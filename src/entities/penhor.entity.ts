import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Cliente } from './cliente.entity';

@Entity('penhor')
export class Penhor {
    @PrimaryGeneratedColumn({ type: 'bigint', name: 'penhor_id' })
    penhorId: string;

    @Column({ type: 'bigint', name: 'cliente_id', nullable: true })
    clienteId: string;

    @Column({ type: 'text', name: 'descricao_item', nullable: false })
    descricaoItem: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, name: 'valor_estimado', nullable: false })
    valorEstimado: number;

    @Column({ type: 'timestamp with time zone', name: 'data_penhora', nullable: false })
    dataPenhora: Date;

    @Exclude()
    @Column({ type: 'bytea', name: 'imagem_penhor', nullable: true })
    imagemPenhor: Buffer;

    @ManyToOne(() => Cliente, cliente => cliente.penhores)
    @JoinColumn({ name: 'cliente_id' })
    cliente: Cliente;
}
