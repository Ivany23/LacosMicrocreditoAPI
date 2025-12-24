
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'joaosilva', description: 'Nome de usuário' })
    @IsNotEmpty()
    @IsString()
    username: string;

    @ApiProperty({ example: 'SenhaForte123!', description: 'Senha do usuário' })
    @IsNotEmpty()
    @IsString()
    password: string;
}
