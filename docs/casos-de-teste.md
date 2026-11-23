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
