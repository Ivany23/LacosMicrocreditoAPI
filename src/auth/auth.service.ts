import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    NotFoundException,
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AutenticacaoCliente } from '../entities/autenticacao-cliente.entity';
import { LoginDto } from './dto/auth.dto';
import {
    CreateAutenticacaoDto,
    UpdateAutenticacaoDto,
    UpdateCredenciaisClienteDto,
} from './dto/autenticacao-crud.dto';
import { FuncionariosService } from '../funcionarios/funcionarios.service';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(AutenticacaoCliente)
        private autenticacaoRepository: Repository<AutenticacaoCliente>,
        private jwtService: JwtService,
        private funcionariosService: FuncionariosService,
    ) { }

    // ─────────────────────────────────────────────
    // LOGIN — CLIENTES
    // ─────────────────────────────────────────────
    async login(loginDto: LoginDto) {
        const auth = await this.autenticacaoRepository.findOne({
            where: { username: loginDto.username },
            relations: ['cliente'],
        });

        if (!auth) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        if (auth.bloqueado) {
            throw new UnauthorizedException('Conta bloqueada. Contacte o administrador.');
        }

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

        const payload = {
            username: auth.username,
            sub: auth.autenticacaoId,
            clienteId: auth.clienteId,
            type: 'cliente',
        };
        const token = this.jwtService.sign(payload);

        return {
            access_token: token,
            clienteId: auth.clienteId,
            username: auth.username,
            type: 'cliente',
            cliente: auth.cliente
                ? {
                    nome: auth.cliente.nome,
                    email: auth.cliente.email,
                    telefone: auth.cliente.telefone,
                }
                : null,
        };
    }

    // ─────────────────────────────────────────────
    // LOGIN — FUNCIONÁRIOS / ADMINISTRADORES
    // ─────────────────────────────────────────────
    async loginFuncionario(loginDto: LoginDto) {
        const funcionario = await this.funcionariosService.findByUsername(loginDto.username);

        if (!funcionario) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        try {
            if (funcionario.bloqueado) {
                throw new UnauthorizedException('Conta bloqueada. Contacte o suporte.');
            }

            if (!funcionario.passwordHash) {
                throw new UnauthorizedException('Erro na configuração da conta. Contacte o administrador.');
            }

            const isPasswordValid = await bcrypt.compare(loginDto.password, funcionario.passwordHash);

            if (!isPasswordValid) {
                await this.funcionariosService.updateTentativasLogin(loginDto.username);
                throw new UnauthorizedException('Credenciais inválidas');
            }

            await this.funcionariosService.updateLoginStats(String(funcionario.funcionarioId));

            const payload = {
                username: funcionario.username,
                sub: String(funcionario.funcionarioId),
                role: funcionario.role,
                type: 'funcionario',
            };
            const token = this.jwtService.sign(payload);

            return {
                access_token: token,
                funcionarioId: String(funcionario.funcionarioId),
                username: funcionario.username,
                role: funcionario.role,
                nome: funcionario.nome,
                type: 'funcionario',
                message: 'Login bem-sucedido',
            };
        } catch (error) {
            if (error instanceof UnauthorizedException) throw error;
            throw new UnauthorizedException('Falha no processo de login. Verifique os dados ou contacte o suporte.');
        }
    }

    // ─────────────────────────────────────────────
    // PERFIL DO UTILIZADOR AUTENTICADO
    // ─────────────────────────────────────────────
    async getProfile(userId: string, type: string = 'cliente') {
        if (type === 'funcionario') {
            const funcionario = await this.funcionariosService.findOne(userId);
            return {
                username: funcionario.username,
                nome: funcionario.nome,
                role: funcionario.role,
                type: 'funcionario',
            };
        }

        const auth = await this.autenticacaoRepository.findOne({
            where: { autenticacaoId: userId },
            relations: ['cliente'],
        });

        if (!auth) throw new UnauthorizedException();

        return {
            username: auth.username,
            clienteId: auth.clienteId,
            cliente: auth.cliente,
            type: 'cliente',
        };
    }

    // ─────────────────────────────────────────────
    // CRIAR AUTENTICAÇÃO PARA CLIENTE (Admin)
    // ─────────────────────────────────────────────
    async create(createDto: CreateAutenticacaoDto) {
        // Verificar se o username já existe
        const existingByUsername = await this.autenticacaoRepository.findOne({
            where: { username: createDto.username },
        });

        if (existingByUsername) {
            throw new ConflictException(`O username "${createDto.username}" já está em uso`);
        }

        // Verificar se o cliente já possui autenticação (OneToOne)
        const existingByCliente = await this.autenticacaoRepository.findOne({
            where: { clienteId: createDto.clienteId },
        });

        if (existingByCliente) {
            throw new ConflictException(`O cliente ID ${createDto.clienteId} já possui credenciais de acesso`);
        }

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

            return {
                message: 'Acesso criado com sucesso para o cliente',
                autenticacaoId: saved.autenticacaoId,
                clienteId: saved.clienteId,
                username: saved.username,
                dataCriacao: saved.dataCriacao,
            };
        } catch (error) {
            // Captura erros de FK (cliente não existe) e UNIQUE violation
            if (error?.code === '23503') {
                throw new BadRequestException(`Cliente com ID ${createDto.clienteId} não encontrado na base de dados`);
            }
            if (error?.code === '23505') {
                throw new ConflictException('Username ou clienteId já existe');
            }
            throw new InternalServerErrorException('Erro ao criar autenticação: ' + error.message);
        }
    }

    // ─────────────────────────────────────────────
    // LISTAR TODAS AS AUTENTICAÇÕES
    // ─────────────────────────────────────────────
    async findAll() {
        return this.autenticacaoRepository.find({
            select: ['autenticacaoId', 'clienteId', 'username', 'dataCriacao', 'ultimoLogin', 'tentativasLogin', 'bloqueado'],
        });
    }

    // ─────────────────────────────────────────────
    // BUSCAR AUTENTICAÇÃO POR ID DE AUTENTICAÇÃO
    // ─────────────────────────────────────────────
    async findOne(id: string) {
        const autenticacao = await this.autenticacaoRepository.findOne({
            where: { autenticacaoId: id },
            select: ['autenticacaoId', 'clienteId', 'username', 'dataCriacao', 'ultimoLogin', 'tentativasLogin', 'bloqueado', 'dataBloqueio'],
        });

        if (!autenticacao) {
            throw new NotFoundException('Autenticação não encontrada');
        }

        return autenticacao;
    }

    // ─────────────────────────────────────────────
    // BUSCAR AUTENTICAÇÃO PELO ID DO CLIENTE
    // ─────────────────────────────────────────────
    async findByClienteId(clienteId: string) {
        const autenticacao = await this.autenticacaoRepository.findOne({
            where: { clienteId },
            select: ['autenticacaoId', 'clienteId', 'username', 'dataCriacao', 'ultimoLogin', 'tentativasLogin', 'bloqueado', 'dataBloqueio'],
        });

        if (!autenticacao) {
            throw new NotFoundException(`Nenhuma autenticação encontrada para o cliente ID ${clienteId}`);
        }

        return autenticacao;
    }

    // ─────────────────────────────────────────────
    // ATUALIZAR AUTENTICAÇÃO (Admin — por ID de autenticação)
    // ─────────────────────────────────────────────
    async update(id: string, updateDto: UpdateAutenticacaoDto) {
        const autenticacao = await this.autenticacaoRepository.findOne({
            where: { autenticacaoId: id },
        });

        if (!autenticacao) {
            throw new NotFoundException('Autenticação não encontrada');
        }

        if (updateDto.username && updateDto.username !== autenticacao.username) {
            const existingAuth = await this.autenticacaoRepository.findOne({
                where: { username: updateDto.username },
            });

            if (existingAuth) {
                throw new ConflictException(`O username "${updateDto.username}" já está em uso`);
            }

            autenticacao.username = updateDto.username;
        }

        if (updateDto.password) {
            autenticacao.passwordHash = await bcrypt.hash(updateDto.password, 10);
        }

        await this.autenticacaoRepository.save(autenticacao);

        return {
            message: 'Autenticação atualizada com sucesso',
            autenticacaoId: autenticacao.autenticacaoId,
            clienteId: autenticacao.clienteId,
            username: autenticacao.username,
        };
    }

    // ─────────────────────────────────────────────
    // ATUALIZAR CREDENCIAIS COM SEGURANÇA (requer senha atual)
    // ─────────────────────────────────────────────
    async updateCredenciaisSeguro(clienteId: string, updateDto: UpdateCredenciaisClienteDto) {
        const autenticacao = await this.autenticacaoRepository.findOne({
            where: { clienteId },
        });

        if (!autenticacao) {
            throw new NotFoundException(`Nenhuma autenticação encontrada para o cliente ID ${clienteId}`);
        }

        // Verificar username atual
        if (autenticacao.username !== updateDto.usernameAtual) {
            throw new UnauthorizedException('Username atual incorreto');
        }

        // Verificar senha atual
        const isSenhaValida = await bcrypt.compare(updateDto.senhaAtual, autenticacao.passwordHash);
        if (!isSenhaValida) {
            throw new UnauthorizedException('Senha atual incorreta');
        }

        // Aplicar novo username (se fornecido e diferente)
        if (updateDto.novoUsername && updateDto.novoUsername !== autenticacao.username) {
            const existingAuth = await this.autenticacaoRepository.findOne({
                where: { username: updateDto.novoUsername },
            });
            if (existingAuth) {
                throw new ConflictException(`O username "${updateDto.novoUsername}" já está em uso`);
            }
            autenticacao.username = updateDto.novoUsername;
        }

        // Aplicar nova senha (se fornecida)
        if (updateDto.novaSenha) {
            autenticacao.passwordHash = await bcrypt.hash(updateDto.novaSenha, 10);
        }

        if (!updateDto.novoUsername && !updateDto.novaSenha) {
            throw new BadRequestException('Forneça pelo menos um campo para atualizar: novoUsername ou novaSenha');
        }

        await this.autenticacaoRepository.save(autenticacao);

        return {
            message: 'Credenciais atualizadas com sucesso',
            clienteId: autenticacao.clienteId,
            username: autenticacao.username,
        };
    }

    // ─────────────────────────────────────────────
    // BLOQUEAR / DESBLOQUEAR CONTA DE CLIENTE
    // ─────────────────────────────────────────────
    async toggleBloqueio(clienteId: string, bloquear: boolean) {
        const autenticacao = await this.autenticacaoRepository.findOne({
            where: { clienteId },
        });

        if (!autenticacao) {
            throw new NotFoundException(`Nenhuma autenticação encontrada para o cliente ID ${clienteId}`);
        }

        autenticacao.bloqueado = bloquear;
        autenticacao.dataBloqueio = bloquear ? new Date() : null;
        if (!bloquear) autenticacao.tentativasLogin = 0;

        await this.autenticacaoRepository.save(autenticacao);

        return {
            message: bloquear ? 'Conta bloqueada com sucesso' : 'Conta desbloqueada com sucesso',
            clienteId: autenticacao.clienteId,
            username: autenticacao.username,
            bloqueado: autenticacao.bloqueado,
        };
    }

    // ─────────────────────────────────────────────
    // REMOVER AUTENTICAÇÃO
    // ─────────────────────────────────────────────
    async remove(id: string) {
        const autenticacao = await this.autenticacaoRepository.findOne({
            where: { autenticacaoId: id },
        });

        if (!autenticacao) {
            throw new NotFoundException('Autenticação não encontrada');
        }

        await this.autenticacaoRepository.remove(autenticacao);

        return {
            message: 'Autenticação removida com sucesso',
            autenticacaoId: id,
        };
    }
}
