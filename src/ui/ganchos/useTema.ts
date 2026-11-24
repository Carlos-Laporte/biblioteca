import { useCallback, useEffect, useState } from 'react';

export type Tema = 'claro' | 'escuro';

const CHAVE = 'biblioteca-tema';

function temaSalvo(): Tema | null {
  try {
    const salvo = localStorage.getItem(CHAVE);
    return salvo === 'claro' || salvo === 'escuro' ? salvo : null;
  } catch {
    return null; // armazenamento bloqueado (aba anônima, política do navegador)
  }
}

function temaDoSistema(): Tema {
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

/** Tema claro/escuro: respeita o sistema e lembra a escolha manual. */
export function useTema() {
  const [tema, setTema] = useState<Tema>(() => temaSalvo() ?? temaDoSistema());

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  const alternar = useCallback(() => {
    setTema((atual) => {
      const proximo = atual === 'claro' ? 'escuro' : 'claro';
      try {
        localStorage.setItem(CHAVE, proximo);
      } catch {
        // sem persistência: o tema vale só nesta sessão
      }
      return proximo;
    });
  }, []);

  return { tema, alternar };
}
