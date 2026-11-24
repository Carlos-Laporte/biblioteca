import { useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Botao } from './Basicos';

export interface Coluna<T> {
  readonly titulo: string;
  readonly celula: (item: T) => ReactNode;
  readonly numerica?: boolean;
}

interface PropsTabela<T> {
  readonly legenda: string;
  readonly colunas: ReadonlyArray<Coluna<T>>;
  readonly itens: readonly T[];
  readonly chave: (item: T) => string | number;
  readonly vazio?: ReactNode;
  readonly porPagina?: number;
}

const ITENS_POR_PAGINA = 10;

function Paginacao({ pagina, total, aoMudar }: { readonly pagina: number; readonly total: number; readonly aoMudar: (pagina: number) => void }) {
  if (total <= 1) return null;
  return (
    <nav className="paginacao" aria-label="Paginação">
      <span>
        Página {pagina} de {total}
      </span>
      <div className="acoes">
        <Botao tamanho="pequeno" icone={ChevronLeft} disabled={pagina === 1} onClick={() => aoMudar(pagina - 1)} aria-label="Página anterior" />
        <Botao tamanho="pequeno" icone={ChevronRight} disabled={pagina === total} onClick={() => aoMudar(pagina + 1)} aria-label="Próxima página" />
      </div>
    </nav>
  );
}

const classeColuna = (numerica?: boolean) => (numerica ? 'numero' : undefined);

function TabelaHtml<T>({ legenda, colunas, itens, chave }: Omit<PropsTabela<T>, 'vazio' | 'porPagina'>) {
  return (
    <div className="tabela-contorno">
      <table className="tabela">
        <caption className="visualmente-oculto">{legenda}</caption>
        <thead>
          <tr>
            {colunas.map((coluna) => <th key={coluna.titulo} scope="col" className={classeColuna(coluna.numerica)}>{coluna.titulo}</th>)}
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={chave(item)}>
              {colunas.map((coluna) => <td key={coluna.titulo} className={classeColuna(coluna.numerica)}>{coluna.celula(item)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Tabela acessível (caption, th com scope) com paginação no cliente. */
export function Tabela<T>({ legenda, colunas, itens, chave, vazio, porPagina = ITENS_POR_PAGINA }: PropsTabela<T>) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina));
  useEffect(() => setPagina(1), [itens.length]);

  if (itens.length === 0) return <>{vazio ?? <EstadoVazio titulo="Nada por aqui" />}</>;
  const visiveis = itens.slice((pagina - 1) * porPagina, pagina * porPagina);
  return (
    <div className="pilha">
      <TabelaHtml legenda={legenda} colunas={colunas} itens={visiveis} chave={chave} />
      <Paginacao pagina={pagina} total={totalPaginas} aoMudar={setPagina} />
    </div>
  );
}

export function EstadoVazio({ titulo, children }: { readonly titulo: string; readonly children?: ReactNode }) {
  return (
    <div className="estado-vazio">
      <Inbox size={36} aria-hidden="true" />
      <strong>{titulo}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

const LINHAS_ESQUELETO = 4;
const LARGURAS_ESQUELETO = ['100%', '85%', '70%'];

export function Esqueleto({ linhas = LINHAS_ESQUELETO }: { readonly linhas?: number }) {
  return (
    <div className="pilha" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: linhas }, (_, indice) => (
        <div key={indice} className="esqueleto" style={{ width: LARGURAS_ESQUELETO[indice % LARGURAS_ESQUELETO.length] }} />
      ))}
    </div>
  );
}
