import type { PerfilUsuario } from '../../domain';

export interface ResumoUsuario {
  livrosEmUso: number;
  limite: number;
  prazoDevolucaoDias: number;
  multasEmAberto: number;
  emAtraso: number;
  pendente: boolean;
}

export interface Usuario {
  id: number;
  nome: string;
  matricula: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
}

export interface UsuarioComResumo extends Usuario {
  resumo: ResumoUsuario;
}

export interface EmprestimoDoUsuario {
  id: number;
  livroId: number;
  titulo: string;
  dataEmprestimo: string;
  dataPrevista: string;
  dataDevolucao: string | null;
}

export interface Multa {
  id: number;
  emprestimoId: number;
  diasAtraso: number;
  valorCentavos: number;
  pagaEm: string | null;
}

export interface UsuarioDetalhado extends UsuarioComResumo {
  emprestimos: EmprestimoDoUsuario[];
  multas: Multa[];
}

export interface Livro {
  id: number;
  titulo: string;
  autor: string;
  isbn: string;
  ano: number;
  exemplaresTotal: number;
  emUso: number;
  disponiveis: number;
}

export interface Emprestimo {
  id: number;
  dataEmprestimo: string;
  dataPrevista: string;
  dataDevolucao: string | null;
  diasAtraso: number;
  usuario: { id: number; nome: string; matricula: string; perfil: PerfilUsuario };
  livro: { id: number; titulo: string; autor: string };
}

export interface MultaListada extends Multa {
  dataDevolucao: string | null;
  usuario: { id: number; nome: string; matricula: string };
  livro: { id: number; titulo: string };
}

export interface Painel {
  hoje: string;
  emprestimosAtivos: number;
  emprestimosAtrasados: number;
  multasEmAbertoCentavos: number;
  usuariosBloqueados: number;
  totalUsuarios: number;
  proximosVencimentos: Emprestimo[];
  maioresAtrasos: Emprestimo[];
}

export interface ResultadoEmprestimo {
  limite: number;
  totalAposEmprestimo: number;
  prazoDevolucaoDias: number;
  dataEmprestimo: string;
  dataPrevista: string;
}

export interface ResultadoDevolucao {
  diasAtraso: number;
  multa: Multa | null;
}

export type DadosUsuario = Pick<Usuario, 'nome' | 'matricula' | 'email' | 'perfil'>;
export type DadosLivro = Pick<Livro, 'titulo' | 'autor' | 'isbn' | 'ano' | 'exemplaresTotal'>;
export type SituacaoEmprestimo = 'ativos' | 'atrasados' | 'devolvidos' | 'todos';
export type SituacaoMulta = 'abertas' | 'pagas' | 'todas';
