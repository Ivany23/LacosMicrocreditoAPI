import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmprestimosService } from './emprestimos.service';
import { EmprestimosController } from './emprestimos.controller';
import { Emprestimo } from '../entities/emprestimo.entity';

import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Emprestimo]),
        NotificacoesModule
    ],
    controllers: [EmprestimosController],
    providers: [EmprestimosService],
})
export class EmprestimosModule { }
