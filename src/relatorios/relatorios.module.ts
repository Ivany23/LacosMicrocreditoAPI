import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RelatoriosController } from './relatorios.controller';
import { RelatoriosService } from './relatorios.service';
import { Cliente } from '../entities/cliente.entity';
import { Emprestimo } from '../entities/emprestimo.entity';
import { Pagamento } from '../entities/pagamento.entity';
import { Penalizacao } from '../entities/penalizacao.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Cliente,
            Emprestimo,
            Pagamento,
            Penalizacao
        ])
    ],
    controllers: [RelatoriosController],
    providers: [RelatoriosService],
    exports: [RelatoriosService]
})
export class RelatoriosModule { }
