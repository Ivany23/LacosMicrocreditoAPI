import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Cliente } from './cliente.entity';

@Entity('testemunhas')
export class Testemunha {
    @PrimaryGeneratedColumn({ type: 'bigint', name: 'testemunha_id' })
    testemunhaId: string;

    @Column({ type: 'bigint', name: 'cliente_id', nullable: true })
    clienteId: string;

    @Column({ type: 'text', nullable: false })
    nome: string;

    @Column({ type: 'text', nullable: false, unique: true })
    telefone: string;

    @Column({ type: 'text', name: 'grau_parentesco', nullable: false })
    grauParentesco: string;

    @ManyToOne(() => Cliente, cliente => cliente.testemunhas)
    @JoinColumn({ name: 'cliente_id' })
    cliente: Cliente;
}
