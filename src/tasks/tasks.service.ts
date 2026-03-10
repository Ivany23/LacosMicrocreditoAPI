import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { Emprestimo } from '../entities/emprestimo.entity';
import { Penalizacao } from '../entities/penalizacao.entity';
import { PenalizacoesService } from '../penalizacoes/penalizacoes.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { TipoNotificacao } from '../notificacoes/dto/notificacao.dto';
import { StatusPenalizacao } from '../penalizacoes/dto/penalizacao.dto';

@Injectable()
export class TasksService {
    private readonly logger = new Logger(TasksService.name);

    constructor(
        @InjectRepository(Emprestimo)
        private emprestimoRepository: Repository<Emprestimo>,
        @InjectRepository(Penalizacao)
        private penalizacaoRepository: Repository<Penalizacao>,
        private penalizacoesService: PenalizacoesService,
        private notificacoesService: NotificacoesService,
    ) { }

    private normalizarData(data: Date): Date {
        const dataStr = data.toISOString().split('T')[0]; 
        const [ano, mes, dia] = dataStr.split('-').map(Number);
        return new Date(ano, mes - 1, dia, 0, 0, 0, 0); 
    }

    private calcularDiasEntreDatas(dataInicio: Date, dataFim: Date): number {
        const inicio = this.normalizarData(dataInicio);
        const fim = this.normalizarData(dataFim);
        const diffTime = fim.getTime() - inicio.getTime();
        return Math.round(diffTime / (1000 * 60 * 60 * 24));
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleDailyPenalties() {
        this.logger.log('Iniciando processamento de penalidades (incluindo retroativas)...');

        const startOfToday = this.normalizarData(new Date());

        const overdueLoans = await this.emprestimoRepository.find({
            where: [
                { status: 'Ativo', dataVencimento: LessThan(new Date()) },
                { status: 'Inadimplente', dataVencimento: LessThan(new Date()) }
            ],
            relations: ['cliente'],
        });

        this.logger.log(`Analisando ${overdueLoans.length} empréstimos vencidos.`);

        for (const loan of overdueLoans) {
            
            const vencimentoNormalizado = this.normalizarData(new Date(loan.dataVencimento));

            this.logger.log(`Empréstimo #${loan.emprestimoId} - Vencimento: ${vencimentoNormalizado.toISOString().split('T')[0]}, Hoje: ${startOfToday.toISOString().split('T')[0]}`);

            const diasAtrasoTotal = this.calcularDiasEntreDatas(vencimentoNormalizado, startOfToday);
            this.logger.log(`Dias de atraso calculados: ${diasAtrasoTotal}`);

            if (diasAtrasoTotal <= 0) {
                this.logger.log(`Empréstimo #${loan.emprestimoId} não está realmente vencido. Pulando...`);
                continue;
            }

            let checkDate = new Date(vencimentoNormalizado);
            checkDate.setDate(checkDate.getDate() + 1);

            let diasProcessados = 0;
            while (checkDate <= startOfToday && diasProcessados < diasAtrasoTotal) {

                const startOfDay = new Date(checkDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(checkDate);
                endOfDay.setHours(23, 59, 59, 999);

                const multaExistente = await this.penalizacaoRepository.findOne({
                    where: {
                        emprestimoId: loan.emprestimoId,
                        tipo: 'atraso',
                        dataAplicacao: Between(startOfDay, endOfDay)
                    }
                });

                if (!multaExistente) {
                    const diasAtrasoReal = diasProcessados + 1; 
                    const valorMulta = Number(loan.valor) * 0.05; 

                    this.logger.log(`Criando multa para Empréstimo #${loan.emprestimoId} - Dia ${diasAtrasoReal} - Data: ${checkDate.toISOString().split('T')[0]}`);

                    const novaMulta = this.penalizacaoRepository.create({
                        emprestimoId: loan.emprestimoId,
                        clienteId: loan.clienteId,
                        tipo: 'atraso',
                        diasAtraso: diasAtrasoReal,
                        valor: valorMulta,
                        status: StatusPenalizacao.PENDENTE,
                        observacoes: `Multa automática (Dia ${diasAtrasoReal})`,
                        dataAplicacao: startOfDay
                    });

                    await this.penalizacaoRepository.save(novaMulta);

                    if (checkDate.getTime() === startOfToday.getTime()) {
                        await this.notificacoesService.create({
                            clienteId: loan.clienteId,
                            tipo: TipoNotificacao.PENALIZACAO,
                            mensagem: `Multa diária de ${valorMulta} aplicada por atraso (Dia ${diasAtrasoReal}).`,
                            status: 'Pendente'
                        });
                    }
                }

                checkDate.setDate(checkDate.getDate() + 1);
                diasProcessados++;
            }

            if (loan.status !== 'Inadimplente') {
                loan.status = 'Inadimplente';
                await this.emprestimoRepository.save(loan);
            }
        }
        this.logger.log('Processamento de penalidades concluído.');
    }

    @Cron('0 8 * * *')
    async handlePaymentReminders() {
        this.logger.log('Iniciando envio de lembretes de pagamento...');
        const today = new Date();
        const futureLoans = await this.emprestimoRepository.find({
            where: { status: 'Ativo', dataVencimento: MoreThan(today) },
            relations: ['cliente']
        });

        for (const loan of futureLoans) {
            const dueDate = new Date(loan.dataVencimento);
            const diffTime = dueDate.getTime() - today.getTime();
            const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (daysUntilDue === 10 || daysUntilDue === 5) {
                await this.notificacoesService.create({
                    clienteId: loan.clienteId,
                    tipo: TipoNotificacao.LEMBRETE,
                    mensagem: `Lembrete: Empréstimo #${loan.emprestimoId} vence em ${daysUntilDue} dias.`,
                    status: 'Pendente'
                });
            }
        }
    }
}
