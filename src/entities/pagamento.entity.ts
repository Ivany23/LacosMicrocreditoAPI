import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Cliente } from './cliente.entity';
import { Emprestimo } from './emprestimo.entity';

@Entity('pagamentos')
export class Pagamento {
    @PrimaryGeneratedColumn({ type: 'bigint', name: 'pagamento_id' })
    pagamentoId: string;

    @Column({ type: 'bigint', name: 'emprestimo_id', nullable: true })
    emprestimoId: string;

    @Column({ type: 'bigint', name: 'cliente_id', nullable: true })
    clienteId: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, name: 'valor_pago', nullable: false })
    valorPago: number;

    @Column({ type: 'timestamp with time zone', name: 'data_pagamento', nullable: false })
    dataPagamento: Date;

    @Column({ type: 'text', name: 'metodo_pagamento', nullable: false })
    metodoPagamento: string;

    @Column({ type: 'text', name: 'referencia_pagamento', nullable: true })
    referenciaPagamento: string;

    @ManyToOne(() => Cliente)
    @JoinColumn({ name: 'cliente_id' })
    cliente: Cliente;

    @ManyToOne(() => Emprestimo)
    @JoinColumn({ name: 'emprestimo_id' })
    emprestimo: Emprestimo;
}
