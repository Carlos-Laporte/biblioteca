import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Botao } from './Basicos';

interface PropsModal {
  readonly aberto: boolean;
  readonly titulo: string;
  readonly aoFechar: () => void;
  readonly children: ReactNode;
  readonly rodape?: ReactNode;
}

function sincronizar(dialogo: HTMLDialogElement | null, aberto: boolean) {
  if (!dialogo || dialogo.open === aberto) return;
  if (aberto) dialogo.showModal();
  else dialogo.close();
}

/** Modal com <dialog> nativo: foco preso, Esc fecha e o foco volta para quem abriu. */
export function Modal({ aberto, titulo, aoFechar, children, rodape }: PropsModal) {
  const referencia = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => sincronizar(referencia.current, aberto), [aberto]);

  return (
    <dialog ref={referencia} className="modal" aria-labelledby={idTitulo} onClose={aoFechar}>
      {aberto && (
        <div className="modal-corpo">
          <header className="modal-cabecalho">
            <h2 id={idTitulo}>{titulo}</h2>
            <Botao variante="fantasma" tamanho="pequeno" icone={X} onClick={aoFechar} aria-label="Fechar" />
          </header>
          {children}
          {rodape && <footer className="modal-rodape">{rodape}</footer>}
        </div>
      )}
    </dialog>
  );
}
