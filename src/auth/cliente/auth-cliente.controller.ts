import { Controller, Post, Body, Get, UseGuards, Request, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthClienteService } from './auth-cliente.service';
import { LoginClienteDto, CreateAutenticacaoDto, UpdateAutenticacaoDto } from './dto/auth-cliente.dto';
import { JwtAuthGuard } from '../jwt-auth.guard';

@ApiTags('⚙️ Autenticação - Clientes')
@Controller('auth/cliente')
export class AuthClienteController {
    constructor(private authClienteService: AuthClienteService) { }

    @Post('login')
    async login(@Body() loginDto: LoginClienteDto) {
        return this.authClienteService.login(loginDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    async getProfile(@Request() req) {
        return this.authClienteService.getProfile(req.user.userId || req.user.sub);
    }

    @UseGuards(JwtAuthGuard)
    @Post('register')
    async create(@Body() createDto: CreateAutenticacaoDto) {
        return this.authClienteService.create(createDto);
    }

    @UseGuards(JwtAuthGuard)
    @Get('cliente/:clienteId')
    async findByClienteId(@Param('clienteId') clienteId: string) {
        return this.authClienteService.findByClienteId(clienteId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('cliente/:clienteId')
    async update(@Param('clienteId') clienteId: string, @Body() updateDto: UpdateAutenticacaoDto) {
        return this.authClienteService.update(clienteId, updateDto);
    }
}
