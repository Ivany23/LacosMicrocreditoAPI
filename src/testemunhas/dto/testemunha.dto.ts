import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GrauParentesco {
    PARENTE = 'Parente',
    AMIGO = 'Amigo',
    COLEGA = 'Colega',
    OUTRO = 'Outro'
}

export class CreateTestemunhaDto {
    @ApiProperty({ example: '1', description: 'ID do Cliente' })
    @IsNotEmpty()
    @IsString()
    clienteId: string;

    @ApiProperty({ example: 'Carlos Alberto', description: 'Nome da testemunha' })
    @IsNotEmpty()
    @IsString()
    nome: string;

    @ApiProperty({ example: '+258841112223', description: 'Telefone da testemunha' })
    @IsNotEmpty()
    @IsString()
    telefone: string;

    @ApiProperty({ example: GrauParentesco.PARENTE, description: 'Grau de parentesco', enum: GrauParentesco })
    @IsNotEmpty()
    @IsEnum(GrauParentesco)
    grauParentesco: string;
}

export class UpdateTestemunhaDto {
    @ApiPropertyOptional({ example: 'Carlos Alberto Junior' })
    @IsOptional()
    @IsString()
    nome?: string;

    @ApiPropertyOptional({ example: '+258849991111' })
    @IsOptional()
    @IsString()
    telefone?: string;

    @ApiPropertyOptional({ example: 'Primo', enum: GrauParentesco })
    @IsOptional()
    @IsEnum(GrauParentesco)
    grauParentesco?: string;
}
