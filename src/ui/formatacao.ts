import { PerfilUsuario } from '../domain';

const CENTAVOS_POR_REAL = 100;

export const ROTULO_PERFIL: Record<PerfilUsuario, string> = {
  [PerfilUsuario.GRADUACAO]: 'Graduação',
  [PerfilUsuario.POS_GRADUACAO]: 'Pós-Graduação',
  [PerfilUsuario.PROFESSOR]: 'Professor',
};

export const PERFIS = Object.values(PerfilUsuario);

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const data = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatarReais = (valor: number) => moeda.format(valor);
export const formatarCentavos = (centavos: number) => moeda.format(centavos / CENTAVOS_POR_REAL);

/** `2026-03-25` → `25/03/2026` (data civil, sem conversão de fuso). */
export const formatarData = (dataCivil: string) => data.format(new Date(`${dataCivil}T00:00:00Z`));

export const plural = (quantidade: number, singular: string, varios: string) =>
  `${quantidade} ${quantidade === 1 ? singular : varios}`;
