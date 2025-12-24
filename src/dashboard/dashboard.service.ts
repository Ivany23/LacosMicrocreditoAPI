import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Cliente } from '../entities/cliente.entity';
import { Emprestimo } from '../entities/emprestimo.entity';
import { Pagamento } from '../entities/pagamento.entity';
import { Penalizacao } from '../entities/penalizacao.entity';

/**
 * Dashboard Service - Laços Microcrédito
 * Serviço completo de análise de dados para tomada de decisões empresariais
 */
@Injectable()
export class DashboardService {
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
     * Formatar valor em moeda MZN
     */
    private formatarMoeda(valor: number): string {
        return new Intl.NumberFormat('pt-MZ', {
            style: 'currency',
            currency: 'MZN'
        }).format(valor);
    }

    /**
     * Calcular variação percentual entre dois períodos
     */
    private calcularVariacao(atual: number, anterior: number): { valor: number; tendencia: string } {
        if (anterior === 0) {
            return { valor: atual > 0 ? 100 : 0, tendencia: atual > 0 ? 'alta' : 'estavel' };
        }
        const variacao = ((atual - anterior) / anterior) * 100;
        return {
            valor: Number(variacao.toFixed(2)),
            tendencia: variacao > 0 ? 'alta' : variacao < 0 ? 'baixa' : 'estavel'
        };
    }

    /**
     * Obter datas para períodos de análise
     */
    private obterPeriodos() {
        const hoje = new Date();
        const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
        const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59);
        const inicioAno = new Date(hoje.getFullYear(), 0, 1);
        const inicio7Dias = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
        const inicio30Dias = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
        const inicio90Dias = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000);

        return {
            hoje,
            inicioMesAtual,
            fimMesAtual,
            inicioMesAnterior,
            fimMesAnterior,
            inicioAno,
            inicio7Dias,
            inicio30Dias,
            inicio90Dias
        };
    }

    /**
     * ====================================================================
     * DASHBOARD PRINCIPAL - Visão Geral Executiva
     * ====================================================================
     */
    async getDashboardPrincipal() {
        const periodos = this.obterPeriodos();

        // Buscar todos os dados necessários
        const [
            todosClientes,
            todosEmprestimos,
            todosPagamentos,
            todasPenalizacoes
        ] = await Promise.all([
            this.clienteRepository.find(),
            this.emprestimoRepository.find(),
            this.pagamentoRepository.find(),
            this.penalizacaoRepository.find()
        ]);

        // ====== KPIs PRINCIPAIS ======
        const totalClientes = todosClientes.length;
        const clientesAtivos = todosEmprestimos.filter(e => e.status === 'Ativo').map(e => e.clienteId);
        const clientesUnicos = [...new Set(clientesAtivos)].length;

        const totalEmprestado = todosEmprestimos.reduce((sum, e) => sum + Number(e.valor), 0);
        const totalRecebido = todosPagamentos.reduce((sum, p) => sum + Number(p.valorPago), 0);

        // Lucro = 20% dos empréstimos pagos + pagamentos recebidos - capital emprestado
        const emprestimosPagos = todosEmprestimos.filter(e => e.status === 'Pago');
        const capitalPago = emprestimosPagos.reduce((sum, e) => sum + Number(e.valor), 0);
        const lucroRealizado = capitalPago * 0.20;

        // Taxa de inadimplência
        const emprestimosInadimplentes = todosEmprestimos.filter(e => e.status === 'Inadimplente');
        const taxaInadimplencia = totalEmprestado > 0
            ? (emprestimosInadimplentes.reduce((sum, e) => sum + Number(e.valor), 0) / totalEmprestado) * 100
            : 0;

        // Penalizações
        const totalPenalizacoes = todasPenalizacoes.reduce((sum, p) => sum + Number(p.valor), 0);
        const penalizacoesPendentes = todasPenalizacoes.filter(p => p.status === 'pendente' || p.status === 'aplicada');
        const valorPenalizacoesPendentes = penalizacoesPendentes.reduce((sum, p) => sum + Number(p.valor), 0);

        // ====== ANÁLISE DO MÊS ATUAL ======
        const emprestimosMesAtual = todosEmprestimos.filter(e =>
            new Date(e.dataEmprestimo) >= periodos.inicioMesAtual &&
            new Date(e.dataEmprestimo) <= periodos.fimMesAtual
        );
        const pagamentosMesAtual = todosPagamentos.filter(p =>
            new Date(p.dataPagamento) >= periodos.inicioMesAtual &&
            new Date(p.dataPagamento) <= periodos.fimMesAtual
        );

        // ====== ANÁLISE DO MÊS ANTERIOR (para comparação) ======
        const emprestimosMesAnterior = todosEmprestimos.filter(e =>
            new Date(e.dataEmprestimo) >= periodos.inicioMesAnterior &&
            new Date(e.dataEmprestimo) <= periodos.fimMesAnterior
        );
        const pagamentosMesAnterior = todosPagamentos.filter(p =>
            new Date(p.dataPagamento) >= periodos.inicioMesAnterior &&
            new Date(p.dataPagamento) <= periodos.fimMesAnterior
        );

        const valorEmprestadoMesAtual = emprestimosMesAtual.reduce((sum, e) => sum + Number(e.valor), 0);
        const valorEmprestadoMesAnterior = emprestimosMesAnterior.reduce((sum, e) => sum + Number(e.valor), 0);
        const valorRecebidoMesAtual = pagamentosMesAtual.reduce((sum, p) => sum + Number(p.valorPago), 0);
        const valorRecebidoMesAnterior = pagamentosMesAnterior.reduce((sum, p) => sum + Number(p.valorPago), 0);

        // ====== EMPRÉSTIMOS A VENCER (Próximos 7 dias) ======
        const proximoVencimento = new Date(periodos.hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
        const emprestimosAVencer = todosEmprestimos.filter(e =>
            e.status === 'Ativo' &&
            new Date(e.dataVencimento) <= proximoVencimento &&
            new Date(e.dataVencimento) >= periodos.hoje
        );

        // ====== EMPRÉSTIMOS VENCIDOS (não pagos) ======
        const emprestimosVencidos = todosEmprestimos.filter(e =>
            e.status === 'Ativo' &&
            new Date(e.dataVencimento) < periodos.hoje
        );

        return {
            sucesso: true,
            dataGeracao: new Date().toISOString(),
            empresa: 'Laços Microcrédito',
            periodo: {
                mesAtual: periodos.inicioMesAtual.toLocaleDateString('pt-MZ', { month: 'long', year: 'numeric' }),
                mesAnterior: periodos.inicioMesAnterior.toLocaleDateString('pt-MZ', { month: 'long', year: 'numeric' })
            },
            kpisPrincipais: {
                totalClientes: {
                    valor: totalClientes,
                    clientesAtivos: clientesUnicos,
                    descricao: 'Total de clientes cadastrados no sistema'
                },
                capitalEmprestado: {
                    valor: this.formatarMoeda(totalEmprestado),
                    valorNumerico: Number(totalEmprestado.toFixed(2)),
                    descricao: 'Capital total emprestado desde o início'
                },
                capitalRecebido: {
                    valor: this.formatarMoeda(totalRecebido),
                    valorNumerico: Number(totalRecebido.toFixed(2)),
                    descricao: 'Total recebido em pagamentos'
                },
                lucroRealizado: {
                    valor: this.formatarMoeda(lucroRealizado),
                    valorNumerico: Number(lucroRealizado.toFixed(2)),
                    descricao: 'Lucro realizado (20% sobre empréstimos quitados)'
                },
                taxaInadimplencia: {
                    valor: `${taxaInadimplencia.toFixed(2)}%`,
                    valorNumerico: Number(taxaInadimplencia.toFixed(2)),
                    nivel: taxaInadimplencia < 5 ? 'BAIXO' : taxaInadimplencia < 15 ? 'MODERADO' : 'CRITICO',
                    descricao: 'Percentual de inadimplência sobre capital emprestado'
                },
                penalizacoesPendentes: {
                    quantidade: penalizacoesPendentes.length,
                    valor: this.formatarMoeda(valorPenalizacoesPendentes),
                    valorNumerico: Number(valorPenalizacoesPendentes.toFixed(2)),
                    descricao: 'Penalizações aguardando pagamento'
                }
            },
            desempenhoMensal: {
                mesAtual: {
                    emprestimos: {
                        quantidade: emprestimosMesAtual.length,
                        valor: this.formatarMoeda(valorEmprestadoMesAtual),
                        valorNumerico: Number(valorEmprestadoMesAtual.toFixed(2))
                    },
                    pagamentos: {
                        quantidade: pagamentosMesAtual.length,
                        valor: this.formatarMoeda(valorRecebidoMesAtual),
                        valorNumerico: Number(valorRecebidoMesAtual.toFixed(2))
                    }
                },
                mesAnterior: {
                    emprestimos: {
                        quantidade: emprestimosMesAnterior.length,
                        valor: this.formatarMoeda(valorEmprestadoMesAnterior),
                        valorNumerico: Number(valorEmprestadoMesAnterior.toFixed(2))
                    },
                    pagamentos: {
                        quantidade: pagamentosMesAnterior.length,
                        valor: this.formatarMoeda(valorRecebidoMesAnterior),
                        valorNumerico: Number(valorRecebidoMesAnterior.toFixed(2))
                    }
                },
                variacoes: {
                    emprestimos: this.calcularVariacao(valorEmprestadoMesAtual, valorEmprestadoMesAnterior),
                    pagamentos: this.calcularVariacao(valorRecebidoMesAtual, valorRecebidoMesAnterior)
                }
            },
            alertas: {
                emprestimosAVencer: {
                    quantidade: emprestimosAVencer.length,
                    valor: this.formatarMoeda(emprestimosAVencer.reduce((sum, e) => sum + Number(e.valor), 0)),
                    prioridade: emprestimosAVencer.length > 5 ? 'ALTA' : emprestimosAVencer.length > 0 ? 'MEDIA' : 'BAIXA',
                    descricao: 'Empréstimos vencendo nos próximos 7 dias'
                },
                emprestimosVencidos: {
                    quantidade: emprestimosVencidos.length,
                    valor: this.formatarMoeda(emprestimosVencidos.reduce((sum, e) => sum + Number(e.valor), 0)),
                    prioridade: emprestimosVencidos.length > 0 ? 'CRITICA' : 'BAIXA',
                    descricao: 'Empréstimos vencidos aguardando pagamento'
                }
            }
        };
    }

    /**
     * ====================================================================
     * ANÁLISE DE EMPRÉSTIMOS - Estatísticas Detalhadas
     * ====================================================================
     */
    async getAnaliseEmprestimos() {
        const todosEmprestimos = await this.emprestimoRepository.find({
            order: { dataEmprestimo: 'DESC' }
        });

        const periodos = this.obterPeriodos();

        // Por Status
        const porStatus = {
            ativos: todosEmprestimos.filter(e => e.status === 'Ativo'),
            pagos: todosEmprestimos.filter(e => e.status === 'Pago'),
            inadimplentes: todosEmprestimos.filter(e => e.status === 'Inadimplente')
        };

        // Estatísticas de valor
        const valores = todosEmprestimos.map(e => Number(e.valor));
        const mediaValor = valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
        const maxValor = valores.length > 0 ? Math.max(...valores) : 0;
        const minValor = valores.length > 0 ? Math.min(...valores) : 0;

        // Por período
        const ultimos7Dias = todosEmprestimos.filter(e => new Date(e.dataEmprestimo) >= periodos.inicio7Dias);
        const ultimos30Dias = todosEmprestimos.filter(e => new Date(e.dataEmprestimo) >= periodos.inicio30Dias);
        const ultimos90Dias = todosEmprestimos.filter(e => new Date(e.dataEmprestimo) >= periodos.inicio90Dias);

        // Distribuição por faixa de valor
        const faixasValor = {
            ate5000: todosEmprestimos.filter(e => Number(e.valor) <= 5000),
            de5001a10000: todosEmprestimos.filter(e => Number(e.valor) > 5000 && Number(e.valor) <= 10000),
            de10001a25000: todosEmprestimos.filter(e => Number(e.valor) > 10000 && Number(e.valor) <= 25000),
            de25001a50000: todosEmprestimos.filter(e => Number(e.valor) > 25000 && Number(e.valor) <= 50000),
            acima50000: todosEmprestimos.filter(e => Number(e.valor) > 50000)
        };

        // Taxa de conversão (Pagos / Total)
        const taxaConversao = todosEmprestimos.length > 0
            ? (porStatus.pagos.length / todosEmprestimos.length) * 100
            : 0;

        // Tempo médio para pagamento (empréstimos pagos)
        const temposPagamento = porStatus.pagos.map(e => {
            const dataEmprestimo = new Date(e.dataEmprestimo);
            const dataVencimento = new Date(e.dataVencimento);
            return (dataVencimento.getTime() - dataEmprestimo.getTime()) / (1000 * 60 * 60 * 24);
        });
        const tempoMedioPagamento = temposPagamento.length > 0
            ? temposPagamento.reduce((a, b) => a + b, 0) / temposPagamento.length
            : 0;

        return {
            sucesso: true,
            dataGeracao: new Date().toISOString(),
            resumoGeral: {
                totalEmprestimos: todosEmprestimos.length,
                valorTotal: this.formatarMoeda(valores.reduce((a, b) => a + b, 0)),
                valorTotalNumerico: Number(valores.reduce((a, b) => a + b, 0).toFixed(2)),
                taxaConversao: `${taxaConversao.toFixed(2)}%`,
                tempoMedioPagamento: `${tempoMedioPagamento.toFixed(0)} dias`
            },
            porStatus: {
                ativos: {
                    quantidade: porStatus.ativos.length,
                    valor: this.formatarMoeda(porStatus.ativos.reduce((sum, e) => sum + Number(e.valor), 0)),
                    percentual: `${((porStatus.ativos.length / todosEmprestimos.length) * 100 || 0).toFixed(1)}%`
                },
                pagos: {
                    quantidade: porStatus.pagos.length,
                    valor: this.formatarMoeda(porStatus.pagos.reduce((sum, e) => sum + Number(e.valor), 0)),
                    percentual: `${((porStatus.pagos.length / todosEmprestimos.length) * 100 || 0).toFixed(1)}%`
                },
                inadimplentes: {
                    quantidade: porStatus.inadimplentes.length,
                    valor: this.formatarMoeda(porStatus.inadimplentes.reduce((sum, e) => sum + Number(e.valor), 0)),
                    percentual: `${((porStatus.inadimplentes.length / todosEmprestimos.length) * 100 || 0).toFixed(1)}%`
                }
            },
            estatisticasValor: {
                media: this.formatarMoeda(mediaValor),
                maximo: this.formatarMoeda(maxValor),
                minimo: this.formatarMoeda(minValor),
                mediaNumerico: Number(mediaValor.toFixed(2)),
                maximoNumerico: Number(maxValor.toFixed(2)),
                minimoNumerico: Number(minValor.toFixed(2))
            },
            porPeriodo: {
                ultimos7Dias: {
                    quantidade: ultimos7Dias.length,
                    valor: this.formatarMoeda(ultimos7Dias.reduce((sum, e) => sum + Number(e.valor), 0))
                },
                ultimos30Dias: {
                    quantidade: ultimos30Dias.length,
                    valor: this.formatarMoeda(ultimos30Dias.reduce((sum, e) => sum + Number(e.valor), 0))
                },
                ultimos90Dias: {
                    quantidade: ultimos90Dias.length,
                    valor: this.formatarMoeda(ultimos90Dias.reduce((sum, e) => sum + Number(e.valor), 0))
                }
            },
            distribuicaoPorFaixa: {
                ate5000MZN: {
                    quantidade: faixasValor.ate5000.length,
                    percentual: `${((faixasValor.ate5000.length / todosEmprestimos.length) * 100 || 0).toFixed(1)}%`
                },
                de5001a10000MZN: {
                    quantidade: faixasValor.de5001a10000.length,
                    percentual: `${((faixasValor.de5001a10000.length / todosEmprestimos.length) * 100 || 0).toFixed(1)}%`
                },
                de10001a25000MZN: {
                    quantidade: faixasValor.de10001a25000.length,
                    percentual: `${((faixasValor.de10001a25000.length / todosEmprestimos.length) * 100 || 0).toFixed(1)}%`
                },
                de25001a50000MZN: {
                    quantidade: faixasValor.de25001a50000.length,
                    percentual: `${((faixasValor.de25001a50000.length / todosEmprestimos.length) * 100 || 0).toFixed(1)}%`
                },
                acima50000MZN: {
                    quantidade: faixasValor.acima50000.length,
                    percentual: `${((faixasValor.acima50000.length / todosEmprestimos.length) * 100 || 0).toFixed(1)}%`
                }
            }
        };
    }

    /**
     * ====================================================================
     * ANÁLISE DE PAGAMENTOS - Fluxo de Caixa
     * ====================================================================
     */
    async getAnalisePagamentos() {
        const todosPagamentos = await this.pagamentoRepository.find({
            order: { dataPagamento: 'DESC' }
        });

        const periodos = this.obterPeriodos();

        // Por método de pagamento
        const porMetodo: Record<string, { quantidade: number; valor: number }> = {};
        todosPagamentos.forEach(p => {
            const metodo = p.metodoPagamento || 'Não informado';
            if (!porMetodo[metodo]) {
                porMetodo[metodo] = { quantidade: 0, valor: 0 };
            }
            porMetodo[metodo].quantidade++;
            porMetodo[metodo].valor += Number(p.valorPago);
        });

        const totalRecebido = todosPagamentos.reduce((sum, p) => sum + Number(p.valorPago), 0);

        // Por período (últimos 6 meses)
        const pagamentosPorMes: Record<string, { quantidade: number; valor: number }> = {};
        for (let i = 5; i >= 0; i--) {
            const data = new Date(periodos.hoje.getFullYear(), periodos.hoje.getMonth() - i, 1);
            const chave = data.toLocaleDateString('pt-MZ', { month: 'short', year: 'numeric' });
            pagamentosPorMes[chave] = { quantidade: 0, valor: 0 };
        }

        todosPagamentos.forEach(p => {
            const data = new Date(p.dataPagamento);
            const chave = data.toLocaleDateString('pt-MZ', { month: 'short', year: 'numeric' });
            if (pagamentosPorMes[chave]) {
                pagamentosPorMes[chave].quantidade++;
                pagamentosPorMes[chave].valor += Number(p.valorPago);
            }
        });

        // Estatísticas de valor
        const valores = todosPagamentos.map(p => Number(p.valorPago));
        const mediaValor = valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
        const maxValor = valores.length > 0 ? Math.max(...valores) : 0;
        const minValor = valores.length > 0 ? Math.min(...valores) : 0;

        // Pagamentos recentes
        const pagamentosRecentes = todosPagamentos.slice(0, 10).map(p => ({
            id: p.pagamentoId,
            valor: this.formatarMoeda(Number(p.valorPago)),
            data: new Date(p.dataPagamento).toLocaleDateString('pt-MZ'),
            metodo: p.metodoPagamento,
            referencia: p.referenciaPagamento || 'N/A'
        }));

        return {
            sucesso: true,
            dataGeracao: new Date().toISOString(),
            resumoGeral: {
                totalPagamentos: todosPagamentos.length,
                valorTotal: this.formatarMoeda(totalRecebido),
                valorTotalNumerico: Number(totalRecebido.toFixed(2)),
                mediaPorPagamento: this.formatarMoeda(mediaValor),
                maiorPagamento: this.formatarMoeda(maxValor),
                menorPagamento: this.formatarMoeda(minValor)
            },
            porMetodoPagamento: Object.entries(porMetodo).map(([metodo, dados]) => ({
                metodo,
                quantidade: dados.quantidade,
                valor: this.formatarMoeda(dados.valor),
                valorNumerico: Number(dados.valor.toFixed(2)),
                percentual: `${((dados.valor / totalRecebido) * 100 || 0).toFixed(1)}%`
            })).sort((a, b) => b.valorNumerico - a.valorNumerico),
            evolucaoMensal: Object.entries(pagamentosPorMes).map(([mes, dados]) => ({
                mes,
                quantidade: dados.quantidade,
                valor: this.formatarMoeda(dados.valor),
                valorNumerico: Number(dados.valor.toFixed(2))
            })),
            pagamentosRecentes
        };
    }

    /**
     * ====================================================================
     * ANÁLISE DE CLIENTES - Segmentação e Comportamento
     * ====================================================================
     */
    async getAnaliseClientes() {
        const [todosClientes, todosEmprestimos, todosPagamentos] = await Promise.all([
            this.clienteRepository.find({ relations: ['localizacao'] }),
            this.emprestimoRepository.find(),
            this.pagamentoRepository.find()
        ]);

        const periodos = this.obterPeriodos();

        // Clientes por situação de empréstimo
        const clientesComEmprestimo = [...new Set(todosEmprestimos.map(e => e.clienteId))];
        const clientesAtivos = [...new Set(todosEmprestimos.filter(e => e.status === 'Ativo').map(e => e.clienteId))];
        const clientesInadimplentes = [...new Set(todosEmprestimos.filter(e => e.status === 'Inadimplente').map(e => e.clienteId))];
        const clientesEmDia = [...new Set(todosEmprestimos.filter(e => e.status === 'Pago').map(e => e.clienteId))];

        // Novos clientes por período
        const clientesNovos30Dias = todosClientes.filter(c =>
            new Date(c.dataCadastro) >= periodos.inicio30Dias
        );
        const clientesNovos90Dias = todosClientes.filter(c =>
            new Date(c.dataCadastro) >= periodos.inicio90Dias
        );

        // Por gênero
        const porGenero = {
            masculino: todosClientes.filter(c => c.sexo?.toLowerCase() === 'masculino' || c.sexo?.toLowerCase() === 'm'),
            feminino: todosClientes.filter(c => c.sexo?.toLowerCase() === 'feminino' || c.sexo?.toLowerCase() === 'f'),
            outro: todosClientes.filter(c => !['masculino', 'm', 'feminino', 'f'].includes(c.sexo?.toLowerCase() || ''))
        };

        // Por localização (província)
        const porProvincia: Record<string, number> = {};
        todosClientes.forEach(c => {
            const provincia = c.localizacao?.provincia || 'Não informada';
            porProvincia[provincia] = (porProvincia[provincia] || 0) + 1;
        });

        // Valor médio emprestado por cliente
        const valorPorCliente: Record<string, number> = {};
        todosEmprestimos.forEach(e => {
            valorPorCliente[e.clienteId] = (valorPorCliente[e.clienteId] || 0) + Number(e.valor);
        });
        const valoresClientes = Object.values(valorPorCliente);
        const mediaValorPorCliente = valoresClientes.length > 0
            ? valoresClientes.reduce((a, b) => a + b, 0) / valoresClientes.length
            : 0;

        // Top 10 clientes por valor emprestado
        const topClientes = Object.entries(valorPorCliente)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([clienteId, valor]) => {
                const cliente = todosClientes.find(c => c.clienteId === clienteId);
                return {
                    clienteId,
                    nome: cliente?.nome || 'N/A',
                    valorTotal: this.formatarMoeda(valor),
                    valorNumerico: Number(valor.toFixed(2))
                };
            });

        // Clientes recorrentes (mais de 1 empréstimo)
        const emprestimosPorCliente: Record<string, number> = {};
        todosEmprestimos.forEach(e => {
            emprestimosPorCliente[e.clienteId] = (emprestimosPorCliente[e.clienteId] || 0) + 1;
        });
        const clientesRecorrentes = Object.values(emprestimosPorCliente).filter(qtd => qtd > 1).length;
        const taxaRecorrencia = clientesComEmprestimo.length > 0
            ? (clientesRecorrentes / clientesComEmprestimo.length) * 100
            : 0;

        return {
            sucesso: true,
            dataGeracao: new Date().toISOString(),
            resumoGeral: {
                totalClientes: todosClientes.length,
                clientesComEmprestimo: clientesComEmprestimo.length,
                clientesSemEmprestimo: todosClientes.length - clientesComEmprestimo.length,
                mediaValorPorCliente: this.formatarMoeda(mediaValorPorCliente),
                taxaRecorrencia: `${taxaRecorrencia.toFixed(2)}%`
            },
            segmentacao: {
                porSituacao: {
                    ativos: clientesAtivos.length,
                    emDia: clientesEmDia.length,
                    inadimplentes: clientesInadimplentes.length
                },
                porGenero: {
                    masculino: {
                        quantidade: porGenero.masculino.length,
                        percentual: `${((porGenero.masculino.length / todosClientes.length) * 100 || 0).toFixed(1)}%`
                    },
                    feminino: {
                        quantidade: porGenero.feminino.length,
                        percentual: `${((porGenero.feminino.length / todosClientes.length) * 100 || 0).toFixed(1)}%`
                    }
                }
            },
            crescimento: {
                novosUltimos30Dias: clientesNovos30Dias.length,
                novosUltimos90Dias: clientesNovos90Dias.length,
                mediaNovosPorMes: Number((clientesNovos90Dias.length / 3).toFixed(1))
            },
            porRegiao: Object.entries(porProvincia)
                .map(([provincia, quantidade]) => ({
                    provincia,
                    quantidade,
                    percentual: `${((quantidade / todosClientes.length) * 100 || 0).toFixed(1)}%`
                }))
                .sort((a, b) => b.quantidade - a.quantidade),
            topClientes
        };
    }

    /**
     * ====================================================================
     * ANÁLISE DE RISCO E INADIMPLÊNCIA
     * ====================================================================
     */
    async getAnaliseRisco() {
        const [todosEmprestimos, todasPenalizacoes] = await Promise.all([
            this.emprestimoRepository.find({ relations: ['cliente'] }),
            this.penalizacaoRepository.find()
        ]);

        const periodos = this.obterPeriodos();

        // Empréstimos por situação de risco
        const emprestimosAtivos = todosEmprestimos.filter(e => e.status === 'Ativo');
        const emprestimosInadimplentes = todosEmprestimos.filter(e => e.status === 'Inadimplente');

        // Classificar por dias de atraso
        const emDia: typeof emprestimosAtivos = [];
        const atrasados1a7: typeof emprestimosAtivos = [];
        const atrasados8a30: typeof emprestimosAtivos = [];
        const atrasadosMais30: typeof emprestimosAtivos = [];

        emprestimosAtivos.forEach(e => {
            const diasAtraso = Math.floor((periodos.hoje.getTime() - new Date(e.dataVencimento).getTime()) / (1000 * 60 * 60 * 24));
            if (diasAtraso <= 0) {
                emDia.push(e);
            } else if (diasAtraso <= 7) {
                atrasados1a7.push(e);
            } else if (diasAtraso <= 30) {
                atrasados8a30.push(e);
            } else {
                atrasadosMais30.push(e);
            }
        });

        // Valor em risco por categoria
        const valorEmDia = emDia.reduce((sum, e) => sum + Number(e.valor), 0);
        const valorAtrasados1a7 = atrasados1a7.reduce((sum, e) => sum + Number(e.valor), 0);
        const valorAtrasados8a30 = atrasados8a30.reduce((sum, e) => sum + Number(e.valor), 0);
        const valorAtrasadosMais30 = atrasadosMais30.reduce((sum, e) => sum + Number(e.valor), 0);
        const valorInadimplentes = emprestimosInadimplentes.reduce((sum, e) => sum + Number(e.valor), 0);

        // Score de risco geral
        const totalAtivo = emprestimosAtivos.length + emprestimosInadimplentes.length;
        const pesoRisco = totalAtivo > 0
            ? ((atrasados1a7.length * 1) + (atrasados8a30.length * 2) + (atrasadosMais30.length * 3) + (emprestimosInadimplentes.length * 5)) / totalAtivo
            : 0;
        const scoreRisco = Math.min(100, pesoRisco * 20);
        const nivelRisco = scoreRisco < 20 ? 'BAIXO' : scoreRisco < 50 ? 'MODERADO' : scoreRisco < 75 ? 'ALTO' : 'CRITICO';

        // Penalizações por tipo
        const penalizacoesPorTipo: Record<string, { quantidade: number; valor: number }> = {};
        todasPenalizacoes.forEach(p => {
            const tipo = p.tipo || 'Outros';
            if (!penalizacoesPorTipo[tipo]) {
                penalizacoesPorTipo[tipo] = { quantidade: 0, valor: 0 };
            }
            penalizacoesPorTipo[tipo].quantidade++;
            penalizacoesPorTipo[tipo].valor += Number(p.valor);
        });

        // Clientes com mais penalizações
        const penalizacoesPorCliente: Record<string, number> = {};
        todasPenalizacoes.forEach(p => {
            penalizacoesPorCliente[p.clienteId] = (penalizacoesPorCliente[p.clienteId] || 0) + 1;
        });
        const clientesMaisPenalizados = Object.entries(penalizacoesPorCliente)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Provisão para devedores duvidosos (PDD)
        // Regra: 0-7 dias = 2%, 8-30 dias = 10%, >30 dias = 30%, Inadimplente = 100%
        const provisaoPDD =
            (valorAtrasados1a7 * 0.02) +
            (valorAtrasados8a30 * 0.10) +
            (valorAtrasadosMais30 * 0.30) +
            (valorInadimplentes * 1.00);

        return {
            sucesso: true,
            dataGeracao: new Date().toISOString(),
            indicadorRisco: {
                score: Number(scoreRisco.toFixed(1)),
                nivel: nivelRisco,
                descricao: `Índice de risco da carteira: ${nivelRisco}`
            },
            carteiraPorRisco: {
                emDia: {
                    quantidade: emDia.length,
                    valor: this.formatarMoeda(valorEmDia),
                    valorNumerico: Number(valorEmDia.toFixed(2)),
                    risco: 'BAIXO'
                },
                atrasados1a7Dias: {
                    quantidade: atrasados1a7.length,
                    valor: this.formatarMoeda(valorAtrasados1a7),
                    valorNumerico: Number(valorAtrasados1a7.toFixed(2)),
                    risco: 'MODERADO'
                },
                atrasados8a30Dias: {
                    quantidade: atrasados8a30.length,
                    valor: this.formatarMoeda(valorAtrasados8a30),
                    valorNumerico: Number(valorAtrasados8a30.toFixed(2)),
                    risco: 'ALTO'
                },
                atrasadosMaisDe30Dias: {
                    quantidade: atrasadosMais30.length,
                    valor: this.formatarMoeda(valorAtrasadosMais30),
                    valorNumerico: Number(valorAtrasadosMais30.toFixed(2)),
                    risco: 'MUITO_ALTO'
                },
                inadimplentes: {
                    quantidade: emprestimosInadimplentes.length,
                    valor: this.formatarMoeda(valorInadimplentes),
                    valorNumerico: Number(valorInadimplentes.toFixed(2)),
                    risco: 'CRITICO'
                }
            },
            provisaoDevedoresDuvidosos: {
                valorProvisionado: this.formatarMoeda(provisaoPDD),
                valorNumerico: Number(provisaoPDD.toFixed(2)),
                descricao: 'Valor estimado para cobertura de possíveis perdas'
            },
            penalizacoes: {
                total: todasPenalizacoes.length,
                valorTotal: this.formatarMoeda(todasPenalizacoes.reduce((sum, p) => sum + Number(p.valor), 0)),
                porTipo: Object.entries(penalizacoesPorTipo).map(([tipo, dados]) => ({
                    tipo,
                    quantidade: dados.quantidade,
                    valor: this.formatarMoeda(dados.valor)
                }))
            },
            alertasRisco: {
                clientesCriticos: clientesMaisPenalizados.length,
                acaoRecomendada: nivelRisco === 'CRITICO'
                    ? 'Ação imediata necessária: revisar políticas de concessão e intensificar cobrança'
                    : nivelRisco === 'ALTO'
                        ? 'Monitorar de perto e implementar ações preventivas de cobrança'
                        : nivelRisco === 'MODERADO'
                            ? 'Manter monitoramento regular e acompanhar atrasos'
                            : 'Situação controlada, manter práticas atuais'
            }
        };
    }

    /**
     * ====================================================================
     * PROJEÇÕES FINANCEIRAS
     * ====================================================================
     */
    async getProjecoesFinanceiras() {
        const [todosEmprestimos, todosPagamentos] = await Promise.all([
            this.emprestimoRepository.find(),
            this.pagamentoRepository.find()
        ]);

        const periodos = this.obterPeriodos();

        // Valores a receber (empréstimos ativos)
        const emprestimosAtivos = todosEmprestimos.filter(e => e.status === 'Ativo');
        const capitalAReceber = emprestimosAtivos.reduce((sum, e) => sum + Number(e.valor), 0);
        const encargosAReceber = capitalAReceber * 0.20;
        const totalAReceber = capitalAReceber + encargosAReceber;

        // Pagamentos previstos por vencimento
        const vencimentoEste_mes = emprestimosAtivos.filter(e =>
            new Date(e.dataVencimento) >= periodos.inicioMesAtual &&
            new Date(e.dataVencimento) <= periodos.fimMesAtual
        );
        const vencimentoProximoMes = emprestimosAtivos.filter(e => {
            const proximoMesInicio = new Date(periodos.hoje.getFullYear(), periodos.hoje.getMonth() + 1, 1);
            const proximoMesFim = new Date(periodos.hoje.getFullYear(), periodos.hoje.getMonth() + 2, 0);
            return new Date(e.dataVencimento) >= proximoMesInicio && new Date(e.dataVencimento) <= proximoMesFim;
        });

        // Média de arrecadação mensal (últimos 6 meses)
        const pagamentosUltimos6Meses = todosPagamentos.filter(p => {
            const data = new Date(p.dataPagamento);
            const seisMatrasInicio = new Date(periodos.hoje.getFullYear(), periodos.hoje.getMonth() - 6, 1);
            return data >= seisMatrasInicio;
        });
        const mediaArrecadacaoMensal = pagamentosUltimos6Meses.length > 0
            ? pagamentosUltimos6Meses.reduce((sum, p) => sum + Number(p.valorPago), 0) / 6
            : 0;

        // Projeção de arrecadação (próximos 3 meses)
        const projecaoMes1 = mediaArrecadacaoMensal * 1.0; // conservador
        const projecaoMes2 = mediaArrecadacaoMensal * 1.05; // leve crescimento
        const projecaoMes3 = mediaArrecadacaoMensal * 1.08; // crescimento moderado

        // Média de empréstimos concedidos por mês
        const emprestimosUltimos6Meses = todosEmprestimos.filter(e => {
            const data = new Date(e.dataEmprestimo);
            const seisMesesInicio = new Date(periodos.hoje.getFullYear(), periodos.hoje.getMonth() - 6, 1);
            return data >= seisMesesInicio;
        });
        const mediaEmprestimosMensal = emprestimosUltimos6Meses.length > 0
            ? emprestimosUltimos6Meses.reduce((sum, e) => sum + Number(e.valor), 0) / 6
            : 0;

        return {
            sucesso: true,
            dataGeracao: new Date().toISOString(),
            valoresAReceber: {
                capital: this.formatarMoeda(capitalAReceber),
                encargos: this.formatarMoeda(encargosAReceber),
                total: this.formatarMoeda(totalAReceber),
                capitalNumerico: Number(capitalAReceber.toFixed(2)),
                encargosNumerico: Number(encargosAReceber.toFixed(2)),
                totalNumerico: Number(totalAReceber.toFixed(2))
            },
            vencimentos: {
                esteMes: {
                    quantidade: vencimentoEste_mes.length,
                    valor: this.formatarMoeda(vencimentoEste_mes.reduce((sum, e) => sum + Number(e.valor) * 1.20, 0))
                },
                proximoMes: {
                    quantidade: vencimentoProximoMes.length,
                    valor: this.formatarMoeda(vencimentoProximoMes.reduce((sum, e) => sum + Number(e.valor) * 1.20, 0))
                }
            },
            projecaoArrecadacao: {
                mes1: {
                    periodo: new Date(periodos.hoje.getFullYear(), periodos.hoje.getMonth() + 1, 1)
                        .toLocaleDateString('pt-MZ', { month: 'long', year: 'numeric' }),
                    valorProjetado: this.formatarMoeda(projecaoMes1),
                    valorNumerico: Number(projecaoMes1.toFixed(2)),
                    cenario: 'conservador'
                },
                mes2: {
                    periodo: new Date(periodos.hoje.getFullYear(), periodos.hoje.getMonth() + 2, 1)
                        .toLocaleDateString('pt-MZ', { month: 'long', year: 'numeric' }),
                    valorProjetado: this.formatarMoeda(projecaoMes2),
                    valorNumerico: Number(projecaoMes2.toFixed(2)),
                    cenario: 'moderado'
                },
                mes3: {
                    periodo: new Date(periodos.hoje.getFullYear(), periodos.hoje.getMonth() + 3, 1)
                        .toLocaleDateString('pt-MZ', { month: 'long', year: 'numeric' }),
                    valorProjetado: this.formatarMoeda(projecaoMes3),
                    valorNumerico: Number(projecaoMes3.toFixed(2)),
                    cenario: 'otimista'
                }
            },
            mediasHistoricas: {
                arrecadacaoMensal: this.formatarMoeda(mediaArrecadacaoMensal),
                emprestimosMensal: this.formatarMoeda(mediaEmprestimosMensal)
            },
            observacoes: [
                'Projeções baseadas na média dos últimos 6 meses',
                'Valores sujeitos a variações de mercado e comportamento dos clientes',
                'Considerar provisão para inadimplência nas análises'
            ]
        };
    }

    /**
     * ====================================================================
     * RELATÓRIO EXECUTIVO CONSOLIDADO
     * ====================================================================
     */
    async getRelatorioExecutivo() {
        const [dashboard, emprestimos, pagamentos, clientes, risco, projecoes] = await Promise.all([
            this.getDashboardPrincipal(),
            this.getAnaliseEmprestimos(),
            this.getAnalisePagamentos(),
            this.getAnaliseClientes(),
            this.getAnaliseRisco(),
            this.getProjecoesFinanceiras()
        ]);

        return {
            sucesso: true,
            titulo: 'Relatório Executivo - Laços Microcrédito',
            dataGeracao: new Date().toISOString(),
            periodo: dashboard.periodo,
            resumoExecutivo: {
                kpis: dashboard.kpisPrincipais,
                desempenho: dashboard.desempenhoMensal,
                alertas: dashboard.alertas
            },
            analises: {
                emprestimos: {
                    resumo: emprestimos.resumoGeral,
                    porStatus: emprestimos.porStatus,
                    distribuicao: emprestimos.distribuicaoPorFaixa
                },
                pagamentos: {
                    resumo: pagamentos.resumoGeral,
                    porMetodo: pagamentos.porMetodoPagamento,
                    evolucao: pagamentos.evolucaoMensal
                },
                clientes: {
                    resumo: clientes.resumoGeral,
                    segmentacao: clientes.segmentacao,
                    crescimento: clientes.crescimento
                },
                risco: {
                    indicador: risco.indicadorRisco,
                    carteira: risco.carteiraPorRisco,
                    provisao: risco.provisaoDevedoresDuvidosos,
                    recomendacao: risco.alertasRisco.acaoRecomendada
                }
            },
            projecoes: {
                valoresAReceber: projecoes.valoresAReceber,
                arrecadacaoProjetada: projecoes.projecaoArrecadacao,
                mediasHistoricas: projecoes.mediasHistoricas
            },
            conclusoes: [
                `Taxa de inadimplência: ${dashboard.kpisPrincipais.taxaInadimplencia.valor} (${dashboard.kpisPrincipais.taxaInadimplencia.nivel})`,
                `Score de risco da carteira: ${risco.indicadorRisco.score} (${risco.indicadorRisco.nivel})`,
                `Taxa de recorrência de clientes: ${clientes.resumoGeral.taxaRecorrencia}`,
                `Previsão de arrecadação próximo mês: ${projecoes.projecaoArrecadacao.mes1.valorProjetado}`
            ]
        };
    }
}
