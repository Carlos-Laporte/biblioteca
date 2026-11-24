import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGINAS = [
  ['Painel', '/'],
  ['Novo empréstimo', '/emprestimos/novo'],
  ['Devolução', '/devolucoes'],
  ['Usuários', '/usuarios'],
  ['Acervo', '/livros'],
  ['Multas', '/multas'],
  ['Simulador de regras', '/simulador'],
] as const;

test.describe('E2E — acessibilidade e responsividade', () => {
  for (const [titulo, rota] of PAGINAS) {
    test(`E2E07 — ${titulo}: sem violações graves (axe, WCAG 2.1 AA) nos temas claro e escuro`, async ({ page }) => {
      // Arrange
      await page.goto(rota);
      await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

      // Act
      const analisar = () => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const claro = await analisar();
      await page.evaluate(() => {
        document.documentElement.dataset.tema = 'escuro';
      });
      const escuro = await analisar();

      // Assert
      const graves = [...claro.violations, ...escuro.violations].filter((violacao) => ['serious', 'critical'].includes(violacao.impact ?? ''));
      expect(graves.map((violacao) => `${violacao.id}: ${violacao.help}`)).toEqual([]);
    });

    test(`E2E08 — ${titulo}: sem rolagem horizontal`, async ({ page }) => {
      // Arrange
      await page.goto(rota);
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);

      // Act
      const larguras = await page.evaluate(() => ({ conteudo: document.documentElement.scrollWidth, tela: document.documentElement.clientWidth }));

      // Assert
      expect(larguras.conteudo).toBeLessThanOrEqual(larguras.tela);
    });
  }

  test('E2E06 — navegação completa pelo teclado', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Teclado físico: cenário de desktop');
    // Arrange
    await page.goto('/');

    // Act
    await page.keyboard.press('Tab');
    const pularConteudo = page.getByRole('link', { name: 'Pular para o conteúdo' });
    await expect(pularConteudo).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#conteudo')).toBeFocused();

    const simulador = page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Simulador' });
    for (let tentativas = 0; tentativas < 20 && !(await simulador.evaluate((el) => el === document.activeElement)); tentativas += 1) {
      await page.keyboard.press('Shift+Tab');
    }
    await page.keyboard.press('Enter');

    // Assert
    await expect(page).toHaveURL(/\/simulador$/);
    await page.getByLabel('Dias de atraso').focus();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('35');
    await expect(page.getByText('R$ 150,00', { exact: true })).toBeVisible();
  });
});
