import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TipoNotificacao {
    LEMBRETE = 'Lembrete de Pagamento',
    ATRASO = 'Atraso no Pagamento',
    CONFIRMACAO_PAGAMENTO = 'Confirmação de Pagamento',
    CONFIRMACAO_EMPRESTIMO = 'Confirmação de Empréstimo',
    PENALIZACAO = 'Penalização Aplicada',
    OUTRO = 'Outro',
    ADMIN_PENALIZACOES = 'ADMIN_PENALIZACOES_AUTOMATICAS',
    ADMIN_NOTIFICACOES = 'ADMIN_NOTIFICACOES_AUTOMATICAS'
}

export enum NotificacaoStatus {
    ENVIADO = 'Enviado',
    LIDO = 'Lido',
    PENDENTE = 'Pendente'
}

export class CreateNotificacaoDto {
    @ApiProperty({ example: '1', description: 'ID do Cliente (opcional para notificações globais/admin)' })
    @IsOptional()
    @IsString()
    clienteId?: string;

    @ApiProperty({ example: TipoNotificacao.LEMBRETE, description: 'Tipo de notificação', enum: TipoNotificacao })
    @IsNotEmpty()
    @IsString()
    @IsEnum(TipoNotificacao)
    tipo: string;

    @ApiProperty({ example: 'Seu empréstimo vence em 3 dias.', description: 'Conteúdo da mensagem' })
    @IsNotEmpty()
    @IsString()
    mensagem: string;

    @ApiPropertyOptional({ example: NotificacaoStatus.PENDENTE, description: 'Status da notificação', default: NotificacaoStatus.PENDENTE, enum: NotificacaoStatus })
    @IsOptional()
    @IsEnum(NotificacaoStatus)
    status?: string;
}
