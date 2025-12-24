import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pagamento } from '../entities/pagamento.entity';
import { CreatePagamentoDto } from './dto/pagamento.dto';
import { Emprestimo } from '../entities/emprestimo.entity';
import { Penalizacao } from '../entities/penalizacao.entity';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { TipoNotificacao } from '../notificacoes/dto/notificacao.dto';
import { StatusPenalizacao } from '../penalizacoes/dto/penalizacao.dto';

@Injectable()
export class PagamentosService {
    constructor(
        @InjectRepository(Pagamento)
        private pagamentoRepository: Repository<Pagamento>,
        @InjectRepository(Emprestimo)
        private emprestimoRepository: Repository<Emprestimo>,
        @InjectRepository(Penalizacao)
        private penalizacaoRepository: Repository<Penalizacao>,
        private notificacoesService: NotificacoesService,
    ) { }

    async create(createPagamentoDto: CreatePagamentoDto) {
        const emprestimo = await this.emprestimoRepository.findOne({
            where: { emprestimoId: createPagamentoDto.emprestimoId },
            relations: ['cliente']
        });

        if (!emprestimo) throw new NotFoundException('Empréstimo não encontrado');
        if (emprestimo.status === 'Pago') throw new ConflictException('Este empréstimo já consta como Pago.');

        // 1. Definição dos Valores Base (Regra de 20% de lucro fixo)
        const valorPrincipalBase = Number(emprestimo.valor);
        const valorLucroFixo = valorPrincipalBase * 0.20;

        // 2. Buscar histórico para cálculos lógicos
        const todosPagamentos = await this.pagamentoRepository.find({ where: { emprestimoId: emprestimo.emprestimoId } });
        const totalPagoAnteriormente = todosPagamentos.reduce((sum, p) => sum + Number(p.valorPago), 0);
        const valorDestePagamento = Number(createPagamentoDto.valorPago);
        const totalPagoAcumulado = totalPagoAnteriormente + valorDestePagamento;

        // 3. Buscar todas as Penalizações ativas (Pendente ou Aplicada)
        const penalizacoesAtivas = await this.penalizacaoRepository.find({
            where: [
                { emprestimoId: emprestimo.emprestimoId, status: StatusPenalizacao.PENDENTE },
                { emprestimoId: emprestimo.emprestimoId, status: StatusPenalizacao.APLICADA }
            ],
            order: { dataAplicacao: 'ASC' }
        });

        const todasPenalizacoes = await this.penalizacaoRepository.find({
            where: { emprestimoId: emprestimo.emprestimoId }
        });
        const totalPenalizacoesHistorico = todasPenalizacoes
            .filter(p => p.status !== StatusPenalizacao.CANCELADA)
            .reduce((sum, p) => sum + Number(p.valor), 0);

        // 4. Ordem de Aplicação Lógica (Penalizações -> Lucro -> Capital)
        let valorParaAlocar = totalPagoAcumulado;

        // Alocação para Penalizações
        const totalAlocadoPenalizacoes = Math.min(valorParaAlocar, totalPenalizacoesHistorico);
        valorParaAlocar -= totalAlocadoPenalizacoes;

        // Alocação para Lucro
        const totalAlocadoLucro = Math.min(valorParaAlocar, valorLucroFixo);
        valorParaAlocar -= totalAlocadoLucro;

        // Alocação para Capital (Principal)
        const totalAlocadoPrincipal = Math.min(valorParaAlocar, valorPrincipalBase);
        valorParaAlocar -= totalAlocadoPrincipal;

        const saldoDevedorTotal = (totalPenalizacoesHistorico + valorLucroFixo + valorPrincipalBase) - totalPagoAcumulado;

        // 5. Atualizar Status das Penalizações no Banco (Efetivar pagamento das multas)
        // Usamos o saldo disponível deste pagamento específico para marcar quais multas foram liquidadas agora
        let saldoParaMultas = valorDestePagamento;
        // Precisamos considerar quanto das multas já foi pago anteriormente para saber por onde começar
        let multasJaPagasAnteriormente = totalPagoAnteriormente;
        // Na verdade, a lógica mais simples é: 
        // Se totalPagoAcumulado cobre uma multa, ela deve estar como 'Paga'.
        let acumuladoParaMultas = totalPagoAcumulado;
        for (const multa of penalizacoesAtivas) {
            const valorMulta = Number(multa.valor);
            if (acumuladoParaMultas >= valorMulta) {
                multa.status = 'Paga';
                multa.observacoes = (multa.observacoes || '') + ` | Liquidada em ${new Date().toISOString()}`;
                await this.penalizacaoRepository.save(multa);
                acumuladoParaMultas -= valorMulta;
            } else {
                // Multa parcialmente paga ou não paga - o sistema atual não suporta status 'Parcial'
                // Mas ela permanece como Pendente/Aplicada
                break;
            }
        }

        // 6. Registrar o Novo Pagamento (data gerada automaticamente pelo sistema)
        const novoPagamento = this.pagamentoRepository.create({
            ...createPagamentoDto,
            dataPagamento: new Date(), // Data/hora atual do sistema
        });
        await this.pagamentoRepository.save(novoPagamento);

        // 7. Determinar Novo Status do Empréstimo (Validação Rigorosa)
        let novoStatus = 'Ativo';
        const hoje = new Date();
        const temAtraso = emprestimo.dataVencimento < hoje;
        const temMultasPendentes = await this.penalizacaoRepository.count({
            where: [
                { emprestimoId: emprestimo.emprestimoId, status: StatusPenalizacao.PENDENTE },
                { emprestimoId: emprestimo.emprestimoId, status: StatusPenalizacao.APLICADA }
            ]
        });

        // "Pago → somente se não existir qualquer valor pendente"
        // Tolerância de 0.01 para arredondamentos
        if (saldoDevedorTotal <= 0.01 && temMultasPendentes === 0) {
            novoStatus = 'Pago';
        }
        // "Inadimplente → se existir atraso ou penalizações"
        else if (temAtraso || temMultasPendentes > 0) {
            novoStatus = 'Inadimplente';
        }
        // "Ativo → se ainda existir saldo, mas dentro do prazo"
        else {
            novoStatus = 'Ativo';
        }

        emprestimo.status = novoStatus;
        await this.emprestimoRepository.save(emprestimo);

        // 8. Calcular dias de atraso totais
        const diasAtrasoTotal = penalizacoesAtivas.length > 0
            ? Math.max(...penalizacoesAtivas.map(p => Number(p.diasAtraso) || 0))
            : 0;

        // 9. Notificações (Enviadas apenas após validação completa)
        await this.notificacoesService.create({
            clienteId: emprestimo.clienteId,
            tipo: TipoNotificacao.CONFIRMACAO_PAGAMENTO,
            mensagem: novoStatus === 'Pago'
                ? `Empréstimo #${emprestimo.emprestimoId} QUITADO com sucesso!`
                : `Recebemos seu pagamento de ${valorDestePagamento}. Saldo restante: ${saldoDevedorTotal.toFixed(2)}.`,
            status: 'Pendente'
        });

        // 10. Resposta Profissional Completa
        const valorTotalEmprestimo = valorPrincipalBase + valorLucroFixo;
        const valorTotalComPenalizacoes = valorTotalEmprestimo + totalPenalizacoesHistorico;
        const penalizacoesPendentesValor = totalPenalizacoesHistorico - totalAlocadoPenalizacoes;

        return {
            sucesso: true,
            mensagem: novoStatus === 'Pago'
                ? '✅ Empréstimo totalmente liquidado!'
                : '✅ Pagamento processado com sucesso.',

            // Dados do Pagamento
            pagamento: {
                id: novoPagamento.pagamentoId,
                valorPago: Number(valorDestePagamento).toFixed(2),
                dataPagamento: novoPagamento.dataPagamento,
                metodoPagamento: createPagamentoDto.metodoPagamento
            },

            // Resumo do Empréstimo
            emprestimo: {
                id: emprestimo.emprestimoId,
                clienteId: emprestimo.clienteId,
                status: novoStatus,
                dataVencimento: emprestimo.dataVencimento
            },

            // Resumo de Penalizações
            penalizacoes: {
                diasAtraso: diasAtrasoTotal,
                quantidadePenalizacoes: todasPenalizacoes.filter(p => p.status !== StatusPenalizacao.CANCELADA).length,
                valorTotalPenalizacoes: Number(totalPenalizacoesHistorico).toFixed(2),
                penalizacoesPagas: Number(totalAlocadoPenalizacoes).toFixed(2),
                penalizacoesPendentes: Number(Math.max(0, penalizacoesPendentesValor)).toFixed(2)
            },

            // Resumo Financeiro Detalhado
            resumoFinanceiro: {
                // Valores Base
                valorPrincipal: Number(valorPrincipalBase).toFixed(2),
                lucro20Porcento: Number(valorLucroFixo).toFixed(2),
                valorTotalEmprestimo: Number(valorTotalEmprestimo).toFixed(2),

                // Com Penalizações
                totalPenalizacoes: Number(totalPenalizacoesHistorico).toFixed(2),
                valorTotalDevido: Number(valorTotalComPenalizacoes).toFixed(2),

                // Pagamentos
                totalPagoAcumulado: Number(totalPagoAcumulado).toFixed(2),

                // Saldo
                saldoDevedor: Number(Math.max(0, saldoDevedorTotal)).toFixed(2)
            },

            // Alocação do Pagamento (Ordem: Penalizações → Lucro → Principal)
            alocacaoPagamento: {
                alocadoPenalizacoes: Number(totalAlocadoPenalizacoes).toFixed(2),
                alocadoLucro: Number(totalAlocadoLucro).toFixed(2),
                alocadoPrincipal: Number(totalAlocadoPrincipal).toFixed(2)
            },

            // Saldos Pendentes por Categoria
            saldosPendentes: {
                principalPendente: Number(Math.max(0, valorPrincipalBase - totalAlocadoPrincipal)).toFixed(2),
                lucroPendente: Number(Math.max(0, valorLucroFixo - totalAlocadoLucro)).toFixed(2),
                penalizacoesPendentes: Number(Math.max(0, penalizacoesPendentesValor)).toFixed(2)
            }
        };
    }

    async findAll() {
        return await this.pagamentoRepository.find({ relations: ['cliente', 'emprestimo'] });
    }

    async findOne(id: string) {
        const pagamento = await this.pagamentoRepository.findOne({
            where: { pagamentoId: id },
            relations: ['cliente', 'emprestimo'],
        });
        if (!pagamento) throw new NotFoundException('Pagamento não encontrado');
        return pagamento;
    }

    async findByCliente(clienteId: string) {
        return await this.pagamentoRepository.find({
            where: { clienteId },
            relations: ['emprestimo'],
            order: { dataPagamento: 'DESC' }
        });
    }

    async findByEmprestimo(emprestimoId: string) {
        return await this.pagamentoRepository.find({
            where: { emprestimoId },
            order: { dataPagamento: 'DESC' }
        });
    }
}
