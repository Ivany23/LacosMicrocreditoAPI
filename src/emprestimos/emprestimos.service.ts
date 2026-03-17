import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Emprestimo } from '../entities/emprestimo.entity';
import { Pagamento } from '../entities/pagamento.entity';
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
        private notificacoesService: NotificacoesService,
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
            return { ...emp, valorPago };
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

        return { ...emprestimo, valorPago };
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
        try {
            await this.emprestimoRepository.remove(emprestimo);
            return { message: 'Empréstimo removido com sucesso' };
        } catch (error) {
            if (error.code === '23503') {
                throw new ConflictException('Não é possível excluir este empréstimo pois existem registros associados (pagamentos ou penalizações).');
            }
            throw error;
        }
    }
}
