import { Link } from 'react-router';
import { AlertTriangle, BookPlus, BookMarked, Receipt, Undo2, UserX } from 'lucide-react';
import { CalculadoraEmprestimo } from '../../domain';
import { api } from '../api/cliente';
import type { Emprestimo, Painel as DadosPainel } from '../api/tipos';
import { CabecalhoPagina, Cartao } from '../componentes/Basicos';
import { Recurso } from '../componentes/Recurso';
import { BadgeAtraso, Indicador } from '../componentes/Regras';
import { EstadoVazio, Tabela, type Coluna } from '../componentes/Tabela';
import { formatarCentavos, formatarData, formatarReais } from '../formatacao';
import { useRecurso } from '../ganchos/useRecurso';

const calculadora = new CalculadoraEmprestimo();

const colunaUsuario: Coluna<Emprestimo> = {
  titulo: 'Usuário',
  celula: (item) => <Link to={`/usuarios/${item.usuario.id}`}>{item.usuario.nome}</Link>,
};
const colunaLivro: Coluna<Emprestimo> = { titulo: 'Livro', celula: (item) => item.livro.titulo };

const COLUNAS_VENCIMENTO: ReadonlyArray<Coluna<Emprestimo>> = [
  colunaUsuario,
  colunaLivro,
  { titulo: 'Devolver até', celula: (item) => formatarData(item.dataPrevista) },
];

const COLUNAS_ATRASO: ReadonlyArray<Coluna<Emprestimo>> = [
  colunaUsuario,
  colunaLivro,
  { titulo: 'Situação', celula: (item) => <BadgeAtraso dias={item.diasAtraso} /> },
  {
    titulo: 'Multa se devolver hoje',
    numerica: true,
    celula: (item) => formatarReais(calculadora.calcularMulta(item.diasAtraso, item.usuario.perfil)),
  },
];

function Indicadores({ painel }: { readonly painel: DadosPainel }) {
  return (
    <div className="grade grade-indicadores">
      <Indicador rotulo="Empréstimos ativos" valor={painel.emprestimosAtivos} icone={BookMarked} />
      <Indicador rotulo="Em atraso" valor={painel.emprestimosAtrasados} icone={AlertTriangle} tom={painel.emprestimosAtrasados ? 'alerta' : 'sucesso'} />
      <Indicador rotulo="Multas em aberto" valor={formatarCentavos(painel.multasEmAbertoCentavos)} icone={Receipt} tom="erro" />
      <Indicador
        rotulo="Usuários bloqueados"
        valor={painel.usuariosBloqueados}
        detalhe={`de ${painel.totalUsuarios}`}
        icone={UserX}
        tom={painel.usuariosBloqueados ? 'erro' : 'sucesso'}
      />
    </div>
  );
}

function Listas({ painel }: { readonly painel: DadosPainel }) {
  return (
    <div className="grade grade-2">
      <Cartao titulo="Maiores atrasos" descricao="Multa estimada pelo RF02 se a devolução for hoje">
        <Tabela legenda="Maiores atrasos" colunas={COLUNAS_ATRASO} itens={painel.maioresAtrasos} chave={(item) => item.id}
          vazio={<EstadoVazio titulo="Nenhum livro em atraso">Todos os empréstimos estão dentro do prazo.</EstadoVazio>} />
      </Cartao>
      <Cartao titulo="Próximos vencimentos" descricao="Empréstimos ativos dentro do prazo">
        <Tabela legenda="Próximos vencimentos" colunas={COLUNAS_VENCIMENTO} itens={painel.proximosVencimentos} chave={(item) => item.id}
          vazio={<EstadoVazio titulo="Nenhum empréstimo ativo no prazo" />} />
      </Cartao>
    </div>
  );
}

export function Painel() {
  const estado = useRecurso(() => api.painel(), []);
  return (
    <>
      <CabecalhoPagina
        titulo="Painel"
        descricao={estado.dados ? `Situação da biblioteca em ${formatarData(estado.dados.hoje)}` : 'Situação da biblioteca'}
        acoes={
          <>
            <Link className="botao" data-variante="primario" to="/emprestimos/novo"><BookPlus size={18} aria-hidden="true" /> Novo empréstimo</Link>
            <Link className="botao" to="/devolucoes"><Undo2 size={18} aria-hidden="true" /> Registrar devolução</Link>
          </>
        }
      />
      <Recurso estado={estado} linhas={8}>
        {(painel) => (
          <div className="pilha">
            <Indicadores painel={painel} />
            <Listas painel={painel} />
          </div>
        )}
      </Recurso>
    </>
  );
}
