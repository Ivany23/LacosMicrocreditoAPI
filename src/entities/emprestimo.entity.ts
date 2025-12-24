import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Cliente } from './cliente.entity';

@Entity('emprestimos')
export class Emprestimo {
    @PrimaryGeneratedColumn({ type: 'bigint', name: 'emprestimo_id' })
    emprestimoId: string;

    @Column({ type: 'bigint', name: 'cliente_id', nullable: true })
    clienteId: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, nullable: false })
    valor: number;

    @Column({ type: 'timestamp with time zone', name: 'data_emprestimo', nullable: false })
    dataEmprestimo: Date;

    @Column({ type: 'timestamp with time zone', name: 'data_vencimento', nullable: false })
    dataVencimento: Date;

    @Column({ type: 'text', default: 'Ativo', nullable: false })
    status: string;

    @ManyToOne(() => Cliente, cliente => cliente.emprestimos)
    @JoinColumn({ name: 'cliente_id' })
    cliente: Cliente;
}
