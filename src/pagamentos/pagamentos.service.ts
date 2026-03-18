import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Pagamento } from '../entities/pagamento.entity';
import { CreatePagamentoDto } from './dto/pagamento.dto';
import { RegistrarPagamentoDiarioDto } from './dto/pagamento-diario.dto';
import { Emprestimo } from '../entities/emprestimo.entity';
import { Penalizacao } from '../entities/penalizacao.entity';
import { PlanoPagamentoDiario } from '../entities/plano-pagamento-diario.entity';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { TipoNotificacao } from '../notificacoes/dto/notificacao.dto';
import { StatusPenalizacao } from '../penalizacoes/dto/penalizacao.dto';

@Injectable()
export class PagamentosService {
    private readonly TAXA_JUROS = 0.20;

    constructor(
        @InjectRepository(Pagamento)
        private paymentRepo: Repository<Pagamento>,
        @InjectRepository(Emprestimo)
        private loanRepo: Repository<Emprestimo>,
        @InjectRepository(Penalizacao)
        private penaltyRepo: Repository<Penalizacao>,
        @InjectRepository(PlanoPagamentoDiario)
        private dailyPlanRepo: Repository<PlanoPagamentoDiario>,
        private notificacoesService: NotificacoesService,
        private dataSource: DataSource,
    ) { }

    private gerarReferenciaAleatoria(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        const timestamp = Date.now().toString().slice(-4);
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `LACM-${result}${timestamp}`;
    }

    async registrarPagamentoDiario(dto: RegistrarPagamentoDiarioDto) {
        return await this.dataSource.transaction(async (manager) => {
            const DATA_REGISTRO = new Date();
            const VALOR_REGISTRO = Number(dto.valorPago);

            const emprestimo = await manager.findOne(Emprestimo, { where: { emprestimoId: dto.emprestimoId } });
            if (!emprestimo) throw new NotFoundException('Empréstimo não encontrado');
            if (emprestimo.status === 'Pago') throw new ConflictException('Este empréstimo já foi totalmente pago');

            const { saldoDevedor, valorTotalComPenalizacoes, totalJaPago } = await this.calcularTotais(manager, emprestimo.emprestimoId, Number(emprestimo.valor));

            if (saldoDevedor <= 0) throw new ConflictException('Empréstimo já está totalmente pago');

            const dataVencimento = new Date(emprestimo.dataVencimento);
            const diasRestantes = Math.ceil((dataVencimento.getTime() - DATA_REGISTRO.getTime()) / (1000 * 60 * 60 * 24));

            const diasRestantesTratado = Math.max(1, diasRestantes);
            const novoSaldoEstimadoFuturo = Math.max(0, saldoDevedor - VALOR_REGISTRO);

            const valorDiarioRecalculado = novoSaldoEstimadoFuturo / diasRestantesTratado;

            const novoPlano = manager.create(PlanoPagamentoDiario, {
                emprestimoId: emprestimo.emprestimoId,
                dataReferencia: DATA_REGISTRO,
                valorPrevisto: valorDiarioRecalculado,
                valorPago: VALOR_REGISTRO,
                status: 'Pago',
                dataCalculo: DATA_REGISTRO
            });
            await manager.save(novoPlano);

            const novoPagamento = manager.create(Pagamento, {
                emprestimoId: emprestimo.emprestimoId,
                clienteId: emprestimo.clienteId,
                valorPago: VALOR_REGISTRO,
                dataPagamento: DATA_REGISTRO,
                metodoPagamento: dto.metodoPagamento || 'Pagamento Diário',
                referenciaPagamento: dto.referenciaPagamento || this.gerarReferenciaAleatoria()
            });
            await manager.save(novoPagamento);

            const novoSaldoDevedor = saldoDevedor - VALOR_REGISTRO;
            const statusAtualizado = await this.atualizarStatusEmprestimo(manager, emprestimo, novoSaldoDevedor, VALOR_REGISTRO);

            return {
                sucesso: true,
                mensagem: statusAtualizado === 'Pago' ? '✅ Empréstimo quitado!' : '✅ Pagamento diário registrado.',
                pagamento: {
                    id: novoPlano.planoId,
                    referencia: novoPagamento.referenciaPagamento,
                    valor: VALOR_REGISTRO,
                    data: DATA_REGISTRO
                },
                saldoDevedor: Number(novoSaldoDevedor.toFixed(2))
            };
        });
    }

    private calcularDiasTotais(emprestimo: Emprestimo): number {
        const dataInicio = new Date(emprestimo.dataEmprestimo);
        const dataVencimento = new Date(emprestimo.dataVencimento);
        return Math.ceil((dataVencimento.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
    }

    async obterCalendarioFinanceiro(emprestimoId: string) {
        try {
            const emprestimo = await this.loanRepo.findOne({ where: { emprestimoId } });
            if (!emprestimo) throw new NotFoundException('Empréstimo não encontrado');

            if (!emprestimo.dataEmprestimo || !emprestimo.dataVencimento) {
                throw new BadRequestException('Datas do empréstimo inválidas.');
            }

            const { saldoDevedor, totalJaPago, valorTotalComPenalizacoes } = await (this.dataSource.transaction(m => this.calcularTotais(m, emprestimoId, Number(emprestimo.valor))));

            const todosPagamentos = await this.paymentRepo.find({
                where: { emprestimoId },
                order: { dataPagamento: 'ASC' }
            });

            const calendario = [];
            const dataInicio = new Date(emprestimo.dataEmprestimo);
            const dataVencimento = new Date(emprestimo.dataVencimento);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            if (isNaN(dataInicio.getTime()) || isNaN(dataVencimento.getTime())) {
                throw new BadRequestException('Datas inválidas no banco.');
            }

            const pagamentosMap = new Map();
            todosPagamentos.forEach(p => {
                const d = new Date(p.dataPagamento).toISOString().split('T')[0];
                const current = pagamentosMap.get(d) || { valorPago: 0 };
                current.valorPago += Number(p.valorPago);
                pagamentosMap.set(d, current);
            });

            let currentDate = new Date(dataInicio);
            let safety = 0;

            let diasRestantesHoje = 0;
            let tempD = new Date(hoje < dataInicio ? dataInicio : hoje);
            while (tempD <= dataVencimento) { diasRestantesHoje++; tempD.setDate(tempD.getDate() + 1); }
            if (diasRestantesHoje <= 0) diasRestantesHoje = 1;
            const valorSugerido = saldoDevedor > 0 ? (saldoDevedor / diasRestantesHoje) : 0;

            while (currentDate <= dataVencimento && safety < 730) {
                safety++;
                const dateStr = currentDate.toISOString().split('T')[0];
                const info = pagamentosMap.get(dateStr);
                const isPast = currentDate < hoje;
                const isToday = currentDate.getTime() === hoje.getTime();

                let diaInfo = {
                    data: dateStr,
                    status: 'FUTURO',
                    valor: Number(valorSugerido.toFixed(2))
                };

                if (info && info.valorPago > 0) {
                    diaInfo.status = 'PAGO';
                    diaInfo.valor = info.valorPago;

                } else if (isPast) {
                    diaInfo.status = 'SEM PAGAMENTO';
                    diaInfo.valor = 0;

                } else if (isToday) {
                    diaInfo.status = 'HOJE';

                }

                if (saldoDevedor < 1 && !isPast && (!info || info.valorPago === 0)) {
                    diaInfo.status = 'QUITADO';
                    diaInfo.valor = 0;

                }

                calendario.push(diaInfo);
                currentDate.setDate(currentDate.getDate() + 1);
            }

            return {
                sucesso: true,
                resumo: {
                    saldoDevedor: Number(saldoDevedor.toFixed(2)),
                    percentualPago: ((totalJaPago / valorTotalComPenalizacoes) * 100).toFixed(1) + '%'
                },
                calendario
            };

        } catch (error) {
            throw new BadRequestException("Erro ao gerar calendário: " + error.message);
        }
    }

    private async calcularTotais(manager: EntityManager, emprestimoId: string, valorPrincipal: number) {

        const totalPagoGeral = await manager
            .createQueryBuilder(Pagamento, 'p')
            .where('p.emprestimoId = :id', { id: emprestimoId })
            .select('SUM(p.valorPago)', 'soma')
            .getRawOne();

        const totalJaPago = Number(totalPagoGeral?.soma || 0);

        const penalizacoes = await manager.find(Penalizacao, { where: { emprestimoId } });
        const totalPenalizacoes = penalizacoes
            .filter(p => [StatusPenalizacao.PENDENTE, StatusPenalizacao.APLICADA].includes(p.status as any))
            .reduce((sum, p) => sum + Number(p.valor), 0);

        const valorLucro = valorPrincipal * this.TAXA_JUROS;
        const valorTotalOriginal = valorPrincipal + valorLucro;
        const valorTotalComPenalizacoes = valorTotalOriginal + totalPenalizacoes;

        const saldoDevedor = valorTotalComPenalizacoes - totalJaPago;

        return {
            valorTotalOriginal,
            totalPenalizacoes,
            valorTotalComPenalizacoes,
            totalJaPago,
            saldoDevedor: saldoDevedor < 0 ? 0 : saldoDevedor
        };
    }

    private async atualizarStatusEmprestimo(manager: EntityManager, emprestimo: Emprestimo, novoSaldoDevedor: number, valorPago: number): Promise<string> {
        let novoStatus = 'Ativo';

        if (novoSaldoDevedor <= 1) {
            novoStatus = 'Pago';

            await manager.createQueryBuilder()
                .update(Penalizacao)
                .set({ status: StatusPenalizacao.PAGA })
                .where("emprestimoId = :id AND status IN (:...status)", {
                    id: emprestimo.emprestimoId,
                    status: [StatusPenalizacao.PENDENTE, StatusPenalizacao.APLICADA]
                })
                .execute();

        } else if (new Date(emprestimo.dataVencimento) < new Date()) {
            novoStatus = 'Inadimplente';
        }

        if (emprestimo.status !== novoStatus) {
            emprestimo.status = novoStatus;
            await manager.save(emprestimo);
        }

        const msg = novoStatus === 'Pago'
            ? `🎉 Recebemos ${valorPago.toLocaleString()} MZN. Empréstimo #${emprestimo.emprestimoId} totalmente quitado!`
            : `Pagamento de ${valorPago.toLocaleString()} MZN processado com sucesso. Saldo restante: ${novoSaldoDevedor.toFixed(2)} MZN`;

        await this.notificacoesService.create({
            clienteId: emprestimo.clienteId,
            tipo: TipoNotificacao.CONFIRMACAO_PAGAMENTO,
            mensagem: msg,
            status: 'Pendente'
        });

        return novoStatus;
    }

    async findAll() {
        return await this.paymentRepo.find({ relations: ['cliente', 'emprestimo'] });
    }

    async findOne(id: string) {
        const pagamento = await this.paymentRepo.findOne({
            where: { pagamentoId: id },
            relations: ['cliente', 'emprestimo'],
        });
        if (!pagamento) throw new NotFoundException('Pagamento não encontrado');
        return pagamento;
    }

    async findByCliente(clienteId: string) {
        return await this.paymentRepo.find({
            where: { clienteId },
            relations: ['emprestimo'],
            order: { dataPagamento: 'DESC' }
        });
    }

    async findByEmprestimo(emprestimoId: string) {
        return await this.paymentRepo.find({
            where: { emprestimoId },
            relations: ['cliente', 'emprestimo'],
            order: { dataPagamento: 'DESC' }
        });
    }

    async remove(id: string) {
        const pagamento = await this.findOne(id);
        await this.paymentRepo.remove(pagamento);
        return { message: 'Pagamento removido com sucesso' };
    }
}
