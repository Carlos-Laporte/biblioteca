// Automação do Docker:  node scripts/docker.mjs <subir|qualidade|parar|logs>
//   subir     — build (com portão de qualidade), sobe o container, espera ficar saudável e abre o navegador
//   qualidade — roda o pipeline completo no container e exporta os relatórios para ./coverage e ./reports
//   parar     — derruba os containers
//   logs      — acompanha os logs da aplicação
import { spawnSync, execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const URL_APP = 'http://localhost:8080';
const TEMPO_MAXIMO_MS = 60_000;
const INTERVALO_MS = 1000;

function executar(comando) {
  console.log(`\n▶ ${comando}`);
  const resultado = spawnSync(comando, { stdio: 'inherit', shell: true });
  if (resultado.status !== 0) {
    console.error(`\n✖ Falhou: ${comando}`);
    process.exit(resultado.status ?? 1);
  }
}

function garantirDocker() {
  try {
    execSync('docker info', { stdio: 'ignore' });
  } catch {
    console.error('✖ Docker não está em execução. Abra o Docker Desktop e tente novamente.');
    process.exit(1);
  }
}

async function aguardarAplicacao() {
  const inicio = Date.now();
  while (Date.now() - inicio < TEMPO_MAXIMO_MS) {
    try {
      const resposta = await fetch(`${URL_APP}/api/saude`); // atravessa Nginx → API → banco
      if (resposta.ok) return true;
    } catch {
      // container ainda iniciando
    }
    await new Promise((ok) => setTimeout(ok, INTERVALO_MS));
  }
  return false;
}

function abrirNavegador(url) {
  const comandos = { win32: `start "" "${url}"`, darwin: `open "${url}"` };
  try {
    execSync(comandos[process.platform] ?? `xdg-open "${url}"`, { stdio: 'ignore' });
  } catch {
    console.log(`Abra manualmente: ${url}`);
  }
}

const acoes = {
  async subir() {
    await subirSistema();
    abrirNavegador(URL_APP);
  },
  async e2e() {
    await subirSistema();
    executar('npx playwright test');
    console.log('\n✓ E2E concluído. Relatório: npx playwright show-report');
  },
  resetar() {
    if (!process.argv.includes('--sim')) {
      console.error('⚠ Isto APAGA todos os dados do banco local (volume dados-postgres) e recria os dados de exemplo.');
      console.error('  Para confirmar:  npm run docker:resetar -- --sim');
      process.exit(1);
    }
    executar('docker compose --profile ferramentas down -v --remove-orphans');
    executar('docker compose up -d --build --wait');
    console.log('\n✓ Banco recriado com os dados de exemplo.');
  },
  qualidade() {
    garantirDocker();
    rmSync('relatorios-docker', { recursive: true, force: true });
    executar('docker compose --profile ferramentas run --rm --build qualidade');
    console.log('\n✓ Pipeline concluído. Relatórios:');
    console.log('  relatorios-docker/cobertura/index.html  (cobertura de linhas e ramos)');
    console.log('  relatorios-docker/mutacao/index.html    (Stryker)');
  },
  parar() {
    executar('docker compose --profile ferramentas down --remove-orphans');
  },
  logs() {
    executar('docker compose logs -f db api app');
  },
};

async function subirSistema() {
  garantirDocker();
  executar('docker compose up -d --build');
  process.stdout.write('\n⏳ Aguardando banco, API e interface');
  if (!(await aguardarAplicacao())) {
    console.error('\n✖ O sistema não respondeu a tempo. Veja: npm run docker:logs');
    process.exit(1);
  }
  console.log(`\n✓ Sistema no ar em ${URL_APP}`);
}

const acao = acoes[process.argv[2]];
if (!acao) {
  console.error(`Uso: node scripts/docker.mjs <${Object.keys(acoes).join('|')}>`);
  process.exit(1);
}
await acao();
