// Gera as evidências (prints) do relatório a partir das saídas REAIS das ferramentas
// e imprime o relatório em PDF. Requer Google Chrome ou Microsoft Edge instalado.
//   npm run evidencias
import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = resolve('.');
const EVID = resolve('docs/evidencias');
const IMG = resolve('docs/relatorio/img');
const TMP = resolve('reports/terminal');
mkdirSync(IMG, { recursive: true });
mkdirSync(TMP, { recursive: true });

const NAVEGADORES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const NAVEGADOR = NAVEGADORES.find((caminho) => existsSync(caminho));
if (!NAVEGADOR) throw new Error('Chrome/Edge não encontrado');

const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
const rodar = (comando) => {
  try {
    return execSync(comando, { encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (erro) {
    return `${erro.stdout ?? ''}${erro.stderr ?? ''}`; // ex.: ESLint sai com código 1 quando há apontamentos
  }
};
const semCaminhoAbsoluto = (texto) =>
  texto.replaceAll(`${RAIZ}\\`, '').replaceAll(`${RAIZ.replaceAll('\\', '/')}/`, '').replaceAll(RAIZ, '.');

function escapar(texto) {
  return texto.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function colorir(linha) {
  const html = escapar(linha);
  if (/✓|MORTO|passed|100\.00 \||Killed|All files .*100/.test(linha)) return `<span class="ok">${html}</span>`;
  if (/×|SOBREVIVENTE|\[Survived]|failed| error /.test(linha)) return `<span class="erro">${html}</span>`;
  if (/warning/.test(linha)) return `<span class="aviso">${html}</span>`;
  if (/^\s*\$ /.test(linha)) return `<span class="cmd">${html}</span>`;
  return html;
}

function screenshot(url, arquivo, largura, altura) {
  execSync(
    `"${NAVEGADOR}" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 ` +
      `--window-size=${largura},${altura} --virtual-time-budget=6000 --screenshot="${arquivo}" "${url}"`,
    { stdio: 'ignore' },
  );
  console.log(`print: ${arquivo}`);
}

function printTerminal(nome, comando, saida, largura = 1000) {
  // eslint-disable-next-line no-control-regex -- remove códigos de cor ANSI
  const semAnsi = saida.replace(/\x1b\[[0-9;]*m/g, '');
  const linhas = [`$ ${comando}`, ...semCaminhoAbsoluto(semAnsi).trimEnd().split(/\r?\n/)];
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#0f1419}
    .janela{font:12.5px/1.45 Consolas,'Cascadia Mono',monospace;color:#d6dde6;padding:14px 16px;white-space:pre}
    .barra{background:#232a33;color:#8b96a3;font:12px system-ui;padding:6px 12px}
    .ok{color:#7ee2a8}.erro{color:#ff8b80}.aviso{color:#f5c26b}.cmd{color:#82b8ff}
  </style><div class="barra">● ● ●  Terminal — calculadora-emprestimo</div><div class="janela">${linhas.map(colorir).join('\n')}</div>`;
  const arquivoHtml = resolve(TMP, `${nome}.html`);
  writeFileSync(arquivoHtml, html);
  const altura = Math.ceil(linhas.length * 18.2 + 60);
  screenshot(pathToFileURL(arquivoHtml).href, resolve(IMG, `${nome}.png`), largura, altura);
}

// 1) Histórico Git (TDD)
const log = rodar('git log --reverse --format="%h  %ad  %s" --date=format:"%d/%m %H:%M"');
writeFileSync(resolve(EVID, '00-git-log.txt'), log);
printTerminal('git-log', 'git log --reverse --oneline', log, 900);

// 2) Suíte de testes passando
writeFileSync(resolve(EVID, '15-suite-final.txt'), rodar('npx vitest run --reporter=tree'));
const suite = rodar('npx vitest run --reporter=default');
const semLinhaRun = (texto) => texto.split('\n').filter((linha) => !linha.trimStart().startsWith('RUN ')).join('\n');
printTerminal('suite', 'npx vitest run', semLinhaRun(suite), 640);

// 3) Cobertura (texto + relatório HTML do v8)
const cobertura = rodar('npx vitest run --coverage --reporter=dot');
const tabela = cobertura.slice(cobertura.indexOf('% Coverage report'));
writeFileSync(resolve(EVID, '12-cobertura-final.txt'), tabela);
printTerminal('cobertura-texto', 'npx vitest run --coverage', tabela, 760);
screenshot(pathToFileURL(resolve('coverage/index.html')).href, resolve(IMG, 'cobertura-html.png'), 1000, 420);

// 4) Análise estática antes x depois
const antes = readFileSync(resolve(EVID, '10-lint-antes.txt'), 'utf8');
printTerminal('lint-antes', 'npx eslint .   # commit f6d8a19 (antes da refatoração)', antes, 1220);
const saidaLint = rodar('npx eslint . --max-warnings=0').trim();
const depois = saidaLint || '✓ 0 problemas (0 erros, 0 avisos) — código-fonte, testes, UI e scripts';
writeFileSync(resolve(EVID, '11-lint-depois.txt'), depois);
printTerminal('lint-depois', 'npx eslint . --max-warnings=0   # após refatoração', depois, 1060);

// 5) Mutantes manuais
const mutantes = readFileSync(resolve(EVID, '13-mutantes.txt'), 'utf8')
  .split('\n')
  .filter((linha) => !linha.startsWith('(node:') && !linha.includes('trace-deprecation'))
  .join('\n');
printTerminal('mutantes', 'npm run mutantes', mutantes, 900);

// 6) Stryker antes x depois (apenas tabelas-resumo)
const tabelaStryker = (arquivo) => {
  const texto = readFileSync(resolve(EVID, arquivo), 'utf8');
  return texto
    .split(/\r?\n/)
    .filter((linha) => /^[-\w. ]*\|/.test(linha))
    .join('\n');
};
printTerminal(
  'stryker',
  'npx stryker run',
  `# 1ª execução (antes dos testes complementares)\n${tabelaStryker('14-stryker-1.txt')}\n# 2ª execução (após testes complementares)\n${tabelaStryker('14-stryker-2.txt')}`,
  900,
);

// 7) Interface React (servidor de preview do Vite)
rodar('npx vite build');
const servidor = spawn('npx', ['vite', 'preview', '--port', '4799', '--strictPort'], { shell: true, env });
await new Promise((ok) => setTimeout(ok, 4000));
screenshot('http://localhost:4799/', resolve(IMG, 'ui.png'), 1000, 560);
if (process.platform === 'win32') execSync(`taskkill /pid ${servidor.pid} /T /F`, { stdio: 'ignore' });
else servidor.kill();

// 8) Relatório em PDF
const relatorio = resolve('docs/relatorio/relatorio.html');
const pdf = resolve('docs/Relatorio-Tecnico-CalculadoraEmprestimo.pdf');
execSync(
  `"${NAVEGADOR}" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=4000 ` +
    `--print-to-pdf="${pdf}" "${pathToFileURL(relatorio).href}"`,
  { stdio: 'ignore' },
);
console.log(`PDF: ${pdf}`);
