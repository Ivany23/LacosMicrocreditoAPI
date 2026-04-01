import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { FuncionariosService } from './funcionarios.service';
import { FuncionariosController } from './funcionarios.controller';
import { Funcionario } from '../entities/funcionario.entity';
import { AuthConstants } from '../auth/constants';

@Module({
    imports: [
        TypeOrmModule.forFeature([Funcionario]),
        JwtModule.register({
            secret: AuthConstants.jwtSecret,
            signOptions: { expiresIn: AuthConstants.jwtExpiration },
        }),
    ],
    controllers: [FuncionariosController],
    providers: [FuncionariosService],
    exports: [FuncionariosService],
})
export class FuncionariosModule { }
