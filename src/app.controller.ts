import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
    @Get()
    getHello(): string {
        return '🚀 API de Gestão de Clientes e Empréstimos está online! Acesse a documentação para mais detalhes.';
    }
}
