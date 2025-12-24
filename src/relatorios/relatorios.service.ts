import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from '../entities/cliente.entity';
import { Emprestimo } from '../entities/emprestimo.entity';
import { Pagamento } from '../entities/pagamento.entity';
import { Penalizacao } from '../entities/penalizacao.entity';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

@Injectable()
export class RelatoriosService {
    constructor(
        @InjectRepository(Cliente)
        private clienteRepository: Repository<Cliente>,
        @InjectRepository(Emprestimo)
        private emprestimoRepository: Repository<Emprestimo>,
        @InjectRepository(Pagamento)
        private pagamentoRepository: Repository<Pagamento>,
        @InjectRepository(Penalizacao)
        private penalizacaoRepository: Repository<Penalizacao>,
    ) { }

    /**
     * Formatar valor em moeda
     */
    private formatarMoeda(valor: number): string {
        return new Intl.NumberFormat('pt-MZ', {
            style: 'currency',
            currency: 'MZN'
        }).format(valor);
    }

    /**
     * Formatar data
     */
    private formatarData(data: Date | string): string {
        if (!data) return 'N/A';
        const d = new Date(data);
        return d.toLocaleDateString('pt-MZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Gerar extrato financeiro completo do cliente
     */
    async gerarExtratoCompleto(clienteId: string) {
        // 1. Buscar dados do cliente
        const cliente = await this.clienteRepository.findOne({
            where: { clienteId },
            relations: ['localizacao']
        });

        if (!cliente) {
            throw new NotFoundException('Cliente não encontrado');
        }

        // 2. Buscar empréstimos do cliente
        const emprestimos = await this.emprestimoRepository.find({
            where: { clienteId },
            order: { dataEmprestimo: 'DESC' }
        });

        // 3. Buscar pagamentos do cliente
        const pagamentos = await this.pagamentoRepository.find({
            where: { clienteId },
            relations: ['emprestimo'],
            order: { dataPagamento: 'DESC' }
        });

        // 4. Buscar penalizações do cliente
        const penalizacoes = await this.penalizacaoRepository.find({
            where: { clienteId },
            order: { dataAplicacao: 'DESC' }
        });

        // 5. Calcular resumos financeiros
        const resumoEmprestimos = this.calcularResumoEmprestimos(emprestimos);
        const resumoPagamentos = this.calcularResumoPagamentos(pagamentos);
        const resumoPenalizacoes = this.calcularResumoPenalizacoes(penalizacoes);

        // 6. Calcular situação financeira global
        const situacaoGlobal = this.calcularSituacaoGlobal(emprestimos, pagamentos, penalizacoes);

        // 7. Montar resposta completa
        const dataGeracao = new Date();

        return {
            sucesso: true,
            relatorio: {
                metadados: {
                    titulo: 'Extrato Financeiro Completo',
                    dataGeracao: this.formatarData(dataGeracao),
                    dataGeracaoISO: dataGeracao.toISOString(),
                    versao: '1.0'
                },
                cliente: {
                    id: cliente.clienteId,
                    nome: cliente.nome,
                    telefone: cliente.telefone,
                    email: cliente.email || 'Não informado',
                    sexo: cliente.sexo,
                    nacionalidade: cliente.nacionalidade,
                    dataNascimento: cliente.dataNascimento,
                    dataCadastro: this.formatarData(cliente.dataCadastro),
                    endereco: cliente.localizacao ? {
                        provincia: cliente.localizacao.provincia,
                        cidade: cliente.localizacao.cidade,
                        bairro: cliente.localizacao.bairro
                    } : null
                },
                situacaoFinanceira: {
                    status: situacaoGlobal.statusGeral,
                    descricao: situacaoGlobal.descricaoStatus,
                    totalEmprestado: this.formatarMoeda(situacaoGlobal.totalEmprestado),
                    totalLucroDevido: this.formatarMoeda(situacaoGlobal.totalLucroDevido),
                    totalPenalizacoesDevidas: this.formatarMoeda(situacaoGlobal.totalPenalizacoesDevidas),
                    totalDevidoGeral: this.formatarMoeda(situacaoGlobal.totalDevidoGeral),
                    totalPago: this.formatarMoeda(situacaoGlobal.totalPago),
                    saldoDevedor: this.formatarMoeda(situacaoGlobal.saldoDevedor),
                    valores: {
                        totalEmprestado: Number(situacaoGlobal.totalEmprestado.toFixed(2)),
                        totalLucroDevido: Number(situacaoGlobal.totalLucroDevido.toFixed(2)),
                        totalPenalizacoesDevidas: Number(situacaoGlobal.totalPenalizacoesDevidas.toFixed(2)),
                        totalDevidoGeral: Number(situacaoGlobal.totalDevidoGeral.toFixed(2)),
                        totalPago: Number(situacaoGlobal.totalPago.toFixed(2)),
                        saldoDevedor: Number(situacaoGlobal.saldoDevedor.toFixed(2))
                    }
                },
                emprestimos: {
                    resumo: resumoEmprestimos,
                    detalhe: emprestimos.map(e => ({
                        id: e.emprestimoId,
                        valor: this.formatarMoeda(Number(e.valor)),
                        valorNumerico: Number(e.valor),
                        lucro20Porcento: this.formatarMoeda(Number(e.valor) * 0.20),
                        valorTotal: this.formatarMoeda(Number(e.valor) * 1.20),
                        status: e.status,
                        dataEmprestimo: this.formatarData(e.dataEmprestimo),
                        dataVencimento: this.formatarData(e.dataVencimento),
                        vencido: new Date(e.dataVencimento) < new Date()
                    }))
                },
                pagamentos: {
                    resumo: resumoPagamentos,
                    detalhe: pagamentos.map(p => ({
                        id: p.pagamentoId,
                        emprestimoId: p.emprestimoId,
                        valor: this.formatarMoeda(Number(p.valorPago)),
                        valorNumerico: Number(p.valorPago),
                        data: this.formatarData(p.dataPagamento),
                        metodo: p.metodoPagamento,
                        referencia: p.referenciaPagamento || 'N/A'
                    }))
                },
                penalizacoes: {
                    resumo: resumoPenalizacoes,
                    detalhe: penalizacoes.map(p => ({
                        id: p.penalizacaoId,
                        emprestimoId: p.emprestimoId,
                        tipo: p.tipo,
                        diasAtraso: p.diasAtraso,
                        valor: this.formatarMoeda(Number(p.valor)),
                        valorNumerico: Number(p.valor),
                        status: p.status,
                        data: this.formatarData(p.dataAplicacao),
                        observacoes: p.observacoes || 'N/A'
                    }))
                }
            }
        };
    }

    private calcularResumoEmprestimos(emprestimos: Emprestimo[]) {
        const ativos = emprestimos.filter(e => e.status === 'Ativo');
        const pagos = emprestimos.filter(e => e.status === 'Pago');
        const inadimplentes = emprestimos.filter(e => e.status === 'Inadimplente');

        const valorTotalEmprestado = emprestimos.reduce((sum, e) => sum + Number(e.valor), 0);
        const valorAtivo = ativos.reduce((sum, e) => sum + Number(e.valor), 0);
        const valorInadimplente = inadimplentes.reduce((sum, e) => sum + Number(e.valor), 0);

        return {
            totalEmprestimos: emprestimos.length,
            emprestimosAtivos: ativos.length,
            emprestimosPagos: pagos.length,
            emprestimosInadimplentes: inadimplentes.length,
            valorTotalEmprestado: this.formatarMoeda(valorTotalEmprestado),
            valorTotalAtivo: this.formatarMoeda(valorAtivo),
            valorTotalInadimplente: this.formatarMoeda(valorInadimplente),
            valores: {
                totalEmprestado: Number(valorTotalEmprestado.toFixed(2)),
                totalAtivo: Number(valorAtivo.toFixed(2)),
                totalInadimplente: Number(valorInadimplente.toFixed(2))
            }
        };
    }

    private calcularResumoPagamentos(pagamentos: Pagamento[]) {
        const valorTotal = pagamentos.reduce((sum, p) => sum + Number(p.valorPago), 0);

        const porMetodo: Record<string, { quantidade: number; valor: number }> = {};
        for (const p of pagamentos) {
            if (!porMetodo[p.metodoPagamento]) {
                porMetodo[p.metodoPagamento] = { quantidade: 0, valor: 0 };
            }
            porMetodo[p.metodoPagamento].quantidade++;
            porMetodo[p.metodoPagamento].valor += Number(p.valorPago);
        }

        return {
            totalPagamentos: pagamentos.length,
            valorTotalPago: this.formatarMoeda(valorTotal),
            valorNumerico: Number(valorTotal.toFixed(2)),
            porMetodoPagamento: Object.entries(porMetodo).map(([metodo, dados]) => ({
                metodo,
                quantidade: dados.quantidade,
                valor: this.formatarMoeda(dados.valor)
            }))
        };
    }

    private calcularResumoPenalizacoes(penalizacoes: Penalizacao[]) {
        const pendentes = penalizacoes.filter(p => p.status === 'pendente' || p.status === 'aplicada');
        const pagas = penalizacoes.filter(p => p.status === 'Paga');
        const canceladas = penalizacoes.filter(p => p.status === 'cancelada');

        const valorTotalPendentes = pendentes.reduce((sum, p) => sum + Number(p.valor), 0);
        const valorTotalPagas = pagas.reduce((sum, p) => sum + Number(p.valor), 0);
        const valorTotalGeral = penalizacoes.reduce((sum, p) => sum + Number(p.valor), 0);

        const diasAtrasoMaximo = penalizacoes.length > 0
            ? Math.max(...penalizacoes.map(p => Number(p.diasAtraso) || 0))
            : 0;

        return {
            totalPenalizacoes: penalizacoes.length,
            penalizacoesPendentes: pendentes.length,
            penalizacoesPagas: pagas.length,
            penalizacoesCanceladas: canceladas.length,
            diasAtrasoMaximo,
            valorTotalGeral: this.formatarMoeda(valorTotalGeral),
            valorPendente: this.formatarMoeda(valorTotalPendentes),
            valorPago: this.formatarMoeda(valorTotalPagas),
            valores: {
                totalGeral: Number(valorTotalGeral.toFixed(2)),
                pendente: Number(valorTotalPendentes.toFixed(2)),
                pago: Number(valorTotalPagas.toFixed(2))
            }
        };
    }

    private calcularSituacaoGlobal(emprestimos: Emprestimo[], pagamentos: Pagamento[], penalizacoes: Penalizacao[]) {
        const emprestimosNaoPagos = emprestimos.filter(e => e.status !== 'Pago');
        const totalEmprestado = emprestimosNaoPagos.reduce((sum, e) => sum + Number(e.valor), 0);
        const totalLucroDevido = totalEmprestado * 0.20;

        const penalizacoesPendentes = penalizacoes.filter(p => p.status === 'pendente' || p.status === 'aplicada');
        const totalPenalizacoesDevidas = penalizacoesPendentes.reduce((sum, p) => sum + Number(p.valor), 0);

        const totalDevidoGeral = totalEmprestado + totalLucroDevido + totalPenalizacoesDevidas;
        const totalPago = pagamentos.reduce((sum, p) => sum + Number(p.valorPago), 0);
        const saldoDevedor = Math.max(0, totalDevidoGeral - totalPago);

        let statusGeral = 'EM DIA';
        let descricaoStatus = 'Cliente sem pendencias financeiras.';

        if (saldoDevedor > 0) {
            const temInadimplente = emprestimos.some(e => e.status === 'Inadimplente');
            const temPenalizacoesPendentes = penalizacoesPendentes.length > 0;

            if (temInadimplente || temPenalizacoesPendentes) {
                statusGeral = 'INADIMPLENTE';
                descricaoStatus = `Cliente possui ${penalizacoesPendentes.length} penalizacao(oes) pendente(s) e saldo devedor de ${this.formatarMoeda(saldoDevedor)}.`;
            } else {
                statusGeral = 'PENDENTE';
                descricaoStatus = `Cliente possui emprestimos ativos com saldo devedor de ${this.formatarMoeda(saldoDevedor)}.`;
            }
        }

        return {
            totalEmprestado,
            totalLucroDevido,
            totalPenalizacoesDevidas,
            totalDevidoGeral,
            totalPago,
            saldoDevedor,
            statusGeral,
            descricaoStatus
        };
    }

    /**
     * Gerar PDF do relatório financeiro - Formato Profissional
     * IMPORTANTE: Este documento é para o cliente - NÃO mostrar lucro da empresa
     */
    async gerarPdfRelatorio(clienteId: string): Promise<Buffer> {
        const extrato = await this.gerarExtratoCompleto(clienteId);
        const relatorio = extrato.relatorio;

        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
                const chunks: Buffer[] = [];

                doc.on('data', (chunk: Buffer) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Cores Profissionais (inspirado em bancos)
                const corPrimaria = '#E65100'; // Laranja corporativo
                const corSecundaria = '#333333';
                const corTitulos = '#1565C0'; // Azul para títulos
                const corVerde = '#2E7D32';
                const corVermelho = '#C62828';
                const corCinza = '#757575';
                const corFundo = '#F5F5F5';
                const pageWidth = 515;

                // ===== CABEÇALHO PROFISSIONAL =====
                // Barra superior laranja
                doc.rect(0, 0, 595, 80).fill(corPrimaria);

                // Título do documento
                doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold')
                    .text('EXTRATO FINANCEIRO', 40, 25);
                doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica')
                    .text('Documento Oficial do Cliente', 40, 50);

                // Número do documento e data à direita
                const numeroDoc = `N° ${String(relatorio.cliente.id).padStart(10, '0')}`;
                doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
                    .text(numeroDoc, 400, 25, { width: 155, align: 'right' });

                const dataEmissao = new Date().toLocaleDateString('pt-MZ', {
                    day: '2-digit', month: 'short', year: 'numeric'
                }).toUpperCase();
                doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica')
                    .text(`Emitido: ${dataEmissao}`, 400, 45, { width: 155, align: 'right' });

                doc.y = 100;

                // ===== DADOS DO CLIENTE =====
                doc.fillColor(corSecundaria).fontSize(10).font('Helvetica-Bold')
                    .text('DADOS DO CLIENTE', 40);
                doc.moveDown(0.3);

                // Caixa de informações do cliente
                const clienteY = doc.y;
                doc.rect(40, clienteY, pageWidth, 50).fill(corFundo);

                doc.fillColor(corSecundaria).fontSize(11).font('Helvetica-Bold')
                    .text(relatorio.cliente.nome.toUpperCase(), 50, clienteY + 10);
                doc.fillColor(corCinza).fontSize(9).font('Helvetica')
                    .text(`Telefone: ${relatorio.cliente.telefone}`, 50, clienteY + 28);
                doc.text(`Email: ${relatorio.cliente.email}`, 250, clienteY + 28);
                doc.text(`N° Cliente: ${relatorio.cliente.id}`, 430, clienteY + 10);
                doc.text(`Desde: ${relatorio.cliente.dataCadastro.split(',')[0]}`, 430, clienteY + 28);

                doc.y = clienteY + 65;

                // ===== SALDO TOTAL A PAGAR =====
                doc.fillColor(corSecundaria).fontSize(10).font('Helvetica-Bold')
                    .text('SALDO A PAGAR', 40);
                doc.moveDown(0.3);

                const saldoY = doc.y;
                const saldoDevedor = relatorio.situacaoFinanceira.valores.saldoDevedor;

                // Caixa de saldo
                doc.rect(40, saldoY, 200, 60).fill(corFundo).stroke('#E0E0E0');
                doc.rect(40, saldoY, 200, 22).fill(corPrimaria);

                doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
                    .text('Total em Meticais', 50, saldoY + 6);

                doc.fillColor(corSecundaria).fontSize(20).font('Helvetica-Bold')
                    .text(this.formatarMoeda(saldoDevedor), 50, saldoY + 30);

                // Status do cliente
                const statusColor = relatorio.situacaoFinanceira.status.includes('EM DIA') ? corVerde :
                    relatorio.situacaoFinanceira.status.includes('PENDENTE') ? corPrimaria : corVermelho;

                doc.rect(260, saldoY, 295, 60).fill(corFundo).stroke('#E0E0E0');
                doc.rect(260, saldoY, 295, 22).fill(statusColor);

                doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
                    .text(`Situação: ${relatorio.situacaoFinanceira.status}`, 270, saldoY + 6);

                doc.fillColor(corCinza).fontSize(8).font('Helvetica')
                    .text(relatorio.situacaoFinanceira.descricao, 270, saldoY + 28, { width: 275 });

                doc.y = saldoY + 75;

                // ===== CONSOLIDADO (Sem mostrar lucro da empresa) =====
                doc.fillColor(corSecundaria).fontSize(10).font('Helvetica-Bold')
                    .text('CONSOLIDADO', 40);
                doc.moveDown(0.3);

                // Tabela de consolidado
                const consolidadoY = doc.y;
                const colWidth1 = 350;
                const colWidth2 = 82;
                const colWidth3 = 83;

                // Cabeçalho da tabela
                doc.rect(40, consolidadoY, pageWidth, 18).fill(corFundo);
                doc.fillColor(corCinza).fontSize(8).font('Helvetica-Bold')
                    .text('DESCRIÇÃO', 50, consolidadoY + 5)
                    .text('METICAIS', 50 + colWidth1, consolidadoY + 5, { width: colWidth2, align: 'right' });

                let linhaY = consolidadoY + 22;
                const espacoLinha = 16;

                // Linha separadora
                doc.strokeColor('#E0E0E0').lineWidth(0.5).moveTo(40, linhaY - 2).lineTo(555, linhaY - 2).stroke();

                // Linhas do consolidado (SEM MOSTRAR LUCRO/JUROS SEPARADAMENTE)
                const consolidadoItens = [
                    { desc: 'CAPITAL EMPRESTADO', valor: relatorio.situacaoFinanceira.valores.totalEmprestado },
                    { desc: 'ENCARGOS FINANCEIROS', valor: relatorio.situacaoFinanceira.valores.totalLucroDevido },
                ];

                // Adicionar penalizações apenas se existirem
                if (relatorio.situacaoFinanceira.valores.totalPenalizacoesDevidas > 0) {
                    consolidadoItens.push({
                        desc: 'PENALIZAÇÕES POR ATRASO',
                        valor: relatorio.situacaoFinanceira.valores.totalPenalizacoesDevidas
                    });
                }

                consolidadoItens.push(
                    { desc: 'TOTAL DEVIDO', valor: relatorio.situacaoFinanceira.valores.totalDevidoGeral },
                    { desc: 'TOTAL PAGO', valor: -relatorio.situacaoFinanceira.valores.totalPago },
                );

                consolidadoItens.forEach((item, index) => {
                    if (index % 2 === 0) {
                        doc.rect(40, linhaY - 2, pageWidth, espacoLinha).fill('#FAFAFA');
                    }
                    const valorColor = item.valor < 0 ? corVerde : corSecundaria;
                    const valorTexto = item.valor < 0 ? `- ${this.formatarMoeda(Math.abs(item.valor))}` : this.formatarMoeda(item.valor);

                    doc.fillColor(corSecundaria).fontSize(9).font('Helvetica')
                        .text(item.desc, 50, linhaY);
                    doc.fillColor(valorColor).fontSize(9).font('Helvetica')
                        .text(valorTexto, 50 + colWidth1, linhaY, { width: colWidth2 + colWidth3, align: 'right' });
                    linhaY += espacoLinha;
                });

                // Linha de saldo devedor (destaque)
                doc.rect(40, linhaY - 2, pageWidth, espacoLinha + 4).fill(corPrimaria);
                doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
                    .text('SALDO DEVEDOR', 50, linhaY);
                doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
                    .text(this.formatarMoeda(saldoDevedor), 50 + colWidth1, linhaY - 1, { width: colWidth2 + colWidth3, align: 'right' });

                doc.y = linhaY + espacoLinha + 15;

                // ===== DETALHE DOS EMPRÉSTIMOS =====
                doc.fillColor(corSecundaria).fontSize(10).font('Helvetica-Bold')
                    .text('DETALHE DOS EMPRÉSTIMOS', 40);
                doc.moveDown(0.3);

                if (relatorio.emprestimos.detalhe.length > 0) {
                    // Cabeçalho da tabela
                    const empY = doc.y;
                    doc.rect(40, empY, pageWidth, 16).fill(corFundo);
                    doc.fillColor(corCinza).fontSize(7).font('Helvetica-Bold')
                        .text('DATA', 50, empY + 4)
                        .text('REFERÊNCIA', 120, empY + 4)
                        .text('VENCIMENTO', 230, empY + 4)
                        .text('VALOR', 350, empY + 4, { width: 60, align: 'right' })
                        .text('TOTAL', 420, empY + 4, { width: 60, align: 'right' })
                        .text('STATUS', 490, empY + 4, { width: 55, align: 'right' });

                    let empLinhaY = empY + 20;

                    relatorio.emprestimos.detalhe.slice(0, 10).forEach((emp: any, index: number) => {
                        if (index % 2 === 0) {
                            doc.rect(40, empLinhaY - 2, pageWidth, 14).fill('#FAFAFA');
                        }

                        const statusColor2 = emp.status === 'Pago' ? corVerde :
                            emp.status === 'Inadimplente' ? corVermelho : corPrimaria;

                        doc.fillColor(corSecundaria).fontSize(8).font('Helvetica')
                            .text(emp.dataVencimento.split(',')[0], 50, empLinhaY)
                            .text(`EMP-${emp.id}`, 120, empLinhaY)
                            .text(emp.dataVencimento.split(',')[0], 230, empLinhaY)
                            .text(emp.valor, 340, empLinhaY, { width: 70, align: 'right' })
                            .text(emp.valorTotal, 410, empLinhaY, { width: 70, align: 'right' });
                        doc.fillColor(statusColor2).fontSize(7).font('Helvetica-Bold')
                            .text(emp.status.toUpperCase(), 490, empLinhaY, { width: 55, align: 'right' });

                        empLinhaY += 14;
                    });

                    if (relatorio.emprestimos.detalhe.length > 10) {
                        doc.fillColor(corCinza).fontSize(8).font('Helvetica')
                            .text(`... e mais ${relatorio.emprestimos.detalhe.length - 10} empréstimos`, 50, empLinhaY);
                        empLinhaY += 14;
                    }

                    doc.y = empLinhaY + 10;
                } else {
                    doc.fillColor(corCinza).fontSize(9).font('Helvetica')
                        .text('Nenhum empréstimo registrado.', 50);
                    doc.moveDown(0.5);
                }

                // ===== HISTÓRICO DE PAGAMENTOS =====
                if (relatorio.pagamentos.detalhe.length > 0) {
                    doc.fillColor(corSecundaria).fontSize(10).font('Helvetica-Bold')
                        .text('HISTÓRICO DE PAGAMENTOS', 40);
                    doc.moveDown(0.3);

                    const pagY = doc.y;
                    doc.rect(40, pagY, pageWidth, 16).fill(corFundo);
                    doc.fillColor(corCinza).fontSize(7).font('Helvetica-Bold')
                        .text('DATA', 50, pagY + 4)
                        .text('REFERÊNCIA', 120, pagY + 4)
                        .text('MÉTODO', 250, pagY + 4)
                        .text('VALOR', 420, pagY + 4, { width: 125, align: 'right' });

                    let pagLinhaY = pagY + 20;

                    relatorio.pagamentos.detalhe.slice(0, 8).forEach((pag: any, index: number) => {
                        if (index % 2 === 0) {
                            doc.rect(40, pagLinhaY - 2, pageWidth, 14).fill('#FAFAFA');
                        }
                        doc.fillColor(corSecundaria).fontSize(8).font('Helvetica')
                            .text(pag.data.split(',')[0], 50, pagLinhaY)
                            .text(`PAG-${pag.id} (Emp: ${pag.emprestimoId})`, 120, pagLinhaY)
                            .text(pag.metodo, 250, pagLinhaY);
                        doc.fillColor(corVerde).fontSize(8).font('Helvetica-Bold')
                            .text(`- ${pag.valor}`, 420, pagLinhaY, { width: 125, align: 'right' });

                        pagLinhaY += 14;
                    });

                    if (relatorio.pagamentos.detalhe.length > 8) {
                        doc.fillColor(corCinza).fontSize(8).font('Helvetica')
                            .text(`... e mais ${relatorio.pagamentos.detalhe.length - 8} pagamentos`, 50, pagLinhaY);
                        pagLinhaY += 14;
                    }

                    doc.y = pagLinhaY + 10;
                }

                // ===== PENALIZAÇÕES (Só aparece se existir) =====
                if (relatorio.penalizacoes.detalhe.length > 0) {
                    doc.fillColor(corSecundaria).fontSize(10).font('Helvetica-Bold')
                        .text('PENALIZAÇÕES APLICADAS', 40);
                    doc.moveDown(0.3);

                    const penY = doc.y;
                    doc.rect(40, penY, pageWidth, 16).fill('#FFF3E0');
                    doc.fillColor(corCinza).fontSize(7).font('Helvetica-Bold')
                        .text('DATA', 50, penY + 4)
                        .text('REFERÊNCIA', 120, penY + 4)
                        .text('DIAS ATRASO', 250, penY + 4)
                        .text('VALOR', 350, penY + 4, { width: 80, align: 'right' })
                        .text('STATUS', 450, penY + 4, { width: 95, align: 'right' });

                    let penLinhaY = penY + 20;

                    relatorio.penalizacoes.detalhe.slice(0, 5).forEach((pen: any, index: number) => {
                        if (index % 2 === 0) {
                            doc.rect(40, penLinhaY - 2, pageWidth, 14).fill('#FFF8F0');
                        }
                        const penStatusColor = pen.status === 'Paga' ? corVerde : corVermelho;

                        doc.fillColor(corSecundaria).fontSize(8).font('Helvetica')
                            .text(pen.data.split(',')[0], 50, penLinhaY)
                            .text(`PEN-${pen.id} (Emp: ${pen.emprestimoId})`, 120, penLinhaY)
                            .text(`${pen.diasAtraso} dias`, 250, penLinhaY);
                        doc.fillColor(corVermelho).fontSize(8).font('Helvetica')
                            .text(pen.valor, 350, penLinhaY, { width: 80, align: 'right' });
                        doc.fillColor(penStatusColor).fontSize(7).font('Helvetica-Bold')
                            .text(pen.status.toUpperCase(), 450, penLinhaY, { width: 95, align: 'right' });

                        penLinhaY += 14;
                    });

                    if (relatorio.penalizacoes.detalhe.length > 5) {
                        doc.fillColor(corCinza).fontSize(8).font('Helvetica')
                            .text(`... e mais ${relatorio.penalizacoes.detalhe.length - 5} penalizações`, 50, penLinhaY);
                    }

                    doc.moveDown(1);
                }

                // ===== RODAPÉ PROFISSIONAL =====
                const footerY = 760;

                // Linha separadora
                doc.strokeColor('#E0E0E0').lineWidth(1).moveTo(40, footerY).lineTo(555, footerY).stroke();

                doc.fillColor(corCinza).fontSize(7).font('Helvetica')
                    .text('Este é um extrato financeiro oficial. Guarde este documento para referência.', 40, footerY + 10, { align: 'center', width: pageWidth });
                doc.text(`Emitido em ${new Date().toLocaleString('pt-MZ')} - Documento gerado automaticamente pelo sistema.`, 40, footerY + 22, { align: 'center', width: pageWidth });

                // Número da página
                doc.fillColor(corCinza).fontSize(8).font('Helvetica')
                    .text('Página 1/1', 480, footerY + 16);

                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Gerar PDF de um empréstimo específico - Laços Microcrédito
     * Documento profissional com cores azuis
     */
    async gerarPdfEmprestimo(emprestimoId: string): Promise<{ pdfBuffer: Buffer; nomeCliente: string }> {
        // 1. Buscar empréstimo
        const emprestimo = await this.emprestimoRepository.findOne({
            where: { emprestimoId },
            relations: ['cliente']
        });

        if (!emprestimo) {
            throw new NotFoundException('Empréstimo não encontrado');
        }

        // 2. Buscar cliente
        const cliente = await this.clienteRepository.findOne({
            where: { clienteId: emprestimo.clienteId },
            relations: ['localizacao', 'documentos']
        });

        if (!cliente) {
            throw new NotFoundException('Cliente não encontrado');
        }

        // Pegar o primeiro documento do cliente (se houver)
        const primeiroDocumento = cliente.documentos && cliente.documentos.length > 0 ? cliente.documentos[0] : null;

        // 3. Buscar pagamentos deste empréstimo específico
        const pagamentos = await this.pagamentoRepository.find({
            where: { emprestimoId },
            order: { dataPagamento: 'DESC' }
        });

        // 4. Buscar penalizações deste empréstimo específico
        const penalizacoes = await this.penalizacaoRepository.find({
            where: { emprestimoId },
            order: { dataAplicacao: 'DESC' }
        });

        // 5. Cálculos financeiros do empréstimo
        const valorEmprestimo = Number(emprestimo.valor);
        const encargosFinanceiros = valorEmprestimo * 0.20;
        const totalPenalizacoes = penalizacoes
            .filter(p => p.status === 'pendente' || p.status === 'aplicada')
            .reduce((sum, p) => sum + Number(p.valor), 0);
        const totalDevido = valorEmprestimo + encargosFinanceiros + totalPenalizacoes;
        const totalPago = pagamentos.reduce((sum, p) => sum + Number(p.valorPago), 0);
        const saldoDevedor = Math.max(0, totalDevido - totalPago);

        const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
                const chunks: Buffer[] = [];

                doc.on('data', (chunk: Buffer) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                // Cores Azul Profissional - Laços Microcrédito
                const corPrimaria = '#1565C0'; // Azul principal
                const corSecundaria = '#0D47A1'; // Azul escuro
                const corClara = '#E3F2FD'; // Azul muito claro
                const corTexto = '#333333';
                const corVerde = '#2E7D32';
                const corVermelho = '#C62828';
                const corCinza = '#757575';
                const corFundo = '#F5F5F5';
                const pageWidth = 515;

                // Helper para desenhar o rodapé em qualquer página
                const desenharRodape = () => {
                    const footerY = 760;
                    doc.strokeColor(corPrimaria).lineWidth(2).moveTo(40, footerY).lineTo(555, footerY).stroke();
                    doc.fillColor(corPrimaria).fontSize(10).font('Helvetica-Bold')
                        .text('LAÇOS MICROCRÉDITO', 40, footerY + 10, { align: 'center', width: pageWidth });
                    doc.fillColor(corCinza).fontSize(7).font('Helvetica')
                        .text('Este é um documento oficial. Guarde para referência e comprovação de pagamentos.', 40, footerY + 25, { align: 'center', width: pageWidth });
                    doc.text(`Emitido em ${new Date().toLocaleString('pt-MZ')} | Documento gerado automaticamente`, 40, footerY + 37, { align: 'center', width: pageWidth });
                };

                // Helper para verificar espaço e adicionar página se necessário
                const verificarBufferETableHeader = (alturaNecessaria: number, tituloTabela: string, colunas: () => void) => {
                    if (doc.y + alturaNecessaria > 740) {
                        desenharRodape();
                        doc.addPage();

                        // Mini cabeçalho de continuação
                        doc.rect(0, 0, 595, 40).fill(corPrimaria);
                        doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold')
                            .text(`LAÇOS MICROCRÉDITO - CONTINUAÇÃO (${tituloTabela})`, 40, 15);

                        doc.y = 60;
                        colunas();
                        return true;
                    }
                    return false;
                };

                // ===== CABEÇALHO PROFISSIONAL - LAÇOS MICROCRÉDITO =====
                doc.rect(0, 0, 595, 90).fill(corPrimaria);

                // Logo/Nome da empresa
                doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold')
                    .text('LAÇOS', 40, 20);
                doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica')
                    .text('MICROCRÉDITO', 40, 45);
                doc.fillColor(corClara).fontSize(9).font('Helvetica')
                    .text('Soluções financeiras ao seu alcance', 40, 62);

                // Número do documento à direita
                doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
                    .text(`EXTRATO Nº EMP-${String(emprestimoId).padStart(6, '0')}`, 350, 25, { width: 205, align: 'right' });

                const dataEmissao = new Date().toLocaleDateString('pt-MZ', {
                    day: '2-digit', month: 'long', year: 'numeric'
                });
                doc.fillColor(corClara).fontSize(9).font('Helvetica')
                    .text(`Emitido em: ${dataEmissao}`, 350, 45, { width: 205, align: 'right' });

                doc.y = 110;

                // ===== DADOS DO CLIENTE =====
                doc.fillColor(corSecundaria).fontSize(11).font('Helvetica-Bold')
                    .text('DADOS DO CLIENTE', 40);
                doc.moveDown(0.3);

                const clienteY = doc.y;
                doc.rect(40, clienteY, pageWidth, 55).fill(corFundo).stroke('#E0E0E0');

                doc.fillColor(corTexto).fontSize(12).font('Helvetica-Bold')
                    .text(cliente.nome.toUpperCase(), 50, clienteY + 10);
                doc.fillColor(corCinza).fontSize(9).font('Helvetica')
                    .text(`Telefone: ${cliente.telefone}`, 50, clienteY + 28)
                    .text(`Email: ${cliente.email || 'Não informado'}`, 50, clienteY + 40);
                doc.text(`N° Cliente: ${cliente.clienteId}`, 350, clienteY + 10)
                    .text(`Documento: ${primeiroDocumento?.tipoDocumento || 'N/A'} - ${primeiroDocumento?.numeroDocumento || 'N/A'}`, 350, clienteY + 28);
                if (cliente.localizacao) {
                    doc.text(`${cliente.localizacao.bairro}, ${cliente.localizacao.cidade}`, 350, clienteY + 40);
                }

                doc.y = clienteY + 70;

                // ===== DETALHES DO EMPRÉSTIMO =====
                doc.fillColor(corSecundaria).fontSize(11).font('Helvetica-Bold')
                    .text('DETALHES DO EMPRÉSTIMO', 40);
                doc.moveDown(0.3);

                const empY = doc.y;
                doc.rect(40, empY, pageWidth, 70).fill(corClara).stroke(corPrimaria);

                // Status com cor
                const statusColor = emprestimo.status === 'Pago' ? corVerde :
                    emprestimo.status === 'Inadimplente' ? corVermelho : corPrimaria;

                doc.fillColor(corTexto).fontSize(9).font('Helvetica')
                    .text('Data do Empréstimo:', 50, empY + 10);
                doc.fillColor(corTexto).fontSize(10).font('Helvetica-Bold')
                    .text(this.formatarData(emprestimo.dataEmprestimo).split(',')[0], 160, empY + 10);

                doc.fillColor(corTexto).fontSize(9).font('Helvetica')
                    .text('Data de Vencimento:', 50, empY + 28);
                doc.fillColor(corTexto).fontSize(10).font('Helvetica-Bold')
                    .text(this.formatarData(emprestimo.dataVencimento).split(',')[0], 160, empY + 28);

                doc.fillColor(corTexto).fontSize(9).font('Helvetica')
                    .text('Situação:', 50, empY + 46);
                doc.fillColor(statusColor).fontSize(11).font('Helvetica-Bold')
                    .text(emprestimo.status.toUpperCase(), 160, empY + 45);

                // Valores à direita
                doc.fillColor(corTexto).fontSize(9).font('Helvetica')
                    .text('Valor Solicitado:', 350, empY + 10);
                doc.fillColor(corTexto).fontSize(12).font('Helvetica-Bold')
                    .text(this.formatarMoeda(valorEmprestimo), 450, empY + 8);

                doc.fillColor(corTexto).fontSize(9).font('Helvetica')
                    .text('Encargos:', 350, empY + 30);
                doc.fillColor(corTexto).fontSize(10).font('Helvetica-Bold')
                    .text(this.formatarMoeda(encargosFinanceiros), 450, empY + 28);

                doc.fillColor(corTexto).fontSize(9).font('Helvetica')
                    .text('Total a Pagar:', 350, empY + 50);
                doc.fillColor(corPrimaria).fontSize(12).font('Helvetica-Bold')
                    .text(this.formatarMoeda(totalDevido), 450, empY + 48);

                doc.y = empY + 85;

                // ===== RESUMO FINANCEIRO =====
                doc.fillColor(corSecundaria).fontSize(11).font('Helvetica-Bold')
                    .text('RESUMO FINANCEIRO', 40);
                doc.moveDown(0.3);

                const resumoY = doc.y;
                doc.rect(40, resumoY, pageWidth, 20).fill(corPrimaria);
                doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
                    .text('DESCRIÇÃO', 50, resumoY + 6)
                    .text('VALOR (MZN)', 400, resumoY + 6, { width: 145, align: 'right' });

                let linhaY = resumoY + 24;

                const itensResumo = [
                    { desc: 'Capital Emprestado', valor: valorEmprestimo, cor: corTexto },
                    { desc: 'Encargos Financeiros', valor: encargosFinanceiros, cor: corTexto },
                ];

                if (totalPenalizacoes > 0) {
                    itensResumo.push({ desc: 'Penalizações por Atraso', valor: totalPenalizacoes, cor: corVermelho });
                }

                itensResumo.push(
                    { desc: 'TOTAL DEVIDO', valor: totalDevido, cor: corSecundaria },
                    { desc: 'Total Pago', valor: totalPago, cor: corVerde }
                );

                itensResumo.forEach((item, index) => {
                    if (index % 2 === 0) {
                        doc.rect(40, linhaY - 3, pageWidth, 18).fill('#FAFAFA');
                    }
                    const isBold = item.desc === 'TOTAL DEVIDO';
                    doc.fillColor(corTexto).fontSize(9).font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                        .text(item.desc, 50, linhaY);
                    doc.fillColor(item.cor).fontSize(10).font(isBold ? 'Helvetica-Bold' : 'Helvetica')
                        .text(this.formatarMoeda(item.valor), 400, linhaY, { width: 145, align: 'right' });
                    linhaY += 18;
                });

                doc.rect(40, linhaY - 3, pageWidth, 18 + 4).fill(corPrimaria);
                doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
                    .text('SALDO DEVEDOR', 50, linhaY);
                doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold')
                    .text(this.formatarMoeda(saldoDevedor), 400, linhaY - 1, { width: 145, align: 'right' });

                doc.y = linhaY + 30;

                // ===== HISTÓRICO DE PAGAMENTOS =====
                if (pagamentos.length > 0) {
                    const desenharHeaderPagamentos = () => {
                        const pagY = doc.y;
                        doc.rect(40, pagY, pageWidth, 18).fill(corFundo);
                        doc.fillColor(corCinza).fontSize(8).font('Helvetica-Bold')
                            .text('DATA', 50, pagY + 5)
                            .text('REFERÊNCIA', 150, pagY + 5)
                            .text('MÉTODO', 300, pagY + 5)
                            .text('VALOR', 420, pagY + 5, { width: 125, align: 'right' });
                        doc.y = pagY + 22;
                    };

                    doc.fillColor(corSecundaria).fontSize(11).font('Helvetica-Bold')
                        .text('HISTÓRICO DE PAGAMENTOS', 40);
                    doc.moveDown(0.3);
                    desenharHeaderPagamentos();

                    pagamentos.forEach((pag, index) => {
                        verificarBufferETableHeader(16, 'PAGAMENTOS', desenharHeaderPagamentos);

                        const pagLinhaY = doc.y;
                        if (index % 2 === 0) {
                            doc.rect(40, pagLinhaY - 2, pageWidth, 16).fill('#FAFAFA');
                        }

                        doc.fillColor(corTexto).fontSize(9).font('Helvetica')
                            .text(this.formatarData(pag.dataPagamento).split(',')[0], 50, pagLinhaY)
                            .text(pag.referenciaPagamento || `PAG-${pag.pagamentoId}`, 150, pagLinhaY)
                            .text(pag.metodoPagamento, 300, pagLinhaY);
                        doc.fillColor(corVerde).fontSize(9).font('Helvetica-Bold')
                            .text(`- ${this.formatarMoeda(Number(pag.valorPago))}`, 420, pagLinhaY, { width: 125, align: 'right' });

                        doc.y = pagLinhaY + 16;
                    });
                    doc.moveDown(1);
                }

                // ===== PENALIZAÇÕES =====
                if (penalizacoes.length > 0) {
                    const desenharHeaderPenalizacoes = () => {
                        const penY = doc.y;
                        doc.rect(40, penY, pageWidth, 18).fill('#FFEBEE');
                        doc.fillColor(corCinza).fontSize(8).font('Helvetica-Bold')
                            .text('DATA', 50, penY + 5)
                            .text('MOTIVO', 150, penY + 5)
                            .text('DIAS ATRASO', 300, penY + 5)
                            .text('VALOR', 380, penY + 5, { width: 80, align: 'right' })
                            .text('STATUS', 470, penY + 5, { width: 75, align: 'right' });
                        doc.y = penY + 22;
                    };

                    doc.fillColor(corSecundaria).fontSize(11).font('Helvetica-Bold')
                        .text('PENALIZAÇÕES APLICADAS', 40);
                    doc.moveDown(0.3);
                    desenharHeaderPenalizacoes();

                    penalizacoes.forEach((pen, index) => {
                        verificarBufferETableHeader(16, 'PENALIZAÇÕES', desenharHeaderPenalizacoes);

                        const penLinhaY = doc.y;
                        if (index % 2 === 0) {
                            doc.rect(40, penLinhaY - 2, pageWidth, 16).fill('#FFF8F8');
                        }
                        const penStatusColor = pen.status === 'Paga' ? corVerde : corVermelho;

                        doc.fillColor(corTexto).fontSize(9).font('Helvetica')
                            .text(this.formatarData(pen.dataAplicacao).split(',')[0], 50, penLinhaY)
                            .text(pen.tipo || 'Atraso', 150, penLinhaY)
                            .text(`${pen.diasAtraso} dias`, 300, penLinhaY);
                        doc.fillColor(corVermelho).fontSize(9).font('Helvetica')
                            .text(this.formatarMoeda(Number(pen.valor)), 380, penLinhaY, { width: 80, align: 'right' });
                        doc.fillColor(penStatusColor).fontSize(8).font('Helvetica-Bold')
                            .text(pen.status.toUpperCase(), 470, penLinhaY, { width: 75, align: 'right' });

                        doc.y = penLinhaY + 16;
                    });
                    doc.moveDown(1);
                }

                // Desenhar rodapé na última página
                desenharRodape();

                // Finalizar: Adicionar numeração de página em todas as páginas
                const range = doc.bufferedPageRange();
                for (let i = range.start; i < range.start + range.count; i++) {
                    doc.switchToPage(i);
                    const pY = 797; // Posição abaixo do rodapé
                    doc.fillColor(corCinza).fontSize(8).font('Helvetica')
                        .text(`Página ${i + 1} de ${range.count}`, 40, pY, { align: 'right', width: pageWidth });
                }

                doc.end();

            } catch (error) {
                reject(error);
            }
        });

        return { pdfBuffer, nomeCliente: cliente.nome };
    }
}
