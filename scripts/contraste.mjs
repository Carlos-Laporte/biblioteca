// Verifica o contraste WCAG 2.1 dos pares de cores do design system (temas claro e escuro).
// Lê os tokens direto de src/ui/estilos/tokens.css e falha se algum par ficar abaixo do mínimo.
//   npm run contraste
import { readFileSync } from 'node:fs';

const MINIMO_TEXTO = 4.5; // texto normal (AA)
const MINIMO_COMPONENTE = 3; // bordas de campos, ícones e texto grande (AA)

const css = readFileSync('src/ui/estilos/tokens.css', 'utf8');

const COR_HEX = /^#[0-9a-fA-F]{6}$/;

function lerTokens(seletor) {
  const inicio = css.indexOf(`${seletor} {`);
  const bloco = css.slice(inicio, css.indexOf('}', inicio));
  const declaracoes = bloco
    .split(';')
    .map((trecho) => trecho.trim().split('\n').pop().trim())
    .filter((declaracao) => declaracao.startsWith('--'))
    .map((declaracao) => declaracao.slice(2).split(':').map((parte) => parte.trim()))
    .filter(([, valor]) => COR_HEX.test(valor ?? ''));
  return Object.fromEntries(declaracoes);
}

function luminancia(hex) {
  const canais = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = canais.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contraste(corA, corB) {
  const [maior, menor] = [luminancia(corA), luminancia(corB)].sort((a, b) => b - a);
  return (maior + 0.05) / (menor + 0.05);
}

// [texto, fundo, mínimo, descrição]
const PARES = [
  ['texto', 'fundo', MINIMO_TEXTO, 'Texto principal'],
  ['texto', 'superficie', MINIMO_TEXTO, 'Texto em cartões'],
  ['texto-suave', 'superficie', MINIMO_TEXTO, 'Texto secundário'],
  ['texto-suave', 'fundo', MINIMO_TEXTO, 'Texto secundário no fundo'],
  ['primaria-texto', 'superficie', MINIMO_TEXTO, 'Links e títulos em azul'],
  ['sobre-primaria', 'primaria', MINIMO_TEXTO, 'Botão primário'],
  ['sobre-primaria', 'lateral', MINIMO_TEXTO, 'Texto na barra lateral'],
  ['lateral-suave', 'lateral', MINIMO_TEXTO, 'Texto secundário na barra lateral'],
  ['sucesso', 'sucesso-suave', MINIMO_TEXTO, 'Badge/alerta de sucesso'],
  ['sucesso', 'superficie', MINIMO_TEXTO, 'Texto verde'],
  ['alerta', 'alerta-suave', MINIMO_TEXTO, 'Badge/alerta de atenção'],
  ['erro', 'erro-suave', MINIMO_TEXTO, 'Badge/alerta de erro'],
  ['erro', 'superficie', MINIMO_TEXTO, 'Mensagem de erro de campo'],
  ['info', 'info-suave', MINIMO_TEXTO, 'Badge/alerta informativo'],
  ['primaria-texto', 'primaria-suave', MINIMO_TEXTO, 'Item de menu ativo / badge azul'],
  ['borda-campo', 'superficie', MINIMO_COMPONENTE, 'Borda de campos'],
  ['foco', 'superficie', MINIMO_COMPONENTE, 'Anel de foco'],
  ['foco', 'fundo', MINIMO_COMPONENTE, 'Anel de foco no fundo'],
];

let falhas = 0;
for (const [tema, seletor] of [['claro', ':root'], ['escuro', ':root[data-tema="escuro"]']]) {
  const tokens = { ...lerTokens(':root'), ...lerTokens(seletor) };
  console.log(`\nTema ${tema}`);
  console.log('| Par | Texto | Fundo | Contraste | Mínimo | |');
  console.log('|---|---|---|---|---|---|');
  for (const [texto, fundo, minimo, descricao] of PARES) {
    const razao = contraste(tokens[texto], tokens[fundo]);
    const ok = razao >= minimo;
    if (!ok) falhas += 1;
    console.log(`| ${descricao} | ${tokens[texto]} | ${tokens[fundo]} | ${razao.toFixed(2)}:1 | ${minimo}:1 | ${ok ? '✓' : '✗'} |`);
  }
}

if (falhas > 0) {
  console.error(`\n✗ ${falhas} par(es) abaixo do mínimo WCAG AA`);
  process.exit(1);
}
console.log('\n✓ Todos os pares atendem ao WCAG 2.1 AA');
