/**
 * @file tests/e2e/security-bypass.spec.ts
 * @description Suíte de Testes Automatizados E2E de Bypass de Segurança (Playwright).
 * Valida a eficácia dos mecanismos de defesa contra:
 * 1. Acesso direto a rotas protegidas (/admin e /dashboard) sem cookie ou token de sessão.
 * 2. Manipulação maliciosa de localStorage (Client-Side Role Forgery como role: "admin").
 * 3. Bloqueio server-side de requisições de dados confidenciais (HTTP 401/403).
 * 4. Redirecionamento instantâneo para a tela de login com sanitização integral do DOM.
 * 
 * Execução pronta para CI/CD:
 *   npx playwright test tests/e2e/security-bypass.spec.ts
 */

import { test, expect } from '@playwright/test';

// Configuração de URL base com fallback para execução local e CI
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('[ShieldCheck] AppSec E2E: Suíte de Prevenção de Bypass de Segurança & Broken Access Control', () => {

  test.beforeEach(async ({ context }) => {
    // Garante ambiente estéril sem resquícios de sessões anteriores
    await context.clearCookies();
    await context.clearPermissions();
  });

  // ============================================================================
  // CENÁRIO 1: ACESSO DIRETO A ROTAS PROTEGIDAS SEM COOKIE/TOKEN DE SESSÃO
  // ============================================================================

  test('1.1 - Deve bloquear acesso direto a /admin sem sessão e redirecionar imediatamente para tela de login', async ({ page }) => {
    // Monitora chamadas de rede para garantir que nenhum dado sensível foi transmitido
    let leakedDataTransmitted = false;
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/appointments') || url.includes('/api/admin') || url.includes('/financial')) {
        if (response.status() === 200) {
          leakedDataTransmitted = true;
        }
      }
    });

    // Tenta acessar diretamente a URL da rota /admin sem qualquer cookie ou token
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });

    // 1. Garante que a interface redireciona para a tela de login imediatamente
    // Verifica ou a alteração de URL para login ou a renderização imediata do formulário de autenticação
    await expect(page.locator('form, [data-testid="login-form"], button:has-text("Entrar")').first()).toBeVisible({
      timeout: 5000,
    });

    // 2. Garante que nenhuma informação sensível seja renderizada no DOM
    const pageContent = await page.content();
    
    // Lista de expressões sensíveis que NUNCA podem constar no DOM de um usuário não autenticado
    const forbiddenSensitiveTerms = [
      'Faturamento Total',
      'Receita Mensal',
      'Comissão do Barbeiro',
      'client_phone',
      'Roberto Concorrente',
      'Dados confidenciais: cliente VIP',
      'service_role',
    ];

    for (const term of forbiddenSensitiveTerms) {
      expect(pageContent).not.toContain(term);
    }

    // 3. Verifica que componentes administrativos de gestão não existem no DOM
    const adminDashboardTable = page.locator('table[data-testid="appointments-table"]');
    await expect(adminDashboardTable).toHaveCount(0);

    const financialMetricsCard = page.locator('[data-testid="financial-overview"]');
    await expect(financialMetricsCard).toHaveCount(0);

    expect(leakedDataTransmitted).toBe(false);
  });

  test('1.2 - Deve bloquear acesso direto a /dashboard sem sessão e sanitizar completamente o DOM', async ({ page }) => {
    // Tenta acessar a URL de painel master /dashboard deslogado
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });

    // A tela de login deve ser exibida imediatamente
    await expect(page.locator('button:has-text("Entrar"), input[type="password"]').first()).toBeVisible({
      timeout: 5000,
    });

    // Auditoria estrita do DOM: nenhuma tabela de clientes ou métricas administrativas
    const domHtml = await page.evaluate(() => document.body.innerHTML);
    expect(domHtml).not.toContain('Vintage Club Barber Shop');
    expect(domHtml).not.toContain('Relatório Financeiro Master');
    expect(domHtml).not.toContain('MRR');
    expect(domHtml).not.toContain('ARR');
  });

  // ============================================================================
  // CENÁRIO 2: MANIPULAÇÃO MANUAL DO LOCALSTORAGE (ROLE FORGERY COMO ADMIN)
  // ============================================================================

  test('2.1 - Simulação de ataque: Deve detectar injeção manual de role: "admin" no localStorage e purgar chaves', async ({ page }) => {
    // Navega inicialmente para uma rota neutra para injetar dados no storage
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    // O invasor abre o Developer Tools e injeta papéis falsificados no localStorage
    await page.evaluate(() => {
      localStorage.setItem('role', 'admin');
      localStorage.setItem('user_role', 'admin');
      localStorage.setItem('user', JSON.stringify({
        id: 'attacker-1337',
        role: 'admin',
        isSuperAdmin: true,
        permissions: ['ALL_PERMISSIONS', 'VIEW_FINANCIALS', 'EXPORT_DATA'],
      }));
      // Simula token forjado sem assinatura criptográfica válida
      localStorage.setItem('access_token', 'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMzM3Iiwicm9sZSI6ImFkbWluIn0.');
    });

    // Invasor tenta navegar para a rota administrativa acreditando ter burlado o frontend
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });

    // O guardião de segurança deve detectar a adulteração, purgar o storage e redirecionar
    await expect(page.locator('form, button:has-text("Entrar")').first()).toBeVisible({
      timeout: 5000,
    });

    // Inspeciona o estado do localStorage para atestar que as chaves maliciosas foram purgadas
    const storageState = await page.evaluate(() => ({
      role: localStorage.getItem('role'),
      userRole: localStorage.getItem('user_role'),
      user: localStorage.getItem('user'),
    }));

    expect(storageState.role).toBeNull();
    expect(storageState.userRole).toBeNull();
    expect(storageState.user).toBeNull();
  });

  test('2.2 - Deve verificar se o servidor bloqueia com 401/403 requisições disparadas com token adulterado', async ({ request }) => {
    // Simula requisição direta de API enviando token manipulado com role 'admin' mas assinatura corrompida
    const forgedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhdHRhY2tlciIsInJvbGUiOiJhZG1pbiJ9.ASSINATURA_FALSA_INVALIDA';

    const response = await request.get(`${BASE_URL}/api/appointments/apt_beta_01`, {
      headers: {
        Authorization: `Bearer ${forgedToken}`,
      },
    });

    // O servidor DEVE bloquear e responder com 401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error || body.code).toBeDefined();
    // Garante que nenhum dado da barbearia foi retornado no payload
    expect(body.data).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('Roberto Concorrente');
  });

  // ============================================================================
  // CENÁRIO 3: PREVENÇÃO DE VAZAMENTO DE DADOS SENSÍVEIS NO DOM
  // ============================================================================

  test('3.1 - Não deve renderizar no DOM dados sensíveis (clientes, faturamento, barbeiros) durante tentativas de bypass', async ({ page }) => {
    // Simula tentativa agressiva injetando múltiplos atributos no sessionStorage e localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('role', 'superadmin');
      window.localStorage.setItem('barbearia_role', 'admin');
    });

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });

    // Varre todos os nós de texto do documento à procura de segredos ou PII
    const sensitiveNodesCount = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let forbiddenCount = 0;
      let node;
      const forbiddenKeywords = [
        'saldo da conta',
        'dados fiscais',
        'comissão de 40%',
        'chave secreta',
        'apt_alpha_01',
      ];
      while ((node = walker.nextNode())) {
        const text = node.textContent?.toLowerCase() || '';
        for (const kw of forbiddenKeywords) {
          if (text.includes(kw)) {
            forbiddenCount++;
          }
        }
      }
      return forbiddenCount;
    });

    expect(sensitiveNodesCount).toBe(0);

    // Confirma que a tela de login permanece apresentada com segurança
    await expect(page.locator('button:has-text("Entrar"), input[type="password"]').first()).toBeVisible();
  });

});
