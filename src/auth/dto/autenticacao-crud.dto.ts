import { IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAutenticacaoDto {
    @ApiProperty({ example: '1', description: 'ID do Cliente já registrado' })
    @IsNotEmpty({ message: 'Cliente ID é obrigatório' })
    @IsString()
    clienteId: string;

    @ApiProperty({ example: 'joaosilva', description: 'Nome de usuário único' })
    @IsNotEmpty({ message: 'Username é obrigatório' })
    @IsString()
    username: string;

    @ApiProperty({ example: 'SenhaForte123!', description: 'Senha de acesso (mínimo 6 caracteres)' })
    @IsNotEmpty({ message: 'Password é obrigatório' })
    @IsString()
    @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
    password: string;
}

export class UpdateAutenticacaoDto {
    @ApiProperty({ example: 'joaosilva', description: 'Nome de usuário único', required: false })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiProperty({ example: 'NovaSenha123!', description: 'Nova senha de acesso (mínimo 6 caracteres)', required: false })
    @IsOptional()
    @IsString()
    @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
    password?: string;
}
