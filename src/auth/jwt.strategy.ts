import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutenticacaoCliente } from '../entities/autenticacao-cliente.entity';
import { AuthConstants } from './constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        @InjectRepository(AutenticacaoCliente)
        private autenticacaoRepository: Repository<AutenticacaoCliente>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: AuthConstants.jwtSecret,
        });
    }

    async validate(payload: any) {
        const auth = await this.autenticacaoRepository.findOne({
            where: { autenticacaoId: String(payload.sub) },
            relations: ['cliente'],
        });

        if (!auth || auth.bloqueado) {
            throw new UnauthorizedException();
        }

        return { userId: payload.sub, username: payload.username, clienteId: auth.clienteId };
    }
}
