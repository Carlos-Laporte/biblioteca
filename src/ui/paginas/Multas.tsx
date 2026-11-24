import { useState } from 'react';
import { Link } from 'react-router';
import { BadgeCheck } from 'lucide-react';
import { api } from '../api/cliente';
import type { MultaListada, SituacaoMulta } from '../api/tipos';
import { Alerta, Badge, Botao, CabecalhoPagina, Cartao } from '../componentes/Basicos';
import { Abas } from '../componentes/Campos';
import { Modal } from '../componentes/Modal';
import { Recurso } from '../componentes/Recurso';
import { EstadoVazio, Tabela, type Coluna } from '../componentes/Tabela';
import { useNotificar } from '../componentes/Toast';
import { formatarCentavos, formatarData } from '../formatacao';
import { useRecurso } from '../ganchos/useRecurso';

const SITUACOES: ReadonlyArray<readonly [SituacaoMulta, string]> = [
  ['abertas', 'Em aberto'],
  ['pagas', 'Pagas'],
  ['todas', 'Todas'],
];

function colunas(aoPagar: (multa: MultaListada) => void): ReadonlyArray<Coluna<MultaListada>> {
  return [
    { titulo: 'Usuário', celula: (multa) => <Link to={`/usuarios/${multa.usuario.id}`}>{multa.usuario.nome}</Link> },
    { titulo: 'Livro', celula: (multa) => multa.livro.titulo },
    { titulo: 'Atraso', numerica: true, celula: (multa) => `${multa.diasAtraso} dias` },
    { titulo: 'Valor', numerica: true, celula: (multa) => <strong>{formatarCentavos(multa.valorCentavos)}</strong> },
    {
      titulo: 'Situação',
      celula: (multa) =>
        multa.pagaEm ? <Badge tom="sucesso">Paga em {formatarData(multa.pagaEm)}</Badge> : (
          <Botao tamanho="pequeno" variante="primario" icone={BadgeCheck} onClick={() => aoPagar(multa)}>Registrar pagamento</Botao>
        ),
    },
  ];
}

function ConfirmarPagamento({ multa, aoFechar, aoConfirmar }: { readonly multa: MultaListada; readonly aoFechar: () => void; readonly aoConfirmar: () => Promise<void> }) {
  const [erro, setErro] = useState<Error>();
  return (
    <Modal aberto titulo="Registrar pagamento" aoFechar={aoFechar}
      rodape={<><Botao onClick={aoFechar}>Cancelar</Botao><Botao variante="primario" onClick={() => aoConfirmar().catch(setErro)}>Confirmar pagamento</Botao></>}>
      <p className="valor-destaque">{formatarCentavos(multa.valorCentavos)}</p>
      <p>{multa.usuario.nome} — “{multa.livro.titulo}” ({multa.diasAtraso} dias de atraso)</p>
      <Alerta tom="info" titulo="O pagamento libera novos empréstimos">Se não houver outra pendência, o usuário volta a poder emprestar livros.</Alerta>
      {erro && <Alerta tom="erro" titulo="Não foi possível registrar" anunciar>{erro.message}</Alerta>}
    </Modal>
  );
}

const total = (multas: readonly MultaListada[]) => multas.reduce((soma, multa) => soma + multa.valorCentavos, 0);

export function Multas() {
  const [situacao, setSituacao] = useState<SituacaoMulta>('abertas');
  const [selecionada, setSelecionada] = useState<MultaListada>();
  const notificar = useNotificar();
  const estado = useRecurso(() => api.multas.listar(situacao), [situacao]);

  async function pagar() {
    if (!selecionada) return;
    await api.multas.pagar(selecionada.id);
    setSelecionada(undefined);
    notificar(`Pagamento de ${formatarCentavos(selecionada.valorCentavos)} registrado`);
    estado.recarregar();
  }

  return (
    <>
      <CabecalhoPagina titulo="Multas" descricao="Multas por atraso geradas nas devoluções (RF02)" />
      <Cartao rotulo="Multas" acoes={<Abas rotulo="Filtrar multas" opcoes={SITUACOES} valor={situacao} aoMudar={setSituacao} />}
        titulo={estado.dados ? `Total: ${formatarCentavos(total(estado.dados))}` : 'Total'}>
        <Recurso estado={estado}>
          {(multas) => <Tabela legenda="Multas" colunas={colunas(setSelecionada)} itens={multas} chave={(multa) => multa.id}
            vazio={<EstadoVazio titulo="Nenhuma multa nesta situação" />} />}
        </Recurso>
      </Cartao>
      {selecionada && <ConfirmarPagamento multa={selecionada} aoFechar={() => setSelecionada(undefined)} aoConfirmar={pagar} />}
    </>
  );
}
