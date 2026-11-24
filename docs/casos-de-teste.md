# Documentação dos Casos de Teste — `CalculadoraEmprestimo`

Documento elaborado **apenas a partir da especificação** (RF01 e RF02), antes da
implementação, aplicando **Partição de Equivalência (PE)** e **Análise do Valor
Limite (AVL/BVA)**. Os identificadores `CTxx` são usados nos nomes dos testes
automatizados (`tests/`), garantindo rastreabilidade.

## Interface projetada

```ts
validarEmprestimo(perfil, livrosEmprestados, livrosSolicitados, possuiPendencia)
  // => { aprovado: true, perfil, limite, totalAposEmprestimo, prazoDevolucaoDias }
  // lança RegraNegocioError (pendência ou limite) | ArgumentoInvalidoError (entrada inválida)

calcularMulta(diasAtraso, perfil)
  // => valor em R$ (number) | lança ArgumentoInvalidoError
```

`ArgumentoInvalidoError` é o equivalente TypeScript de `IllegalArgumentException`.
`RegraNegocioError` representa a recusa por regra de negócio.

## 1. Partição de Equivalência

### RF01 — Elegibilidade e prazo

| Entrada | Classe | Tipo | Representante | Resultado esperado |
|---|---|---|---|---|
| perfil | CE01 `GRADUACAO` | Válida | GRADUACAO | limite 3, prazo 15 dias |
| perfil | CE02 `POS_GRADUACAO` | Válida | POS_GRADUACAO | limite 5, prazo 30 dias |
| perfil | CE03 `PROFESSOR` | Válida | PROFESSOR | limite 10, prazo 45 dias |
| perfil | CE04 nulo / indefinido | Inválida | `null`, `undefined` | `ArgumentoInvalidoError` |
| perfil | CE05 desconhecido | Inválida | `'VISITANTE'` | `ArgumentoInvalidoError` |
| livrosEmprestados | CE06 inteiro ≥ 0 | Válida | 0, 2 | processa |
| livrosEmprestados | CE07 negativo | Inválida | -1 | `ArgumentoInvalidoError` |
| livrosEmprestados | CE08 não inteiro / NaN | Inválida | 1.5, `NaN` | `ArgumentoInvalidoError` |
| livrosSolicitados | CE09 inteiro ≥ 1 | Válida | 1 | processa |
| livrosSolicitados | CE10 zero ou negativo | Inválida | 0, -2 | `ArgumentoInvalidoError` |
| livrosSolicitados | CE11 não inteiro / infinito | Inválida | 2.5, `Infinity` | `ArgumentoInvalidoError` |
| possuiPendencia | CE12 `false` | Válida | false | processa |
| possuiPendencia | CE13 `true` | Válida (recusa) | true | `RegraNegocioError` (pendência) |
| possuiPendencia | CE14 não booleano | Inválida | `undefined` | `ArgumentoInvalidoError` |
| atuais + solicitados | CE15 ≤ limite do perfil | Válida | 2 + 1 (Grad.) | aprovado |
| atuais + solicitados | CE16 > limite do perfil | Válida (recusa) | 3 + 1 (Grad.) | `RegraNegocioError` (limite) |

### RF02 — Multa por atraso

| Entrada | Classe | Tipo | Representante | Resultado esperado |
|---|---|---|---|---|
| diasAtraso | CE17 0 a 3 (tolerância) | Válida | 2 | R$ 0,00 |
| diasAtraso | CE18 4 a 10 | Válida | 7 | 7 × 2,50 = R$ 17,50 |
| diasAtraso | CE19 11 a 34 (acima de 10, abaixo do teto) | Válida | 20 | 25 + 10 × 5 = R$ 75,00 |
| diasAtraso | CE20 ≥ 35 (teto) | Válida | 100 | R$ 150,00 |
| diasAtraso | CE21 negativo | Inválida | -5 | `ArgumentoInvalidoError` |
| diasAtraso | CE22 não inteiro / NaN | Inválida | 4.5, `NaN` | `ArgumentoInvalidoError` |
| perfil | CE01–CE03 | Válida | todos | mesma tabela de multa |
| perfil | CE04–CE05 | Inválida | `null`, `'VISITANTE'` | `ArgumentoInvalidoError` |

**Cálculo do ponto do teto:** para d > 10, multa = 10 × 2,50 + (d − 10) × 5,00 =
25 + 5(d − 10). Igualando a 150: 5(d − 10) = 125 ⇒ **d = 35**.

## 2. Análise do Valor Limite

### RF01 — fronteiras de quantidade de livros

| ID | Perfil | Atuais | Solicitados | Total | Fronteira | Esperado |
|---|---|---|---|---|---|---|
| CT01 | GRADUACAO | 0 | 3 | 3 | = limite | aprovado, prazo 15 |
| CT02 | GRADUACAO | 2 | 1 | 3 | = limite | aprovado |
| CT03 | GRADUACAO | 3 | 1 | 4 | limite + 1 | recusa (limite) |
| CT04 | GRADUACAO | 0 | 4 | 4 | limite + 1 | recusa (limite) |
| CT05 | POS_GRADUACAO | 4 | 1 | 5 | = limite | aprovado, prazo 30 |
| CT06 | POS_GRADUACAO | 5 | 1 | 6 | limite + 1 | recusa (limite) |
| CT07 | PROFESSOR | 9 | 1 | 10 | = limite | aprovado, prazo 45 |
| CT08 | PROFESSOR | 10 | 1 | 11 | limite + 1 | recusa (limite) |
| CT09 | GRADUACAO | 0 | 1 | 1 | mínimo válido | aprovado |
| CT10 | GRADUACAO | -1 | 1 | — | atuais = -1 | `ArgumentoInvalidoError` |
| CT11 | GRADUACAO | 0 | 0 | — | solicitados = 0 | `ArgumentoInvalidoError` |
| CT12 | qualquer | 0 | 1 | 1 | pendência = true | recusa (pendência) |

Casos de classes inválidas (sem fronteira numérica): CT13 perfil nulo, CT14 perfil
indefinido, CT15 perfil desconhecido, CT16 atuais não inteiro, CT17 solicitados não
inteiro/infinito, CT18 pendência não booleana, CT19 pendência tem prioridade sobre
o limite (pendência **e** limite estourado ⇒ motivo pendência).

### RF02 — fronteiras de dias de atraso

| ID | Dias | Fronteira | Cálculo | Esperado |
|---|---|---|---|---|
| CT20 | -1 | abaixo do domínio | — | `ArgumentoInvalidoError` |
| CT21 | 0 | início da tolerância | — | R$ 0,00 |
| CT22 | 3 | fim da tolerância | — | R$ 0,00 |
| CT23 | 4 | início da 1ª faixa | 4 × 2,50 | R$ 10,00 |
| CT24 | 10 | fim da 1ª faixa | 10 × 2,50 | R$ 25,00 |
| CT25 | 11 | início da 2ª faixa | 25 + 1 × 5 | R$ 30,00 |
| CT26 | 34 | teto − 1 dia | 25 + 24 × 5 | R$ 145,00 |
| CT27 | 35 | **atinge o teto** | 25 + 25 × 5 | R$ 150,00 |
| CT28 | 36 | teto + 1 dia | 155 → teto | R$ 150,00 |
| CT29 | 1000 | valor extremo | → teto | R$ 150,00 |

Casos complementares: CT30 dias não inteiro/NaN, CT31 perfil nulo/desconhecido na
multa, CT32 multa independe do perfil (mesmo valor para os três perfis).

Casos complementares guiados por mutação (Stryker): CT33–CT38 (perfil não-string e
mensagens de erro) — ver `tests/mensagens-erro.test.ts`.

## 3. Extensão — regras de datas e pendência (sistema completo)

A especificação original recebe **dias de atraso** e um **indicador de pendência** prontos.
Para o sistema completo (empréstimo e devolução reais), esses valores passam a ser
**calculados** a partir de datas. As regras abaixo são novas e foram implementadas com TDD
(`tests/datas.test.ts`, `tests/pendencias.test.ts`).

### Suposições registradas

| # | Suposição | Justificativa |
|---|---|---|
| S1 | Datas são **datas civis** (`AAAA-MM-DD`), sem hora | prazo e atraso são contados em dias |
| S2 | Prazo e atraso em **dias corridos** | a especificação fala em "dias", sem citar dias úteis |
| S3 | "Hoje" é calculado no fuso **America/Sao_Paulo** | a biblioteca opera no horário de Brasília |
| S4 | Devolução **no dia previsto** não tem atraso (0 dia) | o prazo inclui o último dia |
| S5 | Livro **em atraso** = data prevista **anterior** a hoje | consistente com S4 |
| S6 | Pendência = multa não paga **ou** livro em atraso | RF01: "qualquer multa pendente ou livro em atraso" |

### Funções

```ts
calcularDataDevolucao(dataEmprestimo, perfil)       // => data + prazo do perfil
calcularDiasAtraso(dataPrevista, dataDevolucao)    // => max(0, devolução − prevista)
hojeEmSaoPaulo(agora?)                              // => 'AAAA-MM-DD' no fuso de Brasília
possuiPendencia({ multasEmAberto, datasPrevistasAtivas, hoje })
contarLivrosEmUso(emprestimos)                      // => empréstimos sem data de devolução
```

### Partição de Equivalência

| Entrada | Classe | Tipo | Representante | Esperado |
|---|---|---|---|---|
| data | CE23 data civil válida | Válida | `2026-03-10` | processa |
| data | CE24 dia/mês inexistente | Inválida | `2026-02-30`, `2026-13-01` | `ArgumentoInvalidoError` |
| data | CE25 formato diferente | Inválida | `10/03/2026`, `''` | `ArgumentoInvalidoError` |
| data | CE26 não-string | Inválida | `null`, `20260310` | `ArgumentoInvalidoError` |
| devolução vs. prevista | CE27 antes ou no dia | Válida | prevista ou antes | 0 dia |
| devolução vs. prevista | CE28 depois | Válida | prevista + n | n dias |
| multas em aberto | CE29 zero | Válida | 0 | não pendente (por multa) |
| multas em aberto | CE30 ≥ 1 | Válida | 1 | pendente |
| multas em aberto | CE31 negativo / não inteiro | Inválida | -1 | `ArgumentoInvalidoError` |
| empréstimo ativo | CE32 prevista ≥ hoje | Válida | hoje, amanhã | não pendente |
| empréstimo ativo | CE33 prevista < hoje | Válida | ontem | pendente |

### Análise do Valor Limite

| ID | Caso | Entrada | Esperado |
|---|---|---|---|
| CT39 | prazo Graduação | 2026-03-10 + 15 | 2026-03-25 |
| CT40 | prazo Pós, virada de mês | 2026-03-10 + 30 | 2026-04-09 |
| CT41 | prazo Professor, virada de ano | 2026-12-20 + 45 | 2027-02-03 |
| CT42 | ano bissexto × comum | 2028-02-20 + 15 / 2027-02-20 + 15 | 2028-03-06 / 2027-03-07 |
| CT43 | datas inválidas | `2026-02-30`, `2026-13-01`, `10/03/2026`, `''`, `null`, número | `ArgumentoInvalidoError` |
| CT44 | perfil inválido no prazo | `'VISITANTE'` | `ArgumentoInvalidoError` |
| CT45 | devolução antes / no dia previsto | prevista − 5 / prevista | 0 / 0 |
| CT46 | 1, 3, 4, 10 e 11 dias depois | prevista + n | n (fronteiras da multa) |
| CT47 | 35 dias de atraso → teto | prevista + 35 | multa R$ 150,00 |
| CT48 | atraso atravessando fevereiro | 2028-02-28 → 2028-03-01 / 2027-02-28 → 2027-03-01 | 2 / 1 |
| CT49 | "hoje" no fuso de Brasília | 2026-03-10T02:59Z / 2026-03-10T03:00Z | 2026-03-09 / 2026-03-10 |
| CT50 | sem multa e sem ativos | 0, [] | não pendente |
| CT51 | multa em aberto | 1 | pendente |
| CT52 | prevista = hoje / amanhã / ontem | — | não / não / **sim** |
| CT53 | entradas inválidas na pendência | multas -1, data inválida | `ArgumentoInvalidoError` |
| CT54 | livros em uso | [ativo, devolvido, ativo] | 2 |
