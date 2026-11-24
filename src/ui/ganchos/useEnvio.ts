import { useState } from 'react';
import { ErroApi } from '../api/cliente';

/** Envio de formulário: estado de "enviando", erro geral e erros por campo vindos da API. */
export function useEnvio<T>(acao: (dados: T) => Promise<unknown>) {
  const [erro, setErro] = useState<Error>();
  const [enviando, setEnviando] = useState(false);

  async function enviar(dados: T): Promise<boolean> {
    setEnviando(true);
    try {
      await acao(dados);
      setErro(undefined);
      return true;
    } catch (falha) {
      setErro(falha as Error);
      return false;
    } finally {
      setEnviando(false);
    }
  }

  const errosPorCampo: Record<string, string> =
    erro instanceof ErroApi ? Object.fromEntries(erro.campos.map((item) => [item.campo, item.mensagem])) : {};
  return { erro, enviando, enviar, errosPorCampo };
}
