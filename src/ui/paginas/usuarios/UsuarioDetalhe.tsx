import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, BookPlus, Pencil, Power } from 'lucide-react';
import { api } from '../../api/cliente';
import type { DadosUsuario, EmprestimoDoUsuario, Multa, UsuarioDetalhado } from '../../api/tipos';
import { Alerta, Badge, Botao, CabecalhoPagina, Cartao } from '../../componentes/Basicos';
import { Recurso } from '../../componentes/Recurso';
import { BadgeSituacao, BarraLimite } from '../../componentes/Regras';
import { EstadoVazio, Tabela, type Coluna } from '../../componentes/Tabela';
import { useNotificar } from '../../componentes/Toast';
import { formatarCentavos, formatarData, ROTULO_PERFIL } from '../../formatacao';
import { useRecurso } from '../../ganchos/useRecurso';
import { FormUsuario } from './FormUsuario';

const COLUNAS_EMPRESTIMOS: ReadonlyArray<Coluna<EmprestimoDoUsuario>> = [
  { titulo: 'Livro', celula: (item) => item.titulo },
  { titulo: 'Emprestado em', celula: (item) => formatarData(item.dataEmprestimo) },
  { titulo: 'Previsto', celula: (item) => formatarData(item.dataPrevista) },
  {
    titulo: 'Devolução',
    celula: (item) => (item.dataDevolucao ? formatarData(item.dataDevolucao) : <Badge tom="info">Em andamento</Badge>),
  },
];

const COLUNAS_MULTAS: ReadonlyArray<Coluna<Multa>> = [
  { titulo: 'Dias de atraso', numerica: true, celula: (multa) => multa.diasAtraso },
  { titulo: 'Valor', numerica: true, celula: (multa) => formatarCentavos(multa.valorCentavos) },
  { titulo: 'Situação', celula: (multa) => (multa.pagaEm ? <Badge tom="sucesso">Paga em {formatarData(multa.pagaEm)}</Badge> : <Badge tom="erro">Em aberto</Badge>) },
];

function Resumo({ usuario }: { readonly usuario: UsuarioDetalhado }) {
  const { resumo } = usuario;
  return (
    <Cartao titulo="Situação" acoes={<BadgeSituacao resumo={resumo} ativo={usuario.ativo} />}>
      <BarraLimite emUso={resumo.livrosEmUso} limite={resumo.limite} />
      <dl className="resumo">
        <dt>Perfil</dt><dd>{ROTULO_PERFIL[usuario.perfil]}</dd>
        <dt>Matrícula</dt><dd>{usuario.matricula}</dd>
        <dt>E-mail</dt><dd>{usuario.email}</dd>
        <dt>Prazo</dt><dd>{resumo.prazoDevolucaoDias} dias</dd>
        <dt>Em atraso</dt><dd>{resumo.emAtraso}</dd>
        <dt>Multas em aberto</dt><dd>{resumo.multasEmAberto}</dd>
      </dl>
      {resumo.pendente && (
        <Alerta tom="erro" titulo="Novos empréstimos bloqueados">Regularize multas e devoluções em atraso para liberar (RF01).</Alerta>
      )}
    </Cartao>
  );
}

function Historico({ usuario }: { readonly usuario: UsuarioDetalhado }) {
  return (
    <div className="pilha">
      <Cartao titulo="Empréstimos">
        <Tabela legenda="Histórico de empréstimos" colunas={COLUNAS_EMPRESTIMOS} itens={usuario.emprestimos} chave={(item) => item.id}
          vazio={<EstadoVazio titulo="Nenhum empréstimo registrado" />} />
      </Cartao>
      <Cartao titulo="Multas">
        <Tabela legenda="Multas do usuário" colunas={COLUNAS_MULTAS} itens={usuario.multas} chave={(multa) => multa.id}
          vazio={<EstadoVazio titulo="Nenhuma multa" />} />
      </Cartao>
    </div>
  );
}

function Acoes({ usuario, aoEditar, aoAlternar }: { readonly usuario: UsuarioDetalhado; readonly aoEditar: () => void; readonly aoAlternar: () => void }) {
  return (
    <>
      <Link className="botao" to="/usuarios"><ArrowLeft size={18} aria-hidden="true" /> Voltar</Link>
      <Botao icone={Pencil} onClick={aoEditar}>Editar</Botao>
      <Botao icone={Power} variante={usuario.ativo ? 'perigo' : undefined} onClick={aoAlternar}>{usuario.ativo ? 'Desativar' : 'Reativar'}</Botao>
      {usuario.ativo && <Link className="botao" data-variante="primario" to={`/emprestimos/novo?usuario=${usuario.id}`}><BookPlus size={18} aria-hidden="true" /> Emprestar</Link>}
    </>
  );
}

function useAcoesUsuario(id: number, recarregar: () => void) {
  const [editando, setEditando] = useState(false);
  const notificar = useNotificar();

  async function salvar(dados: DadosUsuario) {
    await api.usuarios.atualizar(id, dados);
    setEditando(false);
    notificar('Dados do usuário atualizados');
    recarregar();
  }

  async function alternarAtivo(usuario: UsuarioDetalhado) {
    await api.usuarios.atualizar(id, { ativo: !usuario.ativo });
    notificar(usuario.ativo ? 'Usuário desativado' : 'Usuário reativado', 'info');
    recarregar();
  }

  return { editando, setEditando, salvar, alternarAtivo };
}

export function UsuarioDetalhe() {
  const id = Number(useParams().id);
  const estado = useRecurso(() => api.usuarios.obter(id), [id]);
  const { editando, setEditando, salvar, alternarAtivo } = useAcoesUsuario(id, estado.recarregar);
  return (
    <Recurso estado={estado} linhas={10}>
      {(usuario) => (
        <>
          <CabecalhoPagina titulo={usuario.nome} descricao={`${ROTULO_PERFIL[usuario.perfil]} · ${usuario.matricula}`}
            acoes={<Acoes usuario={usuario} aoEditar={() => setEditando(true)} aoAlternar={() => alternarAtivo(usuario)} />} />
          <div className="grade grade-lateral">
            <Historico usuario={usuario} />
            <Resumo usuario={usuario} />
          </div>
          {editando && <FormUsuario aberto inicial={usuario} aoFechar={() => setEditando(false)} aoSalvar={salvar} />}
        </>
      )}
    </Recurso>
  );
}
