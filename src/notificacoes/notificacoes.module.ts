import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificacoesService } from './notificacoes.service';
import { NotificacoesController } from './notificacoes.controller';
import { Notificacao } from '../entities/notificacao.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Notificacao])],
    controllers: [NotificacoesController],
    providers: [NotificacoesService],
    exports: [NotificacoesService], // Exported to be used by Penalties/Scheduler
})
export class NotificacoesModule { }
