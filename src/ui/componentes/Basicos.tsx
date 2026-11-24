import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, CircleCheck, Info, OctagonAlert, type LucideIcon } from 'lucide-react';

export type Tom = 'neutro' | 'primario' | 'sucesso' | 'alerta' | 'erro' | 'info';

interface PropsBotao extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Sem variante, o botão é secundário (estilo padrão no CSS). */
  readonly variante?: 'primario' | 'perigo' | 'fantasma';
  readonly tamanho?: 'pequeno';
  readonly icone?: LucideIcon;
}

export function Botao({ variante, tamanho, icone, children, type = 'button', ...resto }: PropsBotao) {
  const Icone = icone;
  return (
    <button className="botao" data-variante={variante} data-tamanho={tamanho} type={type} {...resto}>
      {Icone && <Icone size={18} aria-hidden="true" />}
      {children && <span>{children}</span>}
    </button>
  );
}

export function Badge({ tom = 'neutro', children }: { readonly tom?: Tom; readonly children: ReactNode }) {
  return (
    <span className="badge" data-tom={tom}>
      {children}
    </span>
  );
}

interface PropsCabecalho {
  readonly titulo?: string;
  readonly descricao?: string;
  readonly acoes?: ReactNode;
}

function CabecalhoCartao({ titulo, descricao, acoes }: PropsCabecalho) {
  return (
    <header className="cartao-cabecalho">
      <div>
        {titulo && <h2>{titulo}</h2>}
        {descricao && <p>{descricao}</p>}
      </div>
      {acoes && <div className="acoes">{acoes}</div>}
    </header>
  );
}

interface PropsCartao extends PropsCabecalho {
  readonly children: ReactNode;
  readonly rotulo?: string;
}

export function Cartao({ titulo, descricao, acoes, children, rotulo }: PropsCartao) {
  const temCabecalho = Boolean(titulo || acoes);
  return (
    <section className="cartao" aria-label={rotulo ?? titulo}>
      {temCabecalho && <CabecalhoCartao titulo={titulo} descricao={descricao} acoes={acoes} />}
      {children}
    </section>
  );
}

const ICONE_ALERTA: Record<Tom, LucideIcon> = {
  neutro: Info,
  primario: Info,
  info: Info,
  sucesso: CircleCheck,
  alerta: AlertTriangle,
  erro: OctagonAlert,
};

const ANUNCIO = { role: 'status', 'aria-live': 'polite' } as const;

interface PropsAlerta {
  readonly tom: Tom;
  readonly titulo: string;
  readonly children?: ReactNode;
  /** Leitores de tela anunciam a mudança (aria-live). */
  readonly anunciar?: boolean;
}

export function Alerta({ tom, titulo, children, anunciar = false }: PropsAlerta) {
  const Icone = ICONE_ALERTA[tom];
  return (
    <div className="alerta" data-tom={tom} {...(anunciar ? ANUNCIO : {})}>
      <Icone size={20} aria-hidden="true" />
      <div>
        <strong>{titulo}</strong>
        {children && <span>{children}</span>}
      </div>
    </div>
  );
}

export function CabecalhoPagina({ titulo, descricao, acoes }: { readonly titulo: string; readonly descricao?: string; readonly acoes?: ReactNode }) {
  return (
    <header className="cabecalho-pagina">
      <div>
        <h1>{titulo}</h1>
        {descricao && <p>{descricao}</p>}
      </div>
      {acoes && <div className="acoes">{acoes}</div>}
    </header>
  );
}
