import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Botao } from './Basicos';

type TomToast = 'sucesso' | 'erro' | 'info';

interface Notificacao {
  readonly id: number;
  readonly tom: TomToast;
  readonly mensagem: string;
}

type Notificar = (mensagem: string, tom?: TomToast) => void;

const ContextoToast = createContext<Notificar>(() => undefined);
const DURACAO_MS = 5000;
let proximoId = 0;

/** Notificações temporárias anunciadas a leitores de tela (região aria-live). */
export function ProvedorToast({ children }: { readonly children: ReactNode }) {
  const [itens, setItens] = useState<Notificacao[]>([]);

  const remover = useCallback((id: number) => setItens((atuais) => atuais.filter((item) => item.id !== id)), []);
  const notificar = useCallback<Notificar>(
    (mensagem, tom = 'sucesso') => {
      proximoId += 1;
      const id = proximoId;
      setItens((atuais) => [...atuais, { id, tom, mensagem }]);
      setTimeout(() => remover(id), DURACAO_MS);
    },
    [remover],
  );
  const valor = useMemo(() => notificar, [notificar]);

  return (
    <ContextoToast.Provider value={valor}>
      {children}
      <ul className="toasts" aria-live="polite" aria-label="Notificações">
        {itens.map((item) => (
          <li key={item.id} className="toast" data-tom={item.tom} role={item.tom === 'erro' ? 'alert' : 'status'}>
            <p>{item.mensagem}</p>
            <Botao variante="fantasma" tamanho="pequeno" icone={X} onClick={() => remover(item.id)} aria-label="Dispensar notificação" />
          </li>
        ))}
      </ul>
    </ContextoToast.Provider>
  );
}

export const useNotificar = () => useContext(ContextoToast);
