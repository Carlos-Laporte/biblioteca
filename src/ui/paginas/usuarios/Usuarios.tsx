import { useDeferredValue, useState } from 'react';
import { Link } from 'react-router';
import { UserPlus } from 'lucide-react';
import { api } from '../../api/cliente';
import type { DadosUsuario, UsuarioComResumo } from '../../api/tipos';
import { Badge, Botao, CabecalhoPagina, Cartao } from '../../componentes/Basicos';
import { CampoBusca, Selecao } from '../../componentes/Campos';
import { Recurso } from '../../componentes/Recurso';
import { BadgeSituacao, BarraLimite } from '../../componentes/Regras';
import { EstadoVazio, Tabela, type Coluna } from '../../componentes/Tabela';
import { useNotificar } from '../../componentes/Toast';
import { PERFIS, ROTULO_PERFIL } from '../../formatacao';
import { useRecurso } from '../../ganchos/useRecurso';
import { FormUsuario } from './FormUsuario';

const COLUNAS: ReadonlyArray<Coluna<UsuarioComResumo>> = [
  {
    titulo: 'Nome',
    celula: (usuario) => (
      <div>
        <Link to={`/usuarios/${usuario.id}`}>{usuario.nome}</Link>
        <div className="suave pequeno">{usuario.email}</div>
      </div>
    ),
  },
  { titulo: 'Matrícula', celula: (usuario) => usuario.matricula },
  { titulo: 'Perfil', celula: (usuario) => <Badge tom="primario">{ROTULO_PERFIL[usuario.perfil]}</Badge> },
  { titulo: 'Livros', celula: (usuario) => <BarraLimite emUso={usuario.resumo.livrosEmUso} limite={usuario.resumo.limite} rotulo="Em uso" /> },
  { titulo: 'Situação', celula: (usuario) => <BadgeSituacao resumo={usuario.resumo} ativo={usuario.ativo} /> },
];

function Filtros({ busca, perfil, aoBuscar, aoFiltrar }: { readonly busca: string; readonly perfil: string; readonly aoBuscar: (valor: string) => void; readonly aoFiltrar: (valor: string) => void }) {
  return (
    <div className="filtros">
      <CampoBusca rotulo="Buscar usuário" valor={busca} aoMudar={aoBuscar} placeholder="Nome, matrícula ou e-mail" />
      <Selecao rotulo="Perfil" value={perfil} onChange={(evento) => aoFiltrar(evento.target.value)}>
        <option value="">Todos os perfis</option>
        {PERFIS.map((opcao) => <option key={opcao} value={opcao}>{ROTULO_PERFIL[opcao]}</option>)}
      </Selecao>
    </div>
  );
}

export function Usuarios() {
  const [busca, setBusca] = useState('');
  const [perfil, setPerfil] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const notificar = useNotificar();
  const termo = useDeferredValue(busca);
  const estado = useRecurso(() => api.usuarios.listar({ busca: termo, perfil }), [termo, perfil]);

  async function salvar(dados: DadosUsuario) {
    const criado = await api.usuarios.criar(dados);
    setFormAberto(false);
    notificar(`Usuário ${criado.nome} cadastrado`);
    estado.recarregar();
  }

  return (
    <>
      <CabecalhoPagina titulo="Usuários" descricao="Alunos de graduação, pós-graduação e professores"
        acoes={<Botao variante="primario" icone={UserPlus} onClick={() => setFormAberto(true)}>Novo usuário</Botao>} />
      <Cartao rotulo="Lista de usuários">
        <Filtros busca={busca} perfil={perfil} aoBuscar={setBusca} aoFiltrar={setPerfil} />
        <Recurso estado={estado}>
          {(usuarios) => (
            <Tabela legenda="Usuários cadastrados" colunas={COLUNAS} itens={usuarios} chave={(usuario) => usuario.id}
              vazio={<EstadoVazio titulo="Nenhum usuário encontrado">Ajuste a busca ou cadastre um novo usuário.</EstadoVazio>} />
          )}
        </Recurso>
      </Cartao>
      <FormUsuario aberto={formAberto} aoFechar={() => setFormAberto(false)} aoSalvar={salvar} />
    </>
  );
}
