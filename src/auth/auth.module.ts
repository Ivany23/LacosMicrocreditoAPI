import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { AutenticacaoCliente } from '../entities/autenticacao-cliente.entity';
import { AuthConstants } from './constants';

@Module({
    imports: [
        TypeOrmModule.forFeature([AutenticacaoCliente]),
        PassportModule,
        JwtModule.register({
            secret: AuthConstants.jwtSecret,
            signOptions: {
                expiresIn: AuthConstants.jwtExpiration,
            },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule { }

