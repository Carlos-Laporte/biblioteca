import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ResumoUsuario } from '../api/tipos';
import { Badge, type Tom } from './Basicos';

type Nivel = 'ok' | 'alerta' | 'cheio';

const PORCENTAGEM = 100;

function nivelDoUso(emUso: number, limite: number): Nivel {
  if (emUso >= limite) return 'cheio';
  return emUso === limite - 1 ? 'alerta' : 'ok';
}

/** "Livros em uso / limite do perfil" — muda de cor perto do limite. */
export function BarraLimite({ emUso, limite, rotulo = 'Livros em uso' }: { readonly emUso: number; readonly limite: number; readonly rotulo?: string }) {
  const porcentagem = Math.min(PORCENTAGEM, (emUso / limite) * PORCENTAGEM);
  return (
    <div className="barra-limite" data-nivel={nivelDoUso(emUso, limite)}>
      <div className="barra-limite-texto">
        <span>{rotulo}</span>
        <strong>
          {emUso} / {limite}
        </strong>
      </div>
      <div
        className="barra-limite-trilho"
        role="progressbar"
        aria-label={`${rotulo}: ${emUso} de ${limite}`}
        aria-valuemin={0}
        aria-valuemax={limite}
        aria-valuenow={emUso}
      >
        <div className="barra-limite-preenchimento" style={{ width: `${porcentagem}%` }} />
      </div>
    </div>
  );
}

type RegraSituacao = readonly [(resumo: ResumoUsuario, ativo: boolean) => boolean, Tom, string];

// Primeira regra verdadeira vence; a pendência (multa ou atraso) vem do domínio.
const REGRAS_SITUACAO: readonly RegraSituacao[] = [
  [(_resumo, ativo) => !ativo, 'neutro', 'Inativo'],
  [(resumo) => resumo.multasEmAberto > 0, 'erro', 'Bloqueado · multa'],
  [(resumo) => resumo.emAtraso > 0, 'erro', 'Bloqueado · atraso'],
  [(resumo) => resumo.livrosEmUso >= resumo.limite, 'alerta', 'No limite'],
];

const LIBERADO: RegraSituacao = [() => true, 'sucesso', 'Liberado'];

/** Situação do usuário (pendência = multa em aberto ou livro em atraso). */
export function BadgeSituacao({ resumo, ativo = true }: { readonly resumo: ResumoUsuario; readonly ativo?: boolean }) {
  const [, tom, texto] = REGRAS_SITUACAO.find(([condicao]) => condicao(resumo, ativo)) ?? LIBERADO;
  return <Badge tom={tom}>{texto}</Badge>;
}

export function BadgeAtraso({ dias }: { readonly dias: number }) {
  if (dias === 0) return <Badge tom="sucesso">No prazo</Badge>;
  return <Badge tom="erro">{dias === 1 ? '1 dia de atraso' : `${dias} dias de atraso`}</Badge>;
}

interface PropsIndicador {
  readonly rotulo: string;
  readonly valor: ReactNode;
  readonly icone: LucideIcon;
  readonly tom?: Tom;
  readonly detalhe?: string;
}

export function Indicador({ rotulo, valor, icone, tom = 'primario', detalhe }: PropsIndicador) {
  const Icone = icone;
  return (
    <article className="indicador" data-tom={tom}>
      <div className="indicador-icone">
        <Icone size={22} aria-hidden="true" />
      </div>
      <div>
        <span className="indicador-valor">{valor}</span>
        <span className="indicador-rotulo">{rotulo}</span>
        {detalhe && <span className="indicador-rotulo"> · {detalhe}</span>}
      </div>
    </article>
  );
}
