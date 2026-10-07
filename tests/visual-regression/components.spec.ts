import { test, expect } from '@playwright/test';

test.describe('Design System - Regressão Visual de Componentes UI', () => {
  test.beforeEach(async ({ page }) => {
    // Carrega a página e aguarda carregamento das fontes do Google Fonts
    await page.goto('/?tab=design-system');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
  });

  test.describe('Componente: Button', () => {
    const states = ['default', 'hover', 'active', 'disabled', 'error', 'loading'];
    const variants = ['primary', 'secondary', 'outline', 'destructive', 'ghost'];

    for (const state of states) {
      test(`deve coincidir com o baseline no estado: ${state}`, async ({ page }) => {
        const buttonLocator = page.locator(`[data-testid="story-button-${state}"]`);
        await expect(buttonLocator).toBeVisible();

        if (state === 'hover') {
          await buttonLocator.hover();
        }

        await expect(buttonLocator).toHaveScreenshot(`button-${state}.png`, {
          maxDiffPixelRatio: 0.0015,
        });
      });
    }

    test('deve renderizar a matriz de variantes sem desvio de layout', async ({ page }) => {
      const matrixLocator = page.locator('[data-testid="button-matrix-all-variants"]');
      if (await matrixLocator.count() > 0) {
        await expect(matrixLocator).toHaveScreenshot('button-matrix-all-variants.png');
      }
    });
  });

  test.describe('Componente: Input', () => {
    const inputStates = ['default', 'hover', 'focus', 'filled', 'disabled', 'error'];

    for (const state of inputStates) {
      test(`deve validar snapshot pixel-a-pixel do input em estado: ${state}`, async ({ page }) => {
        const inputLocator = page.locator(`[data-testid="story-input-${state}"]`);
        await expect(inputLocator).toBeVisible();

        if (state === 'focus') {
          await inputLocator.locator('input').focus();
        }

        await expect(inputLocator).toHaveScreenshot(`input-${state}.png`, {
          maxDiffPixelRatio: 0.0015,
        });
      });
    }
  });

  test.describe('Componente: Modal', () => {
    test('deve validar estrutura e backdrop do modal de confirmação destrutiva', async ({ page }) => {
      const modalLocator = page.locator('[data-testid="story-modal-destructive"]');
      await expect(modalLocator).toBeVisible();
      await expect(modalLocator).toHaveScreenshot('modal-destructive-confirm.png');
    });

    test('deve validar alinhamento de ações e contraste do modal padrão', async ({ page }) => {
      const modalLocator = page.locator('[data-testid="story-modal-default"]');
      await expect(modalLocator).toBeVisible();
      await expect(modalLocator).toHaveScreenshot('modal-default-structure.png');
    });
  });

  test.describe('Componente: Card', () => {
    const cardVariants = ['default', 'interactive', 'elevated', 'bordered'];

    for (const variant of cardVariants) {
      test(`deve validar snapshot do card com variante: ${variant}`, async ({ page }) => {
        const cardLocator = page.locator(`[data-testid="story-card-${variant}"]`);
        await expect(cardLocator).toBeVisible();
        await expect(cardLocator).toHaveScreenshot(`card-${variant}.png`);
      });
    }
  });
});
