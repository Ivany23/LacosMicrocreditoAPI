import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOcupacaoDto {
    @ApiProperty({ example: '1', description: 'ID do Cliente' })
    @IsNotEmpty()
    @IsString()
    clienteId: string;

    @ApiProperty({ example: 'ENG001', description: 'Código da ocupação' })
    @IsNotEmpty()
    @IsString()
    codigo: string;

    @ApiProperty({ example: 'Engenheiro Civil', description: 'Nome da profissão' })
    @IsNotEmpty()
    @IsString()
    nome: string;

    @ApiPropertyOptional({ example: 'Trabalha em obras de infraestrutura' })
    @IsOptional()
    @IsString()
    descricao?: string;

    @ApiPropertyOptional({ example: 25000.00, description: 'Renda mínima mensal' })
    @IsOptional()
    @IsNumber()
    rendaMinima?: number;

    @ApiPropertyOptional({ example: true, description: 'Se está ativo na ocupação' })
    @IsOptional()
    @IsBoolean()
    ativo?: boolean;
}

export class UpdateOcupacaoDto {
    @ApiPropertyOptional({ example: 'ENG002' })
    @IsOptional()
    @IsString()
    codigo?: string;

    @ApiPropertyOptional({ example: 'Engenheiro Chefe' })
    @IsOptional()
    @IsString()
    nome?: string;

    @ApiPropertyOptional({ example: 'Responsável técnico' })
    @IsOptional()
    @IsString()
    descricao?: string;

    @ApiPropertyOptional({ example: 40000.00 })
    @IsOptional()
    @IsNumber()
    rendaMinima?: number;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    ativo?: boolean;
}
