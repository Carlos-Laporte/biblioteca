import { z } from 'zod';

const PORTA_PADRAO = 3000;

const esquemaAmbiente = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  PORT: z.coerce.number().int().positive().default(PORTA_PADRAO),
  HOST: z.string().default('0.0.0.0'),
  SEED: z.enum(['true', 'false']).default('false'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Configuracao = z.infer<typeof esquemaAmbiente>;

/** Lê e valida as variáveis de ambiente na inicialização (falha cedo, com mensagem clara). */
export function lerConfiguracao(ambiente: NodeJS.ProcessEnv = process.env): Configuracao {
  const resultado = esquemaAmbiente.safeParse(ambiente);
  if (!resultado.success) {
    throw new Error(`Configuração inválida:\n${z.prettifyError(resultado.error)}`);
  }
  return resultado.data;
}
