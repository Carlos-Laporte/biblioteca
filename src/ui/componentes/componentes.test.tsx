import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Campo } from './Campos';
import { GraficoMulta } from './GraficoMulta';
import { BadgeSituacao, BarraLimite } from './Regras';
import { fabricarUsuario } from '../testes/utilitarios';

describe('UI — componentes de regra', () => {
  it.each([
    ['ok', 1, 3],
    ['alerta', 2, 3],
    ['cheio', 3, 3],
  ])('UI01 — barra de limite no nível %s com %i de %i', (nivel, emUso, limite) => {
    // Arrange (dados da tabela)

    // Act
    const { container } = render(<BarraLimite emUso={emUso} limite={limite} />);

    // Assert
    expect(container.querySelector('.barra-limite')).toHaveAttribute('data-nivel', nivel);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(emUso));
    expect(screen.getByRole('progressbar')).toHaveAccessibleName(`Livros em uso: ${emUso} de ${limite}`);
  });

  it.each([
    ['inativo', { ativo: false }, 'Inativo'],
    ['multa em aberto', { resumo: { multasEmAberto: 1, pendente: true } }, 'Bloqueado · multa'],
    ['livro em atraso', { resumo: { emAtraso: 1, pendente: true } }, 'Bloqueado · atraso'],
    ['no limite', { resumo: { livrosEmUso: 3 } }, 'No limite'],
    ['liberado', {}, 'Liberado'],
  ])('UI02 — situação do usuário: %s', (_caso, parcial, texto) => {
    // Arrange
    const usuario = fabricarUsuario(parcial);

    // Act
    render(<BadgeSituacao resumo={usuario.resumo} ativo={usuario.ativo} />);

    // Assert
    expect(screen.getByText(texto)).toBeInTheDocument();
  });

  it('UI03 — gráfico da multa descreve as faixas e marca o dia atual', () => {
    // Arrange
    const dias = 12;

    // Act
    const { container } = render(<GraficoMulta diasAtuais={dias} />);

    // Assert
    expect(screen.getByRole('img')).toHaveAccessibleName(/teto de R\$\s150,00 a partir de 35 dias/);
    expect(container.querySelector('.marcador')).toBeInTheDocument();
    expect(screen.getByText('35+ dias: teto de R$ 150,00')).toBeInTheDocument();
  });

  it('UI04 — gráfico sem dia válido não desenha marcador', () => {
    // Arrange
    const dias = -1;

    // Act
    const { container } = render(<GraficoMulta diasAtuais={dias} />);

    // Assert
    expect(container.querySelector('.marcador')).not.toBeInTheDocument();
  });

  it('UI05 — campo liga ajuda e erro ao input por aria-describedby', () => {
    // Arrange
    const props = { rotulo: 'Matrícula', ajuda: '3 a 20 caracteres', erro: 'Obrigatório' };

    // Act
    render(<Campo {...props} />);

    // Assert
    const campo = screen.getByLabelText('Matrícula');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription('3 a 20 caracteres Obrigatório');
  });
});
