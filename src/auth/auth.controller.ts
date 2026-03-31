import {
    Controller, Post, Body, Get, UseGuards,
    Request, Put, Delete, Param, Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/auth.dto';
import {
    CreateAutenticacaoDto,
    UpdateAutenticacaoDto,
    UpdateCredenciaisClienteDto,
} from './dto/autenticacao-crud.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
    ApiTags, ApiOperation, ApiBearerAuth,
    ApiParam, ApiBody, ApiResponse,
} from '@nestjs/swagger';

// ═══════════════════════════════════════════════════════════
//  TAG 1: Login de Clientes
// ═══════════════════════════════════════════════════════════
@ApiTags('🔑 Auth — Clientes')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    // ──────────────────────────────────────────────
    // LOGIN DO CLIENTE
    // ──────────────────────────────────────────────
    @Post('login')
    @ApiOperation({
        summary: 'Login do Cliente',
        description: 'Autentica um cliente usando o seu username e senha. Retorna o token JWT e dados básicos do cliente.',
    })
    @ApiBody({ type: LoginDto })
    @ApiResponse({ status: 201, description: 'Login bem-sucedido — retorna access_token e dados do cliente.' })
    @ApiResponse({ status: 401, description: 'Credenciais inválidas ou conta bloqueada.' })
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    // ──────────────────────────────────────────────
    // LOGIN DO FUNCIONÁRIO / ADMINISTRADOR
    // ──────────────────────────────────────────────
    @Post('login/funcionario')
    @ApiOperation({
        summary: 'Login do Funcionário (Admin / Gestor / Operador)',
        description: 'Autentica um funcionário do sistema. Retorna token JWT com role e permissões.',
    })
    @ApiBody({ type: LoginDto })
    @ApiResponse({ status: 201, description: 'Login bem-sucedido — retorna access_token, role e dados do funcionário.' })
    @ApiResponse({ status: 401, description: 'Credenciais inválidas ou conta bloqueada.' })
    async loginFuncionario(@Body() loginDto: LoginDto) {
        return this.authService.loginFuncionario(loginDto);
    }

    // ──────────────────────────────────────────────
    // PERFIL DO UTILIZADOR AUTENTICADO
    // ──────────────────────────────────────────────
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Obter Perfil do Utilizador Autenticado',
        description: 'Retorna dados do cliente ou funcionário autenticado com base no token JWT.',
    })
    @ApiResponse({ status: 200, description: 'Perfil retornado com sucesso.' })
    async getProfile(@Request() req) {
        return this.authService.getProfile(req.user.userId, req.user.type);
    }

    // ──────────────────────────────────────────────
    // CRIAR AUTENTICAÇÃO PARA CLIENTE (Admin)
    // ──────────────────────────────────────────────
    @UseGuards(JwtAuthGuard)
    @Post('register')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Criar Acesso para um Cliente (Admin)',
        description: `
Cria as credenciais de acesso (username + senha) para um cliente já cadastrado.

**Pré-requisito:** O cliente deve já existir na tabela de clientes.

**Regras:**
- O \`clienteId\` deve ser válido (cliente já cadastrado)
- Um cliente só pode ter UM acesso (OneToOne)
- O \`username\` deve ser único no sistema
- A \`password\` deve ter no mínimo 6 caracteres
        `,
    })
    @ApiBody({ type: CreateAutenticacaoDto })
    @ApiResponse({ status: 201, description: 'Acesso criado com sucesso.' })
    @ApiResponse({ status: 400, description: 'Cliente não encontrado com o clienteId fornecido.' })
    @ApiResponse({ status: 409, description: 'Username já em uso ou cliente já possui acesso.' })
    async create(@Body() createDto: CreateAutenticacaoDto) {
        return this.authService.create(createDto);
    }

    // ──────────────────────────────────────────────
    // LISTAR TODAS AS AUTENTICAÇÕES
    // ──────────────────────────────────────────────
    @UseGuards(JwtAuthGuard)
    @Get('users')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Listar Todas as Autenticações de Clientes',
        description: 'Retorna a lista de todos os acessos de clientes registados. Não expõe a senha.',
    })
    async findAll() {
        return this.authService.findAll();
    }

    // ──────────────────────────────────────────────
    // BUSCAR AUTENTICAÇÃO POR ID DE AUTENTICAÇÃO
    // ──────────────────────────────────────────────
    @UseGuards(JwtAuthGuard)
    @Get('users/:id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Buscar Autenticação pelo ID de Autenticação',
        description: 'Retorna os dados de acesso de um cliente pelo ID da autenticação. A senha **não** é retornada.',
    })
    @ApiParam({ name: 'id', description: 'ID da Autenticação (autenticacaoId)', example: '1' })
    @ApiResponse({ status: 200, description: 'Autenticação encontrada.' })
    @ApiResponse({ status: 404, description: 'Autenticação não encontrada.' })
    async findOne(@Param('id') id: string) {
        return this.authService.findOne(id);
    }

    // ──────────────────────────────────────────────
    // BUSCAR AUTENTICAÇÃO PELO ID DO CLIENTE ⭐ NOVO
    // ──────────────────────────────────────────────
    @UseGuards(JwtAuthGuard)
    @Get('cliente/:clienteId')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Buscar Autenticação pelo ID do Cliente ⭐',
        description: `
Retorna os dados de acesso de um cliente pelo **ID do Cliente** (não pelo ID da autenticação).

Útil para o painel admin verificar se um cliente já tem acesso criado e qual é o seu username.

⚠️ A senha nunca é retornada por segurança.
        `,
    })
    @ApiParam({ name: 'clienteId', description: 'ID do Cliente (clienteId)', example: '6' })
    @ApiResponse({ status: 200, description: 'Autenticação do cliente encontrada.' })
    @ApiResponse({ status: 404, description: 'Nenhuma autenticação encontrada para este cliente.' })
    async findByClienteId(@Param('clienteId') clienteId: string) {
        return this.authService.findByClienteId(clienteId);
    }

    // ──────────────────────────────────────────────
    // ATUALIZAR CREDENCIAIS COM SEGURANÇA ⭐ NOVO
    // ──────────────────────────────────────────────
    @UseGuards(JwtAuthGuard)
    @Patch('cliente/:clienteId/credenciais')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Atualizar Credenciais do Cliente com Confirmação de Segurança ⭐',
        description: `
Atualiza o username e/ou a senha de um cliente com **verificação obrigatória** das credenciais atuais.

**Campos obrigatórios:**
- \`usernameAtual\`: username atual (para confirmar identidade)
- \`senhaAtual\`: senha atual (para confirmar identidade)

**Campos opcionais (preencha pelo menos um):**
- \`novoUsername\`: novo username desejado
- \`novaSenha\`: nova senha (mínimo 6 caracteres)
        `,
    })
    @ApiParam({ name: 'clienteId', description: 'ID do Cliente', example: '6' })
    @ApiBody({ type: UpdateCredenciaisClienteDto })
    @ApiResponse({ status: 200, description: 'Credenciais atualizadas com sucesso.' })
    @ApiResponse({ status: 401, description: 'Username atual ou senha atual incorretos.' })
    @ApiResponse({ status: 404, description: 'Cliente não possui autenticação registada.' })
    @ApiResponse({ status: 409, description: 'O novo username já está em uso.' })
    async updateCredenciais(
        @Param('clienteId') clienteId: string,
        @Body() updateDto: UpdateCredenciaisClienteDto,
    ) {
        return this.authService.updateCredenciaisSeguro(clienteId, updateDto);
    }

    // ──────────────────────────────────────────────
    // BLOQUEAR CONTA DO CLIENTE
    // ──────────────────────────────────────────────
    @UseGuards(JwtAuthGuard)
    @Patch('cliente/:clienteId/bloquear')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Bloquear Acesso de um Cliente',
        description: 'Bloqueia a conta de um cliente, impedindo novos logins até ser desbloqueada.',
    })
    @ApiParam({ name: 'clienteId', description: 'ID do Cliente', example: '6' })
    @ApiResponse({ status: 200, description: 'Conta bloqueada com sucesso.' })
    @ApiResponse({ status: 404, description: 'Nenhuma autenticação encontrada para este cliente.' })
    async bloquearCliente(@Param('clienteId') clienteId: string) {
        return this.authService.toggleBloqueio(clienteId, true);
    }

    // ──────────────────────────────────────────────
    // DESBLOQUEAR CONTA DO CLIENTE
    // ──────────────────────────────────────────────
    @UseGuards(JwtAuthGuard)
    @Patch('cliente/:clienteId/desbloquear')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Desbloquear Acesso de um Cliente',
        description: 'Desbloqueia a conta de um cliente e reinicia o contador de tentativas falhadas.',
    })
    @ApiParam({ name: 'clienteId', description: 'ID do Cliente', example: '6' })
    @ApiResponse({ status: 200, description: 'Conta desbloqueada com sucesso.' })
    async desbloquearCliente(@Param('clienteId') clienteId: string) {
        return this.authService.toggleBloqueio(clienteId, false);
    }

    // ──────────────────────────────────────────────
    // ATUALIZAR AUTENTICAÇÃO (Admin — por autenticacaoId)
    // ──────────────────────────────────────────────
    @UseGuards(JwtAuthGuard)
    @Put('users/:id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Atualizar Autenticação pelo ID da Autenticação (Admin)',
        description: 'Permite ao admin atualizar username e/ou senha diretamente, sem necessidade de confirmar a senha atual.',
    })
    @ApiParam({ name: 'id', description: 'ID da Autenticação (autenticacaoId)', example: '1' })
    @ApiBody({ type: UpdateAutenticacaoDto })
    async update(@Param('id') id: string, @Body() updateDto: UpdateAutenticacaoDto) {
        return this.authService.update(id, updateDto);
    }

    // ──────────────────────────────────────────────
    // REMOVER AUTENTICAÇÃO
    // ──────────────────────────────────────────────
    @UseGuards(JwtAuthGuard)
    @Delete('users/:id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Remover Autenticação (Admin)',
        description: 'Remove permanentemente o acesso de um cliente. O cliente continua cadastrado, mas não pode mais fazer login.',
    })
    @ApiParam({ name: 'id', description: 'ID da Autenticação (autenticacaoId)', example: '1' })
    @ApiResponse({ status: 200, description: 'Autenticação removida com sucesso.' })
    @ApiResponse({ status: 404, description: 'Autenticação não encontrada.' })
    async remove(@Param('id') id: string) {
        return this.authService.remove(id);
    }
}
