import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Documento } from '../entities/documento.entity';
import { CreateDocumentoDto, UpdateDocumentoDto } from './dto/documento.dto';

@Injectable()
export class DocumentosService {
    constructor(
        @InjectRepository(Documento)
        private documentoRepository: Repository<Documento>,
    ) { }

    async create(createDocumentoDto: CreateDocumentoDto) {
        const documento = this.documentoRepository.create(createDocumentoDto);
        return await this.documentoRepository.save(documento);
    }

    async findAll() {
        return await this.documentoRepository.find({ relations: ['cliente'] });
    }

    async findOne(id: string) {
        const documento = await this.documentoRepository.findOne({
            where: { documentoId: id },
            relations: ['cliente'],
        });

        if (!documento) {
            throw new NotFoundException('Documento não encontrado');
        }

        return documento;
    }

    async findByCliente(clienteId: string) {
        return await this.documentoRepository.find({
            where: { clienteId },
            relations: ['cliente'],
        });
    }

    async update(id: string, updateDocumentoDto: UpdateDocumentoDto) {
        const documento = await this.findOne(id);
        Object.assign(documento, updateDocumentoDto);
        return await this.documentoRepository.save(documento);
    }

    async remove(id: string) {
        const documento = await this.findOne(id);
        await this.documentoRepository.remove(documento);
        return { message: 'Documento removido com sucesso' };
    }
}
