import { describe, it, expect, beforeEach } from "vitest";
import {
  validateTokenTtl,
  blockUser,
  unblockUser,
  revokeAllUserTokens,
  evaluateTokenRevocationStatus,
  resetJwtLifecycleState,
  REVOCATION_TRIGGERS,
} from "../../security/jwtLifecycleManager";
import { executeRevokeTokensViaAdmin } from "../../../scripts/revoke-user-tokens";
import { activeSessionMiddleware } from "../../middleware/activeSessionMiddleware";
import {
  revokeUserTokensAdmin,
  blockUserAndRevokeSessionsAdmin,
} from "../../api/supabaseAdminRevocation";

// Helper para gerar tokens JWT sintéticos com payloads e claims customizadas
function generateCustomJwt({
  userId = "usr_client_001",
  sessionId = "sess_001",
  ttlSeconds = 900, // 15 minutos padrão
  iatOffsetSeconds = 0,
  role = "client",
}) {
  const now = Math.floor(Date.now() / 1000) + iatOffsetSeconds;
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: userId,
      user_id: userId,
      session_id: sessionId,
      sid: sessionId,
      iat: now,
      exp: now + ttlSeconds,
      role,
      tenant_id: "barbearia_central",
    })
  );
  const signature = btoa("synthetic_cryptographic_signature");
  return `${header}.${payload}.${signature}`;
}

describe("Revogação Ativa de Sessão e Ciclo do JWT (SecOps Integration Suite)", () => {
  beforeEach(() => {
    resetJwtLifecycleState();
  });

  describe("1. Política de Tempo de Vida (TTL Máximo de 15 Minutos)", () => {
    it("deve APROVAR tokens emitidos com TTL igual ou inferior a 15 minutos (900s)", () => {
      const now = Math.floor(Date.now() / 1000);
      const compliantPayload = { iat: now, exp: now + 900 }; // 15 minutos exatos
      const check = validateTokenTtl(compliantPayload);

      expect(check.valid).toBe(true);
      expect(check.ttlSeconds).toBe(900);
    });

    it("deve REJEITAR tokens com TTL superior a 15 minutos (ex: 1 hora / 3600s) por violação de política", () => {
      const longLivedToken = generateCustomJwt({ ttlSeconds: 3600 });
      const status = evaluateTokenRevocationStatus(longLivedToken);

      expect(status.revoked).toBe(true);
      expect(status.code).toBe("TOKEN_TTL_EXCEEDED");
      expect(status.reason).toContain("excede o limite máximo permitido de 15 minutos");
    });
  });

  describe("2. Bloqueio Administrativo de Usuário (user_blocked)", () => {
    it("deve REJEITAR imediatamente requisições de um usuário após bloqueio de conta", () => {
      const targetUserId = "usr_fraud_hacker_77";
      const validToken = generateCustomJwt({ userId: targetUserId, ttlSeconds: 600 });

      // Antes do bloqueio: Token válido
      const beforeBlock = evaluateTokenRevocationStatus(validToken);
      expect(beforeBlock.revoked).toBe(false);

      // Ação SecOps: Bloqueio compulsório
      blockUser(targetUserId, "Fraude financeira detectada", "ADMIN_SECURITY_OPS");

      // Após o bloqueio: Token imediatamente revogado com status USER_BLOCKED
      const afterBlock = evaluateTokenRevocationStatus(validToken);
      expect(afterBlock.revoked).toBe(true);
      expect(afterBlock.code).toBe("USER_BLOCKED");
      expect(afterBlock.reason).toContain("Usuário bloqueado");
    });

    it("deve restabelecer acesso caso o usuário seja desbloqueado e receba novo token", () => {
      const targetUserId = "usr_temporarily_held";
      blockUser(targetUserId, "Investigação temporária", "ADMIN_1");
      expect(evaluateTokenRevocationStatus(generateCustomJwt({ userId: targetUserId })).revoked).toBe(true);

      unblockUser(targetUserId, "ADMIN_1");

      // Novo token emitido após desbloqueio
      const freshToken = generateCustomJwt({ userId: targetUserId, iatOffsetSeconds: 2 });
      expect(evaluateTokenRevocationStatus(freshToken).revoked).toBe(false);
    });
  });

  describe("3. Invalidação Imediata: Sair em Todos os Dispositivos & Troca de Senha", () => {
    it("deve invalidar tokens emitidos previamente ao acionar 'Sair em todos os dispositivos'", () => {
      const userId = "usr_barber_multi_device";
      const device1Token = generateCustomJwt({ userId, sessionId: "sess_celular", ttlSeconds: 800 });

      expect(evaluateTokenRevocationStatus(device1Token).revoked).toBe(false);

      // Usuário clica em 'Sair em todos os dispositivos'
      revokeAllUserTokens(userId, REVOCATION_TRIGGERS.LOGOUT_ALL_DEVICES, "USER_SELF");

      // O token prévio é imediatamente recusado
      const afterLogout = evaluateTokenRevocationStatus(device1Token);
      expect(afterLogout.revoked).toBe(true);
      expect(afterLogout.code).toBe("TOKEN_REVOKED");
      expect(afterLogout.reason).toContain(REVOCATION_TRIGGERS.LOGOUT_ALL_DEVICES);
    });

    it("deve rejeitar tokens emitidos antes da troca de senha", () => {
      const userId = "usr_password_reset_target";
      const oldToken = generateCustomJwt({ userId, ttlSeconds: 700 });

      // Troca de senha efetuada
      revokeAllUserTokens(userId, REVOCATION_TRIGGERS.PASSWORD_CHANGE, "AUTH_WEBHOOK");

      const checkOld = evaluateTokenRevocationStatus(oldToken);
      expect(checkOld.revoked).toBe(true);
      expect(checkOld.code).toBe("TOKEN_REVOKED");

      // Novo token emitido 2 segundos após a troca de senha é aceito normalmente
      const newToken = generateCustomJwt({ userId, iatOffsetSeconds: 2, ttlSeconds: 900 });
      const checkNew = evaluateTokenRevocationStatus(newToken);
      expect(checkNew.revoked).toBe(false);
    });
  });

  describe("4. Script de Revogação via Supabase Admin API", () => {
    it("deve executar a função de revogação de tokens e atualizar estado de segurança", async () => {
      const userId = "usr_admin_action_test";
      const token = generateCustomJwt({ userId, ttlSeconds: 600 });

      const result = await executeRevokeTokensViaAdmin({
        userId,
        trigger: "profile_update_by_admin",
        adminId: "SECOPS_CHIEF",
        metadata: { ip: "192.168.1.100", reason: "Permissões alteradas" },
      });

      expect(result.success).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.refreshTokensRevoked).toBe(true);

      // Valida que o token foi revogado no gerenciador
      const status = evaluateTokenRevocationStatus(token);
      expect(status.revoked).toBe(true);
      expect(status.code).toBe("TOKEN_REVOKED");
    });

    it("deve executar a API revokeUserTokensAdmin e bloquear usuário e sessões", async () => {
      const targetUserId = "usr_api_revocation_target";
      const token = generateCustomJwt({ userId: targetUserId, ttlSeconds: 400 });

      // 1. Testa revogação via API modular
      const res = await revokeUserTokensAdmin({
        userId: targetUserId,
        trigger: "logout_all_devices",
        reason: "Usuário solicitou encerramento de todas as conexões",
      });
      expect(res.success).toBe(true);
      expect(res.userId).toBe(targetUserId);

      const status1 = evaluateTokenRevocationStatus(token);
      expect(status1.revoked).toBe(true);
      expect(status1.code).toBe("TOKEN_REVOKED");

      // 2. Testa bloqueio administrativo compulsório
      const freshToken = generateCustomJwt({ userId: targetUserId, iatOffsetSeconds: 5, ttlSeconds: 400 });
      const blockRes = await blockUserAndRevokeSessionsAdmin(targetUserId, "Fraude comprovada");
      expect(blockRes.success).toBe(true);

      const status2 = evaluateTokenRevocationStatus(freshToken);
      expect(status2.revoked).toBe(true);
      expect(status2.code).toBe("USER_BLOCKED");
    });
  });

  describe("5. Middleware Express de Checagem Ativa de JWT", () => {
    it("deve responder HTTP 401 com código específico quando token for revogado", async () => {
      const userId = "usr_mw_test";
      const token = generateCustomJwt({ userId, ttlSeconds: 500 });

      // Revoga o usuário
      revokeAllUserTokens(userId, REVOCATION_TRIGGERS.LOGOUT_ALL_DEVICES);

      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      let responseStatus = 0;
      let responseBody = null;

      const res = {
        status: (s) => {
          responseStatus = s;
          return {
            json: (b) => {
              responseBody = b;
            },
          };
        },
      };

      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await activeSessionMiddleware(req, res, next);

      expect(nextCalled).toBe(false);
      expect(responseStatus).toBe(401);
      expect(responseBody?.code).toBe("TOKEN_REVOKED");
      expect(responseBody?.message).toContain("Sessão encerrada");
    });
  });
});
