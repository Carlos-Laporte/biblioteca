interface Props {
  readonly rotulo: string;
  readonly valor: number;
  readonly aoMudar: (valor: number) => void;
}

export function CampoNumero({ rotulo, valor, aoMudar }: Props) {
  return (
    <label>
      {rotulo}
      <input
        type="number"
        value={Number.isNaN(valor) ? '' : valor}
        onChange={(evento) => aoMudar(evento.target.valueAsNumber)}
      />
    </label>
  );
}
