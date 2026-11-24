import { Link } from 'react-router';
import { Cartao } from '../componentes/Basicos';
import { EstadoVazio } from '../componentes/Tabela';

export function NaoEncontrada() {
  return (
    <Cartao rotulo="Página não encontrada">
      <EstadoVazio titulo="Página não encontrada">
        O endereço não existe. <Link to="/">Voltar ao painel</Link>
      </EstadoVazio>
    </Cartao>
  );
}
