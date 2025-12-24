import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Emprestimo } from '../entities/emprestimo.entity';
import { CreateEmprestimoDto, UpdateEmprestimoDto } from './dto/emprestimo.dto';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { TipoNotificacao } from '../notificacoes/dto/notificacao.dto';

@Injectable()
export class EmprestimosService {
    constructor(
        @InjectRepository(Emprestimo)
        private emprestimoRepository: Repository<Emprestimo>,
        private notificacoesService: NotificacoesService,
    ) { }

    async create(createEmprestimoDto: CreateEmprestimoDto) {
        const emprestimo = this.emprestimoRepository.create({
            ...createEmprestimoDto,
            dataEmprestimo: new Date(), // Data/hora atual do sistema - gerada automaticamente
            dataVencimento: new Date(createEmprestimoDto.dataVencimento),
        });
        const savedEmprestimo = await this.emprestimoRepository.save(emprestimo);

        // Notificação automática de criação
        await this.notificacoesService.create({
            clienteId: savedEmprestimo.clienteId,
            tipo: TipoNotificacao.CONFIRMACAO_EMPRESTIMO,
            mensagem: `Seu empréstimo de ${savedEmprestimo.valor} foi aprovado e registrado com sucesso!`,
            status: 'Pendente'
        });

        return savedEmprestimo;
    }

    async findAll() {
        return await this.emprestimoRepository.find({ relations: ['cliente'] });
    }

    async findOne(id: string) {
        const emprestimo = await this.emprestimoRepository.findOne({
            where: { emprestimoId: id },
            relations: ['cliente'],
        });

        if (!emprestimo) {
            throw new NotFoundException('Empréstimo não encontrado');
        }

        return emprestimo;
    }

    async findByCliente(clienteId: string) {
        return await this.emprestimoRepository.find({
            where: { clienteId },
            relations: ['cliente'],
        });
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
