import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Funcionario } from '../entities/funcionario.entity';
import { CreateFuncionarioDto, UpdateFuncionarioDto, UpdatePasswordDto } from './dto/funcionario.dto';

@Injectable()
export class FuncionariosService {
    constructor(
        @InjectRepository(Funcionario) private funcionarioRepository: Repository<Funcionario>,
    ) { }

    async create(createDto: CreateFuncionarioDto) {
        const existing = await this.funcionarioRepository.findOne({
            where: [{ email: createDto.email }, { username: createDto.username }]
        });
        if (existing) throw new ConflictException('Email ou Username duplicado');
        const passwordHash = await bcrypt.hash(createDto.password, 10);
        const funcionario = this.funcionarioRepository.create({ ...createDto, passwordHash });
        return await this.funcionarioRepository.save(funcionario);
    }

    async findAll() {
        return await this.funcionarioRepository.find();
    }

    async findOne(id: string) {
        const funcionario = await this.funcionarioRepository.findOne({ where: { funcionarioId: id } });
        if (!funcionario) throw new NotFoundException('Funcionário não existe');
        return funcionario;
    }

    async update(id: string, updateDto: UpdateFuncionarioDto) {
        const funcionario = await this.findOne(id);
        if (updateDto.email || updateDto.username) {
            const existing = await this.funcionarioRepository.findOne({
                where: [
                    updateDto.email ? { email: updateDto.email } : {},
                    updateDto.username ? { username: updateDto.username } : {}
                ].filter(obj => Object.keys(obj).length > 0)
            });
            if (existing && String(existing.funcionarioId) !== String(id)) {
                throw new ConflictException('Email ou Username duplicado');
            }
        }
        Object.assign(funcionario, updateDto);
        return await this.funcionarioRepository.save(funcionario);
    }

    async updatePassword(id: string, passwordDto: UpdatePasswordDto) {
        const funcionario = await this.findOne(id);
        const isMatch = await bcrypt.compare(passwordDto.oldPassword, funcionario.passwordHash);
        if (!isMatch) throw new ForbiddenException('Senha atual incorreta');
        funcionario.passwordHash = await bcrypt.hash(passwordDto.newPassword, 10);
        await this.funcionarioRepository.save(funcionario);
        return { message: 'Senha atualizada' };
    }

    async remove(id: string) {
        const funcionario = await this.findOne(id);
        await this.funcionarioRepository.remove(funcionario);
        return { message: 'Removido com sucesso' };
    }
}
