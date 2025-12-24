import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Cliente } from './cliente.entity';

@Entity('notificacoes')
export class Notificacao {
    @PrimaryGeneratedColumn({ type: 'bigint', name: 'notificacao_id' })
    notificacaoId: string;

    @Column({ type: 'bigint', name: 'cliente_id', nullable: true })
    clienteId: string;

    @Column({ type: 'text', nullable: false })
    tipo: string;

    @Column({ type: 'text', nullable: false })
    mensagem: string;

    @CreateDateColumn({ type: 'timestamp with time zone', name: 'data_envio' })
    dataEnvio: Date;

    @Column({ type: 'text', default: 'Pendente' })
    status: string;

    @ManyToOne(() => Cliente)
    @JoinColumn({ name: 'cliente_id' })
    cliente: Cliente;
}
