import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalizacaoService } from './localizacao.service';
import { LocalizacaoController } from './localizacao.controller';
import { Localizacao } from '../entities/localizacao.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Localizacao])],
    controllers: [LocalizacaoController],
    providers: [LocalizacaoService],
})
export class LocalizacaoModule { }
