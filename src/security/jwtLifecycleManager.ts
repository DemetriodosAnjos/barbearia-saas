/**
 * jwtLifecycleManager.ts
 * 
 * Gerenciador Central de Ciclo de Vida do JWT e Revogação Ativa de Sessões.
 * Padrões: RFC 7519, RFC 7009, OWASP ASVS v4.0 V2.1.8, NIST SP 800-63B Section 7.
 * 
 * Políticas Imutáveis de Segurança:
 * 1. TTL Máximo de Access Token: 15 minutos (900 segundos). Tokens com exp - iat > 900 são rejeitados.
 * 2. Invalidação Imediata: Corte temporal por usuário (revoked_at) e blacklist pontual de tokens (jti).
 * 3. Bloqueio Compulsório: Usuários marcados como bloqueados têm acesso imediatamente negado (HTTP 401 USER_BLOCKED).
 */

export const JWT_SECURITY_POLICY = {
  MAX_ACCESS_TOKEN_TTL_SECONDS: 900, // 15 minutos
  REFRESH_TOKEN_TTL_SECONDS: 604800, // 7 dias
  ALLOWED_ALGORITHMS: ["HS256", "RS256", "ES256"],
  CLOCK_TOLERANCE_SECONDS: 5,
};

export const REVOCATION_TRIGGERS = {
  LOGOUT_ALL_DEVICES: "logout_all_devices",
  PASSWORD_CHANGE: "password_change",
  PROFILE_UPDATE_BY_ADMIN: "profile_update_by_admin",
  USER_BLOCKED: "user_blocked",
  ANOMALY_DETECTED: "anomaly_detected",
};

// Registro em memória de carimbos temporais de revogação global por usuário
// Chave: userId -> { revokedAtMs: number, reason: string, triggeredBy: string }
const userRevocationCutoff = new Map<string, { revokedAtMs: number; reason: string; triggeredBy: string }>();

// Registro de usuários bloqueados administrativamente
// Chave: userId -> { blockedAtMs: number, reason: string, adminId: string }
const blockedUsersRegistry = new Map<string, { blockedAtMs: number; reason: string; adminId: string }>();

// Blacklist individual de tokens (jti ou assinatura)
const tokenSignatureBlacklist = new Set<string>();

// Trilha de auditoria imutável de eventos
export interface JwtSecurityAuditEvent {
  id: string;
  eventType: string;
  userId: string;
  reason: string;
  timestamp: number;
  timestampIso: string;
  metadata?: Record<string, unknown>;
}

const auditTrail: JwtSecurityAuditEvent[] = [];

/**
 * Decodifica o payload de um token JWT sem validar a assinatura criptográfica.
 */
export function parseJwtPayload(token: string): {
  sub?: string;
  user_id?: string;
  session_id?: string;
  sid?: string;
  jti?: string;
  iat?: number;
  exp?: number;
  role?: string;
  tenant_id?: string;
  [key: string]: unknown;
} | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.trim().split(".");
  if (parts.length !== 3) return null;

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Valida a conformidade de tempo de vida (TTL) do Access Token (máximo 15 minutos).
 */
export function validateTokenTtl(payload: { iat?: number; exp?: number }): {
  valid: boolean;
  ttlSeconds: number;
  error?: string;
} {
  if (!payload.iat || !payload.exp) {
    return { valid: false, ttlSeconds: 0, error: "Claims 'iat' e 'exp' são obrigatórias no JWT." };
  }

  const ttlSeconds = payload.exp - payload.iat;

  if (ttlSeconds > JWT_SECURITY_POLICY.MAX_ACCESS_TOKEN_TTL_SECONDS) {
    return {
      valid: false,
      ttlSeconds,
      error: `Violação de Política: Tempo de vida do token (${ttlSeconds}s) excede o limite máximo permitido de 15 minutos (900s).`,
    };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp < nowSeconds - JWT_SECURITY_POLICY.CLOCK_TOLERANCE_SECONDS) {
    return { valid: false, ttlSeconds, error: "Token expirado." };
  }

  return { valid: true, ttlSeconds };
}

/**
 * Registra o bloqueio de um usuário no sistema.
 */
export function blockUser(userId: string, reason = "Violação de Termos / Suspeita de Fraude", adminId = "SUPER_ADMIN"): void {
  if (!userId) return;
  const normalized = userId.trim();
  const now = Date.now();

  blockedUsersRegistry.set(normalized, {
    blockedAtMs: now,
    reason,
    adminId,
  });

  // Também revoga todos os tokens emitidos até o momento do bloqueio
  revokeAllUserTokens(normalized, REVOCATION_TRIGGERS.USER_BLOCKED, adminId);

  auditTrail.unshift({
    id: `audit_blk_${now}_${Math.random().toString(36).slice(2, 6)}`,
    eventType: "USER_BLOCKED",
    userId: normalized,
    reason,
    timestamp: now,
    timestampIso: new Date(now).toISOString(),
    metadata: { adminId },
  });
}

/**
 * Desbloqueia um usuário.
 */
export function unblockUser(userId: string, adminId = "SUPER_ADMIN"): void {
  if (!userId) return;
  const normalized = userId.trim();
  blockedUsersRegistry.delete(normalized);

  auditTrail.unshift({
    id: `audit_unblk_${Date.now()}`,
    eventType: "USER_UNBLOCKED",
    userId: normalized,
    reason: "Desbloqueio administrativo",
    timestamp: Date.now(),
    timestampIso: new Date().toISOString(),
    metadata: { adminId },
  });
}

/**
 * Checa se o usuário está marcado como bloqueado.
 */
export function isUserBlocked(userId: string): { blocked: boolean; reason?: string; blockedAtMs?: number } {
  if (!userId) return { blocked: false };
  const entry = blockedUsersRegistry.get(userId.trim());
  if (entry) {
    return { blocked: true, reason: entry.reason, blockedAtMs: entry.blockedAtMs };
  }
  return { blocked: false };
}

/**
 * Revoga todas as sessões e tokens de um usuário a partir do timestamp atual.
 * Usado em: Sair em todos os dispositivos, Troca de senha e Alteração de perfil pelo Admin.
 */
export function revokeAllUserTokens(
  userId: string,
  reason: string = REVOCATION_TRIGGERS.LOGOUT_ALL_DEVICES,
  triggeredBy: string = "USER"
): { success: boolean; revokedAtMs: number; userId: string; reason: string } {
  if (!userId) throw new Error("Identificador de usuário obrigatório para revogação.");
  const normalized = userId.trim();
  const now = Date.now();

  userRevocationCutoff.set(normalized, {
    revokedAtMs: now,
    reason,
    triggeredBy,
  });

  auditTrail.unshift({
    id: `audit_rev_${now}_${Math.random().toString(36).slice(2, 6)}`,
    eventType: "ALL_TOKENS_REVOKED",
    userId: normalized,
    reason,
    timestamp: now,
    timestampIso: new Date(now).toISOString(),
    metadata: { triggeredBy },
  });

  if (auditTrail.length > 200) auditTrail.pop();

  return { success: true, revokedAtMs: now, userId: normalized, reason };
}

/**
 * Adiciona um identificador de token (jti ou assinatura) à blacklist imediata.
 */
export function blacklistTokenIdentifier(tokenIdentifier: string, reason = "Token blacklistado"): void {
  if (!tokenIdentifier) return;
  tokenSignatureBlacklist.add(tokenIdentifier.trim());
}

/**
 * Avalia se um token JWT ou usuário foi revogado antes da expiração natural.
 */
export function evaluateTokenRevocationStatus(token: string): {
  revoked: boolean;
  code?: "TOKEN_REVOKED" | "USER_BLOCKED" | "TOKEN_EXPIRED" | "TOKEN_TTL_EXCEEDED" | "MALFORMED_TOKEN";
  reason?: string;
  userId?: string;
  sessionId?: string;
} {
  const payload = parseJwtPayload(token);
  if (!payload) {
    return { revoked: true, code: "MALFORMED_TOKEN", reason: "Estrutura do JWT inválida ou corrompida." };
  }

  const userId = (payload.sub || payload.user_id) as string;
  const sessionId = (payload.session_id || payload.sid) as string;
  const jti = (payload.jti || token.slice(-24)) as string;

  // 1. Checagem de TTL máximo (15 minutos)
  const ttlCheck = validateTokenTtl(payload);
  if (!ttlCheck.valid) {
    if (ttlCheck.error?.includes("excede")) {
      return { revoked: true, code: "TOKEN_TTL_EXCEEDED", reason: ttlCheck.error, userId, sessionId };
    }
    return { revoked: true, code: "TOKEN_EXPIRED", reason: ttlCheck.error, userId, sessionId };
  }

  // 2. Checagem de usuário bloqueado
  if (userId) {
    const blockCheck = isUserBlocked(userId);
    if (blockCheck.blocked) {
      return {
        revoked: true,
        code: "USER_BLOCKED",
        reason: `Acesso negado: Usuário bloqueado administrativamente (${blockCheck.reason}).`,
        userId,
        sessionId,
      };
    }
  }

  // 3. Checagem de Blacklist pontual de Token
  if (tokenSignatureBlacklist.has(jti) || tokenSignatureBlacklist.has(token.trim())) {
    return {
      revoked: true,
      code: "TOKEN_REVOKED",
      reason: "Token específico consta na lista de revogação de emergência.",
      userId,
      sessionId,
    };
  }

  // 4. Checagem de Carimbo Temporal de Revogação Global por Usuário
  if (userId) {
    const userCutoff = userRevocationCutoff.get(userId.trim());
    if (userCutoff) {
      const iatMs = payload.iat ? payload.iat * 1000 : 0;
      // Se o token foi emitido antes ou durante o evento de revogação (+ 1s de margem de clock)
      if (iatMs <= userCutoff.revokedAtMs + 1000) {
        return {
          revoked: true,
          code: "TOKEN_REVOKED",
          reason: `Sessão encerrada por evento de segurança: ${userCutoff.reason}.`,
          userId,
          sessionId,
        };
      }
    }
  }

  return { revoked: false, userId, sessionId };
}

/**
 * Obtém a lista cronológica de eventos de auditoria.
 */
export function getJwtAuditTrail(): JwtSecurityAuditEvent[] {
  return [...auditTrail];
}

/**
 * Limpeza completa de registros (utilizado exclusivamente em testes unitários).
 */
export function resetJwtLifecycleState(): void {
  userRevocationCutoff.clear();
  blockedUsersRegistry.clear();
  tokenSignatureBlacklist.clear();
  auditTrail.length = 0;
}
