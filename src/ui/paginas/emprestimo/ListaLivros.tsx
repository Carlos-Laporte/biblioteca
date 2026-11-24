import { useState } from 'react';
import type { Livro } from '../../api/tipos';
import { Badge } from '../../componentes/Basicos';
import { CampoBusca } from '../../componentes/Campos';
import { EstadoVazio } from '../../componentes/Tabela';

interface PropsLista {
  readonly livros: readonly Livro[];
  readonly selecionados: ReadonlySet<number>;
  readonly aoAlternar: (id: number) => void;
}

const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function ItemLivro({ livro, marcado, aoAlternar }: { readonly livro: Livro; readonly marcado: boolean; readonly aoAlternar: () => void }) {
  const indisponivel = livro.disponiveis === 0 && !marcado;
  return (
    <li>
      <label aria-disabled={indisponivel}>
        <input type="checkbox" checked={marcado} disabled={indisponivel} onChange={aoAlternar} />
        <span className="titulo-livro">
          {livro.titulo}
          <small>{livro.autor} · {livro.ano}</small>
        </span>
        <Badge tom={livro.disponiveis === 0 ? 'erro' : 'sucesso'}>
          {livro.disponiveis === 0 ? 'Indisponível' : `${livro.disponiveis} disp.`}
        </Badge>
      </label>
    </li>
  );
}

/** Seleção de livros com busca (ignora acentos); exemplares indisponíveis ficam desabilitados. */
export function ListaLivros({ livros, selecionados, aoAlternar }: PropsLista) {
  const [busca, setBusca] = useState('');
  const termo = normalizar(busca);
  const filtrados = livros.filter((livro) => normalizar(`${livro.titulo} ${livro.autor}`).includes(termo));
  return (
    <fieldset className="pilha" style={{ border: 0, margin: 0, padding: 0 }}>
      <legend className="visualmente-oculto">Livros do pedido</legend>
      <CampoBusca rotulo="Buscar no acervo" valor={busca} aoMudar={setBusca} placeholder="Título ou autor" />
      {filtrados.length === 0 ? (
        <EstadoVazio titulo="Nenhum livro corresponde à busca" />
      ) : (
        <ul className="lista-selecao">
          {filtrados.map((livro) => (
            <ItemLivro key={livro.id} livro={livro} marcado={selecionados.has(livro.id)} aoAlternar={() => aoAlternar(livro.id)} />
          ))}
        </ul>
      )}
    </fieldset>
  );
}
