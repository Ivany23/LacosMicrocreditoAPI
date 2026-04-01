import { IsNotEmpty, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class LoginClienteDto {
    @IsNotEmpty()
    @IsString()
    username: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}

export class CreateAutenticacaoDto {
    @IsNotEmpty()
    @IsString()
    clienteId: string;

    @IsNotEmpty()
    @IsString()
    username: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    password: string;
}

export class UpdateAutenticacaoDto {
    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;

    @IsOptional()
    @IsBoolean()
    bloqueado?: boolean;
}
