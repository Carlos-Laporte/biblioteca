import { useState } from 'react';
import { CalculadoraEmprestimo, PerfilUsuario, REGRAS_POR_PERFIL, RegraNegocioError } from '../../domain';
import { Alerta, CabecalhoPagina, Cartao } from '../componentes/Basicos';
import { Campo, Selecao } from '../componentes/Campos';
import { GraficoMulta } from '../componentes/GraficoMulta';
import { BarraLimite } from '../componentes/Regras';
import { Tabela, type Coluna } from '../componentes/Tabela';
import { formatarReais, PERFIS, ROTULO_PERFIL } from '../formatacao';

const calculadora = new CalculadoraEmprestimo();
const DIAS_INICIAIS = 12;

function SeletorPerfil({ valor, aoMudar }: { readonly valor: PerfilUsuario; readonly aoMudar: (perfil: PerfilUsuario) => void }) {
  return (
    <Selecao rotulo="Perfil do usuário" value={valor} onChange={(evento) => aoMudar(evento.target.value as PerfilUsuario)}>
      {PERFIS.map((perfil) => <option key={perfil} value={perfil}>{ROTULO_PERFIL[perfil]}</option>)}
    </Selecao>
  );
}

function avaliar(perfil: PerfilUsuario, emprestados: number, solicitados: number, pendencia: boolean) {
  try {
    const resultado = calculadora.validarEmprestimo(perfil, emprestados, solicitados, pendencia);
    return <Alerta tom="sucesso" titulo="Aprovado" anunciar>{`Devolução em ${resultado.prazoDevolucaoDias} dias (${resultado.totalAposEmprestimo}/${resultado.limite} livros)`}</Alerta>;
  } catch (erro) {
    const tom = erro instanceof RegraNegocioError ? 'alerta' : 'erro';
    return <Alerta tom={tom} titulo={erro instanceof RegraNegocioError ? 'Recusado' : 'Entrada inválida'} anunciar>{(erro as Error).message}</Alerta>;
  }
}

function SimuladorEmprestimo() {
  const [perfil, setPerfil] = useState<PerfilUsuario>(PerfilUsuario.GRADUACAO);
  const [emprestados, setEmprestados] = useState(0);
  const [solicitados, setSolicitados] = useState(1);
  const [pendencia, setPendencia] = useState(false);
  return (
    <Cartao titulo="Empréstimo (RF01)" descricao="Limite simultâneo, prazo e bloqueio por pendência">
      <SeletorPerfil valor={perfil} aoMudar={setPerfil} />
      <div className="formulario formulario-2">
        <Campo rotulo="Livros já emprestados" type="number" value={Number.isNaN(emprestados) ? '' : emprestados} onChange={(evento) => setEmprestados(evento.target.valueAsNumber)} />
        <Campo rotulo="Livros solicitados" type="number" value={Number.isNaN(solicitados) ? '' : solicitados} onChange={(evento) => setSolicitados(evento.target.valueAsNumber)} />
      </div>
      <label className="linha">
        <input type="checkbox" checked={pendencia} onChange={(evento) => setPendencia(evento.target.checked)} />
        Possui multa pendente ou livro em atraso
      </label>
      <BarraLimite emUso={(emprestados || 0) + (solicitados || 0)} limite={REGRAS_POR_PERFIL[perfil].limiteLivros} rotulo="Total após o pedido" />
      {avaliar(perfil, emprestados, solicitados, pendencia)}
    </Cartao>
  );
}

function SimuladorMulta() {
  const [dias, setDias] = useState(DIAS_INICIAIS);
  let resultado;
  try {
    resultado = <p className="valor-destaque" aria-live="polite">{formatarReais(calculadora.calcularMulta(dias, PerfilUsuario.GRADUACAO))}</p>;
  } catch (erro) {
    resultado = <Alerta tom="erro" titulo="Entrada inválida" anunciar>{(erro as Error).message}</Alerta>;
  }
  return (
    <Cartao titulo="Multa por atraso (RF02)" descricao="O valor independe do perfil do usuário">
      <Campo rotulo="Dias de atraso" type="number" min={0} value={Number.isNaN(dias) ? '' : dias} onChange={(evento) => setDias(evento.target.valueAsNumber)} />
      {resultado}
      <GraficoMulta diasAtuais={dias} />
    </Cartao>
  );
}

type LinhaRegra = readonly [PerfilUsuario, { limiteLivros: number; prazoDevolucaoDias: number }];

const COLUNAS_REGRAS: ReadonlyArray<Coluna<LinhaRegra>> = [
  { titulo: 'Perfil', celula: ([perfil]) => ROTULO_PERFIL[perfil] },
  { titulo: 'Limite simultâneo', numerica: true, celula: ([, regra]) => `${regra.limiteLivros} livros` },
  { titulo: 'Prazo de devolução', numerica: true, celula: ([, regra]) => `${regra.prazoDevolucaoDias} dias` },
];

export function Simulador() {
  const linhas = Object.entries(REGRAS_POR_PERFIL) as unknown as LinhaRegra[];
  return (
    <>
      <CabecalhoPagina titulo="Simulador de regras" descricao="Consulte as regras de negócio sem alterar dados — mesmo módulo usado pela API" />
      <div className="pilha">
        <div className="grade grade-2">
          <SimuladorEmprestimo />
          <SimuladorMulta />
        </div>
        <Cartao titulo="Regras por perfil">
          <Tabela legenda="Regras por perfil" colunas={COLUNAS_REGRAS} itens={linhas} chave={([perfil]) => perfil} />
        </Cartao>
      </div>
    </>
  );
}
