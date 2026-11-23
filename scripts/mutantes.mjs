// Análise de mutantes MANUAL: aplica um defeito por vez, roda a suíte e reverte.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const MUTANTES = [
  {
    id: 'M1',
    tipo: 'Operador relacional (ROR)',
    arquivo: 'src/domain/CalculadoraEmprestimo.ts',
    original: 'if (totalAposEmprestimo > limiteLivros) {',
    mutante: 'if (totalAposEmprestimo >= limiteLivros) {',
  },
  {
    id: 'M2',
    tipo: 'Constante financeira',
    arquivo: 'src/domain/regras.ts',
    original: 'VALOR_DIA_PRIMEIRA_FAIXA: 2.5,',
    mutante: 'VALOR_DIA_PRIMEIRA_FAIXA: 2.0,',
  },
  {
    id: 'M3',
    tipo: 'Inversão de condição lógica',
    arquivo: 'src/domain/CalculadoraEmprestimo.ts',
    original: 'if (possuiPendencia) {',
    mutante: 'if (!possuiPendencia) {',
  },
];

function rodarSuite() {
  const r = spawnSync('npx', ['vitest', 'run', '--reporter=json', '--outputFile=reports/vitest-mutante.json'], {
    encoding: 'utf8',
    shell: true,
    env: { ...process.env, NO_COLOR: '1' },
  });
  if (r.error) throw r.error;
  const json = JSON.parse(readFileSync('reports/vitest-mutante.json', 'utf8'));
  const falhas = json.testResults
    .flatMap((f) => f.assertionResults)
    .filter((a) => a.status === 'failed')
    .map((a) => a.title);
  return { total: json.numTotalTests, falharam: json.numFailedTests, falhas };
}

const resultados = [];
for (const m of MUTANTES) {
  const codigoOriginal = readFileSync(m.arquivo, 'utf8');
  if (!codigoOriginal.includes(m.original)) throw new Error(`${m.id}: trecho original não encontrado`);
  try {
    writeFileSync(m.arquivo, codigoOriginal.replace(m.original, m.mutante));
    const r = rodarSuite();
    const status = r.falharam > 0 ? 'MORTO' : 'SOBREVIVENTE';
    resultados.push({ ...m, ...r, status });
    console.log(`\n[${m.id}] ${m.tipo} — ${m.arquivo}`);
    console.log(`   original: ${m.original}`);
    console.log(`   mutante : ${m.mutante}`);
    console.log(`   => ${status}: ${r.falharam}/${r.total} testes falharam`);
    r.falhas.forEach((t) => console.log(`      × ${t}`));
  } finally {
    writeFileSync(m.arquivo, codigoOriginal); // reverte SEMPRE a mutação
  }
}

const final = rodarSuite();
console.log(`\nCódigo revertido. Suíte original: ${final.total - final.falharam}/${final.total} passando.`);
const mortos = resultados.filter((r) => r.status === 'MORTO').length;
console.log(`Escore de mutação manual: ${mortos}/${resultados.length} = ${((100 * mortos) / resultados.length).toFixed(0)}%`);
mkdirSync('docs/evidencias', { recursive: true });
writeFileSync('docs/evidencias/13-mutantes.json', JSON.stringify(resultados, null, 2));
