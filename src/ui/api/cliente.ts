import type {
  DadosLivro,
  DadosUsuario,
  Emprestimo,
  Livro,
  MultaListada,
  Painel,
  ResultadoDevolucao,
  ResultadoEmprestimo,
  SituacaoEmprestimo,
  SituacaoMulta,
  Usuario,
  UsuarioComResumo,
  UsuarioDetalhado,
} from './tipos';

export interface CampoInvalido {
  campo: string;
  mensagem: string;
}

interface DetalhesErro {
  readonly status: number;
  readonly codigo: string;
  readonly mensagem: string;
  readonly motivo?: string;
  readonly campos?: CampoInvalido[];
}

/** Erro vindo da API, com o código, o motivo de recusa (se houver) e os campos inválidos. */
export class ErroApi extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly motivo?: string;
  readonly campos: CampoInvalido[];

  constructor(detalhes: DetalhesErro) {
    super(detalhes.mensagem);
    this.name = 'ErroApi';
    this.status = detalhes.status;
    this.codigo = detalhes.codigo;
    this.motivo = detalhes.motivo;
    this.campos = detalhes.campos ?? [];
  }
}

interface Opcoes {
  readonly metodo?: 'GET' | 'POST' | 'PUT';
  readonly corpo?: unknown;
}

const SEM_CONEXAO = new ErroApi({
  status: 0,
  codigo: 'SEM_CONEXAO',
  mensagem: 'Não foi possível conectar ao servidor. Verifique se a API está no ar.',
});

function montarRequisicao({ metodo, corpo }: Opcoes): RequestInit {
  if (corpo === undefined) return { method: metodo };
  return { method: metodo, headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) };
}

interface CorpoErro {
  readonly erro: string;
  readonly mensagem: string;
  readonly motivo?: string;
  readonly campos?: CampoInvalido[];
}

const CORPO_PADRAO: CorpoErro = { erro: 'ERRO', mensagem: 'Falha na comunicação com o servidor' };

function erroDaResposta(status: number, dados: Partial<CorpoErro> | null) {
  const corpo = { ...CORPO_PADRAO, ...dados };
  return new ErroApi({ status, codigo: corpo.erro, mensagem: corpo.mensagem, motivo: corpo.motivo, campos: corpo.campos });
}

async function requisitar<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const resposta = await fetch(`/api${caminho}`, montarRequisicao(opcoes)).catch(() => {
    throw SEM_CONEXAO;
  });
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw erroDaResposta(resposta.status, dados);
  return dados as T;
}

function consulta(parametros: Record<string, string | number | undefined>): string {
  const definidos = Object.entries(parametros).filter(([, valor]) => valor !== undefined && valor !== '');
  return definidos.length ? `?${new URLSearchParams(definidos.map(([chave, valor]) => [chave, String(valor)]))}` : '';
}

export const api = {
  painel: () => requisitar<Painel>('/painel'),
  usuarios: {
    listar: (filtro: { busca?: string; perfil?: string } = {}) => requisitar<UsuarioComResumo[]>(`/usuarios${consulta(filtro)}`),
    obter: (id: number) => requisitar<UsuarioDetalhado>(`/usuarios/${id}`),
    criar: (dados: DadosUsuario) => requisitar<Usuario>('/usuarios', { metodo: 'POST', corpo: dados }),
    atualizar: (id: number, dados: Partial<DadosUsuario> & { ativo?: boolean }) =>
      requisitar<Usuario>(`/usuarios/${id}`, { metodo: 'PUT', corpo: dados }),
  },
  livros: {
    listar: (busca?: string) => requisitar<Livro[]>(`/livros${consulta({ busca })}`),
    criar: (dados: DadosLivro) => requisitar<Livro>('/livros', { metodo: 'POST', corpo: dados }),
    atualizar: (id: number, dados: Partial<DadosLivro>) => requisitar<Livro>(`/livros/${id}`, { metodo: 'PUT', corpo: dados }),
  },
  emprestimos: {
    listar: (situacao: SituacaoEmprestimo, usuarioId?: number) =>
      requisitar<Emprestimo[]>(`/emprestimos${consulta({ situacao, usuarioId })}`),
    criar: (dados: { usuarioId: number; livroIds: number[]; dataEmprestimo?: string }) =>
      requisitar<ResultadoEmprestimo>('/emprestimos', { metodo: 'POST', corpo: dados }),
    devolver: (id: number, dataDevolucao?: string) =>
      requisitar<ResultadoDevolucao>(`/emprestimos/${id}/devolucao`, { metodo: 'POST', corpo: dataDevolucao ? { dataDevolucao } : {} }),
  },
  multas: {
    listar: (situacao: SituacaoMulta) => requisitar<MultaListada[]>(`/multas${consulta({ situacao })}`),
    pagar: (id: number) => requisitar<MultaListada>(`/multas/${id}/pagamento`, { metodo: 'POST' }),
  },
};
