import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Cliente } from './cliente.entity';

@Entity('documentos')
export class Documento {
    @PrimaryGeneratedColumn({ type: 'bigint', name: 'documento_id' })
    documentoId: string;

    @Column({ type: 'bigint', name: 'cliente_id', nullable: true })
    clienteId: string;

    @Column({ type: 'text', name: 'tipo_documento', nullable: false })
    tipoDocumento: string;

    @Column({ type: 'text', name: 'numero_documento', nullable: false, unique: true })
    numeroDocumento: string;

    @Exclude()
    @Column({ type: 'bytea', nullable: true })
    arquivo: Buffer;

    @ManyToOne(() => Cliente, cliente => cliente.documentos)
    @JoinColumn({ name: 'cliente_id' })
    cliente: Cliente;
}
