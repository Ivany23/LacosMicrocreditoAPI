import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OcupacoesService } from './ocupacoes.service';
import { CreateOcupacaoDto, UpdateOcupacaoDto } from './dto/ocupacao.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Ocupações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ocupacoes')
export class OcupacoesController {
    constructor(private readonly ocupacoesService: OcupacoesService) { }

    @Post()
    @ApiOperation({ summary: 'Cadastrar ocupação' })
    create(@Body() createOcupacaoDto: CreateOcupacaoDto) {
        return this.ocupacoesService.create(createOcupacaoDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todas as ocupações' })
    findAll() {
        return this.ocupacoesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar ocupação por ID' })
    findOne(@Param('id') id: string) {
        return this.ocupacoesService.findOne(id);
    }

    @Get('cliente/:clienteId')
    @ApiOperation({ summary: 'Buscar ocupações por cliente' })
    findByCliente(@Param('clienteId') clienteId: string) {
        return this.ocupacoesService.findByCliente(clienteId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar ocupação' })
    update(@Param('id') id: string, @Body() updateOcupacaoDto: UpdateOcupacaoDto) {
        return this.ocupacoesService.update(id, updateOcupacaoDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remover ocupação' })
    remove(@Param('id') id: string) {
        return this.ocupacoesService.remove(id);
    }
}
