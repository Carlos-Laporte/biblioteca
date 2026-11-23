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
      const resposta = await fetch(URL_APP);
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
    garantirDocker();
    executar('docker compose up -d --build app');
    process.stdout.write('\n⏳ Aguardando a aplicação responder');
    if (!(await aguardarAplicacao())) {
      console.error('\n✖ A aplicação não respondeu a tempo. Veja: npm run docker:logs');
      process.exit(1);
    }
    console.log(`\n✓ Aplicação no ar em ${URL_APP}`);
    abrirNavegador(URL_APP);
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
    executar('docker compose logs -f app');
  },
};

const acao = acoes[process.argv[2]];
if (!acao) {
  console.error(`Uso: node scripts/docker.mjs <${Object.keys(acoes).join('|')}>`);
  process.exit(1);
}
await acao();
