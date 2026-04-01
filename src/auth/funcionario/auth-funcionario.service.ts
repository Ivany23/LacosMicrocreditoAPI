import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Funcionario } from '../../entities/funcionario.entity';
import { LoginFuncionarioDto } from './dto/auth-funcionario.dto';

@Injectable()
export class AuthFuncionarioService {
    constructor(
        @InjectRepository(Funcionario) private funcionarioRepository: Repository<Funcionario>,
        private jwtService: JwtService,
    ) { }

    async login(loginDto: LoginFuncionarioDto) {
        const funcionario = await this.funcionarioRepository.findOne({ where: { username: loginDto.username } });
        if (!funcionario) throw new UnauthorizedException('Credenciais inválidas');
        
        if (funcionario.bloqueado && funcionario.dataBloqueio) {
            const diffMs = new Date().getTime() - funcionario.dataBloqueio.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins >= 20) {
                funcionario.bloqueado = false;
                funcionario.tentativasLogin = 0;
                funcionario.dataBloqueio = null;
                await this.funcionarioRepository.save(funcionario);
            } else {
                throw new UnauthorizedException(`Conta bloqueada. Tente novamente em ${20 - diffMins} minutos.`);
            }
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, funcionario.passwordHash);
        if (!isPasswordValid) {
            funcionario.tentativasLogin += 1;
            if (funcionario.tentativasLogin >= 3) {
                funcionario.bloqueado = true;
                funcionario.dataBloqueio = new Date();
            }
            await this.funcionarioRepository.save(funcionario);
            throw new UnauthorizedException('Credenciais inválidas');
        }

        funcionario.ultimoLogin = new Date();
        funcionario.tentativasLogin = 0;
        await this.funcionarioRepository.save(funcionario);

        const payload = { username: funcionario.username, sub: String(funcionario.funcionarioId), role: funcionario.role, type: 'funcionario' };
        return {
            access_token: this.jwtService.sign(payload),
            funcionarioId: String(funcionario.funcionarioId),
            username: funcionario.username,
            role: funcionario.role,
            nome: funcionario.nome,
            type: 'funcionario',
        };
    }
}
