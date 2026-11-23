import { ArgumentoInvalidoError, RegraNegocioError } from './erros';
import { PerfilUsuario, ResultadoEmprestimo } from './tipos';

export class CalculadoraEmprestimo {
  validarEmprestimo(
    perfil: PerfilUsuario,
    livrosEmprestados: number,
    livrosSolicitados: number,
    possuiPendencia: boolean,
  ): ResultadoEmprestimo {
    if (perfil == null) {
      throw new ArgumentoInvalidoError('Perfil de usuário inválido');
    }
    if (!Number.isInteger(livrosEmprestados) || livrosEmprestados < 0) {
      throw new ArgumentoInvalidoError('Quantidade de livros inválida');
    }
    if (!Number.isInteger(livrosSolicitados) || livrosSolicitados < 1) {
      throw new ArgumentoInvalidoError('Quantidade de livros inválida');
    }
    if (typeof possuiPendencia != 'boolean') {
      throw new ArgumentoInvalidoError('Indicador de pendência inválido');
    }
    var limite = 0;
    var prazo = 0;
    if (perfil == 'GRADUACAO') {
      limite = 3;
      prazo = 15;
    } else if (perfil == 'POS_GRADUACAO') {
      limite = 5;
      prazo = 30;
    } else if (perfil == 'PROFESSOR') {
      limite = 10;
      prazo = 45;
    } else {
      throw new ArgumentoInvalidoError('Perfil de usuário inválido');
    }
    if (possuiPendencia == true) {
      throw new RegraNegocioError('PENDENCIA', 'Usuário possui pendências');
    }
    let total = livrosEmprestados + livrosSolicitados;
    if (total > limite) {
      throw new RegraNegocioError('LIMITE_EXCEDIDO', 'Limite de livros excedido');
    }
    return { aprovado: true, perfil: perfil, limite: limite, totalAposEmprestimo: total, prazoDevolucaoDias: prazo };
  }

  calcularMulta(diasAtraso: number, perfil: PerfilUsuario): number {
    if (perfil == null || (perfil != 'GRADUACAO' && perfil != 'POS_GRADUACAO' && perfil != 'PROFESSOR')) {
      throw new ArgumentoInvalidoError('Perfil de usuário inválido');
    }
    if (!Number.isInteger(diasAtraso) || diasAtraso < 0) {
      throw new ArgumentoInvalidoError('Quantidade de dias inválida');
    }
    var multa = 0;
    if (diasAtraso <= 3) {
      multa = 0;
    } else if (diasAtraso <= 10) {
      multa = diasAtraso * 2.5;
    } else {
      multa = 10 * 2.5 + (diasAtraso - 10) * 5;
    }
    if (multa > 150) {
      multa = 150;
    }
    return multa;
  }
}
