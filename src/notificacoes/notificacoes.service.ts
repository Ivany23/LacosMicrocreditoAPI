import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificacao } from '../entities/notificacao.entity';
import { CreateNotificacaoDto } from './dto/notificacao.dto';

@Injectable()
export class NotificacoesService {
    constructor(
        @InjectRepository(Notificacao)
        private notificacaoRepository: Repository<Notificacao>,
    ) { }

    private readonly logger = new Logger(NotificacoesService.name);

    async create(createNotificacaoDto: CreateNotificacaoDto) {
        try {
            const notificacao = this.notificacaoRepository.create(createNotificacaoDto);
            const saved = await this.notificacaoRepository.save(notificacao);
            this.logger.log(`Notificação [${createNotificacaoDto.tipo}] enviada para cliente ${createNotificacaoDto.clienteId}`);
            return saved;
        } catch (error) {
            // Regra: Notificação nunca deve travar a operação principal
            this.logger.error(`Falha ao disparar notificação automática: ${error.message}`);
            return null;
        }
    }

    async findAll() {
        return await this.notificacaoRepository.find({
            order: { dataEnvio: 'DESC' },
            relations: ['cliente']
        });
    }

    async findByCliente(clienteId: string) {
        return await this.notificacaoRepository.find({
            where: { clienteId },
            order: { dataEnvio: 'DESC' }
        });
    }

    async markAsRead(id: string) {
        await this.notificacaoRepository.update(id, { status: 'Lido' });
        return { message: 'Notificação marcada como lida' };
    }
}
