import { describe, it, expect, beforeEach } from "vitest";
import {
  handleAppointmentResourceRequest,
  resetAppointmentStore,
  getAppointmentStore,
} from "../../api/appointmentsEndpoint";
import { generateSyntheticJwt } from "../../middleware/rbacMiddleware";
import { USER_ROLES } from "../../security/authorizationMatrix";

describe("Task 2.2 - E2E Suite: BOLA / IDOR Cross-Tenant Prevention (Conta A vs Conta B)", () => {
  let tokenContaA;
  let tokenContaB;

  beforeEach(() => {
    // 1. Reset e semeadura do banco de dados com recursos isolados
    resetAppointmentStore([
      {
        id: "apt_alpha_01",
        tenant_id: "barbearia_alpha",
        client_name: "Cliente da Barbearia Alpha",
        price: 50.0,
        status: "confirmed",
      },
      {
        id: "apt_beta_99",
        tenant_id: "barbearia_beta",
        client_name: "Cliente VIP da Barbearia Beta",
        price: 190.0,
        status: "confirmed",
      },
    ]);

    // 2. Token JWT legítimo emitido para o Administrador da Conta A (Barbearia Alpha)
    tokenContaA = generateSyntheticJwt({
      userId: "usr_admin_alpha_01",
      role: USER_ROLES.ADMIN,
      tenantId: "barbearia_alpha",
    });

    // 3. Token JWT legítimo emitido para o Administrador da Conta B (Barbearia Beta)
    tokenContaB = generateSyntheticJwt({
      userId: "usr_admin_beta_01",
      role: USER_ROLES.ADMIN,
      tenantId: "barbearia_beta",
    });
  });

  it("BLOQUEIA EDIÇÃO (HTTP 403): Conta A tenta requisição PUT em recurso pertencente à Conta B", async () => {
    // Simulação da requisição PUT: Conta A tenta adulterar o preço do agendamento apt_beta_99 para R$ 1,00
    const requestPayload = {
      method: "PUT",
      url: "https://api.barbeariasaas.com/api/appointments/apt_beta_99",
      path: "/api/appointments/apt_beta_99",
      params: { id: "apt_beta_99" },
      headers: {
        authorization: `Bearer ${tokenContaA}`,
        "content-type": "application/json",
      },
      body: {
        price: 1.0,
        status: "tampered_by_attacker",
        notes: "Violação BOLA tentada pela Conta A",
      },
    };

    const response = await handleAppointmentResourceRequest(requestPayload);
    const body = await response.json();

    // 1. A resposta do backend DEVE ser estritamente HTTP 403 Forbidden
    expect(response.status).toBe(403);
    expect(body.status).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(body.code).toBe("CROSS_TENANT_ACCESS_DENIED");
    expect(body.message).toContain("VIOLAÇÃO BOLA/IDOR DETECTADA");

    // 2. O recurso pertencente à Conta B no banco de dados deve permanecer intacto
    const store = getAppointmentStore();
    const betaResourceInDb = store.find((apt) => apt.id === "apt_beta_99");
    expect(betaResourceInDb).toBeDefined();
    expect(betaResourceInDb.price).toBe(190.0);
    expect(betaResourceInDb.status).toBe("confirmed");
  });

  it("BLOQUEIA EXCLUSÃO (HTTP 403): Conta A tenta requisição DELETE em recurso pertencente à Conta B", async () => {
    // Simulação da requisição DELETE: Conta A tenta deletar o agendamento apt_beta_99 da Conta B
    const requestPayload = {
      method: "DELETE",
      url: "https://api.barbeariasaas.com/api/appointments/apt_beta_99",
      path: "/api/appointments/apt_beta_99",
      params: { id: "apt_beta_99" },
      headers: {
        authorization: `Bearer ${tokenContaA}`,
      },
    };

    const response = await handleAppointmentResourceRequest(requestPayload);
    const body = await response.json();

    // 1. A resposta do backend DEVE ser estritamente HTTP 403 Forbidden
    expect(response.status).toBe(403);
    expect(body.status).toBe(403);
    expect(body.error).toBe("Forbidden");
    expect(body.code).toBe("CROSS_TENANT_ACCESS_DENIED");
    expect(body.message).toContain("VIOLAÇÃO BOLA/IDOR DETECTADA");

    // 2. O recurso pertencente à Conta B NÃO pode ter sido excluído do banco de dados
    const store = getAppointmentStore();
    const betaResourceInDb = store.find((apt) => apt.id === "apt_beta_99");
    expect(betaResourceInDb).toBeDefined();
    expect(betaResourceInDb.id).toBe("apt_beta_99");
    expect(betaResourceInDb.tenant_id).toBe("barbearia_beta");
  });

  it("PERMITE MUTAÇÃO LEGÍTIMA (HTTP 200) E IGNORA INJEÇÃO DE TENANT_ID NO BODY", async () => {
    // Conta A atualiza seu próprio recurso, tentando enviar tenant_id: 'barbearia_beta' no body
    const requestPayload = {
      method: "PUT",
      url: "https://api.barbeariasaas.com/api/appointments/apt_alpha_01",
      path: "/api/appointments/apt_alpha_01",
      params: { id: "apt_alpha_01" },
      headers: {
        authorization: `Bearer ${tokenContaA}`,
        "content-type": "application/json",
      },
      body: {
        client_name: "Cliente Alpha Atualizado",
        tenant_id: "barbearia_beta", // Tentativa maliciosa de transferir tenant
      },
    };

    const response = await handleAppointmentResourceRequest(requestPayload);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tenantScoping).toBe("ENFORCED_FROM_JWT");

    // O tenant_id original da Conta A permanece inalterado
    const store = getAppointmentStore();
    const alphaResourceInDb = store.find((apt) => apt.id === "apt_alpha_01");
    expect(alphaResourceInDb.client_name).toBe("Cliente Alpha Atualizado");
    expect(alphaResourceInDb.tenant_id).toBe("barbearia_alpha");
  });

  it("PERMITE EXCLUSÃO LEGÍTIMA (HTTP 200) QUANDO SOLICITADA PELO PROPRIETÁRIO DO RECURSO", async () => {
    // Conta B excluindo seu próprio recurso apt_beta_99
    const requestPayload = {
      method: "DELETE",
      url: "https://api.barbeariasaas.com/api/appointments/apt_beta_99",
      path: "/api/appointments/apt_beta_99",
      params: { id: "apt_beta_99" },
      headers: {
        authorization: `Bearer ${tokenContaB}`,
      },
    };

    const response = await handleAppointmentResourceRequest(requestPayload);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deletedResource.id).toBe("apt_beta_99");

    const store = getAppointmentStore();
    const betaResourceInDb = store.find((apt) => apt.id === "apt_beta_99");
    expect(betaResourceInDb).toBeUndefined();
  });
});
