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
        private paymentRepo: Repository<Pagamento>, // Renamed for clarity internally, or keep same
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
        const timestamp = Date.now().toString().slice(-4); // Últimos 4 dígitos para unicidade temporal
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `LACM-${result}${timestamp}`;
    }

    /**
     * ========================================================================
     * PAGAMENTO DIÁRIO COM RECALCULAÇÃO AUTOMÁTICA
     * ========================================================================
     */
    /**
     * ========================================================================
     * PAGAMENTO DIÁRIO COM RECALCULAÇÃO AUTOMÁTICA (Transactional)
     * ========================================================================
     */
    async registrarPagamentoDiario(dto: RegistrarPagamentoDiarioDto) {
        return await this.dataSource.transaction(async (manager) => {
            const DATA_REGISTRO = new Date();
            const VALOR_REGISTRO = Number(dto.valorPago);

            // 1. Validar Empréstimo
            const emprestimo = await manager.findOne(Emprestimo, { where: { emprestimoId: dto.emprestimoId } });
            if (!emprestimo) throw new NotFoundException('Empréstimo não encontrado');
            if (emprestimo.status === 'Pago') throw new ConflictException('Este empréstimo já foi totalmente pago');

            // 2. Calcular Saldos e Validar
            const { saldoDevedor, valorTotalComPenalizacoes, totalJaPago } = await this.calcularTotais(manager, emprestimo.emprestimoId, Number(emprestimo.valor));

            if (saldoDevedor <= 0) throw new ConflictException('Empréstimo já está totalmente pago');

            // 3. Validar Datas (Lógica de Negócio Específica do Diário)
            const dataVencimento = new Date(emprestimo.dataVencimento);
            const diasRestantes = Math.ceil((dataVencimento.getTime() - DATA_REGISTRO.getTime()) / (1000 * 60 * 60 * 24));

            if (diasRestantes < 0) {
                // Permite o pagamento mas avisa? Ou bloqueia como no original? 
                // Original: throw BadRequestException. Mantendo lógica original.
                throw new BadRequestException('A data de vencimento já passou. Use o sistema de pagamento regular ou renegociação.');
            }

            // Recalculo informativo (Lógica de Negócio)
            const valorDiarioRecalculado = diasRestantes > 0 ? ((saldoDevedor - VALOR_REGISTRO) / diasRestantes) : 0;

            // 4. REGISTRO (Atomicidade via Transaction Manager)

            // A. Plano Diário
            const novoPlano = manager.create(PlanoPagamentoDiario, {
                emprestimoId: emprestimo.emprestimoId,
                dataReferencia: DATA_REGISTRO,
                valorPrevisto: valorDiarioRecalculado, // Sugestão para o PRÓXIMO pagamento
                valorPago: VALOR_REGISTRO,
                status: 'Pago',
                dataCalculo: DATA_REGISTRO
            });
            await manager.save(novoPlano);

            // B. Pagamento Geral
            const novoPagamento = manager.create(Pagamento, {
                emprestimoId: emprestimo.emprestimoId,
                clienteId: emprestimo.clienteId,
                valorPago: VALOR_REGISTRO,
                dataPagamento: DATA_REGISTRO,
                metodoPagamento: dto.metodoPagamento || 'Pagamento Diário',
                referenciaPagamento: this.gerarReferenciaAleatoria()
            });
            await manager.save(novoPagamento);

            // 5. Atualizar Status do Empréstimo
            const novoSaldoDevedor = saldoDevedor - VALOR_REGISTRO;
            const statusAtualizado = await this.atualizarStatusEmprestimo(manager, emprestimo, novoSaldoDevedor);

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

            // Simulação local sem transaction para leitura de calendario? 
            // O ideal seria usar o helper, mas ele pede EntityManager.
            // Para leitura, podemos usar um gerenciador simples ou criar um on-the-fly.
            // Mas calcularTotais é privado. Vamos usar uma transaction readonly implicita aqui ou injetar o manager do repo?
            // Vamos usar o dataSource.manager para leitura direta.
            // Update: A linha acima ja chama transaction so pra usar o helper que pede manager. É pouco performatico mas funciona.
            // Melhor: fazer overload do helper? Nao, mantenha simples.

            // Mas espere, obterCalendarioFinanceiro não deveria escrever nada, então transaction aqui é só pro helper funcionar.
            // Tudo bem.

            // A seguir, precisamos dos pagamentos individuais para mapear.
            // Podemos usar this.paymentRepo.find
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

            // Calcular pagamentos por dia para o calendário
            const pagamentosMap = new Map();
            todosPagamentos.forEach(p => {
                const d = new Date(p.dataPagamento).toISOString().split('T')[0];
                const current = pagamentosMap.get(d) || { valorPago: 0 };
                current.valorPago += Number(p.valorPago);
                pagamentosMap.set(d, current);
            });

            // Gerar dias
            let currentDate = new Date(dataInicio);
            let safety = 0;

            // Recalculo dinâmico de valor sugerido para dias futuros
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
                    // diaInfo.cor = 'verde'; // REMOVIDO: UI Logic no Frontend
                } else if (isPast) {
                    diaInfo.status = 'SEM PAGAMENTO';
                    diaInfo.valor = 0;
                    // diaInfo.cor = 'vermelho';
                } else if (isToday) {
                    diaInfo.status = 'HOJE';
                    // diaInfo.cor = 'azul';
                }

                if (saldoDevedor < 1 && !isPast && (!info || info.valorPago === 0)) {
                    diaInfo.status = 'QUITADO';
                    diaInfo.valor = 0;
                    // diaInfo.cor = 'verde-claro';
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

    /**
     * ========================================================================
     * PAGAMENTO NORMAL (Endpoint Genérico)
     * ========================================================================
     */
    async create(createPagamentoDto: CreatePagamentoDto) {
        return await this.dataSource.transaction(async (manager) => {
            const DATA_REGISTRO = new Date();
            const VALOR_REGISTRO = Number(createPagamentoDto.valorPago);

            const emprestimo = await manager.findOne(Emprestimo, {
                where: { emprestimoId: createPagamentoDto.emprestimoId },
                relations: ['cliente']
            });

            if (!emprestimo) throw new NotFoundException('Empréstimo não encontrado');
            if (emprestimo.status === 'Pago') throw new ConflictException('Empréstimo já pago.');

            // A. Tabela Principal
            const novoPagamento = manager.create(Pagamento, {
                ...createPagamentoDto,
                dataPagamento: DATA_REGISTRO,
                valorPago: VALOR_REGISTRO,
                referenciaPagamento: this.gerarReferenciaAleatoria()
            });
            await manager.save(novoPagamento);

            // B. Tabela Calendário (Plano Diário) - Sincronização
            const planoSync = manager.create(PlanoPagamentoDiario, {
                emprestimoId: emprestimo.emprestimoId,
                dataReferencia: DATA_REGISTRO,
                valorPrevisto: 0,
                valorPago: VALOR_REGISTRO,
                status: 'Pago',
                dataCalculo: DATA_REGISTRO
            });
            await manager.save(planoSync);

            // C. Atualizar Status
            const { saldoDevedor } = await this.calcularTotais(manager, emprestimo.emprestimoId, Number(emprestimo.valor));
            const novoSaldo = saldoDevedor; // Já considera o que acabamos de salvar se calcularTotais olhar para o DB, CUIDADO!
            // transaction isolation level pode esconder o dado nao commitado, mas dentro do mesmo manager ele deveria ver?
            // TypeORM em transactions geralmente vê updates feitos pelo mesmo manager.
            // Mas `calcularTotais` faz query na tabela Pagamento. Se acabamos de salvar `novoPagamento`, ele DEVE aparecer.

            const statusAtualizado = await this.atualizarStatusEmprestimo(manager, emprestimo, novoSaldo);

            return {
                sucesso: true,
                mensagem: statusAtualizado === 'Pago' ? '✅ Quitado!' : '✅ Pagamento registrado.',
                pagamento: {
                    id: novoPagamento.pagamentoId,
                    referencia: novoPagamento.referenciaPagamento,
                    valor: VALOR_REGISTRO
                },
                saldoRestante: novoSaldo.toFixed(2)
            };
        });
    }

    // --- HELPER METHODS (Private) ---

    private async calcularTotais(manager: EntityManager, emprestimoId: string, valorPrincipal: number) {
        // Usa o manager da transação para garantir consistência
        const totalPagoGeral = await manager
            .createQueryBuilder(Pagamento, 'p')
            .where('p.emprestimoId = :id', { id: emprestimoId })
            .select('SUM(p.valorPago)', 'soma')
            .getRawOne();

        const totalJaPago = Number(totalPagoGeral?.soma || 0);

        const penalizacoes = await manager.find(Penalizacao, { where: { emprestimoId } });
        const totalPenalizacoes = penalizacoes
            .filter(p => [StatusPenalizacao.PENDENTE, StatusPenalizacao.APLICADA].includes(p.status as any)) // Cast rapido se Enum nao transpirar
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

    private async atualizarStatusEmprestimo(manager: EntityManager, emprestimo: Emprestimo, novoSaldoDevedor: number): Promise<string> {
        let novoStatus = 'Ativo';

        if (novoSaldoDevedor <= 1) { // Margem de erro pequena para float
            novoStatus = 'Pago';
        } else if (new Date(emprestimo.dataVencimento) < new Date()) {
            novoStatus = 'Inadimplente';
        }

        if (emprestimo.status !== novoStatus) {
            emprestimo.status = novoStatus;
            await manager.save(emprestimo);
        }

        // Notificar
        const msg = novoStatus === 'Pago'
            ? `🎉 Parabéns! Empréstimo #${emprestimo.emprestimoId} totalmente quitado!`
            : `Pagamento processado. Saldo restante: ${novoSaldoDevedor.toFixed(2)}`;

        // Notificação precisa do service, que não tem Transactional Manager...
        // O notificationService provavelmente usa seu próprio repo. É seguro chamar fora da transaction do banco
        // OU não, idealmente deveria ser atômico. Mas vamos assumir que falha na notificação não deve reverter o pagamento financeiro.
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
}
