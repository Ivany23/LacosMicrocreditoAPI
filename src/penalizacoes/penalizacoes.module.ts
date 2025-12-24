import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PenalizacoesService } from './penalizacoes.service';
import { PenalizacoesController } from './penalizacoes.controller';
import { Penalizacao } from '../entities/penalizacao.entity';

import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
    imports: [TypeOrmModule.forFeature([Penalizacao]), NotificacoesModule],
    controllers: [PenalizacoesController],
    providers: [PenalizacoesService],
    exports: [PenalizacoesService],
})
export class PenalizacoesModule { }
