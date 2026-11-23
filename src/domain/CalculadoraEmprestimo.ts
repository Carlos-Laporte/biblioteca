import { PerfilUsuario, ResultadoEmprestimo } from './tipos';

export class CalculadoraEmprestimo {
  validarEmprestimo(
    _perfil: PerfilUsuario,
    _livrosEmprestados: number,
    _livrosSolicitados: number,
    _possuiPendencia: boolean,
  ): ResultadoEmprestimo {
    throw new Error('Não implementado');
  }
}
