/**
 * @file tests/visual/components.spec.ts
 * Testes de Regressão Visual Automatizados com Playwright.
 * Compara snapshots de componentes UI nos estados default, hover, active, disabled e error
 * contra baselines pré-renderizadas com tolerância máxima de 5% de anti-aliasing.
 */

import { test, expect } from '@playwright/test';

test.describe('[Palette] Visual Regression Suite - Design System Components', () => {

  test('Buttons: Deve bater snapshot visual de todas as variantes e estados', async ({ page }) => {
    await page.goto('/?screen=qa-panel&tab=storybook-workbench');
    await page.waitForSelector('[data-testid="storybook-workbench-container"]', { timeout: 10000 });

    // Selecionar componente Button
    const buttonSection = page.locator('[data-testid="component-preview-button"]');
    await expect(buttonSection).toBeVisible();

    // Snapshot do estado Default
    await expect(buttonSection).toHaveScreenshot('button-all-states.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled'
    });
  });

  test('Inputs: Deve manter fidelidade visual com foco, erro e máscara', async ({ page }) => {
    await page.goto('/?screen=qa-panel&tab=storybook-workbench');
    await page.waitForSelector('[data-testid="storybook-workbench-container"]', { timeout: 10000 });

    // Alternar para componente Input
    await page.click('button:has-text("Input")');
    const inputSection = page.locator('[data-testid="component-preview-input"]');
    await expect(inputSection).toBeVisible();

    await expect(inputSection).toHaveScreenshot('input-all-states.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled'
    });
  });

  test('Cards & Modais: Isolamento visual e consistência de backdrop', async ({ page }) => {
    await page.goto('/?screen=qa-panel&tab=storybook-workbench');
    await page.waitForSelector('[data-testid="storybook-workbench-container"]', { timeout: 10000 });

    // Alternar para Cards
    await page.click('button:has-text("Card")');
    const cardSection = page.locator('[data-testid="component-preview-card"]');
    await expect(cardSection).toBeVisible();

    await expect(cardSection).toHaveScreenshot('card-all-states.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled'
    });
  });

  test('Cascade Protection: Fluxo de Agendamento não sofre quebra visual', async ({ page }) => {
    await page.goto('/?screen=client-app');
    await page.waitForSelector('#main-content', { timeout: 10000 });

    const bookingFlow = page.locator('#main-content');
    await expect(bookingFlow).toHaveScreenshot('client-booking-flow.png', {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled'
    });
  });

});
