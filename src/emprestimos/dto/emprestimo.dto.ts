import { IsNotEmpty, IsString, IsNumber, IsDateString, IsOptional, IsEnum } from 'class-validator';
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

    // dataEmprestimo removido - gerado automaticamente pelo sistema

    @ApiProperty({ example: '2023-12-01T10:00:00Z', description: 'Data de vencimento' })
    @IsNotEmpty()
    @IsDateString()
    dataVencimento: string;

    @ApiPropertyOptional({ example: EmprestimoStatus.ATIVO, description: 'Status inicial do empréstimo', enum: EmprestimoStatus, default: EmprestimoStatus.ATIVO })
    @IsOptional()
    @IsEnum(EmprestimoStatus)
    status?: string;
}

export class UpdateEmprestimoDto {
    @ApiPropertyOptional({ example: 6000.00 })
    @IsOptional()
    @IsNumber()
    valor?: number;

    @ApiPropertyOptional({ example: '2023-12-15T10:00:00Z' })
    @IsOptional()
    @IsDateString()
    dataVencimento?: string;

    @ApiPropertyOptional({ example: EmprestimoStatus.PAGO, description: 'Novo status', enum: EmprestimoStatus })
    @IsOptional()
    @IsEnum(EmprestimoStatus)
    status?: string;
}
