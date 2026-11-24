import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Search } from 'lucide-react';

interface PropsBase {
  readonly rotulo: string;
  readonly ajuda?: string;
  readonly erro?: string;
}

function descritores(id: string, ajuda?: string, erro?: string) {
  const ids = [ajuda && `${id}-ajuda`, erro && `${id}-erro`].filter(Boolean).join(' ');
  return ids || undefined;
}

function Mensagens({ id, ajuda, erro }: { readonly id: string; readonly ajuda?: string; readonly erro?: string }) {
  return (
    <>
      {ajuda && <span id={`${id}-ajuda`} className="campo-ajuda">{ajuda}</span>}
      {erro && <span id={`${id}-erro`} className="campo-erro">{erro}</span>}
    </>
  );
}

/** Campo de texto acessível: rótulo, ajuda e erro ligados por aria-describedby. */
export function Campo({ rotulo, ajuda, erro, ...entrada }: PropsBase & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="campo" data-invalido={Boolean(erro)}>
      <label htmlFor={id}>{rotulo}</label>
      <input id={id} aria-invalid={Boolean(erro)} aria-describedby={descritores(id, ajuda, erro)} {...entrada} />
      <Mensagens id={id} ajuda={ajuda} erro={erro} />
    </div>
  );
}

interface PropsSelecao extends PropsBase, SelectHTMLAttributes<HTMLSelectElement> {
  readonly children: ReactNode;
}

export function Selecao({ rotulo, ajuda, erro, children, ...selecao }: PropsSelecao) {
  const id = useId();
  return (
    <div className="campo" data-invalido={Boolean(erro)}>
      <label htmlFor={id}>{rotulo}</label>
      <select id={id} aria-invalid={Boolean(erro)} aria-describedby={descritores(id, ajuda, erro)} {...selecao}>
        {children}
      </select>
      <Mensagens id={id} ajuda={ajuda} erro={erro} />
    </div>
  );
}

interface PropsBusca {
  readonly rotulo: string;
  readonly valor: string;
  readonly aoMudar: (valor: string) => void;
  readonly placeholder?: string;
}

export function CampoBusca({ rotulo, valor, aoMudar, placeholder }: PropsBusca) {
  const id = useId();
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="campo-busca">
        <Search size={18} aria-hidden="true" />
        <input id={id} type="search" value={valor} placeholder={placeholder} onChange={(evento) => aoMudar(evento.target.value)} />
      </div>
    </div>
  );
}

interface PropsAbas<T extends string> {
  readonly rotulo: string;
  readonly opcoes: ReadonlyArray<readonly [T, string]>;
  readonly valor: T;
  readonly aoMudar: (valor: T) => void;
}

/** Filtro segmentado (botões com aria-pressed). */
export function Abas<T extends string>({ rotulo, opcoes, valor, aoMudar }: PropsAbas<T>) {
  return (
    <fieldset className="abas" aria-label={rotulo} style={{ border: 0, margin: 0 }}>
      {opcoes.map(([chave, texto]) => (
        <button key={chave} type="button" aria-pressed={valor === chave} onClick={() => aoMudar(chave)}>
          {texto}
        </button>
      ))}
    </fieldset>
  );
}
