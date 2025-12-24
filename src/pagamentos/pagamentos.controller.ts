import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PagamentosService } from './pagamentos.service';
import { CreatePagamentoDto } from './dto/pagamento.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Pagamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pagamentos')
export class PagamentosController {
    constructor(private readonly pagamentosService: PagamentosService) { }

    @Post()
    @ApiOperation({ summary: 'Registrar um novo pagamento' })
    @ApiResponse({ status: 201, description: 'Pagamento registrado com sucesso.' })
    create(@Body() createPagamentoDto: CreatePagamentoDto) {
        return this.pagamentosService.create(createPagamentoDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos os pagamentos (Relatório Geral)' })
    findAll() {
        return this.pagamentosService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar pagamento por ID' })
    findOne(@Param('id') id: string) {
        return this.pagamentosService.findOne(id);
    }

    @Get('cliente/:clienteId')
    @ApiOperation({ summary: 'Extrato de pagamentos de um cliente' })
    findByCliente(@Param('clienteId') clienteId: string) {
        return this.pagamentosService.findByCliente(clienteId);
    }

    @Get('emprestimo/:emprestimoId')
    @ApiOperation({ summary: 'Pagamentos realizados para um empréstimo específico' })
    findByEmprestimo(@Param('emprestimoId') emprestimoId: string) {
        return this.pagamentosService.findByEmprestimo(emprestimoId);
    }
}
