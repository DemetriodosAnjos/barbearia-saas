import { describe, it, expect } from "vitest";
import {
  AUTHORIZATION_MATRIX,
  UI_SCREEN_MATRIX,
  USER_ROLES,
  ROUTE_CLASSIFICATIONS,
  findScreenDefinition,
} from "../../security/authorizationMatrix";
import {
  evaluateAccess,
  rbacDefaultDenyMiddleware,
  generateSyntheticJwt,
  extractBearerToken,
} from "../../middleware/rbacMiddleware";

describe("Prompt 01: RBAC e Negação por Padrão (Default Deny)", () => {
  // ========================================================
  // 1. MATRIZ DE AUTORIZAÇÃO E CLASSIFICAÇÃO DE ROTAS
  // ========================================================
  describe("1. Matriz de Autorização (Classificação Formal)", () => {
    it("mapeia e classifica todas as rotas em públicas, privadas, employee, administrativas e superadmin", () => {
      expect(AUTHORIZATION_MATRIX.length).toBeGreaterThanOrEqual(15);

      const publicRoutes = AUTHORIZATION_MATRIX.filter(
        (r) => r.classification === ROUTE_CLASSIFICATIONS.PUBLIC
      );
      const privateRoutes = AUTHORIZATION_MATRIX.filter(
        (r) => r.classification === ROUTE_CLASSIFICATIONS.PRIVATE
      );
      const employeeRoutes = AUTHORIZATION_MATRIX.filter(
        (r) => r.classification === ROUTE_CLASSIFICATIONS.EMPLOYEE
      );
      const adminRoutes = AUTHORIZATION_MATRIX.filter(
        (r) => r.classification === ROUTE_CLASSIFICATIONS.ADMINISTRATIVE
      );
      const superAdminRoutes = AUTHORIZATION_MATRIX.filter(
        (r) => r.classification === ROUTE_CLASSIFICATIONS.SUPERADMIN
      );

      expect(publicRoutes.length).toBeGreaterThan(0);
      expect(privateRoutes.length).toBeGreaterThan(0);
      expect(employeeRoutes.length).toBeGreaterThan(0);
      expect(adminRoutes.length).toBeGreaterThan(0);
      expect(superAdminRoutes.length).toBeGreaterThan(0);

      // Toda rota pública deve ter flag isPublic: true
      publicRoutes.forEach((route) => {
        expect(route.isPublic).toBe(true);
        expect(route.allowedRoles).toContain(USER_ROLES.ANON);
      });

      // Toda rota não pública deve ter isPublic: false
      [...privateRoutes, ...employeeRoutes, ...adminRoutes, ...superAdminRoutes].forEach(
        (route) => {
          expect(route.isPublic).toBe(false);
          expect(route.allowedRoles).not.toContain(USER_ROLES.ANON);
        }
      );
    });

    it("mapeia as telas do frontend na UI_SCREEN_MATRIX", () => {
      expect(UI_SCREEN_MATRIX.length).toBeGreaterThanOrEqual(6);
      const clientApp = findScreenDefinition("client-app");
      const barbershop = findScreenDefinition("barbershop");
      const superadmin = findScreenDefinition("superadmin");
      const qaPanel = findScreenDefinition("qa-panel");

      expect(clientApp.isPublic).toBe(true);
      expect(barbershop.isPublic).toBe(false);
      expect(superadmin.isPublic).toBe(false);
      expect(superadmin.allowedRoles).toEqual([USER_ROLES.SUPERADMIN]);

      // Validação estrita: QA Studio reservado exclusivamente ao SuperAdmin
      expect(qaPanel.isPublic).toBe(false);
      expect(qaPanel.classification).toBe(ROUTE_CLASSIFICATIONS.SUPERADMIN);
      expect(qaPanel.allowedRoles).toEqual([USER_ROLES.SUPERADMIN]);
    });
  });

  // ========================================================
  // 2. ESTRATÉGIA DEFAULT DENY (NEGAÇÃO POR PADRÃO)
  // ========================================================
  describe("2. Estratégia de Negação por Padrão (Default Deny)", () => {
    it("nega acesso a qualquer rota não explicitamente declarada como pública quando chamada sem token (HTTP 401)", () => {
      // Rotas fantasmas / não cadastradas na matriz
      const unmappedRoutes = [
        "/api/secret-database-dump",
        "/api/v2/unregistered-feature",
        "/api/debug/env-dump",
        "/api/internal/metrics",
      ];

      unmappedRoutes.forEach((unmappedPath) => {
        const result = evaluateAccess({ path: unmappedPath, method: "GET" });
        expect(result.authorized).toBe(false);
        expect(result.status).toBe(401);
        expect(result.code).toBe("AUTH_TOKEN_MISSING");
        expect(result.message).toContain("[DEFAULT DENY]");
      });
    });

    it("nega acesso com HTTP 403 a rotas não mapeadas mesmo com token de client ou employee", () => {
      const clientToken = generateSyntheticJwt({ role: USER_ROLES.CLIENT });
      const employeeToken = generateSyntheticJwt({ role: USER_ROLES.EMPLOYEE });

      const resultClient = evaluateAccess({
        path: "/api/unknown-endpoint",
        token: clientToken,
      });
      expect(resultClient.status).toBe(403);
      expect(resultClient.code).toBe("DEFAULT_DENY_UNMAPPED_ROUTE");

      const resultEmployee = evaluateAccess({
        path: "/api/unknown-endpoint",
        token: employeeToken,
      });
      expect(resultEmployee.status).toBe(403);
      expect(resultEmployee.code).toBe("DEFAULT_DENY_UNMAPPED_ROUTE");
    });

    it("permite acesso irrestrito (HTTP 200) sem token apenas para rotas explicitamente públicas", () => {
      const publicEndpoints = [
        { path: "/api/health", method: "GET" },
        { path: "/api/public/services", method: "GET" },
        { path: "/api/public/barbers", method: "GET" },
        { path: "/api/public/barbershops/vintage-club", method: "GET" },
        { path: "/api/auth/login", method: "POST" },
      ];

      publicEndpoints.forEach(({ path, method }) => {
        const result = evaluateAccess({ path, method });
        expect(result.authorized).toBe(true);
        expect(result.status).toBe(200);
        expect(result.isPublic).toBe(true);
      });
    });
  });

  // ========================================================
  // 3. HTTP 401 (SEM TOKEN / INVÁLIDO) vs HTTP 403 (ROLE INCORRETA)
  // ========================================================
  describe("3. Garantia de HTTP 401 (Sem Token) e HTTP 403 (Papel Incorreto)", () => {
    it("retorna HTTP 401 quando o cabeçalho Authorization ou token está ausente", () => {
      const protectedPaths = [
        "/api/me",
        "/api/client/my-appointments",
        "/api/employee/schedule",
        "/api/admin/financial/overview",
        "/api/superadmin/tenants",
      ];

      protectedPaths.forEach((path) => {
        const result = evaluateAccess({ path });
        expect(result.authorized).toBe(false);
        expect(result.status).toBe(401);
        expect(result.error).toBe("Unauthorized");
        expect(result.code).toBe("AUTH_TOKEN_MISSING");
      });
    });

    it("retorna HTTP 401 quando o token fornecido é malformado ou corrompido", () => {
      const corruptedTokens = [
        "not.a.valid.jwt",
        "invalid-token-string",
        "eyJhbGciOi.corrupted",
        "",
      ];

      corruptedTokens.forEach((badToken) => {
        const result = evaluateAccess({
          path: "/api/admin/barbers",
          token: badToken,
        });
        expect(result.authorized).toBe(false);
        expect(result.status).toBe(401);
        expect(result.error).toBe("Unauthorized");
      });
    });

    it("retorna HTTP 401 quando o token fornecido está expirado (claim exp vencida)", () => {
      // Token gerado com expiração no passado (-3600 segundos)
      const expiredToken = generateSyntheticJwt({
        role: USER_ROLES.ADMIN,
        expiresInSeconds: -3600,
      });

      const result = evaluateAccess({
        path: "/api/admin/barbers",
        token: expiredToken,
      });

      expect(result.authorized).toBe(false);
      expect(result.status).toBe(401);
      expect(result.code).toBe("AUTH_TOKEN_EXPIRED");
      expect(result.message).toContain("Token JWT expirado");
    });

    it("retorna HTTP 403 quando um usuário autenticado tenta acessar recurso sem a role exigida", () => {
      // Cliente comum com token válido tentando acessar extrato financeiro da barbearia
      const clientToken = generateSyntheticJwt({ role: USER_ROLES.CLIENT });
      const result = evaluateAccess({
        path: "/api/admin/financial/overview",
        method: "GET",
        token: clientToken,
      });

      expect(result.authorized).toBe(false);
      expect(result.status).toBe(403);
      expect(result.error).toBe("Forbidden");
      expect(result.code).toBe("INSUFFICIENT_PERMISSIONS");
      expect(result.currentRole).toBe(USER_ROLES.CLIENT);
      expect(result.requiredRoles).toContain(USER_ROLES.ADMIN);
    });
  });

  // ========================================================
  // 4. BLOQUEIO DE 'CLIENT' E 'EMPLOYEE' EM ROTAS 'ADMIN' E 'SUPERADMIN'
  // ========================================================
  describe("4. Validação Rigorosa: Perfis 'client' e 'employee' NÃO acessam rotas 'admin' ou 'superadmin'", () => {
    const adminRoutesToTest = [
      { path: "/api/admin/tenants/settings", method: "PUT" },
      { path: "/api/admin/barbers", method: "GET" },
      { path: "/api/admin/barbers", method: "POST" },
      { path: "/api/admin/services", method: "POST" },
      { path: "/api/admin/financial/overview", method: "GET" },
      { path: "/api/admin/reports", method: "GET" },
    ];

    const superAdminRoutesToTest = [
      { path: "/api/superadmin/tenants", method: "GET" },
      { path: "/api/superadmin/tenants/status", method: "PATCH" },
      { path: "/api/superadmin/plans", method: "POST" },
      { path: "/api/superadmin/metrics", method: "GET" },
      { path: "/api/superadmin/qa-studio", method: "GET" },
    ];

    it("garante que usuário com perfil 'client' é 100% bloqueado com HTTP 403 em TODAS as rotas de 'admin'", () => {
      const clientToken = generateSyntheticJwt({
        role: USER_ROLES.CLIENT,
        userId: "client_joao_silva",
      });

      adminRoutesToTest.forEach(({ path, method }) => {
        const result = evaluateAccess({ path, method, token: clientToken });
        expect(result.authorized).toBe(false);
        expect(result.status).toBe(403);
        expect(result.error).toBe("Forbidden");
        expect(result.currentRole).toBe(USER_ROLES.CLIENT);
        expect(result.requiredRoles).toContain(USER_ROLES.ADMIN);
      });
    });

    it("garante que usuário com perfil 'employee' (barbeiro) é 100% bloqueado com HTTP 403 em rotas exclusivas de 'admin'", () => {
      const employeeToken = generateSyntheticJwt({
        role: USER_ROLES.EMPLOYEE,
        userId: "barber_carlos_ferreira",
      });

      // Rotas reservadas estritamente a administradores (dono/gestor)
      const strictAdminRoutes = [
        { path: "/api/admin/tenants/settings", method: "PUT" },
        { path: "/api/admin/barbers", method: "POST" },
        { path: "/api/admin/financial/overview", method: "GET" },
        { path: "/api/admin/reports", method: "GET" },
      ];

      strictAdminRoutes.forEach(({ path, method }) => {
        const result = evaluateAccess({ path, method, token: employeeToken });
        expect(result.authorized).toBe(false);
        expect(result.status).toBe(403);
        expect(result.error).toBe("Forbidden");
        expect(result.currentRole).toBe(USER_ROLES.EMPLOYEE);
        expect(result.requiredRoles).not.toContain(USER_ROLES.EMPLOYEE);
      });
    });

    it("garante que nem 'client' nem 'employee' nem 'admin' conseguem acessar rotas de 'superadmin'", () => {
      const clientToken = generateSyntheticJwt({ role: USER_ROLES.CLIENT });
      const employeeToken = generateSyntheticJwt({ role: USER_ROLES.EMPLOYEE });
      const adminToken = generateSyntheticJwt({ role: USER_ROLES.ADMIN });

      superAdminRoutesToTest.forEach(({ path, method }) => {
        expect(evaluateAccess({ path, method, token: clientToken }).status).toBe(403);
        expect(evaluateAccess({ path, method, token: employeeToken }).status).toBe(403);
        expect(evaluateAccess({ path, method, token: adminToken }).status).toBe(403);
      });
    });

    it("garante que usuário com perfil 'admin' consegue acessar todas as rotas administrativas com HTTP 200", () => {
      const adminToken = generateSyntheticJwt({
        role: USER_ROLES.ADMIN,
        userId: "admin_dono_barbearia",
      });

      adminRoutesToTest.forEach(({ path, method }) => {
        const result = evaluateAccess({ path, method, token: adminToken });
        expect(result.authorized).toBe(true);
        expect(result.status).toBe(200);
        expect(result.user.role).toBe(USER_ROLES.ADMIN);
      });
    });

    it("garante que usuário com perfil 'superadmin' consegue acessar rotas administrativas e globais com HTTP 200", () => {
      const superAdminToken = generateSyntheticJwt({
        role: USER_ROLES.SUPERADMIN,
        userId: "superadmin_saas_master",
      });

      [...adminRoutesToTest, ...superAdminRoutesToTest].forEach(({ path, method }) => {
        const result = evaluateAccess({ path, method, token: superAdminToken });
        expect(result.authorized).toBe(true);
        expect(result.status).toBe(200);
      });
    });

    it("garante que SOMENTE o SuperAdmin tem acesso ao painel QA Studio (/api/superadmin/qa-studio e tela qa-panel)", () => {
      // 1. Sem token -> HTTP 401
      const noTokenRes = evaluateAccess({ path: "/api/superadmin/qa-studio", method: "GET" });
      expect(noTokenRes.authorized).toBe(false);
      expect(noTokenRes.status).toBe(401);

      // 2. Client -> HTTP 403
      const clientToken = generateSyntheticJwt({ role: USER_ROLES.CLIENT });
      const clientRes = evaluateAccess({ path: "/api/superadmin/qa-studio", method: "GET", token: clientToken });
      expect(clientRes.authorized).toBe(false);
      expect(clientRes.status).toBe(403);
      expect(clientRes.code).toBe("INSUFFICIENT_PERMISSIONS");

      // 3. Employee -> HTTP 403
      const employeeToken = generateSyntheticJwt({ role: USER_ROLES.EMPLOYEE });
      const employeeRes = evaluateAccess({ path: "/api/superadmin/qa-studio", method: "GET", token: employeeToken });
      expect(employeeRes.authorized).toBe(false);
      expect(employeeRes.status).toBe(403);

      // 4. Admin (Dono de barbearia) -> HTTP 403 (Não tem acesso ao QA Studio!)
      const adminToken = generateSyntheticJwt({ role: USER_ROLES.ADMIN });
      const adminRes = evaluateAccess({ path: "/api/superadmin/qa-studio", method: "GET", token: adminToken });
      expect(adminRes.authorized).toBe(false);
      expect(adminRes.status).toBe(403);
      expect(adminRes.requiredRoles).toEqual([USER_ROLES.SUPERADMIN]);

      // 5. SuperAdmin -> HTTP 200 (Acesso concedido exclusivamente)
      const superAdminToken = generateSyntheticJwt({ role: USER_ROLES.SUPERADMIN });
      const superRes = evaluateAccess({ path: "/api/superadmin/qa-studio", method: "GET", token: superAdminToken });
      expect(superRes.authorized).toBe(true);
      expect(superRes.status).toBe(200);

      // 6. Matriz de UI: tela qa-panel mapeada exclusivamente para SuperAdmin
      const qaScreen = findScreenDefinition("qa-panel");
      expect(qaScreen.classification).toBe(ROUTE_CLASSIFICATIONS.SUPERADMIN);
      expect(qaScreen.allowedRoles).toEqual([USER_ROLES.SUPERADMIN]);
      expect(qaScreen.allowedRoles.includes(USER_ROLES.ADMIN)).toBe(false);
    });
  });

  // ========================================================
  // 5. INTEGRAÇÃO DE MIDDLEWARE (EXPRESS / CONNECT COMPATÍVEL)
  // ========================================================
  describe("5. Middleware Express / Connect (req, res, next)", () => {
    it("extrai corretamente o token do cabeçalho Authorization: Bearer", () => {
      const token = generateSyntheticJwt({ role: USER_ROLES.CLIENT });
      const headers = { Authorization: `Bearer ${token}` };
      expect(extractBearerToken(headers)).toBe(token);
    });

    it("chama next() e anexa req.user quando a requisição é válida", () => {
      const adminToken = generateSyntheticJwt({ role: USER_ROLES.ADMIN });
      const req = {
        path: "/api/admin/financial/overview",
        method: "GET",
        headers: { authorization: `Bearer ${adminToken}` },
      };
      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      rbacDefaultDenyMiddleware(req, {}, next);

      expect(nextCalled).toBe(true);
      expect(req.user).toBeDefined();
      expect(req.user.role).toBe(USER_ROLES.ADMIN);
    });

    it("invoca res.status(401).json(...) quando requisição protegida não possui token", () => {
      const req = {
        path: "/api/admin/financial/overview",
        method: "GET",
        headers: {},
      };
      let capturedStatus = null;
      let capturedBody = null;

      const res = {
        status(code) {
          capturedStatus = code;
          return this;
        },
        json(body) {
          capturedBody = body;
          return this;
        },
      };

      rbacDefaultDenyMiddleware(req, res, () => {});

      expect(capturedStatus).toBe(401);
      expect(capturedBody.error).toBe("Unauthorized");
      expect(capturedBody.code).toBe("AUTH_TOKEN_MISSING");
    });

    it("invoca res.status(403).json(...) quando perfil client tenta acessar rota admin", () => {
      const clientToken = generateSyntheticJwt({ role: USER_ROLES.CLIENT });
      const req = {
        path: "/api/admin/barbers",
        method: "POST",
        headers: { authorization: `Bearer ${clientToken}` },
      };
      let capturedStatus = null;
      let capturedBody = null;

      const res = {
        status(code) {
          capturedStatus = code;
          return this;
        },
        json(body) {
          capturedBody = body;
          return this;
        },
      };

      rbacDefaultDenyMiddleware(req, res, () => {});

      expect(capturedStatus).toBe(403);
      expect(capturedBody.error).toBe("Forbidden");
      expect(capturedBody.code).toBe("INSUFFICIENT_PERMISSIONS");
      expect(capturedBody.currentRole).toBe(USER_ROLES.CLIENT);
    });
  });
});
