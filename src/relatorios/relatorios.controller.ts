import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { RelatoriosService } from './relatorios.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Relatórios Financeiros')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('relatorios')
export class RelatoriosController {
    constructor(private readonly relatoriosService: RelatoriosService) { }

    @Get('emprestimo/:emprestimoId/pdf')
    @ApiOperation({
        summary: 'Download do Extrato de Empréstimo Específico em PDF',
        description: 'Gera e faz download de um PDF profissional com o extrato de um empréstimo específico. Documento oficial da Laços Microcrédito com cores azuis e foco no cliente.'
    })
    @ApiParam({ name: 'emprestimoId', description: 'ID do Empréstimo', example: '1' })
    @ApiResponse({
        status: 200,
        description: 'PDF do empréstimo gerado com sucesso para download',
        content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } }
    })
    @ApiResponse({ status: 404, description: 'Empréstimo não encontrado' })
    async downloadPdfEmprestimo(
        @Param('emprestimoId') emprestimoId: string,
        @Res() res: Response
    ) {
        const resultado = await this.relatoriosService.gerarPdfEmprestimo(emprestimoId);

        const nomeCliente = resultado.nomeCliente
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^a-zA-Z0-9]/g, '_'); // Substitui caracteres especiais

        const dataAtual = new Date().toISOString().split('T')[0];
        const nomeArquivo = `Lacos_Extrato_EMP${emprestimoId}_${nomeCliente}_${dataAtual}.pdf`;

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
            'Content-Length': resultado.pdfBuffer.length,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });

        res.send(resultado.pdfBuffer);
    }

    @Get('cliente/:clienteId/resumo')
    @ApiOperation({
        summary: 'Resumo Rápido da Situação Financeira',
        description: 'Retorna apenas o resumo da situação financeira do cliente, sem os detalhes completos. Útil para verificações rápidas.'
    })
    @ApiParam({ name: 'clienteId', description: 'ID do Cliente', example: '1' })
    @ApiResponse({ status: 200, description: 'Resumo financeiro retornado com sucesso' })
    @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
    async getResumoFinanceiro(@Param('clienteId') clienteId: string) {
        const extrato = await this.relatoriosService.gerarExtratoCompleto(clienteId);

        return {
            sucesso: true,
            cliente: {
                id: extrato.relatorio.cliente.id,
                nome: extrato.relatorio.cliente.nome
            },
            situacaoFinanceira: extrato.relatorio.situacaoFinanceira,
            resumoEmprestimos: extrato.relatorio.emprestimos.resumo,
            resumoPagamentos: extrato.relatorio.pagamentos.resumo,
            resumoPenalizacoes: extrato.relatorio.penalizacoes.resumo
        };
    }
}
