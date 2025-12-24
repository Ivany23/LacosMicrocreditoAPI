import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksService } from './tasks.service';
import { Emprestimo } from '../entities/emprestimo.entity';
import { PenalizacoesModule } from '../penalizacoes/penalizacoes.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { TasksController } from './tasks.controller';
import { Penalizacao } from '../entities/penalizacao.entity';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        TypeOrmModule.forFeature([Emprestimo, Penalizacao]),
        PenalizacoesModule,
        NotificacoesModule,
    ],
    controllers: [TasksController],
    providers: [TasksService],
})
export class TasksModule { }
