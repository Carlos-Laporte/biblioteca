import { CalculadoraEmprestimo, PerfilUsuario, REGRAS_MULTA } from '../../domain';
import { formatarReais } from '../formatacao';

const calculadora = new CalculadoraEmprestimo();

const DIAS_MAXIMOS = 40;
const DIA_TETO = 35; // 25 + 5 × (d − 10) = 150
const LARGURA = 640;
const ALTURA = 260;
const MARGEM = { topo: 16, direita: 16, base: 36, esquerda: 52 } as const;
const PASSO_VALOR = 50;
const MARCAS_VALOR = Array.from({ length: REGRAS_MULTA.TETO / PASSO_VALOR + 1 }, (_, indice) => indice * PASSO_VALOR);
// Marcas do eixo X exatamente nas fronteiras da regra (AVL): 0, 3, 10, 35 e o fim do gráfico.
const MARCAS_DIA = [0, REGRAS_MULTA.DIAS_TOLERANCIA, REGRAS_MULTA.DIAS_PRIMEIRA_FAIXA, DIA_TETO, DIAS_MAXIMOS];
const AJUSTE_TEXTO = 4;
const RECUO_ROTULO_Y = 8;
const DESCIDA_ROTULO_X = 18;
const METADE = 2;
const RAIO_MARCADOR = 7;

const larguraUtil = LARGURA - MARGEM.esquerda - MARGEM.direita;
const alturaUtil = ALTURA - MARGEM.topo - MARGEM.base;
const xDia = (dia: number) => MARGEM.esquerda + (dia / DIAS_MAXIMOS) * larguraUtil;
const yValor = (valor: number) => MARGEM.topo + alturaUtil - (valor / REGRAS_MULTA.TETO) * alturaUtil;

// A curva é gerada pelo próprio domínio: o gráfico nunca diverge da regra.
const PONTOS = Array.from({ length: DIAS_MAXIMOS + 1 }, (_, dia) => [dia, calculadora.calcularMulta(dia, PerfilUsuario.GRADUACAO)] as const);
const CAMINHO = PONTOS.map(([dia, valor], indice) => `${indice === 0 ? 'M' : 'L'}${xDia(dia)},${yValor(valor)}`).join(' ');

// [classe CSS, dia inicial, dia final, legenda, token de cor]
const FAIXAS = [
  ['faixa-tolerancia', 0, REGRAS_MULTA.DIAS_TOLERANCIA, 'Tolerância (0–3 dias): isento', '--sucesso-suave'],
  ['faixa-1', REGRAS_MULTA.DIAS_TOLERANCIA, REGRAS_MULTA.DIAS_PRIMEIRA_FAIXA, '4–10 dias: R$ 2,50/dia', '--info-suave'],
  ['faixa-2', REGRAS_MULTA.DIAS_PRIMEIRA_FAIXA, DIA_TETO, '11–34 dias: + R$ 5,00/dia excedente', '--alerta-suave'],
  ['faixa-teto', DIA_TETO, DIAS_MAXIMOS, '35+ dias: teto de R$ 150,00', '--erro-suave'],
] as const;

function Eixos() {
  return (
    <g>
      {MARCAS_VALOR.map((valor) => (
        <g key={valor}>
          <line className="grade-linha" x1={MARGEM.esquerda} x2={LARGURA - MARGEM.direita} y1={yValor(valor)} y2={yValor(valor)} />
          <text x={MARGEM.esquerda - RECUO_ROTULO_Y} y={yValor(valor) + AJUSTE_TEXTO} textAnchor="end">R$ {valor}</text>
        </g>
      ))}
      {MARCAS_DIA.map((dia) => (
        <text key={dia} x={xDia(dia)} y={ALTURA - MARGEM.base + DESCIDA_ROTULO_X} textAnchor="middle">{dia}</text>
      ))}
      <text x={MARGEM.esquerda + larguraUtil / METADE} y={ALTURA - AJUSTE_TEXTO} textAnchor="middle">dias de atraso</text>
      <line className="eixo" x1={MARGEM.esquerda} x2={LARGURA - MARGEM.direita} y1={yValor(0)} y2={yValor(0)} />
    </g>
  );
}

/** Multa por dias de atraso (0–40), com faixas e teto destacados e o ponto atual marcado. */
export function GraficoMulta({ diasAtuais }: { readonly diasAtuais?: number }) {
  const dentro = diasAtuais !== undefined && Number.isInteger(diasAtuais) && diasAtuais >= 0;
  const diaMarcado = dentro ? Math.min(diasAtuais, DIAS_MAXIMOS) : undefined;
  const resumo = `Gráfico da multa: isento até 3 dias, R$ 2,50 por dia de 4 a 10 dias, mais R$ 5,00 por dia excedente e teto de ${formatarReais(REGRAS_MULTA.TETO)} a partir de 35 dias.`;
  return (
    <figure className="pilha" style={{ margin: 0 }}>
      <svg className="grafico" viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" aria-label={resumo}>
        {FAIXAS.map(([classe, inicio, fim]) => (
          <rect key={classe} className={classe} x={xDia(inicio)} y={MARGEM.topo} width={xDia(fim) - xDia(inicio)} height={alturaUtil} />
        ))}
        <Eixos />
        <line className="linha-teto" x1={MARGEM.esquerda} x2={LARGURA - MARGEM.direita} y1={yValor(REGRAS_MULTA.TETO)} y2={yValor(REGRAS_MULTA.TETO)} />
        <path className="curva" d={CAMINHO} />
        {diaMarcado !== undefined && (
          <circle className="marcador" cx={xDia(diaMarcado)} cy={yValor(PONTOS[diaMarcado][1])} r={RAIO_MARCADOR} />
        )}
      </svg>
      <figcaption className="legenda">
        {FAIXAS.map(([classe, , , texto, cor]) => (
          <span key={classe}>
            <i style={{ background: `var(${cor})` }} />
            {texto}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
