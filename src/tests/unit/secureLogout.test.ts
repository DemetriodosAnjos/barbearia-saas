/**
 * src/tests/unit/secureLogout.test.ts
 *
 * Suíte de Testes Automatizados de Higienização de Estado, Cache e Storage no Logout.
 * Valida a execução rigorosa de:
 * 1. executeLogout() acionada manualmente ou por expiração de token
 * 2. supabase.auth.signOut()
 * 3. queryClient.clear() (expurgo total do cache do React Query)
 * 4. Limpeza seletiva de localStorage e sessionStorage (anti-data leakage)
 * 5. Prevenção de contaminação cruzada de contas no mesmo navegador
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  executeLogout,
  sanitizeLocalStorage,
  sanitizeSessionStorage,
  purgeInMemoryApplicationState,
  verifyStorageHygiene,
  PRESERVED_PREFERENCES_KEYS,
} from "../../security/logoutService";
import { queryClient } from "../../lib/queryClient";
import { supabase } from "../../lib/supabase";

describe("Front-End Security: Limpeza Global de Estado e Storage no Logout (executeLogout)", () => {
  beforeEach(() => {
    // Limpa mocks e armazena chaves simuladas de teste
    localStorage.clear();
    sessionStorage.clear();
    queryClient.clear();
    vi.clearAllMocks();
  });

  it("1. Deve executar supabase.auth.signOut() durante o logout manual", async () => {
    const signOutSpy = vi.spyOn(supabase.auth, "signOut").mockResolvedValue({ error: null });

    const audit = await executeLogout({ reason: "MANUAL_LOGOUT" });

    expect(signOutSpy).toHaveBeenCalledTimes(1);
    expect(audit.supabaseSignOutSuccess).toBe(true);
    expect(audit.reason).toBe("MANUAL_LOGOUT");
  });

  it("2. Deve invalidar e limpar completamente o cache do React Query via queryClient.clear()", async () => {
    // Popula o cache do React Query com consultas simuladas do usuário anterior
    queryClient.setQueryData(["appointments", "tenant-101"], [
      { id: "apt-1", client: "Cliente VIP Antigo", price: 150 },
    ]);
    queryClient.setQueryData(["user-profile", "user-123"], {
      id: "user-123",
      name: "Barbeiro Chefe",
      role: "admin",
      commissionRate: 0.6,
    });

    expect(queryClient.getQueryData(["appointments", "tenant-101"])).toBeDefined();
    expect(queryClient.getQueryData(["user-profile", "user-123"])).toBeDefined();

    const clearSpy = vi.spyOn(queryClient, "clear");

    const audit = await executeLogout({ reason: "MANUAL_LOGOUT" });

    expect(clearSpy).toHaveBeenCalled();
    expect(audit.queryClientCleared).toBe(true);
    // Assegura que o cache está 100% vazio após logout
    expect(queryClient.getQueryData(["appointments", "tenant-101"])).toBeUndefined();
    expect(queryClient.getQueryData(["user-profile", "user-123"])).toBeUndefined();
  });

  it("3. Deve realizar limpeza seletiva de localStorage (purgar dados sensíveis e preservar preferências neutras)", async () => {
    // Dados sensíveis que DEVEM ser purgados
    localStorage.setItem("sb-barbearia-auth-token", "eyJhbGciOiJIUzI1NiIsIn...");
    localStorage.setItem("user_profile", JSON.stringify({ id: "usr_99", email: "antigo@barbearia.com" }));
    localStorage.setItem("tenant_id", "barbearia-vintage-club");
    localStorage.setItem("comanda_draft_12", JSON.stringify({ total: 200 }));
    localStorage.setItem("active_user_role", "admin");

    // Preferências neutras de UI que DEVEM ser preservadas (Whitelist)
    localStorage.setItem("theme", "dark");
    localStorage.setItem("preferred_locale", "pt-BR");

    const { removedKeys, preservedKeys } = sanitizeLocalStorage(true);

    // Verificações
    expect(removedKeys).toContain("sb-barbearia-auth-token");
    expect(removedKeys).toContain("user_profile");
    expect(removedKeys).toContain("tenant_id");
    expect(removedKeys).toContain("comanda_draft_12");
    expect(removedKeys).toContain("active_user_role");

    expect(preservedKeys).toContain("theme");
    expect(preservedKeys).toContain("preferred_locale");

    // No storage físico
    expect(localStorage.getItem("sb-barbearia-auth-token")).toBeNull();
    expect(localStorage.getItem("user_profile")).toBeNull();
    expect(localStorage.getItem("tenant_id")).toBeNull();

    expect(localStorage.getItem("theme")).toBe("dark");
    expect(localStorage.getItem("preferred_locale")).toBe("pt-BR");
  });

  it("4. Deve limpar 100% do sessionStorage", async () => {
    sessionStorage.setItem("otp_secret_temp", "849201");
    sessionStorage.setItem("current_booking_step", "3");

    expect(sessionStorage.length).toBe(2);

    const success = sanitizeSessionStorage();

    expect(success).toBe(true);
    expect(sessionStorage.length).toBe(0);
    expect(sessionStorage.getItem("otp_secret_temp")).toBeNull();
  });

  it("5. Deve ser acionada corretamente em evento de expiração de token (TOKEN_EXPIRED)", async () => {
    localStorage.setItem("auth_token", "expired_token_123");
    sessionStorage.setItem("navigation_temp", "dashboard");

    const audit = await executeLogout({ reason: "TOKEN_EXPIRED" });

    expect(audit.reason).toBe("TOKEN_EXPIRED");
    expect(audit.success).toBe(true);
    expect(audit.queryClientCleared).toBe(true);
    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(sessionStorage.getItem("navigation_temp")).toBeNull();
  });

  it("6. Deve prevenir que dados do usuário anterior permaneçam na memória ao logar com outra conta no mesmo navegador", async () => {
    // FASE A: Usuário 1 (Dono da Barbearia) está autenticado
    const user1Profile = { id: "user-alpha", name: "Dono Antigo", role: "admin", revenue: 50000 };
    localStorage.setItem("user_profile", JSON.stringify(user1Profile));
    localStorage.setItem("tenant_id", "vintage-barber");
    queryClient.setQueryData(["finance", "vintage-barber"], { monthlyRevenue: 50000 });

    // FASE B: Usuário 1 faz logout seguro
    const logoutAudit = await executeLogout({ reason: "MANUAL_LOGOUT" });
    expect(logoutAudit.success).toBe(true);

    // Validação pós-logout
    const hygieneCheck = verifyStorageHygiene();
    expect(hygieneCheck.isClean).toBe(true);
    expect(hygieneCheck.residualKeysFound).toHaveLength(0);
    expect(queryClient.getQueryData(["finance", "vintage-barber"])).toBeUndefined();

    // FASE C: Novo Usuário 2 (Cliente Comum) faz login no mesmo navegador
    const user2Profile = { id: "user-beta", name: "Cliente Novo", role: "client" };
    localStorage.setItem("user_profile", JSON.stringify(user2Profile));
    queryClient.setQueryData(["client-bookings", "user-beta"], [{ id: "booking-99" }]);

    // Valida que nenhuma informação do Usuário 1 vazou para o contexto do Usuário 2
    expect(queryClient.getQueryData(["finance", "vintage-barber"])).toBeUndefined();
    expect(localStorage.getItem("tenant_id")).toBeNull();
    expect(JSON.parse(localStorage.getItem("user_profile")!)).toEqual(user2Profile);
    expect(JSON.parse(localStorage.getItem("user_profile")!).id).toBe("user-beta");
    expect(JSON.parse(localStorage.getItem("user_profile")!).name).not.toBe("Dono Antigo");
  });

  it("7. Deve tratar com resiliência falhas de rede no Supabase Auth sem interromper a limpeza local", async () => {
    vi.spyOn(supabase.auth, "signOut").mockRejectedValue(new Error("Network failure in signOut"));

    localStorage.setItem("auth_token", "active_jwt");
    const audit = await executeLogout({ reason: "SECURITY_ANOMALY" });

    // Mesmo com erro remoto, a higienização local DEVE ter sido completada com êxito
    expect(audit.success).toBe(true);
    expect(audit.queryClientCleared).toBe(true);
    expect(localStorage.getItem("auth_token")).toBeNull();
  });
});
