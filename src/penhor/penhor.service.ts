import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Penhor } from '../entities/penhor.entity';
import { CreatePenhorDto, UpdatePenhorDto } from './dto/penhor.dto';

@Injectable()
export class PenhorService {
    constructor(
        @InjectRepository(Penhor)
        private penhorRepository: Repository<Penhor>,
    ) { }

    async create(createPenhorDto: CreatePenhorDto) {
        const penhor = this.penhorRepository.create({
            ...createPenhorDto,
            dataPenhora: new Date(createPenhorDto.dataPenhora),
        });
        return await this.penhorRepository.save(penhor);
    }

    async findAll() {
        return await this.penhorRepository.find({ relations: ['cliente'] });
    }

    async findOne(id: string) {
        const penhor = await this.penhorRepository.findOne({
            where: { penhorId: id },
            relations: ['cliente'],
        });

        if (!penhor) {
            throw new NotFoundException('Penhor não encontrado');
        }

        return penhor;
    }

    async findByCliente(clienteId: string) {
        return await this.penhorRepository.find({
            where: { clienteId },
            relations: ['cliente'],
        });
    }

    async update(id: string, updatePenhorDto: UpdatePenhorDto) {
        const penhor = await this.findOne(id);
        Object.assign(penhor, updatePenhorDto);
        return await this.penhorRepository.save(penhor);
    }

    async remove(id: string) {
        const penhor = await this.findOne(id);
        await this.penhorRepository.remove(penhor);
        return { message: 'Penhor removido com sucesso' };
    }
}
