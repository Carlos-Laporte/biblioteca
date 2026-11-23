import { PerfilUsuario } from './tipos';

export interface RegraPerfil {
  readonly limiteLivros: number;
  readonly prazoDevolucaoDias: number;
}

/** RF01 — limite de livros simultâneos e prazo de devolução por perfil. */
export const REGRAS_POR_PERFIL: Readonly<Record<PerfilUsuario, RegraPerfil>> = {
  [PerfilUsuario.GRADUACAO]: { limiteLivros: 3, prazoDevolucaoDias: 15 },
  [PerfilUsuario.POS_GRADUACAO]: { limiteLivros: 5, prazoDevolucaoDias: 30 },
  [PerfilUsuario.PROFESSOR]: { limiteLivros: 10, prazoDevolucaoDias: 45 },
};

/** RF02 — parâmetros financeiros da multa por atraso. */
export const REGRAS_MULTA = {
  DIAS_TOLERANCIA: 3,
  DIAS_PRIMEIRA_FAIXA: 10,
  VALOR_DIA_PRIMEIRA_FAIXA: 2.5,
  VALOR_DIA_EXCEDENTE: 5,
  TETO: 150,
} as const;
