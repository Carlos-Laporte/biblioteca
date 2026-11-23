import { useMemo, useState } from 'react';
import { CalculadoraEmprestimo, PerfilUsuario, REGRAS_MULTA } from '../domain';
import { CampoNumero } from './CampoNumero';
import { SeletorPerfil } from './SeletorPerfil';
import { formatarReais } from './rotulos';

const calculadora = new CalculadoraEmprestimo();
const DIAS_INICIAIS = 5;

function descreverFaixa(dias: number): string {
  if (dias <= REGRAS_MULTA.DIAS_TOLERANCIA) return 'Tolerância: isento';
  if (dias <= REGRAS_MULTA.DIAS_PRIMEIRA_FAIXA) return 'R$ 2,50 por dia desde o 1º dia';
  return '10 × R$ 2,50 + R$ 5,00 por dia excedente (teto R$ 150,00)';
}

function avaliar(dias: number, perfil: PerfilUsuario) {
  try {
    const valor = calculadora.calcularMulta(dias, perfil);
    return { valido: true, texto: formatarReais(valor), faixa: descreverFaixa(dias) };
  } catch (erro) {
    return { valido: false, texto: (erro as Error).message, faixa: '' };
  }
}

export function PainelMulta() {
  const [perfil, setPerfil] = useState<PerfilUsuario>(PerfilUsuario.GRADUACAO);
  const [dias, setDias] = useState(DIAS_INICIAIS);

  const resultado = useMemo(() => avaliar(dias, perfil), [dias, perfil]);

  return (
    <section className="painel">
      <h2>Multa por atraso</h2>
      <SeletorPerfil valor={perfil} aoMudar={setPerfil} />
      <CampoNumero rotulo="Dias de atraso" valor={dias} aoMudar={setDias} />
      <output className={`resultado ${resultado.valido ? 'ok' : 'invalido'}`}>
        <strong>{resultado.texto}</strong>
        {resultado.faixa && <small>{resultado.faixa}</small>}
      </output>
    </section>
  );
}
