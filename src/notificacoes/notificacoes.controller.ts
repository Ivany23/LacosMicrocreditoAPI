import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificacoesService } from './notificacoes.service';
import { CreateNotificacaoDto } from './dto/notificacao.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Notificações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notificacoes')
export class NotificacoesController {
    constructor(private readonly notificacoesService: NotificacoesService) { }

    @Post()
    @ApiOperation({ summary: 'Criar nova notificação (Sistema/Admin)' })
    create(@Body() createNotificacaoDto: CreateNotificacaoDto) {
        return this.notificacoesService.create(createNotificacaoDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todas as notificações' })
    findAll() {
        return this.notificacoesService.findAll();
    }

    @Get('cliente/:clienteId')
    @ApiOperation({ summary: 'Listar notificações de um cliente' })
    findByCliente(@Param('clienteId') clienteId: string) {
        return this.notificacoesService.findByCliente(clienteId);
    }

    @Patch(':id/ler')
    @ApiOperation({ summary: 'Marcar notificação como lida' })
    markAsRead(@Param('id') id: string) {
        return this.notificacoesService.markAsRead(id);
    }
}
