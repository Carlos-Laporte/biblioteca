import { PerfilUsuario } from '../domain';

export const ROTULO_PERFIL: Record<PerfilUsuario, string> = {
  [PerfilUsuario.GRADUACAO]: 'Graduação',
  [PerfilUsuario.POS_GRADUACAO]: 'Pós-Graduação',
  [PerfilUsuario.PROFESSOR]: 'Professor',
};

export const PERFIS = Object.values(PerfilUsuario);

export const formatarReais = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
