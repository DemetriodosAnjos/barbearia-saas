import { describe, it, expect, beforeEach } from "vitest";
import {
  TenantIsolationEngine,
  createMultiTenantTestDatabase,
  ROUTE_IDENTIFIER_MAP,
} from "../../security/tenantIsolationEngine";
import { generateSyntheticJwt } from "../../middleware/rbacMiddleware";
import { USER_ROLES } from "../../security/authorizationMatrix";

describe("Prompt 02 - Isolamento de Tenants, Prevenção BOLA e Defesa IDOR", () => {
  let engine;
  let tokenTenantAlpha;
  let tokenTenantBeta;
  let tokenSuperAdmin;

  beforeEach(() => {
    // Inicializa banco de dados multi-tenant isolado
    engine = new TenantIsolationEngine(createMultiTenantTestDatabase());

    // Token legítimo do Administrador do Tenant A (Barbearia Alpha)
    tokenTenantAlpha = generateSyntheticJwt({
      userId: "usr_admin_alpha",
      role: USER_ROLES.ADMIN,
      tenantId: "barbearia_alpha",
    });

    // Token legítimo do Administrador do Tenant B (Barbearia Beta Concorrente)
    tokenTenantBeta = generateSyntheticJwt({
      userId: "usr_admin_beta",
      role: USER_ROLES.ADMIN,
      tenantId: "barbearia_beta",
    });

    // Token do Superadministrador da Plataforma SaaS
    tokenSuperAdmin = generateSyntheticJwt({
      userId: "usr_superadmin_master",
      role: USER_ROLES.SUPERADMIN,
      tenantId: "saas_platform_hq",
    });
  });

  // ========================================================
  // 1. MAPEAMENTO DE IDENTIFICADORES E ROTAS (INSTRUÇÃO 1)
  // ========================================================
  describe("Mapeamento de Rotas com Identificadores (tenant_id, user_id, resource_id)", () => {
    it("deve catalogar formalmente rotas de path, query e body suscetíveis a BOLA/IDOR", () => {
      expect(ROUTE_IDENTIFIER_MAP.length).toBeGreaterThanOrEqual(8);

      const pathParamRoutes = ROUTE_IDENTIFIER_MAP.filter((r) => r.location.includes("path"));
      const queryParamRoutes = ROUTE_IDENTIFIER_MAP.filter((r) => r.location.includes("query"));
      const bodyParamRoutes = ROUTE_IDENTIFIER_MAP.filter((r) => r.location.includes("body"));

      expect(pathParamRoutes.length).toBeGreaterThan(0);
      expect(queryParamRoutes.length).toBeGreaterThan(0);
      expect(bodyParamRoutes.length).toBeGreaterThan(0);

      ROUTE_IDENTIFIER_MAP.forEach((item) => {
        expect(item).toHaveProperty("endpoint");
        expect(item).toHaveProperty("parameter");
        expect(item).toHaveProperty("riskCategory");
        expect(item).toHaveProperty("mitigationStrategy");
        expect(item.status).toBe("PROTEGIDO");
      });
    });
  });

  // ========================================================
  // 2. EVIDÊNCIA DE VULNERABILIDADE ANTES DA CORREÇÃO
  // ========================================================
  describe("Evidência Forense: Comportamento Inseguro (Sem Proteção BOLA)", () => {
    it("DEMONSTRAÇÃO DE FALHA: Modo vulnerável permitia ler dados confidenciais do Tenant B usando tenant_id na query", () => {
      const response = engine.dispatch({
        path: "/api/admin/financial/overview",
        method: "GET",
        token: tokenTenantAlpha,
        query: { tenant_id: "barbearia_beta" },
        vulnerabilityMode: true, // Modo inseguro demonstrativo
      });

      expect(response.status).toBe(200);
      expect(response.vulnerable).toBe(true);
      expect(response.data.gross_revenue).toBe(42800.0); // Faturamento de Beta vazado para Alpha!
    });

    it("DEMONSTRAÇÃO DE FALHA: Modo vulnerável permitia excluir agendamento de outro tenant via ID direto (IDOR)", () => {
      const response = engine.dispatch({
        path: "/api/appointments/apt_beta_01",
        method: "DELETE",
        token: tokenTenantAlpha,
        vulnerabilityMode: true,
      });

      expect(response.status).toBe(200);
      expect(response.vulnerable).toBe(true);
      expect(response.data.tenant_id).toBe("barbearia_beta");
    });
  });

  // ========================================================
  // 3. DEFESA IMPLEMENTADA: LEITURA CRUZADA BOLA/IDOR (INSTRUÇÃO 2 E 3)
  // ========================================================
  describe("Defesa BOLA/IDOR: Tentativas de Leitura Cruzada (Tenant A -> Tenant B)", () => {
    it("BLOQUEIA LEITURA (HTTP 403): Tenant A tentando ler agendamento pertencente ao Tenant B (/api/appointments/apt_beta_01)", () => {
      const response = engine.dispatch({
        path: "/api/appointments/apt_beta_01",
        method: "GET",
        token: tokenTenantAlpha,
      });

      expect(response.status).toBe(403);
      expect(response.code).toBe("CROSS_TENANT_ACCESS_DENIED");
      expect(response.message).toContain("VIOLAÇÃO BOLA/IDOR DETECTADA");
      expect(response.data).toBeUndefined();
    });

    it("PERMITE LEITURA LEGÍTIMA (HTTP 200): Tenant A lendo agendamento pertencente a si mesmo (/api/appointments/apt_alpha_01)", () => {
      const response = engine.dispatch({
        path: "/api/appointments/apt_alpha_01",
        method: "GET",
        token: tokenTenantAlpha,
      });

      expect(response.status).toBe(200);
      expect(response.tenant_scoping).toBe("ENFORCED_FROM_JWT");
      expect(response.data.id).toBe("apt_alpha_01");
      expect(response.data.tenant_id).toBe("barbearia_alpha");
    });

    it("IGNORA QUERY DO CLIENTE (INSTRUÇÃO 4): Tenant A requisita faturamento passando ?tenant_id=barbearia_beta, mas recebe estritamente dados de barbearia_alpha", () => {
      const response = engine.dispatch({
        path: "/api/admin/financial/overview",
        method: "GET",
        token: tokenTenantAlpha,
        query: { tenant_id: "barbearia_beta" }, // Injeção maliciosa do cliente
      });

      expect(response.status).toBe(200);
      expect(response.tenant_scoping).toBe("ENFORCED_FROM_JWT");
      expect(response.effectiveTenantId).toBe("barbearia_alpha");
      expect(response.spoofingAttemptSuppressed).toBe(true);

      // Faturamento retornado deve ser estritamente o de Alpha (R$ 15.400), NÃO o de Beta (R$ 42.800)
      expect(response.data.gross_revenue).toBe(15400.0);
      expect(response.data.gross_revenue).not.toBe(42800.0);
    });

    it("PERMITE ACESSO LEGÍTIMO: Tenant B acessando seu próprio agendamento (apt_beta_01)", () => {
      const response = engine.dispatch({
        path: "/api/appointments/apt_beta_01",
        method: "GET",
        token: tokenTenantBeta,
      });

      expect(response.status).toBe(200);
      expect(response.data.id).toBe("apt_beta_01");
      expect(response.data.tenant_id).toBe("barbearia_beta");
    });
  });

  // ========================================================
  // 4. DEFESA IMPLEMENTADA: EDIÇÃO CRUZADA BOLA/IDOR (INSTRUÇÃO 2 E 3)
  // ========================================================
  describe("Defesa BOLA/IDOR: Tentativas de Edição Cruzada (Tenant A -> Tenant B)", () => {
    it("BLOQUEIA EDIÇÃO (HTTP 403): Tenant A tentando alterar preço de agendamento do Tenant B", () => {
      const response = engine.dispatch({
        path: "/api/appointments/apt_beta_01",
        method: "PUT",
        token: tokenTenantAlpha,
        body: { price: 1.0, notes: "Fraude de Preço" },
      });

      expect(response.status).toBe(403);
      expect(response.code).toBe("CROSS_TENANT_MUTATION_DENIED");
      expect(response.message).toContain("VIOLAÇÃO BOLA/IDOR BLOQUEADA");

      // Garante que o preço no banco permanece inalterado
      const targetInDb = engine.db.appointments.find((a) => a.id === "apt_beta_01");
      expect(targetInDb.price).toBe(180.0);
    });

    it("IMPEDE REATRIBUIÇÃO DE TENANT: Ao editar agendamento próprio, tentativa de injetar tenant_id: 'barbearia_beta' no body é descartada", () => {
      const response = engine.dispatch({
        path: "/api/appointments/apt_alpha_01",
        method: "PUT",
        token: tokenTenantAlpha,
        body: {
          client_name: "João Silva Atualizado",
          tenant_id: "barbearia_beta", // Tentativa de transferir o agendamento
        },
      });

      expect(response.status).toBe(200);
      expect(response.data.client_name).toBe("João Silva Atualizado");
      expect(response.data.tenant_id).toBe("barbearia_alpha"); // Continua em Alpha!

      const targetInDb = engine.db.appointments.find((a) => a.id === "apt_alpha_01");
      expect(targetInDb.tenant_id).toBe("barbearia_alpha");
    });

    it("IMPEDE HIJACKING DE CONFIGURAÇÃO: Tenant A tenta mudar a chave Pix do Tenant B passando tenant_id no body de settings", () => {
      const response = engine.dispatch({
        path: "/api/admin/tenants/settings",
        method: "PUT",
        token: tokenTenantAlpha,
        body: {
          tenant_id: "barbearia_beta", // Alvo da vítima
          pix_key: "hacker@alpha.com",
        },
      });

      expect(response.status).toBe(200);
      expect(response.effectiveTenantId).toBe("barbearia_alpha");
      expect(response.spoofingAttemptSuppressed).toBe(true);

      // A alteração foi aplicada na conta de Alpha, e a conta de Beta permaneceu intacta!
      const betaInDb = engine.db.tenants.find((t) => t.id === "barbearia_beta");
      expect(betaInDb.pix_key).toBe("diretoria@beta.com");
      expect(betaInDb.pix_key).not.toBe("hacker@alpha.com");

      const alphaInDb = engine.db.tenants.find((t) => t.id === "barbearia_alpha");
      expect(alphaInDb.pix_key).toBe("hacker@alpha.com");
    });
  });

  // ========================================================
  // 5. DEFESA IMPLEMENTADA: EXCLUSÃO CRUZADA BOLA/IDOR (INSTRUÇÃO 2 E 3)
  // ========================================================
  describe("Defesa BOLA/IDOR: Tentativas de Exclusão Cruzada (Tenant A -> Tenant B)", () => {
    it("BLOQUEIA EXCLUSÃO (HTTP 403): Tenant A tentando deletar agendamento do Tenant B", () => {
      const response = engine.dispatch({
        path: "/api/appointments/apt_beta_01",
        method: "DELETE",
        token: tokenTenantAlpha,
      });

      expect(response.status).toBe(403);
      expect(response.code).toBe("CROSS_TENANT_DELETION_DENIED");
      expect(response.message).toContain("VIOLAÇÃO BOLA/IDOR BLOQUEADA");

      // Registro continua preservado no banco
      const targetInDb = engine.db.appointments.find((a) => a.id === "apt_beta_01");
      expect(targetInDb).toBeDefined();
      expect(targetInDb.id).toBe("apt_beta_01");
    });

    it("PERMITE EXCLUSÃO LEGÍTIMA NO PRÓPRIO TENANT (HTTP 200)", () => {
      const response = engine.dispatch({
        path: "/api/appointments/apt_alpha_02",
        method: "DELETE",
        token: tokenTenantAlpha,
      });

      expect(response.status).toBe(200);
      expect(response.deletedResource.id).toBe("apt_alpha_02");

      const targetInDb = engine.db.appointments.find((a) => a.id === "apt_alpha_02");
      expect(targetInDb).toBeUndefined();
    });
  });

  // ========================================================
  // 6. CASO ESPECIAL: SUPERADMIN (SUPORTE GLOBAL)
  // ========================================================
  describe("Acesso SuperAdmin: Permissão Master com Rastreabilidade", () => {
    it("SuperAdmin pode inspecionar agendamento de qualquer tenant para fins de auditoria e suporte", () => {
      const resAlpha = engine.dispatch({
        path: "/api/appointments/apt_alpha_01",
        method: "GET",
        token: tokenSuperAdmin,
      });
      const resBeta = engine.dispatch({
        path: "/api/appointments/apt_beta_01",
        method: "GET",
        token: tokenSuperAdmin,
      });

      expect(resAlpha.status).toBe(200);
      expect(resBeta.status).toBe(200);
      expect(resAlpha.data.id).toBe("apt_alpha_01");
      expect(resBeta.data.id).toBe("apt_beta_01");
    });
  });
});
