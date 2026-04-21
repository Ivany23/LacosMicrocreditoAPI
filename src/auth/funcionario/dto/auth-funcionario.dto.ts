import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginFuncionarioDto {
    @ApiProperty({ example: 'admin', description: 'Nome de usuário do funcionário' })
    @IsNotEmpty()
    @IsString()
    username: string;

    @ApiProperty({ example: 'admin123', description: 'Senha de acesso' })
    @IsNotEmpty()
    @IsString()
    password: string;
}
