/**
 * @file cypress/e2e/security-bypass.cy.ts
 * @description Suíte de Testes Automatizados E2E de Bypass de Segurança (Cypress).
 * 
 * Execução pronta para CI/CD:
 *   npx cypress run --spec cypress/e2e/security-bypass.cy.ts
 */

describe('🛡️ AppSec E2E (Cypress): Bypass de Rotas e Integridade de Sessão', () => {

  beforeEach(() => {
    // Limpa cookies e storage antes de cada cenário
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('1. Acesso direto a /admin sem sessão deve redirecionar imediatamente para login sem expor DOM sensível', () => {
    // Tenta acessar URL restrita diretamente
    cy.visit('/admin', { failOnStatusCode: false });

    // Verifica que o redirecionamento ou tela de login foi ativada
    cy.get('button').contains(/Entrar/i).should('be.visible');

    // Valida que nenhuma informação sensível de faturamento ou clientes está presente no DOM
    cy.get('body').should('not.contain', 'Faturamento Total');
    cy.get('body').should('not.contain', 'Roberto Concorrente');
    cy.get('body').should('not.contain', 'service_role');
    cy.get('table[data-testid="appointments-table"]').should('not.exist');
  });

  it('2. Acesso direto a /dashboard sem sessão deve bloquear renderização administrativa', () => {
    cy.visit('/dashboard', { failOnStatusCode: false });

    // Deve renderizar a tela de login
    cy.get('input[type="password"], button:contains("Entrar")').should('exist');

    // Nenhuma métrica administrativa deve vazar no DOM
    cy.get('body').should('not.contain', 'Relatório Financeiro Master');
    cy.get('body').should('not.contain', 'MRR');
  });

  it('3. Simulação de manipulação manual de localStorage (role: "admin") deve ser purgada e bloqueada', () => {
    // Injeta papéis falsificados no localStorage antes de carregar a página
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('role', 'admin');
        win.localStorage.setItem('user', JSON.stringify({ role: 'admin', isSuperAdmin: true }));
        win.localStorage.setItem('access_token', 'forged.fake.token');
      },
    });

    // Tenta acessar a rota administrativa
    cy.visit('/admin');

    // O sistema deve identificar o role forjado sem assinatura legítima e forçar login
    cy.get('button').contains(/Entrar/i).should('be.visible');

    // O storage adulterado deve ter sido purgado
    cy.window().then((win) => {
      expect(win.localStorage.getItem('role')).to.be.null;
      expect(win.localStorage.getItem('user')).to.be.null;
    });
  });

  it('4. Chamadas de API com token adulterado devem receber HTTP 401 e zero dados sensíveis', () => {
    cy.request({
      url: '/api/appointments/apt_beta_01',
      headers: {
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.fake.signature',
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(401);
      expect(response.body).to.not.have.property('data');
    });
  });

});
