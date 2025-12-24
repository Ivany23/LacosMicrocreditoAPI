import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Localizacao } from '../entities/localizacao.entity';
import { CreateLocalizacaoDto, UpdateLocalizacaoDto } from './dto/localizacao.dto';

@Injectable()
export class LocalizacaoService {
    constructor(
        @InjectRepository(Localizacao)
        private localizacaoRepository: Repository<Localizacao>,
    ) { }

    async create(createLocalizacaoDto: CreateLocalizacaoDto) {
        const localizacao = this.localizacaoRepository.create(createLocalizacaoDto);
        return await this.localizacaoRepository.save(localizacao);
    }

    async findAll() {
        return await this.localizacaoRepository.find({ relations: ['cliente'] });
    }

    async findOne(id: string) {
        const localizacao = await this.localizacaoRepository.findOne({
            where: { localizacaoId: id },
            relations: ['cliente'],
        });

        if (!localizacao) {
            throw new NotFoundException('Localização não encontrada');
        }

        return localizacao;
    }

    async findByCliente(clienteId: string) {
        return await this.localizacaoRepository.findOne({
            where: { clienteId },
            relations: ['cliente'],
        });
    }

    async update(id: string, updateLocalizacaoDto: UpdateLocalizacaoDto) {
        const localizacao = await this.findOne(id);
        Object.assign(localizacao, updateLocalizacaoDto);
        return await this.localizacaoRepository.save(localizacao);
    }

    async remove(id: string) {
        const localizacao = await this.findOne(id);
        await this.localizacaoRepository.remove(localizacao);
        return { message: 'Localização removida com sucesso' };
    }
}
