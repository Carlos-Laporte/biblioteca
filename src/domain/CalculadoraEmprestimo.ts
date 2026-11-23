import { RegraNegocioError } from './erros';
import { PerfilUsuario, ResultadoEmprestimo } from './tipos';

export class CalculadoraEmprestimo {
  validarEmprestimo(
    perfil: PerfilUsuario,
    livrosEmprestados: number,
    livrosSolicitados: number,
    possuiPendencia: boolean,
  ): ResultadoEmprestimo {
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
    }
    let total = livrosEmprestados + livrosSolicitados;
    if (total > limite) {
      throw new RegraNegocioError('LIMITE_EXCEDIDO', 'Limite de livros excedido');
    }
    return { aprovado: true, perfil: perfil, limite: limite, totalAposEmprestimo: total, prazoDevolucaoDias: prazo };
  }
}
