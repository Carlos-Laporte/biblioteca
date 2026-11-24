import { Route, Routes } from 'react-router';
import { Layout } from './layout/Layout';
import { Devolucoes } from './paginas/Devolucoes';
import { NovoEmprestimo } from './paginas/emprestimo/NovoEmprestimo';
import { Livros } from './paginas/livros/Livros';
import { Multas } from './paginas/Multas';
import { NaoEncontrada } from './paginas/NaoEncontrada';
import { Painel } from './paginas/Painel';
import { Simulador } from './paginas/Simulador';
import { UsuarioDetalhe } from './paginas/usuarios/UsuarioDetalhe';
import { Usuarios } from './paginas/usuarios/Usuarios';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Painel />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="usuarios/:id" element={<UsuarioDetalhe />} />
        <Route path="livros" element={<Livros />} />
        <Route path="emprestimos/novo" element={<NovoEmprestimo />} />
        <Route path="devolucoes" element={<Devolucoes />} />
        <Route path="multas" element={<Multas />} />
        <Route path="simulador" element={<Simulador />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  );
}
