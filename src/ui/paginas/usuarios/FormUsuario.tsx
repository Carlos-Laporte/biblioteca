import { useState, type FormEvent } from 'react';
import { PerfilUsuario } from '../../../domain';
import type { DadosUsuario } from '../../api/tipos';
import { Alerta, Botao } from '../../componentes/Basicos';
import { Campo, Selecao } from '../../componentes/Campos';
import { Modal } from '../../componentes/Modal';
import { PERFIS, ROTULO_PERFIL } from '../../formatacao';
import { useEnvio } from '../../ganchos/useEnvio';

const VAZIO: DadosUsuario = { nome: '', matricula: '', email: '', perfil: PerfilUsuario.GRADUACAO };

interface PropsForm {
  readonly aberto: boolean;
  readonly inicial?: DadosUsuario;
  readonly aoFechar: () => void;
  readonly aoSalvar: (dados: DadosUsuario) => Promise<unknown>;
}

type Mudar = (campo: keyof DadosUsuario, valor: string) => void;

function CamposUsuario({ dados, erros, mudar }: { readonly dados: DadosUsuario; readonly erros: Record<string, string>; readonly mudar: Mudar }) {
  return (
    <div className="formulario formulario-2">
      <Campo rotulo="Nome completo" required value={dados.nome} erro={erros.nome} onChange={(evento) => mudar('nome', evento.target.value)} autoComplete="name" />
      <Campo rotulo="Matrícula" required value={dados.matricula} erro={erros.matricula} ajuda="3 a 20 letras, números ou hífen" onChange={(evento) => mudar('matricula', evento.target.value)} />
      <Campo rotulo="E-mail" type="email" required value={dados.email} erro={erros.email} onChange={(evento) => mudar('email', evento.target.value)} autoComplete="email" />
      <Selecao rotulo="Perfil" value={dados.perfil} erro={erros.perfil} onChange={(evento) => mudar('perfil', evento.target.value)}>
        {PERFIS.map((perfil) => <option key={perfil} value={perfil}>{ROTULO_PERFIL[perfil]}</option>)}
      </Selecao>
    </div>
  );
}

const camposEditaveis = (usuario: DadosUsuario): DadosUsuario => ({
  nome: usuario.nome,
  matricula: usuario.matricula,
  email: usuario.email,
  perfil: usuario.perfil,
});

/** Cadastro/edição de usuário; erros de validação da API aparecem em cada campo. */
export function FormUsuario({ aberto, inicial, aoFechar, aoSalvar }: PropsForm) {
  const [dados, setDados] = useState<DadosUsuario>(() => (inicial ? camposEditaveis(inicial) : VAZIO));
  const { erro, enviando, enviar, errosPorCampo } = useEnvio(aoSalvar);
  const mudar: Mudar = (campo, valor) => setDados((atual) => ({ ...atual, [campo]: valor }));

  async function submeter(evento: FormEvent) {
    evento.preventDefault();
    if ((await enviar(dados)) && !inicial) setDados(VAZIO);
  }

  return (
    <Modal aberto={aberto} titulo={inicial ? 'Editar usuário' : 'Novo usuário'} aoFechar={aoFechar}>
      <form className="pilha" onSubmit={submeter} noValidate>
        {erro && <Alerta tom="erro" titulo="Não foi possível salvar" anunciar>{erro.message}</Alerta>}
        <CamposUsuario dados={dados} erros={errosPorCampo} mudar={mudar} />
        <div className="modal-rodape">
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="primario" type="submit" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar'}</Botao>
        </div>
      </form>
    </Modal>
  );
}
