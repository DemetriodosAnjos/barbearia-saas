/**
 * @file src/tests/integration/securityBypass.test.ts
 * @description Teste de Integração Vitest para Prevenção de Bypass de Segurança,
 * Manipulação de LocalStorage e Prevenção de Vazamento no DOM.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  evaluateRouteAccessSecurity,
  detectAndNeutralizeStorageTampering,
  resolveNormalizedScreen,
} from '../../security/routeSecurityGuard';
import { handleAppointmentResourceRequest } from '../../api/appointmentsEndpoint';
import { USER_ROLES } from '../../security/authorizationMatrix';

describe('[ShieldCheck] Testes de Bypass de Segurança (Rotas, Storage e DOM Leak)', () => {

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // CENÁRIO 1: Acesso direto a /admin e /dashboard sem sessão
  // ==========================================================================
  it('1.1 - Deve normalizar rotas /admin e /dashboard e exigir autenticação estrita', () => {
    expect(resolveNormalizedScreen('/admin')).toBe('barbershop');
    expect(resolveNormalizedScreen('/dashboard')).toBe('superadmin');
    expect(resolveNormalizedScreen('/login')).toBe('login');
    expect(resolveNormalizedScreen('/client-app')).toBe('client-app');
  });

  it('1.2 - Deve bloquear acesso direto a /admin sem token ou sessão e forçar redirect para login', () => {
    const check = evaluateRouteAccessSecurity({
      targetScreen: 'barbershop',
      currentRole: USER_ROLES.ANON,
      authToken: null,
    });

    expect(check.allowed).toBe(false);
    expect(check.redirectUrl).toBe('/login');
    expect(check.sensitiveDataBlocked).toBe(true);
    expect(check.denialReason).toContain('Acesso direto não autorizado');
  });

  it('1.3 - Deve bloquear acesso direto a /dashboard (superadmin) para usuários sem sessão', () => {
    const check = evaluateRouteAccessSecurity({
      targetScreen: 'superadmin',
      currentRole: USER_ROLES.ANON,
      authToken: null,
    });

    expect(check.allowed).toBe(false);
    expect(check.redirectUrl).toBe('/login');
    expect(check.sensitiveDataBlocked).toBe(true);
  });

  // ==========================================================================
  // CENÁRIO 2: Simulação de manipulação manual do localStorage (role: "admin")
  // ==========================================================================
  it('2.1 - Deve detectar injeção arbitrária de role: "admin" no localStorage sem JWT assinado e purgar chaves', () => {
    // Invasor simula manipulação via console do navegador
    localStorage.setItem('role', 'admin');
    localStorage.setItem('user', JSON.stringify({ role: 'admin', isSuperAdmin: true }));

    const audit = detectAndNeutralizeStorageTampering();

    expect(audit.tamperingDetected).toBe(true);
    expect(audit.purgedKeys).toContain('role');
    expect(audit.purgedKeys).toContain('user');

    // Assegura que o storage foi limpo
    expect(localStorage.getItem('role')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('2.2 - Servidor deve bloquear requisição de dados reais com HTTP 401 para token adulterado', async () => {
    // Simula tentativa de chamada com token inválido/adulterado
    const forgedToken = 'Bearer eyJhbGciOiJIUzI1NiJ9.fake_payload.corrupted_signature';
    const mockReq = {
      method: 'GET',
      path: '/api/appointments/apt_alpha_01',
      headers: {
        authorization: forgedToken,
      },
    };

    const response = await handleAppointmentResourceRequest(mockReq);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
    expect(body.code).toBe('AUTH_TOKEN_INVALID');
    expect(body.data).toBeUndefined();
  });

  // ==========================================================================
  // CENÁRIO 3: Redirecionamento e Zero Vazamento no DOM
  // ==========================================================================
  it('3.1 - evaluateRouteAccessSecurity deve acusar tentativa de bypass e acionar bloqueio de dados sensíveis', () => {
    // Injeta adulteração
    localStorage.setItem('barbearia_role', 'admin');

    const check = evaluateRouteAccessSecurity({
      targetScreen: 'barbershop',
      currentRole: USER_ROLES.ADMIN, // Papel falsificado no client
      authToken: null,               // Sem token legítimo assinado
    });

    expect(check.allowed).toBe(false);
    expect(check.tamperingDetected).toBe(true);
    expect(check.redirectUrl).toBe('/login');
    expect(check.sensitiveDataBlocked).toBe(true);
    expect(check.purgedKeys).toContain('barbearia_role');
  });

});
