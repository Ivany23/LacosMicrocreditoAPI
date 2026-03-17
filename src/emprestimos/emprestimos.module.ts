import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmprestimosService } from './emprestimos.service';
import { EmprestimosController } from './emprestimos.controller';
import { Emprestimo } from '../entities/emprestimo.entity';
import { Pagamento } from '../entities/pagamento.entity';
import { Penalizacao } from '../entities/penalizacao.entity';
import { PlanoPagamentoDiario } from '../entities/plano-pagamento-diario.entity';
import { Penhor } from '../entities/penhor.entity';
import { Testemunha } from '../entities/testemunha.entity';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Emprestimo, Pagamento, Penalizacao, PlanoPagamentoDiario, Penhor, Testemunha]),
        NotificacoesModule
    ],
    controllers: [EmprestimosController],
    providers: [EmprestimosService],
})
export class EmprestimosModule { }
