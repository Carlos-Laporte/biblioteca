import { useMemo, useState } from 'react';
import { CalculadoraEmprestimo, PerfilUsuario, REGRAS_POR_PERFIL, RegraNegocioError } from '../domain';
import { CampoNumero } from './CampoNumero';
import { SeletorPerfil } from './SeletorPerfil';

const calculadora = new CalculadoraEmprestimo();

type TipoResultado = 'ok' | 'recusado' | 'invalido';

function avaliar(perfil: PerfilUsuario, emprestados: number, solicitados: number, pendencia: boolean) {
  try {
    const aprovado = calculadora.validarEmprestimo(perfil, emprestados, solicitados, pendencia);
    const texto = `Aprovado — devolução em ${aprovado.prazoDevolucaoDias} dias (${aprovado.totalAposEmprestimo}/${aprovado.limite} livros)`;
    return { tipo: 'ok' as TipoResultado, texto };
  } catch (erro) {
    const tipo: TipoResultado = erro instanceof RegraNegocioError ? 'recusado' : 'invalido';
    return { tipo, texto: (erro as Error).message };
  }
}

export function PainelEmprestimo() {
  const [perfil, setPerfil] = useState<PerfilUsuario>(PerfilUsuario.GRADUACAO);
  const [emprestados, setEmprestados] = useState(0);
  const [solicitados, setSolicitados] = useState(1);
  const [pendencia, setPendencia] = useState(false);

  const resultado = useMemo(
    () => avaliar(perfil, emprestados, solicitados, pendencia),
    [perfil, emprestados, solicitados, pendencia],
  );
  const regra = REGRAS_POR_PERFIL[perfil];

  return (
    <section className="painel">
      <h2>Novo empréstimo</h2>
      <SeletorPerfil valor={perfil} aoMudar={setPerfil} />
      <p className="dica">
        Limite de {regra.limiteLivros} livros · prazo de {regra.prazoDevolucaoDias} dias
      </p>
      <CampoNumero rotulo="Livros já emprestados" valor={emprestados} aoMudar={setEmprestados} />
      <CampoNumero rotulo="Livros solicitados" valor={solicitados} aoMudar={setSolicitados} />
      <label className="linha">
        <input type="checkbox" checked={pendencia} onChange={(evento) => setPendencia(evento.target.checked)} />
        Possui multa pendente ou livro em atraso
      </label>
      <output className={`resultado ${resultado.tipo}`}>{resultado.texto}</output>
    </section>
  );
}
