import { ArgumentoInvalidoError } from './erros';
import { REGRAS_POR_PERFIL } from './regras';
import { PerfilUsuario } from './tipos';

export function garantirPerfilValido(perfil: unknown): asserts perfil is PerfilUsuario {
  if (typeof perfil !== 'string' || !Object.hasOwn(REGRAS_POR_PERFIL, perfil)) {
    throw new ArgumentoInvalidoError(`Perfil de usuário inválido: ${String(perfil)}`);
  }
}

export function garantirInteiroMinimo(valor: number, minimo: number, descricao: string): void {
  if (!Number.isInteger(valor) || valor < minimo) {
    throw new ArgumentoInvalidoError(`${descricao} inválido(a): ${valor} (mínimo ${minimo})`);
  }
}

export function garantirBooleano(valor: unknown, descricao: string): asserts valor is boolean {
  if (typeof valor !== 'boolean') {
    throw new ArgumentoInvalidoError(`${descricao} deve ser booleano`);
  }
}
