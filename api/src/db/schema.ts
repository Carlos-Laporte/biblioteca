import { sql } from 'drizzle-orm';
import { TAMANHO } from '../limites';
import { boolean, check, date, index, integer, pgEnum, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';

export const perfilUsuario = pgEnum('perfil_usuario', ['GRADUACAO', 'POS_GRADUACAO', 'PROFESSOR']);

const criadoEm = () => timestamp('criado_em', { withTimezone: true }).notNull().defaultNow();

export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  nome: varchar('nome', { length: TAMANHO.NOME }).notNull(),
  matricula: varchar('matricula', { length: TAMANHO.MATRICULA }).notNull().unique(),
  email: varchar('email', { length: TAMANHO.EMAIL }).notNull(),
  perfil: perfilUsuario('perfil').notNull(),
  ativo: boolean('ativo').notNull().default(true),
  criadoEm: criadoEm(),
});

export const livros = pgTable(
  'livros',
  {
    id: serial('id').primaryKey(),
    titulo: varchar('titulo', { length: TAMANHO.TITULO }).notNull(),
    autor: varchar('autor', { length: TAMANHO.AUTOR }).notNull(),
    isbn: varchar('isbn', { length: TAMANHO.ISBN }).notNull().unique(),
    ano: integer('ano').notNull(),
    exemplaresTotal: integer('exemplares_total').notNull(),
    criadoEm: criadoEm(),
  },
  (tabela) => [check('livros_exemplares_positivos', sql`${tabela.exemplaresTotal} >= 1`)],
);

export const emprestimos = pgTable(
  'emprestimos',
  {
    id: serial('id').primaryKey(),
    usuarioId: integer('usuario_id').notNull().references(() => usuarios.id),
    livroId: integer('livro_id').notNull().references(() => livros.id),
    dataEmprestimo: date('data_emprestimo', { mode: 'string' }).notNull(),
    dataPrevista: date('data_prevista', { mode: 'string' }).notNull(),
    dataDevolucao: date('data_devolucao', { mode: 'string' }),
    criadoEm: criadoEm(),
  },
  (tabela) => [
    index('emprestimos_usuario_idx').on(tabela.usuarioId),
    index('emprestimos_livro_idx').on(tabela.livroId),
    check('emprestimos_prevista_valida', sql`${tabela.dataPrevista} >= ${tabela.dataEmprestimo}`),
    check(
      'emprestimos_devolucao_valida',
      sql`${tabela.dataDevolucao} IS NULL OR ${tabela.dataDevolucao} >= ${tabela.dataEmprestimo}`,
    ),
  ],
);

export const multas = pgTable(
  'multas',
  {
    id: serial('id').primaryKey(),
    emprestimoId: integer('emprestimo_id').notNull().unique().references(() => emprestimos.id),
    usuarioId: integer('usuario_id').notNull().references(() => usuarios.id),
    diasAtraso: integer('dias_atraso').notNull(),
    valorCentavos: integer('valor_centavos').notNull(),
    pagaEm: date('paga_em', { mode: 'string' }),
    criadoEm: criadoEm(),
  },
  (tabela) => [
    index('multas_usuario_idx').on(tabela.usuarioId),
    check('multas_valor_positivo', sql`${tabela.valorCentavos} > 0`),
  ],
);
