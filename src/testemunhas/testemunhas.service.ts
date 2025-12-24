import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testemunha } from '../entities/testemunha.entity';
import { Cliente } from '../entities/cliente.entity';
import { CreateTestemunhaDto, UpdateTestemunhaDto } from './dto/testemunha.dto';

@Injectable()
export class TestemunhasService {
    constructor(
        @InjectRepository(Testemunha)
        private testemunhaRepository: Repository<Testemunha>,
        @InjectRepository(Cliente)
        private clienteRepository: Repository<Cliente>,
    ) { }

    async create(createTestemunhaDto: CreateTestemunhaDto) {
        // 1. Verificar se o cliente existe
        const cliente = await this.clienteRepository.findOne({
            where: { clienteId: createTestemunhaDto.clienteId }
        });

        if (!cliente) {
            throw new NotFoundException('Cliente não encontrado');
        }

        // 2. Verificar se a testemunha tem o mesmo telefone que o cliente (Não pode ser a própria testemunha)
        if (createTestemunhaDto.telefone === cliente.telefone) {
            throw new BadRequestException('O cliente não pode ser a sua própria testemunha');
        }

        // 3. Verificar se o telefone já existe na base de testemunhas
        const telefoneExistente = await this.testemunhaRepository.findOne({
            where: { telefone: createTestemunhaDto.telefone }
        });

        if (telefoneExistente) {
            throw new ConflictException('Este número de telefone já está registrado para outra testemunha');
        }

        // 4. Verificar se o telefone pertence a algum outro cliente (Opcional, mas garante que a testemunha é externa)
        const clienteComTelefone = await this.clienteRepository.findOne({
            where: { telefone: createTestemunhaDto.telefone }
        });

        if (clienteComTelefone) {
            throw new BadRequestException('A testemunha não pode ser um cliente registrado no sistema');
        }

        const testemunha = this.testemunhaRepository.create(createTestemunhaDto);
        return await this.testemunhaRepository.save(testemunha);
    }

    async findAll() {
        return await this.testemunhaRepository.find({ relations: ['cliente'] });
    }

    async findOne(id: string) {
        const testemunha = await this.testemunhaRepository.findOne({
            where: { testemunhaId: id },
            relations: ['cliente'],
        });

        if (!testemunha) {
            throw new NotFoundException('Testemunha não encontrada');
        }

        return testemunha;
    }

    async findByCliente(clienteId: string) {
        return await this.testemunhaRepository.find({
            where: { clienteId },
            relations: ['cliente'],
        });
    }

    async update(id: string, updateTestemunhaDto: UpdateTestemunhaDto) {
        const testemunha = await this.findOne(id);
        Object.assign(testemunha, updateTestemunhaDto);
        return await this.testemunhaRepository.save(testemunha);
    }

    async remove(id: string) {
        const testemunha = await this.findOne(id);
        await this.testemunhaRepository.remove(testemunha);
        return { message: 'Testemunha removida com sucesso' };
    }
}
