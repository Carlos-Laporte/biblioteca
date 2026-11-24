import { useDeferredValue, useState } from 'react';
import { Link } from 'react-router';
import { Undo2 } from 'lucide-react';
import { calcularDiasAtraso, CalculadoraEmprestimo, hojeEmSaoPaulo } from '../../domain';
import { api } from '../api/cliente';
import type { Emprestimo } from '../api/tipos';
import { Alerta, Botao, CabecalhoPagina, Cartao } from '../componentes/Basicos';
import { Campo, CampoBusca } from '../componentes/Campos';
import { Modal } from '../componentes/Modal';
import { Recurso } from '../componentes/Recurso';
import { BadgeAtraso } from '../componentes/Regras';
import { EstadoVazio, Tabela, type Coluna } from '../componentes/Tabela';
import { useNotificar } from '../componentes/Toast';
import { formatarCentavos, formatarData, formatarReais } from '../formatacao';
import { useEnvio } from '../ganchos/useEnvio';
import { useRecurso } from '../ganchos/useRecurso';

const calculadora = new CalculadoraEmprestimo();

/** Multa prevista para a data escolhida, calculada pelo domínio (RF02). */
function previsao(emprestimo: Emprestimo, dataDevolucao: string) {
  try {
    const dias = calcularDiasAtraso(emprestimo.dataPrevista, dataDevolucao);
    return { dias, valor: calculadora.calcularMulta(dias, emprestimo.usuario.perfil) };
  } catch {
    return undefined;
  }
}

function PreviaMulta({ emprestimo, data }: { readonly emprestimo: Emprestimo; readonly data: string }) {
  const prevista = previsao(emprestimo, data);
  if (!prevista) return <Alerta tom="erro" titulo="Data inválida" anunciar>Informe uma data no formato dia/mês/ano.</Alerta>;
  if (prevista.valor === 0) {
    const detalhe = prevista.dias === 0 ? 'Devolução dentro do prazo.' : `${prevista.dias} dia(s) de atraso, dentro da tolerância de 3 dias.`;
    return <Alerta tom="sucesso" titulo="Sem multa" anunciar>{detalhe}</Alerta>;
  }
  return <Alerta tom="alerta" titulo={`Multa de ${formatarReais(prevista.valor)}`} anunciar>{`${prevista.dias} dias de atraso.`}</Alerta>;
}

function ConfirmarDevolucao({ emprestimo, aoFechar, aoConfirmar }: { readonly emprestimo: Emprestimo; readonly aoFechar: () => void; readonly aoConfirmar: (data: string) => Promise<void> }) {
  const hoje = hojeEmSaoPaulo();
  const [data, setData] = useState(hoje);
  const { erro, enviando, enviar } = useEnvio(aoConfirmar);
  return (
    <Modal aberto titulo="Registrar devolução" aoFechar={aoFechar}
      rodape={<><Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" disabled={enviando} onClick={() => enviar(data)}>Confirmar devolução</Botao></>}>
      <p><strong>{emprestimo.livro.titulo}</strong> — {emprestimo.usuario.nome}</p>
      <p className="suave pequeno">Emprestado em {formatarData(emprestimo.dataEmprestimo)} · devolução prevista para {formatarData(emprestimo.dataPrevista)}</p>
      <Campo rotulo="Data da devolução" type="date" value={data} min={emprestimo.dataEmprestimo} max={hoje} onChange={(evento) => setData(evento.target.value)} />
      <PreviaMulta emprestimo={emprestimo} data={data} />
      {erro && <Alerta tom="erro" titulo="Não foi possível registrar" anunciar>{erro.message}</Alerta>}
    </Modal>
  );
}

function colunas(aoDevolver: (item: Emprestimo) => void): ReadonlyArray<Coluna<Emprestimo>> {
  return [
    { titulo: 'Livro', celula: (item) => <strong>{item.livro.titulo}</strong> },
    { titulo: 'Usuário', celula: (item) => <Link to={`/usuarios/${item.usuario.id}`}>{item.usuario.nome}</Link> },
    { titulo: 'Previsto', celula: (item) => formatarData(item.dataPrevista) },
    { titulo: 'Situação', celula: (item) => <BadgeAtraso dias={item.diasAtraso} /> },
    { titulo: 'Multa hoje', numerica: true, celula: (item) => formatarReais(calculadora.calcularMulta(item.diasAtraso, item.usuario.perfil)) },
    { titulo: 'Ação', celula: (item) => <Botao tamanho="pequeno" icone={Undo2} onClick={() => aoDevolver(item)}>Devolver</Botao> },
  ];
}

const contem = (item: Emprestimo, termo: string) =>
  `${item.livro.titulo} ${item.usuario.nome} ${item.usuario.matricula}`.toLowerCase().includes(termo.toLowerCase());

export function Devolucoes() {
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<Emprestimo>();
  const notificar = useNotificar();
  const termo = useDeferredValue(busca);
  const estado = useRecurso(() => api.emprestimos.listar('ativos'), []);

  async function devolver(data: string) {
    if (!selecionado) return;
    const resultado = await api.emprestimos.devolver(selecionado.id, data);
    setSelecionado(undefined);
    notificar(resultado.multa ? `Devolução registrada com multa de ${formatarCentavos(resultado.multa.valorCentavos)}` : 'Devolução registrada sem multa');
    estado.recarregar();
  }

  return (
    <>
      <CabecalhoPagina titulo="Devolução" descricao="Empréstimos em andamento; a multa é calculada pelo RF02" />
      <Cartao rotulo="Empréstimos em andamento">
        <CampoBusca rotulo="Buscar empréstimo" valor={busca} aoMudar={setBusca} placeholder="Livro, usuário ou matrícula" />
        <Recurso estado={estado}>
          {(ativos) => (
            <Tabela legenda="Empréstimos em andamento" colunas={colunas(setSelecionado)} itens={ativos.filter((item) => contem(item, termo))}
              chave={(item) => item.id} vazio={<EstadoVazio titulo="Nenhum empréstimo em andamento" />} />
          )}
        </Recurso>
      </Cartao>
      {selecionado && <ConfirmarDevolucao emprestimo={selecionado} aoFechar={() => setSelecionado(undefined)} aoConfirmar={devolver} />}
    </>
  );
}
