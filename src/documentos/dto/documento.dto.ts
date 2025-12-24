import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TipoDocumento {
    BI = 'BI',
    PASSAPORTE = 'Passaporte',
    CARTA_CONDUCAO = 'Carta de Conducao',
    NUIT = 'NUIT',
    CONTRATO_MICROCREDITO = 'Contrato Microcredito',
    LIVRETE = 'Livrete',
    DIRE = 'DIRE',
    CERTIDAO_NASCIMENTO = 'Certidao de Nascimento',
    CERTIFICADO_HABILITACOES = 'Certificado de Habilitacoes',
    COMPROVATIVO_RESIDENCIA = 'Comprovativo de Residencia',
    TALAO_DEPOSITO = 'Talao de Deposito',
    OUTRO = 'Outro'
}

export class CreateDocumentoDto {
    @ApiProperty({ description: 'ID do Cliente' })
    @IsNotEmpty()
    @IsString()
    clienteId: string;

    @ApiProperty({
        example: TipoDocumento.BI,
        description: 'Tipo de documento. Valores obrigatórios conforme constraint do banco: ' + Object.values(TipoDocumento).join(', '),
        enum: TipoDocumento
    })
    @IsNotEmpty()
    @IsEnum(TipoDocumento)
    tipoDocumento: string;

    @ApiProperty({ description: 'Número do documento (ÚNICO no sistema)' })
    @IsNotEmpty()
    @IsString()
    numeroDocumento: string;

    @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Arquivo do documento' })
    @IsOptional()
    arquivo?: any;
}

export class UpdateDocumentoDto {
    @ApiPropertyOptional({
        example: TipoDocumento.BI,
        description: 'Tipo de documento. Valores permitidos: ' + Object.values(TipoDocumento).join(', '),
        enum: TipoDocumento
    })
    @IsOptional()
    @IsEnum(TipoDocumento)
    tipoDocumento?: string;

    @ApiPropertyOptional({ description: 'Número do documento (Deve ser ÚNICO se alterado)' })
    @IsOptional()
    @IsString()
    numeroDocumento?: string;

    @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Novo arquivo (opcional)' })
    @IsOptional()
    arquivo?: any;
}
