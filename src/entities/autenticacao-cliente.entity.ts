import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { Cliente } from './cliente.entity';

@Entity('autenticacao_clientes')
export class AutenticacaoCliente {
    @PrimaryGeneratedColumn({ type: 'bigint', name: 'autenticacao_id' })
    autenticacaoId: string;

    @Column({ type: 'bigint', name: 'cliente_id', nullable: false })
    clienteId: string;

    @Column({ type: 'text', nullable: false, unique: true })
    username: string;

    @Column({ type: 'text', name: 'password_hash', nullable: false })
    passwordHash: string;

    @CreateDateColumn({ type: 'timestamp with time zone', name: 'data_criacao' })
    dataCriacao: Date;

    @Column({ type: 'timestamp with time zone', name: 'ultimo_login', nullable: true })
    ultimoLogin: Date;

    @Column({ type: 'integer', name: 'tentativas_login', default: 0 })
    tentativasLogin: number;

    @Column({ type: 'boolean', default: false })
    bloqueado: boolean;

    @Column({ type: 'timestamp with time zone', name: 'data_bloqueio', nullable: true })
    dataBloqueio: Date;

    @OneToOne(() => Cliente, cliente => cliente.autenticacao)
    @JoinColumn({ name: 'cliente_id' })
    cliente: Cliente;
}
