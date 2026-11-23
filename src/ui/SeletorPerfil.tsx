import { PerfilUsuario } from '../domain';
import { PERFIS, ROTULO_PERFIL } from './rotulos';

interface Props {
  readonly valor: PerfilUsuario;
  readonly aoMudar: (perfil: PerfilUsuario) => void;
}

export function SeletorPerfil({ valor, aoMudar }: Props) {
  return (
    <label>
      Perfil do usuário
      <select value={valor} onChange={(evento) => aoMudar(evento.target.value as PerfilUsuario)}>
        {PERFIS.map((perfil) => (
          <option key={perfil} value={perfil}>
            {ROTULO_PERFIL[perfil]}
          </option>
        ))}
      </select>
    </label>
  );
}
