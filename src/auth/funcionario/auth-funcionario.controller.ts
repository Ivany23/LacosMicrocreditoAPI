import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthFuncionarioService } from './auth-funcionario.service';
import { LoginFuncionarioDto } from './dto/auth-funcionario.dto';

@ApiTags('⚙️ Autenticação - Funcionários')
@Controller('auth/funcionario')
export class AuthFuncionarioController {
    constructor(private readonly authFuncionarioService: AuthFuncionarioService) { }

    @Post('login')
    @ApiOperation({ summary: 'Realiza o login do funcionário/administrador' })
    @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
    @ApiResponse({ status: 401, description: 'Credenciais inválidas ou conta bloqueada' })
    login(@Body() loginDto: LoginFuncionarioDto) {
        return this.authFuncionarioService.login(loginDto);
    }
}
