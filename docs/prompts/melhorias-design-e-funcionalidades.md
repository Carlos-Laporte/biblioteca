# Prompt — Evolução de design e funcionalidades do sistema de biblioteca

> Cole este prompt em uma nova sessão do assistente de código, aberta na raiz do projeto.

---

## Papel

Você é um engenheiro full-stack sênior (Node.js, PostgreSQL, React), com foco em design de interfaces,
acessibilidade e qualidade de software. Vai evoluir um projeto acadêmico já existente **sem quebrar nenhum
dos requisitos de qualidade que ele já cumpre**.

## Contexto do projeto (leia antes de começar)

Sistema de empréstimos de uma biblioteca universitária, em TypeScript + React 19 + Vite, com Docker.

- **Domínio** (`src/domain/`): classe `CalculadoraEmprestimo` com `validarEmprestimo(perfil, livrosEmprestados,
  livrosSolicitados, possuiPendencia)` e `calcularMulta(diasAtraso, perfil)`. Regras em `regras.ts`
  (`REGRAS_POR_PERFIL`, `REGRAS_MULTA`), validadores em `validacoes.ts`, erros em `erros.ts`
  (`ArgumentoInvalidoError`, `RegraNegocioError` com `motivo`).
- **Regras (RF01/RF02) — NÃO podem mudar:** Graduação 3 livros/15 dias; Pós 5/30; Professor 10/45; pendência
  bloqueia (com prioridade sobre o limite); multa 0–3 dias isenta, 4–10 dias R$ 2,50/dia desde o 1º dia,
  acima de 10 dias 10 × 2,50 + R$ 5,00/dia excedente, teto de R$ 150,00 (atingido em 35 dias).
- **UI atual** (`src/ui/`): uma página com dois painéis (simulador de empréstimo e de multa), CSS simples em
  `estilos.css`.
- **Qualidade atual:** 53 testes Vitest (padrão AAA, IDs `CTxx` rastreáveis a `docs/casos-de-teste.md`),
  100% de cobertura de linhas e ramos no domínio, Stryker 100%, ESLint + SonarJS com 0 apontamentos,
  `tsc` strict, Dockerfile com portão de qualidade (`verificacao` → `build` → `app` Nginx), CI no GitHub Actions
  (`.github/workflows/ci.yml`), automação em `scripts/docker.mjs`, `iniciar.bat` e `parar.bat`.
- **Comandos:** `npm run qualidade`, `npm run docker:subir`, `npm run docker:qualidade`, `npm run dev`.

Leia `README.md`, `docs/casos-de-teste.md`, `src/domain/*`, `src/ui/*`, `Dockerfile`, `docker-compose.yml` e
`.github/workflows/ci.yml` antes de propor qualquer mudança.

## Objetivo

Transformar o simulador em um **sistema de biblioteca completo**: back-end Node.js com PostgreSQL, interface
com a identidade visual da UniRV, fluxos reais de cadastro, empréstimo, devolução e multa usando as regras do
domínio, e testes em todas as camadas (unidade, integração com banco real e ponta a ponta).

## Parte 1 — Arquitetura

```
src/domain/     domínio puro, sem I/O (permanece aqui: o histórico Git e o relatório apontam para estes arquivos)
src/ui/         front-end React (consome a API; nenhuma regra de negócio em componentes)
api/            back-end Node.js
  src/rotas/        HTTP (validação de entrada com Zod, códigos de status, mapeamento de erros)
  src/servicos/     casos de uso: orquestram domínio + repositórios em transações
  src/repositorios/ acesso ao PostgreSQL
  src/db/           schema, migrations e seed
  tests/            testes de integração contra PostgreSQL real
e2e/            testes Playwright
```

- **API:** Fastify + TypeScript strict. **Banco:** PostgreSQL 17. **Acesso a dados:** Drizzle ORM com
  `node-postgres` e migrations versionadas (nada de SQL montado por concatenação).
- O domínio (`src/domain`) é **importado pela API**: a API é a autoridade das regras; o front pode reaproveitar
  o domínio só para *pré-visualizar* (ex.: mostrar a multa antes de confirmar a devolução).
- Erros do domínio viram respostas HTTP coerentes: `ArgumentoInvalidoError` → 400, `RegraNegocioError` → 422
  (com `motivo` no corpo), não encontrado → 404, conflito de concorrência → 409.
- **Transações:** registrar empréstimo, devolução e pagamento de multa em transação, com bloqueio da linha
  do usuário (`SELECT ... FOR UPDATE`) para que dois empréstimos simultâneos não ultrapassem o limite.
- **Configuração:** variáveis de ambiente lidas e validadas na inicialização; criar `.env.example`;
  **nunca** commitar `.env` nem senhas.

### Modelo de dados mínimo

| Tabela | Campos principais |
|---|---|
| `usuarios` | id, nome, matricula (única), email, perfil (`GRADUACAO`/`POS_GRADUACAO`/`PROFESSOR`), ativo, criado_em |
| `livros` | id, titulo, autor, isbn (único), ano, exemplares_total, criado_em |
| `emprestimos` | id, usuario_id, livro_id, data_emprestimo, data_prevista, data_devolucao (nula = ativo) |
| `multas` | id, emprestimo_id, usuario_id, dias_atraso, valor_centavos, paga_em (nula = em aberto) |

Valores monetários em **centavos (inteiro)** no banco; exemplares disponíveis calculados pelos empréstimos
ativos (ou mantidos com restrição `CHECK` que impeça valor negativo).

### Docker

Atualizar `docker-compose.yml` com:
- `db`: `postgres:17-alpine`, volume nomeado para os dados e `healthcheck` com `pg_isready`;
- `api`: build multi-stage com o mesmo portão de qualidade; espera o `db` ficar saudável, aplica as migrations
  e o seed na subida;
- `app`: Nginx servindo o front e fazendo *proxy* de `/api` para a `api` (sem CORS aberto).

`npm run docker:subir`, `iniciar.bat` e `parar.bat` devem continuar funcionando com um único comando/clique.

## Parte 2 — Design com a identidade visual da UniRV

Fonte: *Manual de Padronização Visual UniRV* (unirv.edu.br). Use exatamente estes valores:

| Papel | Cor | HEX | Uso recomendado |
|---|---|---|---|
| Principal (institucional) | Azul UniRV | `#27348B` | navegação, cabeçalho, botões primários, links |
| Secundária (do brasão) | Verde UniRV | `#009640` | sucesso/aprovado, destaques, ícones, áreas grandes |
| Apoio | Azul médio | `#0067B1` | estados de foco/hover, gráficos, informação |
| Apoio | Verde claro | `#76B82A` | detalhes e gráficos (nunca como texto) |
| Apoio | Cinza | `#DADADA` | bordas, divisores, fundos neutros |

**Tipografia:** Montserrat (Google Fonts) — Medium (500) para texto, ExtraBold (800) para títulos.

Regras obrigatórias:
1. **Tokens em CSS** (`:root`) com essas cores, mais tons derivados (claros/escuros) gerados a partir delas,
   tipografia, espaçamentos, raios e sombras. Nenhuma cor fixa fora dos tokens.
2. **Contraste WCAG AA (4,5:1 para texto normal).** O verde `#009640` tem ~3,9:1 sobre branco: **não** use
   para texto pequeno; para texto verde use um tom derivado mais escuro (≈ `#007A33`, ~5,5:1). Valide todas as
   combinações de texto/fundo e registre a tabela de contraste no README.
3. **Tema escuro:** derive tons mais claros do azul e do verde para manter contraste sobre fundo escuro;
   alternância manual que respeita `prefers-color-scheme` e lembra a escolha.
4. **Marca:** se for usar o logotipo, use somente o arquivo oficial fornecido por mim (não redesenhe nem
   recolora), respeitando a área de proteção, sem deformar e sobre fundo branco ou em box/tarja branca, como o
   manual exige. Rodapé com "Projeto acadêmico — não é um sistema oficial da UniRV".
5. **Layout:** barra lateral azul institucional com navegação (vira menu inferior no celular), cabeçalho com o
   título da página, conteúdo em cartões. Navegação com `react-router`.
6. **Componentes reutilizáveis** em `src/ui/componentes/`: Botão, Campo (rótulo, ajuda, erro), Select, Cartão,
   Badge, Tabela com busca e paginação, Modal de confirmação, Toast, Estado vazio, Esqueleto de carregamento.
7. **Visualização das regras:** barra "livros em uso / limite do perfil" que muda de cor perto do limite;
   gráfico da multa por dias de atraso (0 a 40 dias, com as faixas e o teto em 35 dias destacados), em SVG ou
   `recharts`; badges de perfil e de situação (em dia, atrasado, bloqueado).
8. **Acessibilidade:** foco visível, uso completo por teclado, `aria-live` nos resultados, erros ligados aos
   campos (`aria-describedby`), textos em pt-BR. **Responsivo** de 360 px a 1440 px, sem rolagem horizontal.
   Transições de 150–200 ms, desligadas com `prefers-reduced-motion`.

Ícones: `lucide-react`. Não use bibliotecas de componentes prontas (MUI, Ant etc.).

## Parte 3 — Funcionalidades

| Tela (rota) | O que faz | Endpoints |
|---|---|---|
| **Painel** `/` | Indicadores: empréstimos ativos, atrasados, multas em aberto (R$), usuários bloqueados; próximos vencimentos | `GET /api/painel` |
| **Usuários** `/usuarios` | Cadastrar, editar, desativar, buscar; detalhe com livros em uso, histórico e pendências | `GET/POST/PUT /api/usuarios` |
| **Acervo** `/livros` | Cadastrar e listar livros; exemplares totais e disponíveis | `GET/POST/PUT /api/livros` |
| **Novo empréstimo** `/emprestimos/novo` | Escolher usuário + livros; validação em tempo real; motivo da recusa; data prevista ao confirmar | `POST /api/emprestimos` |
| **Devolução** `/devolucoes` | Registrar devolução; dias de atraso e multa calculados; gera multa se houver | `POST /api/emprestimos/:id/devolucao` |
| **Multas** `/multas` | Listar (filtro em aberto/pagas) e registrar pagamento, que libera o usuário | `GET /api/multas`, `POST /api/multas/:id/pagamento` |
| **Simulador** `/simulador` | Os dois painéis atuais, redesenhados | — (só domínio) |

Seed com dados de exemplo convincentes (≈ 15 usuários dos três perfis, 30 livros, empréstimos em dia, atrasados
e com multa) para a demonstração funcionar logo ao subir.

## Novas regras de domínio (obrigatório usar TDD)

Implemente no domínio (`src/domain/`), sem I/O:

- `calcularDataDevolucao(dataEmprestimo, perfil)` → data + prazo do perfil, em dias corridos;
- `calcularDiasAtraso(dataPrevista, dataDevolucao)` → dias corridos após a data prevista (0 se no prazo);
- `possuiPendencia(multasEmAberto, emprestimosAtivos, hoje)` → verdadeiro se houver multa não paga **ou** livro
  com prazo vencido;
- quantidade de livros em uso a partir dos empréstimos ativos.

Datas como **data civil** (sem hora), no fuso `America/Sao_Paulo`. **Registre cada suposição** em
`docs/casos-de-teste.md`, com novas classes de equivalência e valores-limite: devolução no dia previsto, 1 dia
depois, 3/4 e 10/11 dias depois, virada de mês e de ano, 29 de fevereiro.

## Parte 4 — Testes

| Camada | Ferramenta | O que cobrir |
|---|---|---|
| Domínio | Vitest | regras novas em ciclos RED → GREEN, padrão AAA, IDs `CTxx` |
| API (integração) | Vitest + `fastify.inject` + **PostgreSQL real** (Testcontainers ou serviço `db` de teste) | cada endpoint: sucesso, 400, 404, 422 com `motivo`; transações; concorrência (2 empréstimos simultâneos não estouram o limite) |
| Componentes | Vitest + Testing Library (`jsdom`) | formulários, validação, estados vazio/erro/carregando |
| **Ponta a ponta** | **Playwright** contra o sistema completo no Docker | (1) empréstimo aprovado; (2) recusado por limite; (3) recusado por pendência; (4) devolução com atraso gera multa com o valor certo; (5) pagamento da multa libera novo empréstimo; (6) navegação só por teclado; (7) verificação de acessibilidade com `@axe-core/playwright` sem violações graves |

- Nada de *mock* do banco nos testes de integração: o banco precisa ser real.
- Playwright em Chromium, com captura de tela e trace em caso de falha; projeto extra em viewport de celular.
- Novos scripts: `test:api`, `test:e2e`; `npm run qualidade` passa a rodar tudo.
- **CI:** adicionar job com serviço `postgres` para os testes de integração e job que sobe o `docker compose` e
  roda o Playwright, publicando o relatório HTML do Playwright como artefato.

## Restrições de qualidade (não negociáveis)

1. **TDD:** para toda regra nova, commitar o teste falhando (`test(RED): ...`) antes da implementação
   (`feat(GREEN): ...`), como no histórico atual.
2. **Não alterar** `validarEmprestimo` e `calcularMulta`; os 53 testes atuais continuam passando sem mudança.
3. **Domínio:** cobertura de ramos ≥ 90% (manter 100% se possível) e Stryker ≥ 90%. **API:** cobertura ≥ 80%.
4. **ESLint + SonarJS com 0 apontamentos** em todo o código (front, API, testes), sem afrouxar as regras atuais
   (complexidade ciclomática ≤ 5 etc.); `tsc` strict sem erros.
5. `npm run qualidade` e `docker compose build` passando ao final de cada fase.
6. **Segurança:** validação de toda entrada com Zod, consultas parametrizadas, sem segredos no repositório,
   cabeçalhos de segurança no Nginx.
7. **Commits pequenos e progressivos**, em português, no padrão `tipo(escopo): descrição`.
8. **Não aumentar** o relatório em PDF além de 6 páginas; se incluir as novidades, substitua conteúdo.

## Forma de trabalho

Trabalhe em fases e **pare no fim de cada uma** para eu revisar:

1. **Plano:** estrutura de pastas, schema do banco, lista de endpoints, rotas e componentes, funções de domínio
   novas e paleta derivada com a tabela de contraste. Não escreva código antes da minha aprovação.
2. **Fundação:** API Fastify + PostgreSQL + Drizzle + migrations + Docker Compose (db, api, app) funcionando.
3. **Domínio novo:** regras de data, atraso e pendência em ciclos RED → GREEN → REFACTOR.
4. **API:** serviços, repositórios e rotas, com testes de integração contra banco real.
5. **Design system:** tokens UniRV, Montserrat, tema claro/escuro, layout e componentes base.
6. **Telas:** Painel, Usuários, Acervo, Empréstimo, Devolução, Multas, Simulador.
7. **E2E e polimento:** Playwright (fluxos 1–7), acessibilidade, responsividade, seed.
8. **Fechamento:** README (arquitetura, como rodar, tabela de contraste), `docs/casos-de-teste.md`, CI
   atualizado, `npm run qualidade` e `npm run docker:subir` passando; prints das telas principais nos temas
   claro e escuro e na largura de celular.

## Critérios de aceite

- [ ] `iniciar.bat` sobe banco, API e front com um clique, já com dados de exemplo
- [ ] Todas as telas da Parte 3 funcionando com dados no PostgreSQL
- [ ] Regras de negócio só no domínio; a API é a autoridade; nenhuma regra dentro de componentes
- [ ] Identidade visual UniRV (cores e Montserrat) com contraste AA validado, tema claro/escuro, 360–1440 px
- [ ] 53 testes originais intactos + testes de domínio, integração (banco real), componentes e Playwright passando
- [ ] Cobertura de ramos do domínio ≥ 90%, Stryker ≥ 90%, API ≥ 80%
- [ ] ESLint com 0 apontamentos e `tsc` sem erros
- [ ] CI verde: qualidade, integração com Postgres, build Docker e Playwright
- [ ] Histórico Git mostrando os ciclos TDD das regras novas
