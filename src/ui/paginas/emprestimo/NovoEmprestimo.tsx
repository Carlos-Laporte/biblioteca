import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { BookPlus } from 'lucide-react';
import { hojeEmSaoPaulo } from '../../../domain';
import { api } from '../../api/cliente';
import type { Livro, UsuarioComResumo } from '../../api/tipos';
import { Alerta, Botao, CabecalhoPagina, Cartao } from '../../componentes/Basicos';
import { Campo, Selecao } from '../../componentes/Campos';
import { Recurso } from '../../componentes/Recurso';
import { BadgeSituacao, BarraLimite } from '../../componentes/Regras';
import { useNotificar } from '../../componentes/Toast';
import { formatarData, ROTULO_PERFIL } from '../../formatacao';
import { useEnvio } from '../../ganchos/useEnvio';
import { useRecurso } from '../../ganchos/useRecurso';
import { ListaLivros } from './ListaLivros';
import { avaliarPedido, Previa } from './Previa';

interface Dados {
  readonly usuarios: UsuarioComResumo[];
  readonly livros: Livro[];
}

function SeletorUsuario({ usuarios, valor, aoMudar }: { readonly usuarios: readonly UsuarioComResumo[]; readonly valor: string; readonly aoMudar: (id: string) => void }) {
  return (
    <Selecao rotulo="Usuário" value={valor} onChange={(evento) => aoMudar(evento.target.value)}>
      <option value="">Selecione…</option>
      {usuarios.filter((usuario) => usuario.ativo).map((usuario) => (
        <option key={usuario.id} value={usuario.id}>
          {usuario.nome} — {ROTULO_PERFIL[usuario.perfil]}{usuario.resumo.pendente ? ' (bloqueado)' : ''}
        </option>
      ))}
    </Selecao>
  );
}

function SituacaoUsuario({ usuario, selecionados }: { readonly usuario?: UsuarioComResumo; readonly selecionados: number }) {
  if (!usuario) return null;
  return (
    <div className="pilha">
      <div className="linha separar">
        <span className="pequeno suave">Prazo de {usuario.resumo.prazoDevolucaoDias} dias</span>
        <BadgeSituacao resumo={usuario.resumo} ativo={usuario.ativo} />
      </div>
      <BarraLimite emUso={usuario.resumo.livrosEmUso + selecionados} limite={usuario.resumo.limite} rotulo="Em uso após o pedido" />
    </div>
  );
}

/** Estado do pedido: usuário, livros marcados, data e envio para a API. */
function usePedido(dados: Dados) {
  const [parametros] = useSearchParams();
  const [usuarioId, setUsuarioId] = useState(parametros.get('usuario') ?? '');
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [dataEmprestimo, setDataEmprestimo] = useState(hojeEmSaoPaulo());
  const navegar = useNavigate();
  const notificar = useNotificar();
  const usuario = dados.usuarios.find((item) => String(item.id) === usuarioId);

  const alternar = (id: number) =>
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (!proximo.delete(id)) proximo.add(id);
      return proximo;
    });

  const { erro, enviar } = useEnvio(async (escolhido: UsuarioComResumo) => {
    const resultado = await api.emprestimos.criar({ usuarioId: escolhido.id, livroIds: [...selecionados], dataEmprestimo });
    notificar(`Empréstimo registrado: devolução até ${formatarData(resultado.dataPrevista)}`);
    navegar(`/usuarios/${escolhido.id}`);
  });

  const submeter = (evento: FormEvent) => {
    evento.preventDefault();
    if (usuario) void enviar(usuario);
  };

  return { usuario, usuarioId, setUsuarioId, selecionados, alternar, dataEmprestimo, setDataEmprestimo, erro, submeter };
}

function Formulario({ dados }: { readonly dados: Dados }) {
  const { usuario, usuarioId, setUsuarioId, selecionados, alternar, dataEmprestimo, setDataEmprestimo, erro, submeter } = usePedido(dados);
  const avaliacao = avaliarPedido(usuario, selecionados.size, dataEmprestimo);
  return (
    <form className="grade grade-lateral" onSubmit={submeter}>
      <Cartao titulo="Livros" descricao="Marque os livros que serão emprestados">
        <ListaLivros livros={dados.livros} selecionados={selecionados} aoAlternar={alternar} />
      </Cartao>
      <Cartao titulo="Pedido">
        <SeletorUsuario usuarios={dados.usuarios} valor={usuarioId} aoMudar={setUsuarioId} />
        <SituacaoUsuario usuario={usuario} selecionados={selecionados.size} />
        <Campo rotulo="Data do empréstimo" type="date" value={dataEmprestimo} max={hojeEmSaoPaulo()} required
          ajuda="Altere apenas para registrar um empréstimo retroativo" onChange={(evento) => setDataEmprestimo(evento.target.value)} />
        <Previa avaliacao={avaliacao} />
        {erro && <Alerta tom="erro" titulo="A API recusou o pedido" anunciar>{erro.message}</Alerta>}
        <Botao variante="primario" type="submit" icone={BookPlus} disabled={avaliacao.tipo !== 'aprovado'}>Confirmar empréstimo</Botao>
      </Cartao>
    </form>
  );
}

export function NovoEmprestimo() {
  const estado = useRecurso(async (): Promise<Dados> => {
    const [usuarios, livros] = await Promise.all([api.usuarios.listar(), api.livros.listar()]);
    return { usuarios, livros };
  }, []);
  return (
    <>
      <CabecalhoPagina titulo="Novo empréstimo" descricao="Limite e pendências são verificados em tempo real (RF01)" />
      <Recurso estado={estado} linhas={10}>{(dados) => <Formulario dados={dados} />}</Recurso>
    </>
  );
}
