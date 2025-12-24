import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PenhorService } from './penhor.service';
import { PenhorController } from './penhor.controller';
import { Penhor } from '../entities/penhor.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Penhor])],
    controllers: [PenhorController],
    providers: [PenhorService],
})
export class PenhorModule { }
