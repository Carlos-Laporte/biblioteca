import { RegraNegocioError } from './erros';
import { REGRAS_MULTA, REGRAS_POR_PERFIL } from './regras';
import { PerfilUsuario, ResultadoEmprestimo } from './tipos';
import { garantirBooleano, garantirInteiroMinimo, garantirPerfilValido } from './validacoes';

const MINIMO_LIVROS_EMPRESTADOS = 0;
const MINIMO_LIVROS_SOLICITADOS = 1;
const MINIMO_DIAS_ATRASO = 0;
const SEM_MULTA = 0;

export class CalculadoraEmprestimo {
  /**
   * RF01 — valida um novo empréstimo.
   * @throws ArgumentoInvalidoError entrada fora do domínio
   * @throws RegraNegocioError usuário com pendência ou limite do perfil excedido
   */
  validarEmprestimo(
    perfil: PerfilUsuario,
    livrosEmprestados: number,
    livrosSolicitados: number,
    possuiPendencia: boolean,
  ): ResultadoEmprestimo {
    garantirPerfilValido(perfil);
    garantirInteiroMinimo(livrosEmprestados, MINIMO_LIVROS_EMPRESTADOS, 'Quantidade de livros emprestados');
    garantirInteiroMinimo(livrosSolicitados, MINIMO_LIVROS_SOLICITADOS, 'Quantidade de livros solicitados');
    garantirBooleano(possuiPendencia, 'Indicador de pendência');

    if (possuiPendencia) {
      throw new RegraNegocioError('PENDENCIA', 'Empréstimo recusado: usuário possui multa ou livro em atraso');
    }

    const { limiteLivros, prazoDevolucaoDias } = REGRAS_POR_PERFIL[perfil];
    const totalAposEmprestimo = livrosEmprestados + livrosSolicitados;
    if (totalAposEmprestimo > limiteLivros) {
      throw new RegraNegocioError(
        'LIMITE_EXCEDIDO',
        `Empréstimo recusado: ${totalAposEmprestimo} livros excede o limite de ${limiteLivros}`,
      );
    }

    return { aprovado: true, perfil, limite: limiteLivros, totalAposEmprestimo, prazoDevolucaoDias };
  }

  /**
   * RF02 — calcula a multa (R$) por atraso na devolução.
   * @throws ArgumentoInvalidoError dias negativos/não inteiros ou perfil inválido
   */
  calcularMulta(diasAtraso: number, perfil: PerfilUsuario): number {
    garantirPerfilValido(perfil);
    garantirInteiroMinimo(diasAtraso, MINIMO_DIAS_ATRASO, 'Quantidade de dias de atraso');

    if (diasAtraso <= REGRAS_MULTA.DIAS_TOLERANCIA) {
      return SEM_MULTA;
    }

    const diasPrimeiraFaixa = Math.min(diasAtraso, REGRAS_MULTA.DIAS_PRIMEIRA_FAIXA);
    const diasExcedentes = diasAtraso - diasPrimeiraFaixa;
    const valorBruto =
      diasPrimeiraFaixa * REGRAS_MULTA.VALOR_DIA_PRIMEIRA_FAIXA + diasExcedentes * REGRAS_MULTA.VALOR_DIA_EXCEDENTE;

    return Math.min(valorBruto, REGRAS_MULTA.TETO);
  }
}
