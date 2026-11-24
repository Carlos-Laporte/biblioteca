import { z } from 'zod';
import { TAMANHO } from './limites';

const ANO_MINIMO = 1450;
const ANO_MAXIMO = 2100;
const MAX_EXEMPLARES = 999;
const MAX_LIVROS_POR_PEDIDO = 10;

export const esquemaId = z.object({ id: z.coerce.number().int().positive() });

const dataCivil = z.iso.date({ error: 'Use o formato AAAA-MM-DD' });
const perfil = z.enum(['GRADUACAO', 'POS_GRADUACAO', 'PROFESSOR']);

export const esquemaNovoUsuario = z.object({
  nome: z.string().trim().min(TAMANHO.NOME_MINIMO).max(TAMANHO.NOME),
  matricula: z.string().trim().regex(/^[A-Za-z0-9-]{3,20}$/, 'Use de 3 a 20 letras, números ou hífen'),
  email: z.email().max(TAMANHO.EMAIL),
  perfil,
});

export const esquemaEdicaoUsuario = esquemaNovoUsuario.partial().extend({ ativo: z.boolean().optional() });

export const esquemaFiltroUsuarios = z.object({
  busca: z.string().trim().max(TAMANHO.NOME).optional(),
  perfil: perfil.optional(),
});

export const esquemaNovoLivro = z.object({
  titulo: z.string().trim().min(1).max(TAMANHO.TITULO),
  autor: z.string().trim().min(1).max(TAMANHO.AUTOR),
  isbn: z.string().trim().regex(/^[0-9-]{10,16}[0-9X]$/, 'ISBN inválido'),
  ano: z.number().int().min(ANO_MINIMO).max(ANO_MAXIMO),
  exemplaresTotal: z.number().int().min(1).max(MAX_EXEMPLARES),
});

export const esquemaEdicaoLivro = esquemaNovoLivro.partial();

export const esquemaFiltroLivros = z.object({ busca: z.string().trim().max(TAMANHO.TITULO).optional() });

export const esquemaNovoEmprestimo = z.object({
  usuarioId: z.number().int().positive(),
  livroIds: z
    .array(z.number().int().positive())
    .min(1)
    .max(MAX_LIVROS_POR_PEDIDO)
    .refine((ids) => new Set(ids).size === ids.length, 'O mesmo livro foi informado mais de uma vez'),
  dataEmprestimo: dataCivil.optional(),
});

export const esquemaDevolucao = z.object({ dataDevolucao: dataCivil.optional() }).default({});

export const esquemaFiltroEmprestimos = z.object({
  situacao: z.enum(['ativos', 'atrasados', 'devolvidos', 'todos']).default('ativos'),
  usuarioId: z.coerce.number().int().positive().optional(),
});

export const esquemaFiltroMultas = z.object({ situacao: z.enum(['abertas', 'pagas', 'todas']).default('abertas') });

export type NovoUsuario = z.infer<typeof esquemaNovoUsuario>;
export type EdicaoUsuario = z.infer<typeof esquemaEdicaoUsuario>;
export type FiltroUsuarios = z.infer<typeof esquemaFiltroUsuarios>;
export type NovoLivro = z.infer<typeof esquemaNovoLivro>;
export type FiltroLivros = z.infer<typeof esquemaFiltroLivros>;
export type EdicaoLivro = z.infer<typeof esquemaEdicaoLivro>;
export type NovoEmprestimo = z.infer<typeof esquemaNovoEmprestimo>;
export type Devolucao = z.infer<typeof esquemaDevolucao>;
export type FiltroEmprestimos = z.infer<typeof esquemaFiltroEmprestimos>;
export type FiltroMultas = z.infer<typeof esquemaFiltroMultas>;
