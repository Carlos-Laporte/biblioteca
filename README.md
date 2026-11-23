# CalculadoraEmprestimo — Biblioteca Universitária

Módulo de regras de negócio para **elegibilidade de empréstimos (RF01)** e **cálculo de multas por atraso (RF02)**,
desenvolvido com **TDD** em TypeScript, com cobertura de código, análise de mutantes e análise estática.

| | |
|---|---|
| Linguagem | TypeScript 5.9 (`strict`) · Node.js ≥ 20 |
| Testes / cobertura | Vitest + `@vitest/coverage-v8` — **53 testes, 100% linhas e ramos** |
| Mutação | Manual (`scripts/mutantes.mjs`, 3/3 mortos) + Stryker (**100%**, 69/69) |
| Análise estática | ESLint + typescript-eslint + SonarJS — **41 → 0 apontamentos** |
| Interface | React 19 + Vite |

## Como executar

```bash
npm install
npm test               # suíte de testes
npm run coverage       # cobertura (falha se < 90%); relatório em coverage/index.html
npm run lint           # análise estática
npm run typecheck      # verificação de tipos
npm run mutantes       # 3 mutantes manuais, um por vez, com reversão automática
npm run mutation:auto  # Stryker; relatório em reports/mutation/index.html
npm run dev            # interface React em http://localhost:5173
npm run evidencias     # regenera os prints e o PDF do relatório (requer Chrome/Edge)
```

## Executar com Docker

A imagem só é construída se **typecheck, lint e testes com cobertura ≥ 90%** passarem (portão de qualidade no
`Dockerfile`). A interface é servida por Nginx.

```bash
docker compose up -d --build              # interface em http://localhost:8080
docker compose --profile ferramentas run --rm testes                         # testes + cobertura
docker compose --profile ferramentas run --rm mutacao                        # 3 mutantes manuais
docker compose --profile ferramentas run --rm mutacao npm run mutation:auto  # Stryker
docker compose down                       # parar
```

## Regras implementadas

| Perfil | Limite simultâneo | Prazo |
|---|---|---|
| Graduação | 3 livros | 15 dias |
| Pós-Graduação | 5 livros | 30 dias |
| Professor | 10 livros | 45 dias |

- Pendência (multa ou atraso) → `RegraNegocioError` (`motivo: 'PENDENCIA'`), com prioridade sobre o limite.
- Atuais + solicitados > limite → `RegraNegocioError` (`motivo: 'LIMITE_EXCEDIDO'`).
- Multa: 0–3 dias isento · 4–10 dias R$ 2,50/dia desde o 1º dia · > 10 dias 10 × R$ 2,50 + R$ 5,00/dia excedente ·
  teto R$ 150,00 (atingido em 35 dias).
- Entradas inválidas (dias/livros negativos ou não inteiros, perfil nulo/desconhecido, pendência não booleana) →
  `ArgumentoInvalidoError` (equivalente a `IllegalArgumentException`).

## Estrutura

```
src/domain/            regras de negócio (sem dependência de UI)
  CalculadoraEmprestimo.ts   validarEmprestimo() e calcularMulta()
  regras.ts                  tabela de perfis e constantes da multa
  validacoes.ts              validadores de entrada
  erros.ts                   ArgumentoInvalidoError, RegraNegocioError
src/ui/                interface React
tests/                 testes unitários (padrão AAA, IDs CTxx rastreáveis)
docs/casos-de-teste.md Partição de Equivalência e Análise do Valor Limite
docs/evidencias/       saídas reais de cada etapa (RED/GREEN, cobertura, lint, mutação)
docs/Relatorio-Tecnico-CalculadoraEmprestimo.pdf
```

## Histórico TDD

O histórico Git registra cada ciclo **RED → GREEN** (o teste é commitado falhando antes do código de produção),
seguido da refatoração guiada pela análise estática e dos testes complementares guiados pela mutação:
`git log --oneline --reverse`.
