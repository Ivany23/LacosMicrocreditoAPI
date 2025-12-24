import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ocupacao } from '../entities/ocupacao.entity';
import { CreateOcupacaoDto, UpdateOcupacaoDto } from './dto/ocupacao.dto';

@Injectable()
export class OcupacoesService {
    constructor(
        @InjectRepository(Ocupacao)
        private ocupacaoRepository: Repository<Ocupacao>,
    ) { }

    async create(createOcupacaoDto: CreateOcupacaoDto) {
        const ocupacao = this.ocupacaoRepository.create(createOcupacaoDto);
        return await this.ocupacaoRepository.save(ocupacao);
    }

    async findAll() {
        return await this.ocupacaoRepository.find({ relations: ['cliente'] });
    }

    async findOne(id: string) {
        const ocupacao = await this.ocupacaoRepository.findOne({
            where: { ocupacaoId: id },
            relations: ['cliente'],
        });

        if (!ocupacao) {
            throw new NotFoundException('Ocupação não encontrada');
        }

        return ocupacao;
    }

    async findByCliente(clienteId: string) {
        return await this.ocupacaoRepository.find({
            where: { clienteId },
            relations: ['cliente'],
        });
    }

    async update(id: string, updateOcupacaoDto: UpdateOcupacaoDto) {
        const ocupacao = await this.findOne(id);
        Object.assign(ocupacao, updateOcupacaoDto);
        return await this.ocupacaoRepository.save(ocupacao);
    }

    async remove(id: string) {
        const ocupacao = await this.findOne(id);
        await this.ocupacaoRepository.remove(ocupacao);
        return { message: 'Ocupação removida com sucesso' };
    }
}
