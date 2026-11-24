import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { vi } from 'vitest';
import type { UsuarioComResumo } from '../api/tipos';
import { ProvedorToast } from '../componentes/Toast';

type Resposta = readonly [status: number, corpo: unknown];
type Rota = (corpo: unknown) => Resposta;

export interface ApiFalsa {
  readonly chamadas: Array<{ metodo: string; caminho: string; corpo: unknown }>;
}

/** Substitui o fetch global por rotas falsas: { 'GET /api/usuarios': () => [200, [...]] }. */
export function simularApi(rotas: Record<string, Rota>): ApiFalsa {
  const chamadas: ApiFalsa['chamadas'] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const metodo = init.method ?? 'GET';
    const caminho = url.split('?')[0];
    const corpo = init.body ? JSON.parse(String(init.body)) : undefined;
    chamadas.push({ metodo, caminho, corpo });
    const rota = rotas[`${metodo} ${caminho}`];
    const [status, resposta] = rota ? rota(corpo) : [404, { erro: 'NAO_ENCONTRADO', mensagem: `Rota falsa ausente: ${metodo} ${caminho}` }];
    return new Response(JSON.stringify(resposta), { status, headers: { 'content-type': 'application/json' } });
  }));
  return { chamadas };
}

/** Renderiza dentro do roteador e do provedor de notificações, como na aplicação real. */
export function renderizar(elemento: ReactElement, { rota = '/', caminho = '/' }: { rota?: string; caminho?: string } = {}) {
  const usuario = userEvent.setup();
  const resultado = render(
    <MemoryRouter initialEntries={[rota]}>
      <ProvedorToast>
        <Routes>
          <Route path={caminho} element={elemento} />
          <Route path="/usuarios/:id" element={<p>Página do usuário</p>} />
        </Routes>
      </ProvedorToast>
    </MemoryRouter>,
  );
  return { usuario, ...resultado };
}

type UsuarioParcial = Partial<Omit<UsuarioComResumo, 'resumo'>> & { resumo?: Partial<UsuarioComResumo['resumo']> };

export function fabricarUsuario(parcial: UsuarioParcial = {}): UsuarioComResumo {
  const { resumo, ...resto } = parcial;
  return {
    id: 1,
    nome: 'Ana Souza',
    matricula: 'G2024001',
    email: 'ana@exemplo.com',
    perfil: 'GRADUACAO',
    ativo: true,
    ...resto,
    resumo: { livrosEmUso: 0, limite: 3, prazoDevolucaoDias: 15, multasEmAberto: 0, emAtraso: 0, pendente: false, ...resumo },
  };
}

export const livroFalso = (id: number, titulo: string, disponiveis = 2) => ({
  id,
  titulo,
  autor: 'Autor Exemplo',
  isbn: `978-0-00-00000${id}-0`,
  ano: 2020,
  exemplaresTotal: 2,
  emUso: 2 - disponiveis,
  disponiveis,
});
