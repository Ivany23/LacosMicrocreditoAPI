import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { Emprestimo } from '../entities/emprestimo.entity';
import { Pagamento } from '../entities/pagamento.entity';
import { Penalizacao } from '../entities/penalizacao.entity';
import { PlanoPagamentoDiario } from '../entities/plano-pagamento-diario.entity';
import { Penhor } from '../entities/penhor.entity';
import { Testemunha } from '../entities/testemunha.entity';
import { CreateEmprestimoDto, UpdateEmprestimoDto } from './dto/emprestimo.dto';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { TipoNotificacao } from '../notificacoes/dto/notificacao.dto';

@Injectable()
export class EmprestimosService {
    constructor(
        @InjectRepository(Emprestimo)
        private emprestimoRepository: Repository<Emprestimo>,
        @InjectRepository(Pagamento)
        private pagamentoRepository: Repository<Pagamento>,
        @InjectRepository(Penalizacao)
        private penalizacaoRepository: Repository<Penalizacao>,
        @InjectRepository(PlanoPagamentoDiario)
        private planoPagamentoDiarioRepository: Repository<PlanoPagamentoDiario>,
        private notificacoesService: NotificacoesService,
        private dataSource: DataSource,
    ) { }

    async create(createEmprestimoDto: CreateEmprestimoDto) {
        const emprestimo = this.emprestimoRepository.create({
            ...createEmprestimoDto,
            dataEmprestimo: new Date(), 
            dataVencimento: new Date(createEmprestimoDto.dataVencimento),
        });
        const savedEmprestimo = await this.emprestimoRepository.save(emprestimo);

        await this.notificacoesService.create({
            clienteId: savedEmprestimo.clienteId,
            tipo: TipoNotificacao.CONFIRMACAO_EMPRESTIMO,
            mensagem: `Seu empréstimo de ${savedEmprestimo.valor} foi aprovado e registrado com sucesso!`,
            status: 'Pendente'
        });

        return savedEmprestimo;
    }

    async findAll(status?: string) {
        const where: any = {};

        if (status && status !== 'Todos') {
            if (status === 'Ativos') {
                where.status = In(['Ativo', 'APROVADO', 'Aprovado', 'EM_ANDAMENTO']);
            } else if (status === 'Atrasados') {
                where.status = In(['ATRASADO', 'Inadimplente']);
            } else if (status === 'Liquidados') {
                where.status = In(['PAGO', 'Pago', 'LIQUIDADO']);
            } else {
                where.status = status;
            }
        }

        const emprestimos = await this.emprestimoRepository.find({
            where,
            relations: ['cliente'],
            order: { dataEmprestimo: 'DESC' }
        });

        return await Promise.all(emprestimos.map(async emp => {
            const pagamentos = await this.pagamentoRepository.find({ where: { emprestimoId: emp.emprestimoId } });
            const valorPago = pagamentos.reduce((acc, p) => acc + Number(p.valorPago || 0), 0);
            const valorPrincipal = Number(emp.valor || 0);
            const valorTotal = valorPrincipal + (valorPrincipal * 0.20);
            return { ...emp, valorPago, valorTotal };
        }));
    }

    async findOne(id: string) {
        const emprestimo = await this.emprestimoRepository.findOne({
            where: { emprestimoId: id },
            relations: ['cliente'],
        });

        if (!emprestimo) {
            throw new NotFoundException('Empréstimo não encontrado');
        }

        const pagamentos = await this.pagamentoRepository.find({ where: { emprestimoId: id } });
        const valorPago = pagamentos.reduce((acc, p) => acc + Number(p.valorPago || 0), 0);
        
        const valorPrincipal = Number(emprestimo.valor || 0);
        const valorTotal = valorPrincipal + (valorPrincipal * 0.20);

        return { ...emprestimo, valorPago, valorTotal };
    }

    async findByCliente(clienteId: string) {
        const emprestimos = await this.emprestimoRepository.find({
            where: { clienteId },
            relations: ['cliente'],
        });

        return await Promise.all(emprestimos.map(async emp => {
            const pagamentos = await this.pagamentoRepository.find({ where: { emprestimoId: emp.emprestimoId } });
            const valorPago = pagamentos.reduce((acc, p) => acc + Number(p.valorPago || 0), 0);
            return { ...emp, valorPago };
        }));
    }

    async update(id: string, updateEmprestimoDto: UpdateEmprestimoDto) {
        const emprestimo = await this.findOne(id);

        if (updateEmprestimoDto.dataVencimento) {
            updateEmprestimoDto.dataVencimento = new Date(updateEmprestimoDto.dataVencimento) as any;
        }

        Object.assign(emprestimo, updateEmprestimoDto);
        return await this.emprestimoRepository.save(emprestimo);
    }

    async remove(id: string) {
        const emprestimo = await this.findOne(id);
        const queryRunner = this.dataSource.createQueryRunner();
        
        await queryRunner.connect();
        await queryRunner.startTransaction();
        
        try {
            
            await queryRunner.manager.delete(Pagamento, { emprestimoId: id });
            
            
            await queryRunner.manager.delete(Penalizacao, { emprestimoId: id });
            
            
            await queryRunner.manager.delete(PlanoPagamentoDiario, { emprestimoId: id });

            
            await queryRunner.manager.delete(Penhor, { emprestimoId: id });

            
            await queryRunner.manager.delete(Testemunha, { emprestimoId: id });
            
            
            await queryRunner.manager.remove(emprestimo);
            
            await queryRunner.commitTransaction();
            return { message: 'Empréstimo e todos os dados relacionados removidos com sucesso' };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
}
