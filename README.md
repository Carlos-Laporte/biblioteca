# Biblioteca UniRV — Empréstimos e Multas

Sistema de biblioteca universitária construído em torno do módulo de regras de negócio
**`CalculadoraEmprestimo`** (elegibilidade de empréstimos — RF01 —, multas por atraso — RF02 — e renovação — RF03),
desenvolvido com **TDD** e validado por cobertura, análise de mutantes, análise estática,
testes de integração com banco real e testes ponta a ponta.

> Projeto acadêmico — não é um sistema oficial da UniRV. Os dados de exemplo são fictícios.

| | |
|---|---|
| Domínio | TypeScript 5.9 (`strict`) — **126 testes, 100% de linhas e ramos, Stryker 100%** |
| API | Node.js 24 + Fastify 5 + PostgreSQL 17 (Drizzle ORM) — **56 testes de integração em banco real, 97,7% de linhas** |
| Interface | React 19 + Vite 8, identidade visual UniRV — **23 testes de componentes** |
| Ponta a ponta | Playwright (desktop + celular) — **37 testes**: fluxos, acessibilidade (axe, WCAG 2.1 AA) e responsividade |
| Análise estática | ESLint + typescript-eslint + SonarJS — **0 apontamentos** (eram 41 no baseline do TDD) |
| Infraestrutura | Docker Compose (db + api + app) com portão de qualidade; CI no GitHub Actions |

## Como rodar na máquina local

### Pré-requisitos

| Ferramenta | Versão | Para quê |
|---|---|---|
| [Git](https://git-scm.com/downloads) | qualquer recente | baixar o projeto |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 4.x ou superior (Compose v2) | rodar banco, API e interface |
| [Node.js](https://nodejs.org/) | 24 LTS (mínimo 20) | só para os comandos `npm` e para os testes fora do Docker |

### Passo a passo (recomendado: tudo no Docker)

```bash
# 1. Baixe o projeto
git clone https://github.com/Carlos-Laporte/biblioteca.git
cd biblioteca

# 2. Abra o Docker Desktop e espere ele iniciar

# 3. Suba banco (PostgreSQL), API e interface
docker compose up -d --build
```

Na primeira vez, a construção leva alguns minutos, porque os testes rodam dentro dela e a imagem só
é criada se todos passarem. Quando terminar, acesse **http://localhost:8080**. O banco já vem com
dados de exemplo (15 usuários, 30 livros, empréstimos em dia, atrasados e com multa).

Para desligar: `docker compose down`. Os dados ficam salvos para a próxima vez.

**Atalhos:**
- **Windows, sem terminal:** dê dois cliques em **`iniciar.bat`** (sobe tudo e abre o navegador) e
  em **`parar.bat`** para desligar.
- **Com Node.js instalado:** `npm install` uma vez e depois `npm run docker:subir`.

**Problemas comuns:**
- *"Docker não está em execução":* abra o Docker Desktop e espere o ícone ficar verde.
- *Porta 8080 ocupada:* troque `"8080:80"` por outra porta (ex.: `"8081:80"`) em `docker-compose.yml`.
- *Quero começar do zero:* `npm run docker:resetar -- --sim` (apaga o banco local e recria os dados de exemplo).

### Rodar os testes na máquina local

```bash
npm install
npx playwright install chromium   # uma vez, para os testes ponta a ponta
npm test                          # domínio + componentes
npm run coverage:api              # API contra PostgreSQL real (precisa do Docker aberto)
npm run docker:e2e                # sobe o sistema e roda o Playwright
npm run docker:qualidade          # pipeline completo dentro do Docker
```

### Comandos de automação

| Comando | O que faz |
|---|---|
| `npm run docker:subir` | Sobe o sistema completo, já com dados de exemplo, e abre o navegador |
| `npm run docker:e2e` | Sobe o sistema e roda os testes Playwright contra ele |
| `npm run docker:qualidade` | Pipeline completo em containers; relatórios em `relatorios-docker/` |
| `npm run docker:logs` | Acompanha os logs de banco, API e interface |
| `npm run docker:parar` | Derruba os containers (os dados do banco são mantidos) |
| `npm run docker:resetar -- --sim` | **Apaga** o banco local e recria os dados de exemplo |

### Desenvolvimento local (sem Docker para a aplicação)

```bash
npm install
npm run dev:api   # API em :3000 (requer DATABASE_URL; veja .env.example)
npm run dev       # interface em :5173, com proxy de /api para a API
```

### Testes e qualidade

```bash
npm test               # domínio + componentes de interface
npm run coverage       # domínio, com mínimo de 90% (falha abaixo disso)
npm run coverage:api   # integração da API com PostgreSQL real (Testcontainers), mínimo de 80%
npm run test:e2e       # Playwright (com o sistema no ar: npm run docker:subir)
npm run mutantes       # 3 mutantes manuais, um por vez, com reversão automática
npm run mutation:auto  # Stryker no domínio
npm run lint           # ESLint + SonarJS
npm run contraste      # contraste WCAG das cores do design system
npm run qualidade      # tudo acima, exceto E2E
npm run evidencias     # regenera os prints e o PDF do relatório
```

Os testes de integração sobem um PostgreSQL descartável via **Testcontainers** (é preciso ter Docker).
Para usar um banco já existente, defina `BIBLIOTECA_TEST_DATABASE_URL`. Como os testes apagam as
tabelas, o nome desse banco precisa conter "teste"; caso contrário, os testes se recusam a rodar.

## Arquitetura

```
src/domain/     regras de negócio puras (sem I/O) — a fonte única das regras
  CalculadoraEmprestimo.ts  validarEmprestimo() e calcularMulta()        (RF01/RF02, TDD)
  datas.ts                  data prevista, dias de atraso, "hoje" em Brasília (CT39–CT49)
  pendencias.ts             pendência = multa em aberto ou livro vencido (CT50–CT54)
api/            Fastify + Drizzle + PostgreSQL
  src/servicos/   casos de uso em transação (SELECT … FOR UPDATE contra concorrência)
  src/rotas.ts    HTTP + validação Zod; erros do domínio → 400/404/409/422
  drizzle/        migrations versionadas (aplicadas na subida)
  tests/          integração contra PostgreSQL real
src/ui/         React: design system, componentes e telas
e2e/            Playwright contra o sistema completo
docs/           casos de teste (PE/AVL), evidências e relatório técnico em PDF
```

A **API é a autoridade** das regras: o mesmo módulo `src/domain` decide pendência, limite, data prevista
e multa. O front usa esse mesmo módulo só para *pré-visualizar* a decisão em tempo real, e a API
confirma ao salvar.

| Erro | HTTP | Exemplo |
|---|---|---|
| `ArgumentoInvalidoError` / Zod | 400 | data em outro formato, matrícula inválida |
| `NaoEncontradoError` | 404 | usuário ou livro inexistente |
| `ConflitoError` | 409 | matrícula duplicada, devolver duas vezes |
| `RegraNegocioError` / `OperacaoRecusadaError` | 422 (`motivo`) | `PENDENCIA`, `LIMITE_EXCEDIDO`, `LIVRO_INDISPONIVEL` |

### Telas

Painel · Novo empréstimo · Devolução · Usuários (lista e detalhe) · Acervo · Multas · Simulador.

### Regras (RF01/RF02/RF03)

| Perfil | Limite simultâneo | Prazo |
|---|---|---|
| Graduação | 3 livros | 15 dias |
| Pós-Graduação | 5 livros | 30 dias |
| Professor | 10 livros | 45 dias |

- Pendência (multa não paga ou livro vencido) bloqueia o empréstimo, com prioridade sobre o limite.
- Multa: 0–3 dias isento · 4–10 dias R$ 2,50/dia desde o 1º dia · acima de 10 dias, 10 × R$ 2,50 +
  R$ 5,00 por dia excedente · teto de R$ 150,00 (atingido com 35 dias).
- Suposições das regras de data (dias corridos, fuso de Brasília, devolução no dia previsto sem atraso):
  [docs/casos-de-teste.md](docs/casos-de-teste.md#3-extensão--regras-de-datas-e-pendência-sistema-completo).
- Renovação (RF03, no domínio: `validarRenovacao`): até 2 renovações por empréstimo, a partir de 3 dias
  antes da data prevista; o novo prazo conta a partir do dia da renovação. É recusada se o empréstimo
  estiver vencido, se o usuário tiver pendência ou se outro usuário tiver reservado o livro
  ([casos de teste](docs/casos-de-teste.md#4-extensão--renovação-de-empréstimo-rf03)).

## Identidade visual e acessibilidade

As cores vêm do *Manual de Padronização Visual UniRV*: azul `#27348B` (principal), verde `#009640`
(secundária) e, como apoio, `#0067B1`, `#76B82A` e `#DADADA`. A tipografia é Montserrat, servida
localmente.

O verde oficial tem contraste de 3,9:1 sobre branco, abaixo do mínimo de 4,5:1 para texto. Por isso,
textos verdes usam um tom derivado mais escuro (`#006B2D`). O verde oficial aparece em áreas e destaques.

Contraste validado por `npm run contraste` (tema claro; o tema escuro também passa em todos os pares):

| Par | Texto | Fundo | Contraste |
|---|---|---|---|
| Texto principal | `#1A1F36` | `#F4F6FB` | 15,02:1 |
| Texto secundário | `#4F5670` | `#FFFFFF` | 7,25:1 |
| Links e títulos em azul | `#27348B` | `#FFFFFF` | 10,77:1 |
| Botão primário / barra lateral | `#FFFFFF` | `#27348B` | 10,77:1 |
| Texto verde (sucesso) | `#006B2D` | `#FFFFFF` | 6,69:1 |
| Alerta de atenção | `#7A4A00` | `#FFF4DB` | 6,85:1 |
| Erro | `#B42318` | `#FFFFFF` | 6,57:1 |
| Borda de campos (mín. 3:1) | `#7C8399` | `#FFFFFF` | 3,77:1 |
| Anel de foco (mín. 3:1) | `#0067B1` | `#FFFFFF` | 5,87:1 |

A interface também atende a estes pontos:
- tema claro/escuro, que respeita o sistema e lembra a escolha;
- uso completo pelo teclado, com link "pular para o conteúdo" e foco visível;
- resultados anunciados por `aria-live`;
- tabelas com `caption` e regiões roláveis focáveis;
- funciona de 360 px a 1440 px sem rolagem horizontal, com menu inferior no celular;
- animações desligadas com `prefers-reduced-motion`.

## Histórico TDD

O histórico Git registra cada ciclo **RED → GREEN**: o teste é commitado falhando antes do código de
produção. Depois vêm a refatoração guiada pela análise estática, os testes complementares guiados
pela mutação e a extensão para o sistema completo, também em TDD (CT39–CT54).

```bash
git log --oneline --reverse
```
