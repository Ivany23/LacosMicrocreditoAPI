import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthClienteService } from './cliente/auth-cliente.service';
import { AuthClienteController } from './cliente/auth-cliente.controller';
import { AuthFuncionarioService } from './funcionario/auth-funcionario.service';
import { AuthFuncionarioController } from './funcionario/auth-funcionario.controller';
import { JwtStrategy } from './jwt.strategy';
import { AutenticacaoCliente } from '../entities/autenticacao-cliente.entity';
import { Funcionario } from '../entities/funcionario.entity';
import { AuthConstants } from './constants';
import { FuncionariosModule } from '../funcionarios/funcionarios.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([AutenticacaoCliente, Funcionario]),
        PassportModule,
        JwtModule.register({
            secret: AuthConstants.jwtSecret,
            signOptions: {
                expiresIn: AuthConstants.jwtExpiration,
            },
        }),
        FuncionariosModule,
    ],
    controllers: [AuthClienteController, AuthFuncionarioController],
    providers: [AuthClienteService, AuthFuncionarioService, JwtStrategy],
    exports: [AuthClienteService, AuthFuncionarioService],
})
export class AuthModule { }
