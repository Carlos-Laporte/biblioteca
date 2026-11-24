import type { ReactNode } from 'react';
import { RotateCw } from 'lucide-react';
import { Alerta, Botao } from './Basicos';
import { Esqueleto } from './Tabela';

interface PropsRecurso<T> {
  readonly estado: { dados?: T; erro?: Error; carregando: boolean; recarregar: () => void };
  readonly children: (dados: T) => ReactNode;
  readonly linhas?: number;
}

/** Estados padrão de uma consulta: carregando (esqueleto), erro (com nova tentativa) e conteúdo. */
export function Recurso<T>({ estado, children, linhas }: PropsRecurso<T>) {
  if (estado.erro) {
    return (
      <div className="pilha">
        <Alerta tom="erro" titulo="Não foi possível carregar os dados" anunciar>
          {estado.erro.message}
        </Alerta>
        <div>
          <Botao icone={RotateCw} onClick={estado.recarregar}>
            Tentar novamente
          </Botao>
        </div>
      </div>
    );
  }
  if (estado.dados === undefined) return <Esqueleto linhas={linhas} />;
  return <>{children(estado.dados)}</>;
}
