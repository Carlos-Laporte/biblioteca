export const PerfilUsuario = {
  GRADUACAO: 'GRADUACAO',
  POS_GRADUACAO: 'POS_GRADUACAO',
  PROFESSOR: 'PROFESSOR',
} as const;

export type PerfilUsuario = (typeof PerfilUsuario)[keyof typeof PerfilUsuario];

export interface ResultadoEmprestimo {
  aprovado: true;
  perfil: PerfilUsuario;
  limite: number;
  totalAposEmprestimo: number;
  prazoDevolucaoDias: number;
}
