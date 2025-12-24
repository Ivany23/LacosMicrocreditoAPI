import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, OneToOne } from 'typeorm';
import { AutenticacaoCliente } from './autenticacao-cliente.entity';
import { Documento } from './documento.entity';
import { Localizacao } from './localizacao.entity';
import { Ocupacao } from './ocupacao.entity';
import { Emprestimo } from './emprestimo.entity';
import { Penhor } from './penhor.entity';
import { Testemunha } from './testemunha.entity';

@Entity('clientes')
export class Cliente {
    @PrimaryGeneratedColumn({ type: 'bigint', name: 'cliente_id' })
    clienteId: string;

    @Column({ type: 'text', nullable: false })
    nome: string;

    @Column({ type: 'text', nullable: false })
    sexo: string;

    @Column({ type: 'text', nullable: false, unique: true })
    telefone: string;

    @Column({ type: 'text', unique: true, nullable: true })
    email: string;

    @Column({ type: 'text', nullable: false, default: 'Moçambicana' })
    nacionalidade: string;

    @CreateDateColumn({ type: 'timestamp with time zone', name: 'data_cadastro' })
    dataCadastro: Date;

    @Column({ type: 'date', name: 'data_nascimento', nullable: false })
    dataNascimento: Date;

    @OneToOne(() => AutenticacaoCliente, auth => auth.cliente)
    autenticacao: AutenticacaoCliente;

    @OneToMany(() => Documento, doc => doc.cliente)
    documentos: Documento[];

    @OneToOne(() => Localizacao, loc => loc.cliente)
    localizacao: Localizacao;

    @OneToMany(() => Ocupacao, ocp => ocp.cliente)
    ocupacoes: Ocupacao[];

    @OneToMany(() => Emprestimo, emp => emp.cliente)
    emprestimos: Emprestimo[];

    @OneToMany(() => Penhor, pen => pen.cliente)
    penhores: Penhor[];

    @OneToMany(() => Testemunha, test => test.cliente)
    testemunhas: Testemunha[];
}
