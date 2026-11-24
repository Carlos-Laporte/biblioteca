import { NavLink, Outlet } from 'react-router';
import { BookOpen, BookPlus, Calculator, LayoutDashboard, Library, Moon, Receipt, Sun, Undo2, Users, type LucideIcon } from 'lucide-react';
import { Botao } from '../componentes/Basicos';
import { useTema } from '../ganchos/useTema';

const ITENS: ReadonlyArray<readonly [string, string, LucideIcon]> = [
  ['/', 'Painel', LayoutDashboard],
  ['/emprestimos/novo', 'Empréstimo', BookPlus],
  ['/devolucoes', 'Devolução', Undo2],
  ['/usuarios', 'Usuários', Users],
  ['/livros', 'Acervo', BookOpen],
  ['/multas', 'Multas', Receipt],
  ['/simulador', 'Simulador', Calculator],
];

function Navegacao() {
  return (
    <nav className="navegacao" aria-label="Principal">
      <ul>
        {ITENS.map(([destino, rotulo, icone]) => {
          const Icone = icone;
          return (
            <li key={destino}>
              <NavLink to={destino} end={destino === '/'}>
                <Icone size={20} aria-hidden="true" />
                {rotulo}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function BarraLateral() {
  const { tema, alternar } = useTema();
  const escuro = tema === 'escuro';
  return (
    <aside className="lateral">
      <NavLink to="/" className="marca" aria-label="Biblioteca UniRV — início">
        <span className="marca-icone">
          <Library size={22} aria-hidden="true" />
        </span>
        <span>
          <strong>Biblioteca</strong>
          <small>Universidade de Rio Verde</small>
        </span>
      </NavLink>
      <Navegacao />
      <div className="lateral-rodape">
        <Botao icone={escuro ? Sun : Moon} onClick={alternar} aria-label={escuro ? 'Ativar tema claro' : 'Ativar tema escuro'}>
          {escuro ? 'Tema claro' : 'Tema escuro'}
        </Botao>
        <small>Projeto acadêmico — não é um sistema oficial da UniRV.</small>
      </div>
    </aside>
  );
}

export function Layout() {
  return (
    <div className="app">
      <a className="pular-conteudo" href="#conteudo">
        Pular para o conteúdo
      </a>
      <BarraLateral />
      <div className="conteudo">
        <main id="conteudo" className="principal" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="rodape">
          Sistema de Biblioteca — projeto acadêmico (TDD, TypeScript, React, Node.js e PostgreSQL). Não é um sistema oficial da UniRV.
        </footer>
      </div>
    </div>
  );
}
