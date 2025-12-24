import { IsNotEmpty, IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EmprestimoStatus {
    ATIVO = 'Ativo',
    PAGO = 'Pago',
    INADIMPLENTE = 'Inadimplente'
}

export class CreateEmprestimoDto {
    @ApiProperty({ example: '1', description: 'ID do Cliente' })
    @IsNotEmpty()
    @IsString()
    clienteId: string;

    @ApiProperty({ example: 5000.00, description: 'Valor do empréstimo' })
    @IsNotEmpty()
    @IsNumber()
    valor: number;

    @ApiProperty({ example: '2023-12-31', description: 'Data de vencimento (YYYY-MM-DD)' })
    @IsNotEmpty()
    @IsDateString()
    dataVencimento: string;
}

export class UpdateEmprestimoDto {
    @ApiPropertyOptional({ example: 6000.00 })
    @IsOptional()
    @IsNumber()
    valor?: number;

    @ApiPropertyOptional({ example: '2024-01-15' })
    @IsOptional()
    @IsDateString()
    dataVencimento?: string;
}
