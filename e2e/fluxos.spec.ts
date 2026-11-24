import { expect, test } from '@playwright/test';
import { criarLivro, criarUsuario, diasAtras, emprestar, hojeDaApi } from './apoio';

test.describe('E2E — fluxos da biblioteca (front + API + PostgreSQL)', () => {
  test('E2E01 — empréstimo aprovado é registrado e aparece no histórico do usuário', async ({ page, request }) => {
    // Arrange
    const usuario = await criarUsuario(request);
    const livro = await criarLivro(request);
    await page.goto(`/emprestimos/novo?usuario=${usuario.id}`);

    // Act
    await page.getByLabel('Buscar no acervo').fill(livro.titulo);
    await page.getByLabel(livro.titulo).check();
    await expect(page.getByText('Empréstimo permitido')).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar empréstimo' }).click();

    // Assert
    await expect(page).toHaveURL(new RegExp(`/usuarios/${usuario.id}$`));
    await expect(page.getByRole('heading', { name: usuario.nome })).toBeVisible();
    await expect(page.getByRole('cell', { name: livro.titulo })).toBeVisible();
  });

  test('E2E02 — empréstimo acima do limite do perfil é recusado (RF01)', async ({ page, request }) => {
    // Arrange
    const usuario = await criarUsuario(request, 'GRADUACAO');
    const livros = await Promise.all([1, 2, 3, 4].map(() => criarLivro(request)));
    await emprestar(request, usuario.id, livros.slice(0, 3).map((livro) => livro.id));
    await page.goto(`/emprestimos/novo?usuario=${usuario.id}`);

    // Act
    await page.getByLabel('Buscar no acervo').fill(livros[3].titulo);
    await page.getByLabel(livros[3].titulo).check();

    // Assert
    await expect(page.getByText('Empréstimo recusado: 4 livros excede o limite de 3')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar empréstimo' })).toBeDisabled();
  });

  test('E2E03 — usuário com livro em atraso é recusado por pendência (RF01)', async ({ page, request }) => {
    // Arrange
    const hoje = await hojeDaApi(request);
    const usuario = await criarUsuario(request, 'GRADUACAO');
    const [atrasado, novo] = await Promise.all([criarLivro(request), criarLivro(request)]);
    await emprestar(request, usuario.id, [atrasado.id], diasAtras(hoje, 20)); // venceu há 5 dias
    await page.goto(`/emprestimos/novo?usuario=${usuario.id}`);

    // Act
    await page.getByLabel('Buscar no acervo').fill(novo.titulo);
    await page.getByLabel(novo.titulo).check();

    // Assert
    await expect(page.getByText('Empréstimo recusado: usuário possui multa ou livro em atraso')).toBeVisible();
  });

  test('E2E04/05 — devolução com atraso gera multa correta; o pagamento libera novo empréstimo', async ({ page, request }) => {
    // Arrange: Graduação emprestado há 30 dias → prevista há 15 → 15 dias de atraso → 25 + 5 × 5 = R$ 50,00
    const hoje = await hojeDaApi(request);
    const usuario = await criarUsuario(request, 'GRADUACAO');
    const [livro, proximo] = await Promise.all([criarLivro(request), criarLivro(request)]);
    await emprestar(request, usuario.id, [livro.id], diasAtras(hoje, 30));

    // Act — devolução
    await page.goto('/devolucoes');
    await page.getByLabel('Buscar empréstimo').fill(livro.titulo);
    await page.getByRole('row', { name: new RegExp(livro.titulo) }).getByRole('button', { name: 'Devolver' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Registrar devolução' });
    await expect(dialogo.getByText('Multa de R$ 50,00')).toBeVisible();
    await dialogo.getByRole('button', { name: 'Confirmar devolução' }).click();

    // Assert — multa gerada
    await expect(page.getByText('Devolução registrada com multa de R$ 50,00')).toBeVisible();

    // Act — pagamento
    await page.goto('/multas');
    await page.getByRole('row', { name: new RegExp(usuario.nome) }).getByRole('button', { name: 'Registrar pagamento' }).click();
    await page.getByRole('dialog', { name: 'Registrar pagamento' }).getByRole('button', { name: 'Confirmar pagamento' }).click();
    await expect(page.getByText('Pagamento de R$ 50,00 registrado')).toBeVisible();

    // Assert — liberado para novo empréstimo
    await page.goto(`/emprestimos/novo?usuario=${usuario.id}`);
    await page.getByLabel('Buscar no acervo').fill(proximo.titulo);
    await page.getByLabel(proximo.titulo).check();
    await expect(page.getByText('Empréstimo permitido')).toBeVisible();
  });
});
