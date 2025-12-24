import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StatusPenalizacao {
    PENDENTE = 'pendente',
    SIMULADO = 'simulado',
    APLICADA = 'aplicada',
    CANCELADA = 'cancelada'
}

export class CreatePenalizacaoDto {
    @ApiProperty({ example: '1', description: 'ID do Empréstimo' })
    @IsNotEmpty()
    @IsString()
    emprestimoId: string;

    @ApiProperty({ example: '1', description: 'ID do Cliente' })
    @IsNotEmpty()
    @IsString()
    clienteId: string;

    @ApiProperty({ example: 'atraso', description: 'Tipo da penalização' })
    @IsNotEmpty()
    @IsString()
    tipo: string;

    @ApiProperty({ example: 5, description: 'Dias de atraso' })
    @IsNotEmpty()
    @IsNumber()
    diasAtraso: number;

    @ApiProperty({ example: 250.00, description: 'Valor da multa' })
    @IsNotEmpty()
    @IsNumber()
    valor: number;

    @ApiProperty({ example: StatusPenalizacao.PENDENTE, description: 'Status', enum: StatusPenalizacao, default: StatusPenalizacao.PENDENTE })
    @IsNotEmpty()
    @IsEnum(StatusPenalizacao)
    status: string;

    @ApiPropertyOptional({ example: 'Multa aplicada automaticamente pelo sistema', description: 'Observações' })
    @IsOptional()
    @IsString()
    observacoes?: string;
}
