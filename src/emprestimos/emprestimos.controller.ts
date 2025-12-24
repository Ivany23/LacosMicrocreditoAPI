import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmprestimosService } from './emprestimos.service';
import { CreateEmprestimoDto, UpdateEmprestimoDto } from './dto/emprestimo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Empréstimos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('emprestimos')
export class EmprestimosController {
    constructor(private readonly emprestimosService: EmprestimosService) { }

    @Post()
    @ApiOperation({ summary: 'Criar novo empréstimo' })
    create(@Body() createEmprestimoDto: CreateEmprestimoDto) {
        return this.emprestimosService.create(createEmprestimoDto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos os empréstimos' })
    findAll() {
        return this.emprestimosService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Buscar empréstimo por ID' })
    findOne(@Param('id') id: string) {
        return this.emprestimosService.findOne(id);
    }

    @Get('cliente/:clienteId')
    @ApiOperation({ summary: 'Buscar empréstimos por cliente' })
    findByCliente(@Param('clienteId') clienteId: string) {
        return this.emprestimosService.findByCliente(clienteId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualizar empréstimo' })
    update(@Param('id') id: string, @Body() updateEmprestimoDto: UpdateEmprestimoDto) {
        return this.emprestimosService.update(id, updateEmprestimoDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Remover empréstimo' })
    remove(@Param('id') id: string) {
        return this.emprestimosService.remove(id);
    }
}
