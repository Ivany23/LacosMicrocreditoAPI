import { IsNotEmpty, IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePenhorDto {
    @ApiProperty({ description: 'ID do Cliente' })
    @IsNotEmpty()
    @IsString()
    clienteId: string;

    @ApiProperty({ description: 'Descrição do item penhorado' })
    @IsNotEmpty()
    @IsString()
    descricaoItem: string;

    @ApiProperty({ description: 'Valor estimado do ítem' })
    @IsNotEmpty()
    @Type(() => Number)
    @IsNumber()
    valorEstimado: number;

    @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Imagem do item' })
    @IsOptional()
    imagemPenhor?: any;
}

export class UpdatePenhorDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    descricaoItem?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    valorEstimado?: number;

    @ApiPropertyOptional({ type: 'string', format: 'binary' })
    @IsOptional()
    imagemPenhor?: any;
}
