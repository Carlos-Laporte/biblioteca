import { calcularDataDevolucao, CalculadoraEmprestimo, RegraNegocioError } from '../../../domain';
import type { UsuarioComResumo } from '../../api/tipos';
import { Alerta } from '../../componentes/Basicos';
import { formatarData, plural } from '../../formatacao';

const calculadora = new CalculadoraEmprestimo();

export type Avaliacao =
  | { readonly tipo: 'pendente'; readonly mensagem: string }
  | { readonly tipo: 'recusado'; readonly mensagem: string }
  | { readonly tipo: 'aprovado'; readonly dataPrevista: string; readonly prazo: number; readonly total: number; readonly limite: number };

/** Pré-visualização do RF01 com o mesmo domínio da API (que continua sendo a autoridade). */
export function avaliarPedido(usuario: UsuarioComResumo | undefined, quantidade: number, dataEmprestimo: string): Avaliacao {
  if (!usuario) return { tipo: 'pendente', mensagem: 'Escolha o usuário.' };
  if (quantidade === 0) return { tipo: 'pendente', mensagem: 'Selecione ao menos um livro.' };
  try {
    const resultado = calculadora.validarEmprestimo(usuario.perfil, usuario.resumo.livrosEmUso, quantidade, usuario.resumo.pendente);
    return {
      tipo: 'aprovado',
      dataPrevista: calcularDataDevolucao(dataEmprestimo, usuario.perfil),
      prazo: resultado.prazoDevolucaoDias,
      total: resultado.totalAposEmprestimo,
      limite: resultado.limite,
    };
  } catch (erro) {
    if (erro instanceof RegraNegocioError) return { tipo: 'recusado', mensagem: erro.message };
    return { tipo: 'pendente', mensagem: (erro as Error).message };
  }
}

export function Previa({ avaliacao }: { readonly avaliacao: Avaliacao }) {
  if (avaliacao.tipo === 'pendente') return <Alerta tom="info" titulo="Pedido incompleto" anunciar>{avaliacao.mensagem}</Alerta>;
  if (avaliacao.tipo === 'recusado') return <Alerta tom="erro" titulo="Empréstimo recusado" anunciar>{avaliacao.mensagem}</Alerta>;
  return (
    <Alerta tom="sucesso" titulo="Empréstimo permitido" anunciar>
      {`${plural(avaliacao.total, 'livro', 'livros')} de ${avaliacao.limite} · devolução até ${formatarData(avaliacao.dataPrevista)} (${avaliacao.prazo} dias)`}
    </Alerta>
  );
}
