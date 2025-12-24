import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Cliente } from './cliente.entity';
import { Emprestimo } from './emprestimo.entity';

@Entity('penalizacoes')
export class Penalizacao {
    @PrimaryGeneratedColumn({ type: 'bigint', name: 'penalizacao_id' })
    penalizacaoId: string;

    @Column({ type: 'bigint', name: 'emprestimo_id', nullable: false })
    emprestimoId: string;

    @Column({ type: 'bigint', name: 'cliente_id', nullable: false })
    clienteId: string;

    @Column({ type: 'text', nullable: false })
    tipo: string;

    @Column({ type: 'integer', name: 'dias_atraso', default: 0 })
    diasAtraso: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: false })
    valor: number;

    @Column({ type: 'text', nullable: false })
    status: string;

    @CreateDateColumn({ type: 'timestamp with time zone', name: 'data_aplicacao' })
    dataAplicacao: Date;

    @Column({ type: 'text', nullable: true })
    observacoes: string;

    @ManyToOne(() => Cliente)
    @JoinColumn({ name: 'cliente_id' })
    cliente: Cliente;

    @ManyToOne(() => Emprestimo)
    @JoinColumn({ name: 'emprestimo_id' })
    emprestimo: Emprestimo;
}
