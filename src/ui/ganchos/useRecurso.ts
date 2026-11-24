import { DependencyList, useCallback, useEffect, useState } from 'react';

interface Estado<T> {
  readonly dados?: T;
  readonly erro?: Error;
  readonly carregando: boolean;
}

/** Carrega um recurso assíncrono, com estados de carregamento/erro e `recarregar()`. */
export function useRecurso<T>(carregar: () => Promise<T>, dependencias: DependencyList) {
  const [estado, setEstado] = useState<Estado<T>>({ carregando: true });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    setEstado((anterior) => ({ ...anterior, carregando: true }));
    carregar()
      .then((dados) => ativo && setEstado({ dados, carregando: false }))
      .catch((erro: Error) => ativo && setEstado({ erro, carregando: false }));
    return () => {
      ativo = false;
    };
    // As dependências são declaradas por quem chama (como em useEffect).
  }, [...dependencias, versao]);

  const recarregar = useCallback(() => setVersao((atual) => atual + 1), []);
  return { ...estado, recarregar };
}
