import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Cliente } from './cliente.entity';

@Entity('localizacao')
export class Localizacao {
    @PrimaryGeneratedColumn({ type: 'bigint', name: 'localizacao_id' })
    localizacaoId: string;

    @Column({ type: 'bigint', name: 'cliente_id', nullable: true })
    clienteId: string;

    @Column({ type: 'text', nullable: true })
    bairro: string;

    @Column({ type: 'text', name: 'numero_da_casa', nullable: true })
    numeroDaCasa: string;

    @Column({ type: 'text', nullable: true })
    quarteirao: string;

    @Column({ type: 'text', nullable: false })
    cidade: string;

    @Column({ type: 'text', nullable: false })
    distrito: string;

    @Column({ type: 'text', nullable: false })
    provincia: string;

    @OneToOne(() => Cliente, cliente => cliente.localizacao)
    @JoinColumn({ name: 'cliente_id' })
    cliente: Cliente;
}
