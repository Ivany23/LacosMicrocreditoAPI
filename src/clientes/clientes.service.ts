import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cliente } from '../entities/cliente.entity';
import { CreateClienteDto, UpdateClienteDto } from './dto/cliente.dto';

@Injectable()
export class ClientesService {
    constructor(
        @InjectRepository(Cliente)
        private clienteRepository: Repository<Cliente>,
    ) { }

    async create(createClienteDto: CreateClienteDto) {
        const cliente = this.clienteRepository.create({
            ...createClienteDto,
            dataNascimento: new Date(createClienteDto.dataNascimento),
        });
        return await this.clienteRepository.save(cliente);
    }

    async findAll() {
        return await this.clienteRepository.find({
            relations: ['documentos', 'localizacao', 'ocupacoes', 'emprestimos', 'penhores', 'testemunhas'],
        });
    }

    async findOne(id: string) {
        const cliente = await this.clienteRepository.findOne({
            where: { clienteId: id },
            relations: ['documentos', 'localizacao', 'ocupacoes', 'emprestimos', 'penhores', 'testemunhas'],
        });

        if (!cliente) {
            throw new NotFoundException('Cliente não encontrado');
        }

        return cliente;
    }

    async update(id: string, updateClienteDto: UpdateClienteDto) {
        const cliente = await this.findOne(id);

        if (updateClienteDto.dataNascimento) {
            updateClienteDto.dataNascimento = new Date(updateClienteDto.dataNascimento) as any;
        }

        Object.assign(cliente, updateClienteDto);
        return await this.clienteRepository.save(cliente);
    }

    async remove(id: string) {
        const cliente = await this.findOne(id);
        await this.clienteRepository.remove(cliente);
        return { message: 'Cliente removido com sucesso' };
    }
}
