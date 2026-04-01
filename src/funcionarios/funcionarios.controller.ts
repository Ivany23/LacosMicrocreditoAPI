import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { FuncionariosService } from './funcionarios.service';
import { CreateFuncionarioDto, UpdateFuncionarioDto, UpdatePasswordDto } from './dto/funcionario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('funcionarios')
export class FuncionariosController {
    constructor(private readonly funcionariosService: FuncionariosService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() createFuncionarioDto: CreateFuncionarioDto) {
        return this.funcionariosService.create(createFuncionarioDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll() {
        return this.funcionariosService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateFuncionarioDto: UpdateFuncionarioDto) {
        return this.funcionariosService.update(id, updateFuncionarioDto);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/credenciais')
    updatePassword(@Param('id') id: string, @Body() updatePasswordDto: UpdatePasswordDto) {
        return this.funcionariosService.updatePassword(id, updatePasswordDto);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.funcionariosService.remove(id);
    }
}
