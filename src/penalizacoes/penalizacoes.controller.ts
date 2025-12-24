import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PenalizacoesService } from './penalizacoes.service';
import { CreatePenalizacaoDto } from './dto/penalizacao.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Penalizações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('penalizacoes')
export class PenalizacoesController {
    constructor(private readonly penalizacoesService: PenalizacoesService) { }

    @Post()
    @ApiOperation({ summary: 'Registrar uma penalização manualmente' })
    create(@Body() createPenalizacaoDto: CreatePenalizacaoDto) {
        return this.penalizacoesService.create(createPenalizacaoDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todas as penalizações' })
    findAll() {
        return this.penalizacoesService.findAll();
    }

    @Get('emprestimo/:emprestimoId')
    @ApiOperation({ summary: 'Ver penalizações de um empréstimo' })
    findByEmprestimo(@Param('emprestimoId') emprestimoId: string) {
        return this.penalizacoesService.findByEmprestimo(emprestimoId);
    }

    @Get('cliente/:clienteId')
    @ApiOperation({ summary: 'Ver histórico de penalizações de um cliente' })
    findByCliente(@Param('clienteId') clienteId: string) {
        return this.penalizacoesService.findByCliente(clienteId);
    }
}
