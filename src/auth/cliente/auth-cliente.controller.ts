import { Controller, Post, Body, Get, UseGuards, Request, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthClienteService } from './auth-cliente.service';
import { LoginClienteDto, CreateAutenticacaoDto, UpdateAutenticacaoDto } from './dto/auth-cliente.dto';
import { JwtAuthGuard } from '../jwt-auth.guard';

@ApiTags('⚙️ Autenticação - Clientes')
@Controller('auth/cliente')
export class AuthClienteController {
    constructor(private authClienteService: AuthClienteService) { }

    @Post('login')
    @ApiOperation({ summary: 'Realiza o login do cliente' })
    @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
    @ApiResponse({ status: 401, description: 'Credenciais inválidas ou conta bloqueada' })
    async login(@Body() loginDto: LoginClienteDto) {
        return this.authClienteService.login(loginDto);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    @ApiOperation({ summary: 'Obtém o perfil do cliente autenticado' })
    @ApiResponse({ status: 200, description: 'Perfil retornado com sucesso' })
    @ApiResponse({ status: 401, description: 'Não autorizado' })
    async getProfile(@Request() req) {
        return this.authClienteService.getProfile(req.user.userId || req.user.sub);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post('register')
    @ApiOperation({ summary: 'Registra novas credenciais para um cliente' })
    @ApiResponse({ status: 201, description: 'Credenciais criadas com sucesso' })
    @ApiResponse({ status: 409, description: 'Username já em uso ou cliente já possui acesso' })
    async create(@Body() createDto: CreateAutenticacaoDto) {
        return this.authClienteService.create(createDto);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('cliente/:clienteId')
    @ApiOperation({ summary: 'Busca credenciais por ID do cliente' })
    @ApiResponse({ status: 200, description: 'Dados da autenticação encontrados' })
    @ApiResponse({ status: 404, description: 'Autenticação não encontrada' })
    async findByClienteId(@Param('clienteId') clienteId: string) {
        return this.authClienteService.findByClienteId(clienteId);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Patch('cliente/:clienteId')
    @ApiOperation({ summary: 'Atualiza credenciais do cliente' })
    @ApiResponse({ status: 200, description: 'Atualizado com sucesso' })
    @ApiResponse({ status: 404, description: 'Autenticação não encontrada' })
    async update(@Param('clienteId') clienteId: string, @Body() updateDto: UpdateAutenticacaoDto) {
        return this.authClienteService.update(clienteId, updateDto);
    }
}
