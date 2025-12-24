import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Dashboard Empresarial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get()
    @ApiOperation({
        summary: 'Dashboard Principal - Visão Geral Executiva',
        description: `
Retorna os principais KPIs e métricas empresariais da Laços Microcrédito.

**Métricas Incluídas:**
- Total de clientes e clientes ativos
- Capital emprestado e recebido
- Lucro realizado (20% sobre empréstimos quitados)
- Taxa de inadimplência
- Penalizações pendentes
- Desempenho mensal com comparativo ao mês anterior
- Alertas de empréstimos a vencer e vencidos

**Uso Recomendado:**
- Reuniões executivas
- Acompanhamento diário de performance
- Tomada de decisões estratégicas
        `
    })
    @ApiResponse({
        status: 200,
        description: 'Dashboard principal retornado com sucesso',
        schema: {
            type: 'object',
            properties: {
                sucesso: { type: 'boolean', example: true },
                dataGeracao: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
                empresa: { type: 'string', example: 'Laços Microcrédito' },
                kpisPrincipais: { type: 'object' },
                desempenhoMensal: { type: 'object' },
                alertas: { type: 'object' }
            }
        }
    })
    async getDashboardPrincipal() {
        return this.dashboardService.getDashboardPrincipal();
    }

    @Get('emprestimos')
    @ApiOperation({
        summary: 'Análise de Empréstimos - Estatísticas Detalhadas',
        description: `
Análise completa da carteira de empréstimos.

**Métricas Incluídas:**
- Distribuição por status (Ativos, Pagos, Inadimplentes)
- Estatísticas de valor (média, máximo, mínimo)
- Evolução por período (7, 30, 90 dias)
- Distribuição por faixa de valor
- Taxa de conversão (empréstimos quitados)
- Tempo médio para pagamento

**Uso Recomendado:**
- Análise de performance da carteira
- Identificação de padrões de crédito
- Planejamento de ofertas
        `
    })
    @ApiResponse({
        status: 200,
        description: 'Análise de empréstimos retornada com sucesso',
        schema: {
            type: 'object',
            properties: {
                sucesso: { type: 'boolean', example: true },
                resumoGeral: { type: 'object' },
                porStatus: { type: 'object' },
                estatisticasValor: { type: 'object' },
                porPeriodo: { type: 'object' },
                distribuicaoPorFaixa: { type: 'object' }
            }
        }
    })
    async getAnaliseEmprestimos() {
        return this.dashboardService.getAnaliseEmprestimos();
    }

    @Get('pagamentos')
    @ApiOperation({
        summary: 'Análise de Pagamentos - Fluxo de Caixa',
        description: `
Análise completa do fluxo de pagamentos recebidos.

**Métricas Incluídas:**
- Total recebido e média por pagamento
- Distribuição por método de pagamento
- Evolução mensal (últimos 6 meses)
- Pagamentos recentes

**Uso Recomendado:**
- Gestão de fluxo de caixa
- Análise de preferências de pagamento
- Reconciliação financeira
        `
    })
    @ApiResponse({
        status: 200,
        description: 'Análise de pagamentos retornada com sucesso',
        schema: {
            type: 'object',
            properties: {
                sucesso: { type: 'boolean', example: true },
                resumoGeral: { type: 'object' },
                porMetodoPagamento: { type: 'array' },
                evolucaoMensal: { type: 'array' },
                pagamentosRecentes: { type: 'array' }
            }
        }
    })
    async getAnalisePagamentos() {
        return this.dashboardService.getAnalisePagamentos();
    }

    @Get('clientes')
    @ApiOperation({
        summary: 'Análise de Clientes - Segmentação e Comportamento',
        description: `
Análise detalhada da base de clientes.

**Métricas Incluídas:**
- Total de clientes e segmentação por situação
- Distribuição por gênero
- Crescimento da base (novos clientes)
- Distribuição geográfica por província
- Top 10 clientes por valor emprestado
- Taxa de recorrência

**Uso Recomendado:**
- Marketing e campanhas segmentadas
- Estratégias de fidelização
- Expansão geográfica
        `
    })
    @ApiResponse({
        status: 200,
        description: 'Análise de clientes retornada com sucesso',
        schema: {
            type: 'object',
            properties: {
                sucesso: { type: 'boolean', example: true },
                resumoGeral: { type: 'object' },
                segmentacao: { type: 'object' },
                crescimento: { type: 'object' },
                porRegiao: { type: 'array' },
                topClientes: { type: 'array' }
            }
        }
    })
    async getAnaliseClientes() {
        return this.dashboardService.getAnaliseClientes();
    }

    @Get('risco')
    @ApiOperation({
        summary: 'Análise de Risco e Inadimplência',
        description: `
Análise de risco da carteira de crédito.

**Métricas Incluídas:**
- Score de risco geral (0-100)
- Carteira classificada por nível de risco
- Classificação por dias de atraso
- Provisão para Devedores Duvidosos (PDD)
- Análise de penalizações
- Recomendações de ação

**Níveis de Risco:**
- BAIXO: < 20 pontos
- MODERADO: 20-50 pontos
- ALTO: 50-75 pontos
- CRÍTICO: > 75 pontos

**Uso Recomendado:**
- Gestão de risco de crédito
- Definição de políticas de cobrança
- Provisionamento contábil
        `
    })
    @ApiResponse({
        status: 200,
        description: 'Análise de risco retornada com sucesso',
        schema: {
            type: 'object',
            properties: {
                sucesso: { type: 'boolean', example: true },
                indicadorRisco: { type: 'object' },
                carteiraPorRisco: { type: 'object' },
                provisaoDevedoresDuvidosos: { type: 'object' },
                penalizacoes: { type: 'object' },
                alertasRisco: { type: 'object' }
            }
        }
    })
    async getAnaliseRisco() {
        return this.dashboardService.getAnaliseRisco();
    }

    @Get('projecoes')
    @ApiOperation({
        summary: 'Projeções Financeiras',
        description: `
Projeções e previsões financeiras para planejamento.

**Métricas Incluídas:**
- Valores a receber (capital + encargos)
- Vencimentos previstos (este mês e próximo)
- Projeção de arrecadação (3 meses)
- Médias históricas de arrecadação e empréstimos

**Cenários de Projeção:**
- Conservador: mantém média atual
- Moderado: crescimento de 5%
- Otimista: crescimento de 8%

**Uso Recomendado:**
- Planejamento financeiro
- Gestão de capital de giro
- Previsão de fluxo de caixa
        `
    })
    @ApiResponse({
        status: 200,
        description: 'Projeções financeiras retornadas com sucesso',
        schema: {
            type: 'object',
            properties: {
                sucesso: { type: 'boolean', example: true },
                valoresAReceber: { type: 'object' },
                vencimentos: { type: 'object' },
                projecaoArrecadacao: { type: 'object' },
                mediasHistoricas: { type: 'object' },
                observacoes: { type: 'array' }
            }
        }
    })
    async getProjecoesFinanceiras() {
        return this.dashboardService.getProjecoesFinanceiras();
    }

    @Get('executivo')
    @ApiOperation({
        summary: 'Relatório Executivo Consolidado',
        description: `
Relatório executivo completo com todas as análises consolidadas.

**Seções Incluídas:**
- Resumo executivo com KPIs principais
- Análise de empréstimos
- Análise de pagamentos
- Análise de clientes
- Análise de risco
- Projeções financeiras
- Conclusões e recomendações

**Ideal Para:**
- Reuniões de diretoria
- Apresentações a investidores
- Relatórios mensais/trimestrais
- Tomada de decisões estratégicas

**Nota:** Este endpoint consolida todos os outros dashboards em um único relatório.
        `
    })
    @ApiResponse({
        status: 200,
        description: 'Relatório executivo retornado com sucesso',
        schema: {
            type: 'object',
            properties: {
                sucesso: { type: 'boolean', example: true },
                titulo: { type: 'string', example: 'Relatório Executivo - Laços Microcrédito' },
                dataGeracao: { type: 'string' },
                resumoExecutivo: { type: 'object' },
                analises: { type: 'object' },
                projecoes: { type: 'object' },
                conclusoes: { type: 'array' }
            }
        }
    })
    async getRelatorioExecutivo() {
        return this.dashboardService.getRelatorioExecutivo();
    }

    @Get('kpis')
    @ApiOperation({
        summary: 'KPIs Rápidos - Indicadores Chave',
        description: `
Retorna apenas os KPIs principais de forma simplificada.
Ideal para visualizações rápidas e integrações.

**KPIs Incluídos:**
- Total de clientes
- Capital emprestado
- Capital recebido
- Lucro realizado
- Taxa de inadimplência
- Penalizações pendentes
        `
    })
    @ApiResponse({
        status: 200,
        description: 'KPIs retornados com sucesso'
    })
    async getKPIsRapidos() {
        const dashboard = await this.dashboardService.getDashboardPrincipal();
        return {
            sucesso: true,
            dataGeracao: dashboard.dataGeracao,
            kpis: dashboard.kpisPrincipais
        };
    }

    @Get('alertas')
    @ApiOperation({
        summary: 'Alertas e Notificações',
        description: `
Retorna apenas os alertas ativos que requerem atenção.

**Alertas Monitorados:**
- Empréstimos a vencer nos próximos 7 dias
- Empréstimos vencidos não pagos
- Nível de risco da carteira

**Prioridades:**
- CRÍTICA: Ação imediata necessária
- ALTA: Atenção urgente
- MÉDIA: Monitorar de perto
- BAIXA: Situação sob controle
        `
    })
    @ApiResponse({
        status: 200,
        description: 'Alertas retornados com sucesso'
    })
    async getAlertas() {
        const [dashboard, risco] = await Promise.all([
            this.dashboardService.getDashboardPrincipal(),
            this.dashboardService.getAnaliseRisco()
        ]);

        return {
            sucesso: true,
            dataGeracao: new Date().toISOString(),
            resumo: {
                totalAlertas:
                    (dashboard.alertas.emprestimosAVencer.quantidade > 0 ? 1 : 0) +
                    (dashboard.alertas.emprestimosVencidos.quantidade > 0 ? 1 : 0) +
                    (risco.indicadorRisco.nivel === 'CRITICO' || risco.indicadorRisco.nivel === 'ALTO' ? 1 : 0),
                prioridadeMaisAlta:
                    dashboard.alertas.emprestimosVencidos.quantidade > 0 ? 'CRITICA' :
                        risco.indicadorRisco.nivel === 'CRITICO' ? 'CRITICA' :
                            dashboard.alertas.emprestimosAVencer.quantidade > 5 ? 'ALTA' :
                                risco.indicadorRisco.nivel === 'ALTO' ? 'ALTA' : 'MEDIA'
            },
            alertas: {
                emprestimosAVencer: dashboard.alertas.emprestimosAVencer,
                emprestimosVencidos: dashboard.alertas.emprestimosVencidos,
                indicadorRisco: risco.indicadorRisco,
                recomendacao: risco.alertasRisco.acaoRecomendada
            }
        };
    }
}
