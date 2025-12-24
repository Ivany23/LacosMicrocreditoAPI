import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OcupacoesService } from './ocupacoes.service';
import { OcupacoesController } from './ocupacoes.controller';
import { Ocupacao } from '../entities/ocupacao.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Ocupacao])],
    controllers: [OcupacoesController],
    providers: [OcupacoesService],
})
export class OcupacoesModule { }
