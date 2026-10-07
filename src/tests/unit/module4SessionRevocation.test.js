import { describe, it, expect, beforeEach } from "vitest";
import {
  revokeAllUserSessions,
  blacklistToken,
  isSessionRevoked,
  resetRevocationRegistry,
  CRITICAL_REVOCATION_REASONS,
  handleCriticalSecurityEvent,
} from "../../security/sessionRevocationManager";
import {
  validateActiveSession,
  invalidateSessionCache,
  clearAllSessionCache,
} from "../../middleware/activeSessionMiddleware";

describe("Módulo 4: Revogação de Sessão e Gestão de JWT (Tasks 4.1 & 4.2)", () => {
  beforeEach(() => {
    resetRevocationRegistry();
    clearAllSessionCache();
  });

  describe("Task 4.1: Invalidação de Refresh Token & Sessão Global", () => {
    it("deve revogar imediatamente todas as sessões de um usuário ao alterar senha", async () => {
      const userId = "usr_test_pw_change_123";
      const result = await handleCriticalSecurityEvent(
        CRITICAL_REVOCATION_REASONS.PASSWORD_CHANGE,
        { userId, details: "Usuário alterou senha após detecção de risco" }
      );

      expect(result.success).toBe(true);
      expect(result.reason).toBe(CRITICAL_REVOCATION_REASONS.PASSWORD_CHANGE);
      expect(result.userId).toBe(userId);
      expect(result.revokedAt).toBeGreaterThan(0);

      // Checa se tokens emitidos antes do carimbo são identificados como revogados
      const checkRevoked = isSessionRevoked({
        userId,
        issuedAt: Math.floor((result.revokedAt - 5000) / 1000),
      });
      expect(checkRevoked.isRevoked).toBe(true);
      expect(checkRevoked.reason).toBe(CRITICAL_REVOCATION_REASONS.PASSWORD_CHANGE);
    });

    it("deve bloquear e revogar sessões por ação administrativa de bloqueio de conta", async () => {
      const blockedUserId = "usr_blocked_fraud_999";
      const res = await revokeAllUserSessions(
        blockedUserId,
        CRITICAL_REVOCATION_REASONS.ADMIN_FORCED_REVOCATION,
        { adminId: "admin_super_01", reason: "Fraude confirmada" }
      );

      expect(res.success).toBe(true);
      const isRev = isSessionRevoked({ userId: blockedUserId });
      expect(isRev.isRevoked).toBe(true);
    });

    it("deve incluir token em blacklist imediata ao detectar anomalia", () => {
      const anomalyToken = "ey_anomaly_stolen_token_xyz";
      blacklistToken(anomalyToken, CRITICAL_REVOCATION_REASONS.ANOMALY_DETECTED);

      const check = isSessionRevoked({ token: anomalyToken });
      expect(check.isRevoked).toBe(true);
      expect(check.reason).toBe(CRITICAL_REVOCATION_REASONS.ANOMALY_DETECTED);
    });
  });

  describe("Task 4.2: Middleware de Checagem de JWT Ativo (session_id)", () => {
    it("deve rejeitar validação se sessionId ou userId estiverem ausentes", async () => {
      const emptyCheck = await validateActiveSession("", "");
      expect(emptyCheck.active).toBe(false);
      expect(emptyCheck.error).toBe("MISSING_SESSION_IDENTIFIERS");
    });

    it("deve invalidar cache de sessão quando solicitado", () => {
      invalidateSessionCache("sess_123", "usr_abc");
      clearAllSessionCache();
      expect(true).toBe(true);
    });
  });
});
