import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Cliente } from './cliente.entity';

@Entity('ocupacoes')
export class Ocupacao {
    @PrimaryGeneratedColumn({ type: 'bigint', name: 'ocupacao_id' })
    ocupacaoId: string;

    @Column({ type: 'bigint', name: 'cliente_id', nullable: false })
    clienteId: string;

    @Column({ type: 'varchar', length: 10, nullable: false })
    codigo: string;

    @Column({ type: 'varchar', length: 100, nullable: false })
    nome: string;

    @Column({ type: 'text', nullable: true })
    descricao: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, name: 'renda_minima', nullable: true })
    rendaMinima: number;

    @Column({ type: 'boolean', default: true })
    ativo: boolean;

    @ManyToOne(() => Cliente, cliente => cliente.ocupacoes)
    @JoinColumn({ name: 'cliente_id' })
    cliente: Cliente;
}
