import { IsNotEmpty, IsString, IsEmail, IsEnum, IsOptional, MinLength } from 'class-validator';
import { FuncionarioRole } from '../../entities/funcionario.entity';

export class LoginFuncionarioDto {
    @IsNotEmpty()
    @IsString()
    username: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}

export class CreateFuncionarioDto {
    @IsNotEmpty()
    @IsString()
    nome: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    username: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    password: string;

    @IsNotEmpty()
    @IsEnum(FuncionarioRole)
    role: FuncionarioRole;
}

export class UpdateFuncionarioDto {
    @IsOptional()
    @IsString()
    nome?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsEnum(FuncionarioRole)
    role?: FuncionarioRole;
}

export class UpdatePasswordDto {
    @IsNotEmpty()
    @IsString()
    oldPassword: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    newPassword: string;
}
