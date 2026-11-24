import { useDeferredValue, useState, type FormEvent } from 'react';
import { BookPlus, Pencil } from 'lucide-react';
import { api } from '../../api/cliente';
import type { DadosLivro, Livro } from '../../api/tipos';
import { Alerta, Badge, Botao, CabecalhoPagina, Cartao } from '../../componentes/Basicos';
import { Campo, CampoBusca } from '../../componentes/Campos';
import { Modal } from '../../componentes/Modal';
import { Recurso } from '../../componentes/Recurso';
import { EstadoVazio, Tabela, type Coluna } from '../../componentes/Tabela';
import { useNotificar } from '../../componentes/Toast';
import { useEnvio } from '../../ganchos/useEnvio';
import { useRecurso } from '../../ganchos/useRecurso';

const ANO_PADRAO = 2024;
const VAZIO: DadosLivro = { titulo: '', autor: '', isbn: '', ano: ANO_PADRAO, exemplaresTotal: 1 };

function BadgeDisponivel({ livro }: { readonly livro: Livro }) {
  const tom = livro.disponiveis === 0 ? 'erro' : 'sucesso';
  return <Badge tom={tom}>{livro.disponiveis} de {livro.exemplaresTotal} disponíveis</Badge>;
}

interface PropsForm {
  readonly livro?: Livro;
  readonly aoFechar: () => void;
  readonly aoSalvar: (dados: DadosLivro) => Promise<void>;
}

function CamposLivro({ dados, erros, mudar }: { readonly dados: DadosLivro; readonly erros: Record<string, string>; readonly mudar: (parcial: Partial<DadosLivro>) => void }) {
  return (
    <div className="formulario formulario-2">
      <Campo rotulo="Título" required value={dados.titulo} erro={erros.titulo} onChange={(evento) => mudar({ titulo: evento.target.value })} />
      <Campo rotulo="Autor" required value={dados.autor} erro={erros.autor} onChange={(evento) => mudar({ autor: evento.target.value })} />
      <Campo rotulo="ISBN" required value={dados.isbn} erro={erros.isbn} ajuda="Ex.: 978-85-359-0277-1" onChange={(evento) => mudar({ isbn: evento.target.value })} />
      <Campo rotulo="Ano" type="number" value={dados.ano} erro={erros.ano} onChange={(evento) => mudar({ ano: evento.target.valueAsNumber })} />
      <Campo rotulo="Exemplares" type="number" min={1} value={dados.exemplaresTotal} erro={erros.exemplaresTotal}
        onChange={(evento) => mudar({ exemplaresTotal: evento.target.valueAsNumber })} />
    </div>
  );
}

const camposEditaveis = ({ titulo, autor, isbn, ano, exemplaresTotal }: DadosLivro): DadosLivro => ({ titulo, autor, isbn, ano, exemplaresTotal });

function FormLivro({ livro, aoFechar, aoSalvar }: PropsForm) {
  const [dados, setDados] = useState<DadosLivro>(livro ? camposEditaveis(livro) : VAZIO);
  const { erro, enviando, enviar, errosPorCampo } = useEnvio(aoSalvar);

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    await enviar(dados);
  }

  return (
    <Modal aberto titulo={livro ? 'Editar livro' : 'Novo livro'} aoFechar={aoFechar}>
      <form className="pilha" onSubmit={submeter} noValidate>
        {erro && <Alerta tom="erro" titulo="Não foi possível salvar" anunciar>{erro.message}</Alerta>}
        <CamposLivro dados={dados} erros={errosPorCampo} mudar={(parcial) => setDados((atual) => ({ ...atual, ...parcial }))} />
        <div className="modal-rodape">
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="primario" type="submit" disabled={enviando}>Salvar</Botao>
        </div>
      </form>
    </Modal>
  );
}

function colunasLivros(aoEditar: (livro: Livro) => void): ReadonlyArray<Coluna<Livro>> {
  return [
    { titulo: 'Título', celula: (livro) => <div><strong>{livro.titulo}</strong><div className="suave pequeno">{livro.autor}</div></div> },
    { titulo: 'Ano', numerica: true, celula: (livro) => livro.ano },
    { titulo: 'ISBN', celula: (livro) => livro.isbn },
    { titulo: 'Disponibilidade', celula: (livro) => <BadgeDisponivel livro={livro} /> },
    { titulo: 'Ações', celula: (livro) => <Botao tamanho="pequeno" icone={Pencil} onClick={() => aoEditar(livro)} aria-label={`Editar ${livro.titulo}`} /> },
  ];
}

export function Livros() {
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Livro | 'novo'>();
  const notificar = useNotificar();
  const termo = useDeferredValue(busca);
  const estado = useRecurso(() => api.livros.listar(termo), [termo]);
  const colunas = colunasLivros(setEditando);

  async function salvar(dados: DadosLivro) {
    const salvo = editando === 'novo' || !editando ? await api.livros.criar(dados) : await api.livros.atualizar(editando.id, dados);
    setEditando(undefined);
    notificar(`"${salvo.titulo}" salvo no acervo`);
    estado.recarregar();
  }

  return (
    <>
      <CabecalhoPagina titulo="Acervo" descricao="Livros e exemplares disponíveis para empréstimo"
        acoes={<Botao variante="primario" icone={BookPlus} onClick={() => setEditando('novo')}>Novo livro</Botao>} />
      <Cartao rotulo="Lista de livros">
        <CampoBusca rotulo="Buscar livro" valor={busca} aoMudar={setBusca} placeholder="Título, autor ou ISBN" />
        <Recurso estado={estado}>
          {(livros) => <Tabela legenda="Acervo" colunas={colunas} itens={livros} chave={(livro) => livro.id} vazio={<EstadoVazio titulo="Nenhum livro encontrado" />} />}
        </Recurso>
      </Cartao>
      {editando && <FormLivro livro={editando === 'novo' ? undefined : editando} aoFechar={() => setEditando(undefined)} aoSalvar={salvar} />}
    </>
  );
}
