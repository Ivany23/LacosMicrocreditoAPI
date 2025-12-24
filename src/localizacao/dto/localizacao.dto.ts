import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLocalizacaoDto {
    @ApiProperty({ example: '1', description: 'ID do Cliente' })
    @IsNotEmpty()
    @IsString()
    clienteId: string;

    @ApiPropertyOptional({ example: 'Polana Cimento' })
    @IsOptional()
    @IsString()
    bairro?: string;

    @ApiPropertyOptional({ example: '123' })
    @IsOptional()
    @IsString()
    numeroDaCasa?: string;

    @ApiPropertyOptional({ example: 'Q20' })
    @IsOptional()
    @IsString()
    quarteirao?: string;

    @ApiProperty({ example: 'Maputo', description: 'Cidade' })
    @IsNotEmpty()
    @IsString()
    cidade: string;

    @ApiProperty({ example: 'KaMpfumo', description: 'Distrito' })
    @IsNotEmpty()
    @IsString()
    distrito: string;

    @ApiProperty({ example: 'Maputo Cidade', description: 'Província' })
    @IsNotEmpty()
    @IsString()
    provincia: string;
}

export class UpdateLocalizacaoDto {
    @ApiPropertyOptional({ example: 'Central' })
    @IsOptional()
    @IsString()
    bairro?: string;

    @ApiPropertyOptional({ example: '456' })
    @IsOptional()
    @IsString()
    numeroDaCasa?: string;

    @ApiPropertyOptional({ example: 'Q21' })
    @IsOptional()
    @IsString()
    quarteirao?: string;

    @ApiPropertyOptional({ example: 'Matola' })
    @IsOptional()
    @IsString()
    cidade?: string;

    @ApiPropertyOptional({ example: 'Matola' })
    @IsOptional()
    @IsString()
    distrito?: string;

    @ApiPropertyOptional({ example: 'Maputo Província' })
    @IsOptional()
    @IsString()
    provincia?: string;
}
