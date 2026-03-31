import { IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAutenticacaoDto {
    @ApiProperty({ example: '6', description: 'ID do Cliente já registrado no sistema' })
    @IsNotEmpty({ message: 'clienteId é obrigatório' })
    @IsString()
    clienteId: string;

    @ApiProperty({ example: 'joao.silva', description: 'Nome de utilizador único (login)' })
    @IsNotEmpty({ message: 'username é obrigatório' })
    @IsString()
    username: string;

    @ApiProperty({ example: 'Senha@2025', description: 'Senha de acesso (mínimo 6 caracteres)' })
    @IsNotEmpty({ message: 'password é obrigatório' })
    @IsString()
    @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
    password: string;
}

export class UpdateAutenticacaoDto {
    @ApiProperty({ example: 'joao.silva.novo', description: 'Novo username (opcional)', required: false })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiProperty({ example: 'NovaSenha@2025', description: 'Nova senha (mínimo 6 caracteres)', required: false })
    @IsOptional()
    @IsString()
    @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
    password?: string;
}

/**
 * DTO para atualizar credenciais de um cliente com verificação da senha atual.
 * Garante segurança: o cliente deve confirmar a identidade antes de alterar.
 */
export class UpdateCredenciaisClienteDto {
    @ApiProperty({ example: 'joao.silva', description: 'Username atual do cliente (para confirmar identidade)' })
    @IsNotEmpty({ message: 'usernameAtual é obrigatório' })
    @IsString()
    usernameAtual: string;

    @ApiProperty({ example: 'SenhaAtual@2025', description: 'Senha atual do cliente (para confirmar identidade)' })
    @IsNotEmpty({ message: 'senhaAtual é obrigatória' })
    @IsString()
    senhaAtual: string;

    @ApiProperty({ example: 'joao.silva.novo', description: 'Novo username desejado (opcional)', required: false })
    @IsOptional()
    @IsString()
    novoUsername?: string;

    @ApiProperty({ example: 'NovaSenha@2025', description: 'Nova senha desejada (mínimo 6 caracteres, opcional)', required: false })
    @IsOptional()
    @IsString()
    @MinLength(6, { message: 'A nova senha deve ter no mínimo 6 caracteres' })
    novaSenha?: string;
}
