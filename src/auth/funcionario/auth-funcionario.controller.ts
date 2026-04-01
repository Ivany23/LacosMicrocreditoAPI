import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthFuncionarioService } from './auth-funcionario.service';
import { LoginFuncionarioDto } from './dto/auth-funcionario.dto';

@ApiTags('⚙️ Autenticação - Funcionários')
@Controller('auth/funcionario')
export class AuthFuncionarioController {
    constructor(private readonly authFuncionarioService: AuthFuncionarioService) { }

    @Post('login')
    login(@Body() loginDto: LoginFuncionarioDto) {
        return this.authFuncionarioService.login(loginDto);
    }
}
