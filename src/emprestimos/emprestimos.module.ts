import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmprestimosService } from './emprestimos.service';
import { EmprestimosController } from './emprestimos.controller';
import { Emprestimo } from '../entities/emprestimo.entity';
import { Pagamento } from '../entities/pagamento.entity';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Emprestimo, Pagamento]),
        NotificacoesModule
    ],
    controllers: [EmprestimosController],
    providers: [EmprestimosService],
})
export class EmprestimosModule { }
