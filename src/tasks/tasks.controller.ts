import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Tarefas Automáticas (Rotinas)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post('run-penalties')
    @ApiOperation({
        summary: 'Executar verificação diária de penalidades',
        description: 'Verifica empréstimos vencidos e aplica multas/notificações automaticamente. (Normalmente roda à meia-noite)'
    })
    @ApiResponse({ status: 200, description: 'Processo de penalidades executado com sucesso.' })
    async runDailyPenalties() {
        await this.tasksService.handleDailyPenalties();
        return { message: 'Verificação diária de penalidades executada.' };
    }

    @Post('run-reminders')
    @ApiOperation({
        summary: 'Executar envio de lembretes de pagamento',
        description: 'Verifica empréstimos vencendo em 5 ou 10 dias e envia notificações de lembrete. (Normalmente roda às 08:00)'
    })
    @ApiResponse({ status: 200, description: 'Lembretes enviados com sucesso.' })
    async runPaymentReminders() {
        await this.tasksService.handlePaymentReminders();
        return { message: 'Envio de lembretes processado.' };
    }
}
