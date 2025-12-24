import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LocalizacaoService } from './localizacao.service';
import { CreateLocalizacaoDto, UpdateLocalizacaoDto } from './dto/localizacao.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Localização')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('localizacao')
export class LocalizacaoController {
    constructor(private readonly localizacaoService: LocalizacaoService) { }

    @Post()
    @ApiOperation({ summary: 'Cadastrar localização' })
    create(@Body() createLocalizacaoDto: CreateLocalizacaoDto) {
        return this.localizacaoService.create(createLocalizacaoDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todas as localizações' })
    findAll() {
        return this.localizacaoService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar localização por ID' })
    findOne(@Param('id') id: string) {
        return this.localizacaoService.findOne(id);
    }

    @Get('cliente/:clienteId')
    @ApiOperation({ summary: 'Buscar localização por cliente' })
    findByCliente(@Param('clienteId') clienteId: string) {
        return this.localizacaoService.findByCliente(clienteId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar localização' })
    update(@Param('id') id: string, @Body() updateLocalizacaoDto: UpdateLocalizacaoDto) {
        return this.localizacaoService.update(id, updateLocalizacaoDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remover localização' })
    remove(@Param('id') id: string) {
        return this.localizacaoService.remove(id);
    }
}
