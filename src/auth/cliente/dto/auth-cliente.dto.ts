import { IsNotEmpty, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginClienteDto {
    @ApiProperty({ example: 'joao.silva', description: 'Nome de usuário do cliente' })
    @IsNotEmpty()
    @IsString()
    username: string;

    @ApiProperty({ example: 'senha123', description: 'Senha de acesso' })
    @IsNotEmpty()
    @IsString()
    password: string;
}

export class CreateAutenticacaoDto {
    @ApiProperty({ example: 'uuid-do-cliente', description: 'ID do cliente vinculado' })
    @IsNotEmpty()
    @IsString()
    clienteId: string;

    @ApiProperty({ example: 'joao.silva', description: 'Nome de usuário desejado' })
    @IsNotEmpty()
    @IsString()
    username: string;

    @ApiProperty({ example: 'senha123', description: 'Senha de acesso (mínimo 6 caracteres)', minLength: 6 })
    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    password: string;
}

export class UpdateAutenticacaoDto {
    @ApiProperty({ example: 'joao.novo', description: 'Novo nome de usuário', required: false })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiProperty({ example: 'novaSenha123', description: 'Nova senha de acesso', required: false, minLength: 6 })
    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;

    @ApiProperty({ example: false, description: 'Estado de bloqueio da conta', required: false })
    @IsOptional()
    @IsBoolean()
    bloqueado?: boolean;
}
