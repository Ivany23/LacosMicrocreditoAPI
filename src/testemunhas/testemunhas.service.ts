import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testemunha } from '../entities/testemunha.entity';
import { CreateTestemunhaDto, UpdateTestemunhaDto } from './dto/testemunha.dto';

@Injectable()
export class TestemunhasService {
    constructor(
        @InjectRepository(Testemunha)
        private testemunhaRepository: Repository<Testemunha>,
    ) { }

    async create(createTestemunhaDto: CreateTestemunhaDto) {
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
