import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Penalizacao } from '../entities/penalizacao.entity';
import { CreatePenalizacaoDto, StatusPenalizacao } from './dto/penalizacao.dto';

import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { TipoNotificacao } from '../notificacoes/dto/notificacao.dto';

@Injectable()
export class PenalizacoesService {
    constructor(
        @InjectRepository(Penalizacao)
        private penalizacaoRepository: Repository<Penalizacao>,
        private notificacoesService: NotificacoesService,
    ) { }

    /**
     * Função auxiliar para calcular resumo de penalizações
     */
    private calcularResumo(penalizacoes: Penalizacao[]) {
        const pendentes = penalizacoes.filter(p =>
            p.status === StatusPenalizacao.PENDENTE || p.status === StatusPenalizacao.APLICADA
        );
        const pagas = penalizacoes.filter(p => p.status === 'Paga');
        const canceladas = penalizacoes.filter(p => p.status === StatusPenalizacao.CANCELADA);

        const valorTotalPendentes = pendentes.reduce((sum, p) => sum + Number(p.valor), 0);
        const valorTotalPagas = pagas.reduce((sum, p) => sum + Number(p.valor), 0);
        const valorTotalGeral = penalizacoes.reduce((sum, p) => sum + Number(p.valor), 0);

        const diasAtrasoMaximo = penalizacoes.length > 0
            ? Math.max(...penalizacoes.map(p => Number(p.diasAtraso) || 0))
            : 0;

        return {
            totalRegistros: penalizacoes.length,
            diasAtrasoMaximo,

            // Contagem por Status
            quantidadePendentes: pendentes.length,
            quantidadePagas: pagas.length,
            quantidadeCanceladas: canceladas.length,

            // Valores
            valorTotalGeral: Number(valorTotalGeral).toFixed(2),
            valorTotalPendentes: Number(valorTotalPendentes).toFixed(2),
            valorTotalPagas: Number(valorTotalPagas).toFixed(2)
        };
    }

    async create(createPenalizacaoDto: CreatePenalizacaoDto) {
        const penalizacao = this.penalizacaoRepository.create(createPenalizacaoDto);
        const savedPenalizacao = await this.penalizacaoRepository.save(penalizacao);

        // Notificação automática
        await this.notificacoesService.create({
            clienteId: createPenalizacaoDto.clienteId,
            tipo: TipoNotificacao.PENALIZACAO,
            mensagem: `Penalização aplicada: ${createPenalizacaoDto.tipo}. Valor: ${createPenalizacaoDto.valor}.`,
            status: 'Pendente'
        });

        return {
            sucesso: true,
            mensagem: '⚠️ Penalização registrada com sucesso.',
            penalizacao: savedPenalizacao
        };
    }

    async findAll() {
        const penalizacoes = await this.penalizacaoRepository.find({
            relations: ['cliente', 'emprestimo'],
            order: { dataAplicacao: 'DESC' }
        });

        const resumo = this.calcularResumo(penalizacoes);

        return {
            sucesso: true,
            resumoGeral: resumo,
            penalizacoes
        };
    }

    async findByEmprestimo(emprestimoId: string) {
        const penalizacoes = await this.penalizacaoRepository.find({
            where: { emprestimoId },
            order: { dataAplicacao: 'DESC' }
        });

        const resumo = this.calcularResumo(penalizacoes);

        return {
            sucesso: true,
            emprestimoId,
            resumoPenalizacoes: {
                ...resumo,
                descricao: resumo.quantidadePendentes > 0
                    ? `⚠️ Este empréstimo possui ${resumo.quantidadePendentes} penalização(ões) pendente(s) totalizando ${resumo.valorTotalPendentes}`
                    : '✅ Este empréstimo não possui penalizações pendentes.'
            },
            detalhePenalizacoes: penalizacoes
        };
    }

    async findByCliente(clienteId: string) {
        const penalizacoes = await this.penalizacaoRepository.find({
            where: { clienteId },
            relations: ['emprestimo'],
            order: { dataAplicacao: 'DESC' }
        });

        const resumo = this.calcularResumo(penalizacoes);

        const porEmprestimo: Record<string, { quantidade: number; valorTotal: number }> = {};
        for (const p of penalizacoes) {
            if (!porEmprestimo[p.emprestimoId]) {
                porEmprestimo[p.emprestimoId] = { quantidade: 0, valorTotal: 0 };
            }
            porEmprestimo[p.emprestimoId].quantidade++;
            porEmprestimo[p.emprestimoId].valorTotal += Number(p.valor);
        }

        const resumoPorEmprestimo = Object.entries(porEmprestimo).map(([emprestimoId, dados]) => ({
            emprestimoId,
            quantidadePenalizacoes: dados.quantidade,
            valorTotal: Number(dados.valorTotal).toFixed(2)
        }));

        return {
            sucesso: true,
            clienteId,
            resumoCliente: {
                ...resumo,
                descricao: resumo.quantidadePendentes > 0
                    ? `⚠️ Cliente possui ${resumo.quantidadePendentes} penalização(ões) pendente(s) totalizando ${resumo.valorTotalPendentes}`
                    : '✅ Cliente não possui penalizações pendentes.'
            },
            resumoPorEmprestimo,
            historicoPenalizacoes: penalizacoes
        };
    }
}

