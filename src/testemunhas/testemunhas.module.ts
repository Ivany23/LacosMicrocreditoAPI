import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestemunhasService } from './testemunhas.service';
import { TestemunhasController } from './testemunhas.controller';
import { Testemunha } from '../entities/testemunha.entity';
import { Cliente } from '../entities/cliente.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Testemunha, Cliente])],
    controllers: [TestemunhasController],
    providers: [TestemunhasService],
})
export class TestemunhasModule { }
