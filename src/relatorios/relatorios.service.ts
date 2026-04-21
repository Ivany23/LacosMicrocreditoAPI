import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Cliente } from '../entities/cliente.entity';
import { Emprestimo } from '../entities/emprestimo.entity';
import { Pagamento } from '../entities/pagamento.entity';
import { Penalizacao } from '../entities/penalizacao.entity';
import { DashboardService } from '../dashboard/dashboard.service';

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
        private dashboardService: DashboardService,
    ) { }

    private formatarMoeda(valor: number): string {
        return new Intl.NumberFormat('pt-MZ', {
            style: 'currency',
            currency: 'MZN'
        }).format(valor);
    }

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

    async gerarExtratoCompleto(clienteId: string) {
        
        const cliente = await this.clienteRepository.findOne({
            where: { clienteId },
            relations: ['localizacao']
        });

        if (!cliente) {
            throw new NotFoundException('Cliente não encontrado');
        }

        const emprestimos = await this.emprestimoRepository.find({
            where: { clienteId },
            order: { dataEmprestimo: 'DESC' }
        });

        const pagamentos = await this.pagamentoRepository.find({
            where: { clienteId },
            relations: ['emprestimo'],
            order: { dataPagamento: 'DESC' }
        });

        const penalizacoes = await this.penalizacaoRepository.find({
            where: { clienteId },
            order: { dataAplicacao: 'DESC' }
        });

        const resumoEmprestimos = this.calcularResumoEmprestimos(emprestimos);
        const resumoPagamentos = this.calcularResumoPagamentos(pagamentos);
        const resumoPenalizacoes = this.calcularResumoPenalizacoes(penalizacoes);

        const situacaoGlobal = this.calcularSituacaoGlobal(emprestimos, pagamentos, penalizacoes);

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

                const corPrimaria = '#E65100'; 
                const corSecundaria = '#333333';
                const corTitulos = '#1565C0'; 
                const corVerde = '#2E7D32';
                const corVermelho = '#C62828';
                const corCinza = '#757575';
                const corFundo = '#F5F5F5';
                const pageWidth = 515;

                doc.rect(0, 0, 595, 80).fill(corPrimaria);

                doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold')
                    .text('EXTRATO FINANCEIRO', 40, 25);
                doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica')
                    .text('Documento Oficial do Cliente', 40, 50);

                const numeroDoc = `N° ${String(relatorio.cliente.id).padStart(10, '0')}`;
                doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
                    .text(numeroDoc, 400, 25, { width: 155, align: 'right' });

                const dataEmissao = new Date().toLocaleDateString('pt-MZ', {
                    day: '2-digit', month: 'short', year: 'numeric'
                }).toUpperCase();
                doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica')
                    .text(`Emitido: ${dataEmissao}`, 400, 45, { width: 155, align: 'right' });

                doc.y = 100;

                doc.fillColor(corSecundaria).fontSize(10).font('Helvetica-Bold')
                    .text('DADOS DO CLIENTE', 40);
                doc.moveDown(0.3);

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

                doc.fillColor(corSecundaria).fontSize(10).font('Helvetica-Bold')
                    .text('SALDO A PAGAR', 40);
                doc.moveDown(0.3);

                const saldoY = doc.y;
                const saldoDevedor = relatorio.situacaoFinanceira.valores.saldoDevedor;

                doc.rect(40, saldoY, 200, 60).fill(corFundo).stroke('#E0E0E0');
                doc.rect(40, saldoY, 200, 22).fill(corPrimaria);

                doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
                    .text('Total em Meticais', 50, saldoY + 6);

                doc.fillColor(corSecundaria).fontSize(20).font('Helvetica-Bold')
                    .text(this.formatarMoeda(saldoDevedor), 50, saldoY + 30);

                const statusColor = relatorio.situacaoFinanceira.status.includes('EM DIA') ? corVerde :
                    relatorio.situacaoFinanceira.status.includes('PENDENTE') ? corPrimaria : corVermelho;

                doc.rect(260, saldoY, 295, 60).fill(corFundo).stroke('#E0E0E0');
                doc.rect(260, saldoY, 295, 22).fill(statusColor);

                doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
                    .text(`Situação: ${relatorio.situacaoFinanceira.status}`, 270, saldoY + 6);

                doc.fillColor(corCinza).fontSize(8).font('Helvetica')
                    .text(relatorio.situacaoFinanceira.descricao, 270, saldoY + 28, { width: 275 });

                doc.y = saldoY + 75;

                doc.fillColor(corSecundaria).fontSize(10).font('Helvetica-Bold')
                    .text('CONSOLIDADO', 40);
                doc.moveDown(0.3);

                const consolidadoY = doc.y;
                const colWidth1 = 350;
                const colWidth2 = 82;
                const colWidth3 = 83;

                doc.rect(40, consolidadoY, pageWidth, 18).fill(corFundo);
                doc.fillColor(corCinza).fontSize(8).font('Helvetica-Bold')
                    .text('DESCRIÇÃO', 50, consolidadoY + 5)
                    .text('METICAIS', 50 + colWidth1, consolidadoY + 5, { width: colWidth2, align: 'right' });

                let linhaY = consolidadoY + 22;
                const espacoLinha = 16;

                doc.strokeColor('#E0E0E0').lineWidth(0.5).moveTo(40, linhaY - 2).lineTo(555, linhaY - 2).stroke();

                const consolidadoItens = [
                    { desc: 'CAPITAL EMPRESTADO', valor: relatorio.situacaoFinanceira.valores.totalEmprestado },
                    { desc: 'ENCARGOS FINANCEIROS', valor: relatorio.situacaoFinanceira.valores.totalLucroDevido },
                ];

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

                doc.rect(40, linhaY - 2, pageWidth, espacoLinha + 4).fill(corPrimaria);
                doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold')
                    .text('SALDO DEVEDOR', 50, linhaY);
                doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
                    .text(this.formatarMoeda(saldoDevedor), 50 + colWidth1, linhaY - 1, { width: colWidth2 + colWidth3, align: 'right' });

                doc.y = linhaY + espacoLinha + 15;

                doc.fillColor(corSecundaria).fontSize(10).font('Helvetica-Bold')
                    .text('DETALHE DOS EMPRÉSTIMOS', 40);
                doc.moveDown(0.3);

                if (relatorio.emprestimos.detalhe.length > 0) {
                    
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

                const footerY = 760;

                doc.strokeColor('#E0E0E0').lineWidth(1).moveTo(40, footerY).lineTo(555, footerY).stroke();

                doc.fillColor(corCinza).fontSize(7).font('Helvetica')
                    .text('Este é um extrato financeiro oficial. Guarde este documento para referência.', 40, footerY + 10, { align: 'center', width: pageWidth });
                doc.text(`Emitido em ${new Date().toLocaleString('pt-MZ')} - Documento gerado automaticamente pelo sistema.`, 40, footerY + 22, { align: 'center', width: pageWidth });

                doc.fillColor(corCinza).fontSize(8).font('Helvetica')
                    .text('Página 1/1', 480, footerY + 16);

                doc.end();

            } catch (error) {
                reject(error);
            }
        });
    }

    async gerarPdfEmprestimo(emprestimoId: string): Promise<{ pdfBuffer: Buffer; nomeCliente: string }> {
        
        const emprestimo = await this.emprestimoRepository.findOne({
            where: { emprestimoId },
            relations: ['cliente']
        });

        if (!emprestimo) {
            throw new NotFoundException('Empréstimo não encontrado');
        }

        const cliente = await this.clienteRepository.findOne({
            where: { clienteId: emprestimo.clienteId },
            relations: ['localizacao', 'documentos']
        });

        if (!cliente) {
            throw new NotFoundException('Cliente não encontrado');
        }

        const primeiroDocumento = cliente.documentos && cliente.documentos.length > 0 ? cliente.documentos[0] : null;

        const pagamentos = await this.pagamentoRepository.find({
            where: { emprestimoId },
            order: { dataPagamento: 'DESC' }
        });

        const penalizacoes = await this.penalizacaoRepository.find({
            where: { emprestimoId },
            order: { dataAplicacao: 'DESC' }
        });

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

                const corPrimaria = '#1565C0'; 
                const corSecundaria = '#0D47A1'; 
                const corClara = '#E3F2FD'; 
                const corTexto = '#333333';
                const corVerde = '#2E7D32';
                const corVermelho = '#C62828';
                const corCinza = '#757575';
                const corFundo = '#F5F5F5';
                const pageWidth = 515;

                const desenharRodape = () => {
                    const footerY = 760;
                    doc.strokeColor(corPrimaria).lineWidth(2).moveTo(40, footerY).lineTo(555, footerY).stroke();
                    doc.fillColor(corPrimaria).fontSize(10).font('Helvetica-Bold')
                        .text('LAÇOS MICROCRÉDITO', 40, footerY + 10, { align: 'center', width: pageWidth });
                    doc.fillColor(corCinza).fontSize(7).font('Helvetica')
                        .text('Este é um documento oficial. Guarde para referência e comprovação de pagamentos.', 40, footerY + 25, { align: 'center', width: pageWidth });
                    doc.text(`Emitido em ${new Date().toLocaleString('pt-MZ')} | Documento gerado automaticamente`, 40, footerY + 37, { align: 'center', width: pageWidth });
                };

                const verificarBufferETableHeader = (alturaNecessaria: number, tituloTabela: string, colunas: () => void) => {
                    if (doc.y + alturaNecessaria > 740) {
                        desenharRodape();
                        doc.addPage();

                        doc.rect(0, 0, 595, 40).fill(corPrimaria);
                        doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold')
                            .text(`LAÇOS MICROCRÉDITO - CONTINUAÇÃO (${tituloTabela})`, 40, 15);

                        doc.y = 60;
                        colunas();
                        return true;
                    }
                    return false;
                };

                doc.rect(0, 0, 595, 90).fill(corPrimaria);

                doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold')
                    .text('LAÇOS', 40, 20);
                doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica')
                    .text('MICROCRÉDITO', 40, 45);
                doc.fillColor(corClara).fontSize(9).font('Helvetica')
                    .text('Soluções financeiras ao seu alcance', 40, 62);

                doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
                    .text(`EXTRATO Nº EMP-${String(emprestimoId).padStart(6, '0')}`, 350, 25, { width: 205, align: 'right' });

                const dataEmissao = new Date().toLocaleDateString('pt-MZ', {
                    day: '2-digit', month: 'long', year: 'numeric'
                });
                doc.fillColor(corClara).fontSize(9).font('Helvetica')
                    .text(`Emitido em: ${dataEmissao}`, 350, 45, { width: 205, align: 'right' });

                doc.y = 110;

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

                doc.fillColor(corSecundaria).fontSize(11).font('Helvetica-Bold')
                    .text('DETALHES DO EMPRÉSTIMO', 40);
                doc.moveDown(0.3);

                const empY = doc.y;
                doc.rect(40, empY, pageWidth, 70).fill(corClara).stroke(corPrimaria);

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

                desenharRodape();

                const range = doc.bufferedPageRange();
                for (let i = range.start; i < range.start + range.count; i++) {
                    doc.switchToPage(i);
                    const pY = 797; 
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

    async gerarExcelFinanceiroCompleto(): Promise<Buffer> {
        const dados = await this.dashboardService.getRelatorioExecutivo();
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Laços Microcrédito';
        workbook.lastModifiedBy = 'Sistema de API';
        workbook.created = new Date();
        workbook.title = 'Relatório Financeiro Consolidado';

        // --- ESTILOS COMPARTILHADOS ---
        const styleBorder = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
        };

        const applyZebraStriping = (sheet: ExcelJS.Worksheet, startRow: number = 2) => {
            sheet.eachRow((row, rowNumber) => {
                if (rowNumber >= startRow) {
                    const isEven = rowNumber % 2 === 0;
                    row.eachCell((cell) => {
                        cell.border = styleBorder as any;
                        if (isEven) {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFF9FAFB' }
                            };
                        }
                    });
                }
            });
        };

        const setupProfessionalHeader = (sheet: ExcelJS.Worksheet, color: string) => {
            const headerRow = sheet.getRow(1);
            headerRow.height = 30;
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } }
                } as any;
            });
            sheet.views = [{ state: 'frozen', ySplit: 1 }];
        };

        // --- 1. ABA: RESUMO EXECUTIVO ---
        const sheetDash = workbook.addWorksheet('Resumo Executivo');
        sheetDash.columns = [
            { header: 'INDICADOR ESTRATÉGICO', key: 'indicador', width: 45 },
            { header: 'VALOR ATUAL', key: 'valor', width: 25 },
            { header: 'DETALHAMENTO E STATUS', key: 'descricao', width: 80 }
        ];

        // Título e Branding no topo
        sheetDash.insertRow(1, ['LAÇOS MICROCRÉDITO - RELATÓRIO EXECUTIVO DE GESTÃO']);
        sheetDash.insertRow(2, [`Data de Referência: ${new Date().toLocaleDateString('pt-MZ')} | Gerado às ${new Date().toLocaleTimeString('pt-MZ')}`]);
        sheetDash.insertRow(3, []);

        sheetDash.mergeCells('A1:C1');
        sheetDash.mergeCells('A2:C2');
        
        const titleRow = sheetDash.getRow(1);
        titleRow.font = { size: 16, bold: true, color: { argb: 'FF1A237E' } };
        titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
        
        const subTitleRow = sheetDash.getRow(2);
        subTitleRow.font = { italic: true, color: { argb: 'FF757575' } };
        subTitleRow.alignment = { horizontal: 'center' };

        // Re-header para os dados reais
        const dataHeaderRow = sheetDash.getRow(4);
        dataHeaderRow.values = ['INDICADOR ESTRATÉGICO', 'VALOR ATUAL', 'DETALHAMENTO E STATUS'];
        setupProfessionalHeader(sheetDash, 'FF1A237E');
        sheetDash.views = []; // No Resumo não precisamos congelar a primeira linha do mesmo jeito

        // Seção 1: KPIs
        sheetDash.addRow({ indicador: '► 1. INDICADORES DE PERFORMANCE (KPIs)', valor: '', descricao: '' });
        sheetDash.lastRow.font = { bold: true, size: 12 };
        sheetDash.lastRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } };

        const kpis = dados.resumoExecutivo.kpis;
        Object.values(kpis).forEach((kpi: any) => {
            const row = sheetDash.addRow({
                indicador: `   • ${kpi.descricao.split('(')[0].trim()}`,
                valor: kpi.valor,
                descricao: kpi.descricao
            });
            row.getCell('valor').font = { bold: true };
        });

        // Seção 2: Risco
        sheetDash.addRow([]);
        sheetDash.addRow({ indicador: '► 2. ANÁLISE DE RISCO E CARTEIRA (PAR)', valor: '', descricao: '' });
        sheetDash.lastRow.font = { bold: true, size: 12 };
        sheetDash.lastRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBE9E7' } };

        const empStatus = dados.analises.emprestimos.porStatus;
        sheetDash.addRow({ indicador: '   • Taxa de Inadimplência Global', valor: kpis.taxaInadimplencia.valor, descricao: `Nível de Alerta: ${kpis.taxaInadimplencia.nivel}` });
        sheetDash.addRow({ indicador: '   • Volume Inadimplente (Qtd)', valor: empStatus.inadimplentes.quantidade, descricao: 'Contratos com atraso superior a 1 dia' });
        sheetDash.addRow({ indicador: '   • Exposição Financeira (Risco)', valor: empStatus.inadimplentes.valor, descricao: 'Saldo total em aberto destes contratos' });

        // Seção 3: Alertas
        sheetDash.addRow([]);
        sheetDash.addRow({ indicador: '► 3. ALERTAS E PRIORIDADES CRÍTICAS', valor: '', descricao: '' });
        sheetDash.lastRow.font = { bold: true, size: 12, color: { argb: 'FFB71C1C' } };
        sheetDash.lastRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } };

        const alertas = dados.resumoExecutivo.alertas;
        const vRow = sheetDash.addRow({ 
            indicador: '   • Portfólio Vencido / Cobrança Ativa', 
            valor: alertas.emprestimosVencidos.quantidade, 
            descricao: `Total: ${alertas.emprestimosVencidos.valor} - PRIORIDADE: ${alertas.emprestimosVencidos.prioridade}` 
        });
        vRow.getCell('valor').font = { color: { argb: 'FFD32F2F' }, bold: true };

        sheetDash.addRow({ 
            indicador: '   • Próximos Vencimentos (7 Dias)', 
            valor: alertas.emprestimosAVencer.quantidade, 
            descricao: `Expectativa de Recebimento: ${alertas.emprestimosAVencer.valor}` 
        });

        // --- DATA FETCHING PARA AS OUTRAS ABAS ---
        const [todosEmprestimos, todosPagamentos, todosClientes] = await Promise.all([
            this.emprestimoRepository.find({ relations: ['cliente'], order: { dataEmprestimo: 'DESC' } }),
            this.pagamentoRepository.find({ relations: ['cliente', 'emprestimo'], order: { dataPagamento: 'DESC' } }),
            this.clienteRepository.find({ relations: ['localizacao'], order: { dataCadastro: 'DESC' } })
        ]);

        // --- 2. ABA: EMPRÉSTIMOS ---
        const sheetEmp = workbook.addWorksheet('Gestão de Carteira');
        sheetEmp.columns = [
            { header: 'ID CONTRATO', key: 'id', width: 15 },
            { header: 'NOME DO CLIENTE', key: 'cliente', width: 40 },
            { header: 'SOLICITAÇÃO', key: 'data', width: 18 },
            { header: 'LIMITE VENC.', key: 'vencimento', width: 18 },
            { header: 'CAPITAL (MZN)', key: 'valor', width: 22 },
            { header: 'JUROS (20%)', key: 'encargos', width: 22 },
            { header: 'MONTANTE FINAL', key: 'total', width: 22 },
            { header: 'STATUS ATUAL', key: 'status', width: 20 }
        ];

        setupProfessionalHeader(sheetEmp, 'FF2E7D32');
        todosEmprestimos.forEach(e => {
            const vParam = Number(e.valor);
            const row = sheetEmp.addRow({
                id: `EMP-${e.emprestimoId}`,
                cliente: e.cliente?.nome || 'N/A',
                data: this.formatarData(e.dataEmprestimo).split(',')[0],
                vencimento: this.formatarData(e.dataVencimento).split(',')[0],
                valor: vParam,
                encargos: vParam * 0.2,
                total: vParam * 1.2,
                status: e.status.toUpperCase()
            });

            // Colorir status
            const statusCell = row.getCell('status');
            if (e.status === 'Pago') statusCell.font = { color: { argb: 'FF2E7D32' }, bold: true };
            if (e.status === 'Inadimplente') statusCell.font = { color: { argb: 'FFC62828' }, bold: true };
            if (e.status === 'Ativo') statusCell.font = { color: { argb: 'FF1565C0' }, bold: true };
        });

        applyZebraStriping(sheetEmp);
        ['E', 'F', 'G'].forEach(col => {
            const column = sheetEmp.getColumn(col);
            column.numFmt = '#,##0.00" MT"';
            column.alignment = { horizontal: 'right' };
        });

        // --- 3. ABA: PAGAMENTOS ---
        const sheetPag = workbook.addWorksheet('Fluxo de Caixa (Entradas)');
        sheetPag.columns = [
            { header: 'N° TRANSAÇÃO', key: 'id', width: 18 },
            { header: 'VÍNCULO EMP.', key: 'empId', width: 18 },
            { header: 'BENEFICIÁRIO', key: 'cliente', width: 40 },
            { header: 'DATA CRÉDITO', key: 'data', width: 20 },
            { header: 'VALOR LIQUIDADO', key: 'valor', width: 22 },
            { header: 'MODALIDADE', key: 'metodo', width: 22 },
            { header: 'COMPROVANTE/REF', key: 'ref', width: 30 }
        ];

        setupProfessionalHeader(sheetPag, 'FF1565C0');
        todosPagamentos.forEach(p => {
            sheetPag.addRow({
                id: `PAG-${p.pagamentoId}`,
                empId: `EMP-${p.emprestimoId}`,
                cliente: p.cliente?.nome || 'N/A',
                data: this.formatarData(p.dataPagamento),
                valor: Number(p.valorPago),
                metodo: p.metodoPagamento,
                ref: p.referenciaPagamento || '---'
            });
        });

        applyZebraStriping(sheetPag);
        sheetPag.getColumn('E').numFmt = '#,##0.00" MT"';
        sheetPag.getColumn('E').alignment = { horizontal: 'right' };

        // --- 4. ABA: CLIENTES ---
        const sheetCli = workbook.addWorksheet('Dossier de Clientes');
        sheetCli.columns = [
            { header: 'CÓDIGO', key: 'id', width: 12 },
            { header: 'NOME COMPLETO', key: 'nome', width: 45 },
            { header: 'CONTATO', key: 'telefone', width: 22 },
            { header: 'PROVÍNCIA', key: 'provincia', width: 25 },
            { header: 'CIDADE/DISTRITO', key: 'cidade', width: 25 },
            { header: 'DATA ADMISSÃO', key: 'data', width: 20 }
        ];

        setupProfessionalHeader(sheetCli, 'FF455A64');
        todosClientes.forEach(c => {
            sheetCli.addRow({
                id: c.clienteId,
                nome: c.nome.toUpperCase(),
                telefone: c.telefone,
                provincia: c.localizacao?.provincia || 'N/A',
                cidade: c.localizacao?.cidade || 'N/A',
                data: this.formatarData(c.dataCadastro).split(',')[0]
            });
        });

        applyZebraStriping(sheetCli);

        // --- AUTO FILTROS EM TUDO ---
        [sheetEmp, sheetPag, sheetCli].forEach(s => {
            s.autoFilter = {
                from: { row: 1, column: 1 },
                to: { row: 1, column: s.columns.length }
            };
        });

        const buffer = await workbook.xlsx.writeBuffer();
        return buffer as any;
    }
}
