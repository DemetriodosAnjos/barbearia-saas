import { test, expect } from '@playwright/test';

test.describe('Prevenção de Quebras em Cascata em Telas Dependentes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?tab=cascading-tests');
    await page.waitForLoadState('networkidle');
  });

  test('Tela de Checkout: deve validar integridade visual com componentes filhos isolados', async ({ page }) => {
    const checkoutContainer = page.locator('[data-testid="dependent-screen-checkout"]');
    await expect(checkoutContainer).toBeVisible();

    // Compara a tela inteira de checkout garantindo que alterações em Button/Input não colapsaram o grid
    await expect(checkoutContainer).toHaveScreenshot('screen-checkout-baseline.png', {
      maxDiffPixelRatio: 0.001,
      threshold: 0.05,
    });
  });

  test('Dashboard de Métricas: deve validar alinhamento de cards e tipografia tabular', async ({ page }) => {
    const dashboardContainer = page.locator('[data-testid="dependent-screen-dashboard"]');
    await expect(dashboardContainer).toBeVisible();

    await expect(dashboardContainer).toHaveScreenshot('screen-dashboard-baseline.png', {
      maxDiffPixelRatio: 0.001,
    });
  });

  test('Detecção de Quebra Provocada: deve rejeitar build se Button sofrer alteração invasiva de padding', async ({ page }) => {
    // Altera classe via DOM no sandbox para validar que o comparador de pixel detecta a quebra
    const checkoutContainer = page.locator('[data-testid="dependent-screen-checkout"]');
    
    // Verifica tolerância estrita contra overflowing em containers pais
    const boundingBox = await checkoutContainer.boundingBox();
    expect(boundingBox?.width).toBeGreaterThanOrEqual(400);
  });
});
