import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AutenticacaoCliente } from '../../entities/autenticacao-cliente.entity';
import { LoginClienteDto, CreateAutenticacaoDto, UpdateAutenticacaoDto } from './dto/auth-cliente.dto';

@Injectable()
export class AuthClienteService {
    constructor(
        @InjectRepository(AutenticacaoCliente) private autenticacaoRepository: Repository<AutenticacaoCliente>,
        private jwtService: JwtService,
    ) { }

    async login(loginDto: LoginClienteDto) {
        const auth = await this.autenticacaoRepository.findOne({ where: { username: loginDto.username }, relations: ['cliente'] });
        if (!auth) throw new UnauthorizedException('Credenciais inválidas');
        if (auth.bloqueado) throw new UnauthorizedException('Conta bloqueada');
        
        const isPasswordValid = await bcrypt.compare(loginDto.password, auth.passwordHash);
        if (!isPasswordValid) {
            auth.tentativasLogin += 1;
            if (auth.tentativasLogin >= 5) {
                auth.bloqueado = true;
                auth.dataBloqueio = new Date();
            }
            await this.autenticacaoRepository.save(auth);
            throw new UnauthorizedException('Credenciais inválidas');
        }

        auth.tentativasLogin = 0;
        auth.ultimoLogin = new Date();
        await this.autenticacaoRepository.save(auth);

        const payload = { username: auth.username, sub: auth.autenticacaoId, clienteId: auth.clienteId, type: 'cliente' };
        return {
            access_token: this.jwtService.sign(payload),
            clienteId: auth.clienteId,
            username: auth.username,
            type: 'cliente',
            cliente: auth.cliente ? { nome: auth.cliente.nome, email: auth.cliente.email, telefone: auth.cliente.telefone } : null,
        };
    }

    async getProfile(userId: string) {
        const auth = await this.autenticacaoRepository.findOne({ where: { autenticacaoId: userId }, relations: ['cliente'] });
        if (!auth) throw new UnauthorizedException();
        return { username: auth.username, clienteId: auth.clienteId, cliente: auth.cliente, type: 'cliente' };
    }

    async create(createDto: CreateAutenticacaoDto) {
        const existingByUsername = await this.autenticacaoRepository.findOne({ where: { username: createDto.username } });
        if (existingByUsername) throw new ConflictException('Username já em uso');

        const existingByCliente = await this.autenticacaoRepository.findOne({ where: { clienteId: createDto.clienteId } });
        if (existingByCliente) throw new ConflictException('O cliente já possui acessos');

        try {
            const hashedPassword = await bcrypt.hash(createDto.password, 10);
            const autenticacao = this.autenticacaoRepository.create({
                clienteId: createDto.clienteId,
                username: createDto.username,
                passwordHash: hashedPassword,
                tentativasLogin: 0,
                bloqueado: false,
            });
            const saved = await this.autenticacaoRepository.save(autenticacao);
            return { message: 'Acesso criado', autenticacaoId: saved.autenticacaoId, clienteId: saved.clienteId, username: saved.username, dataCriacao: saved.dataCriacao };
        } catch (error: any) {
            if (error?.code === '23503') throw new BadRequestException('Cliente não encontrado');
            if (error?.code === '23505') throw new ConflictException('Username ou clienteId já existe');
            throw new InternalServerErrorException('Erro ao criar autenticação');
        }
    }

    async findByClienteId(clienteId: string) {
        const autenticacao = await this.autenticacaoRepository.findOne({
            where: { clienteId },
            select: ['autenticacaoId', 'clienteId', 'username', 'dataCriacao', 'ultimoLogin', 'tentativasLogin', 'bloqueado', 'dataBloqueio'],
        });
        if (!autenticacao) throw new NotFoundException('Autenticação não encontrada');
        return autenticacao;
    }

    async update(clienteId: string, updateDto: UpdateAutenticacaoDto) {
        const autenticacao = await this.autenticacaoRepository.findOne({ where: { clienteId } });
        if (!autenticacao) throw new NotFoundException('Autenticação não encontrada');

        if (updateDto.username && updateDto.username !== autenticacao.username) {
            const existingAuth = await this.autenticacaoRepository.findOne({ where: { username: updateDto.username } });
            if (existingAuth) throw new ConflictException('O username já em uso');
            autenticacao.username = updateDto.username;
        }

        if (updateDto.password) {
            autenticacao.passwordHash = await bcrypt.hash(updateDto.password, 10);
        }

        if (updateDto.bloqueado !== undefined) {
            autenticacao.bloqueado = updateDto.bloqueado;
            autenticacao.dataBloqueio = updateDto.bloqueado ? new Date() : null;
            if (!updateDto.bloqueado) autenticacao.tentativasLogin = 0;
        }

        await this.autenticacaoRepository.save(autenticacao);
        return { message: 'Atualizado com sucesso', clienteId: autenticacao.clienteId, username: autenticacao.username, bloqueado: autenticacao.bloqueado };
    }
}
