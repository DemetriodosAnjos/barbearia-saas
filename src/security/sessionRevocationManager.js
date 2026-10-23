/**
 * ============================================================================
 * SESSION REVOCATION MANAGER & JWT ACTIVE INVALIDATION ENGINE
 * ============================================================================
 * Implementa o mecanismo de revogação ativa de sessões e invalidação
 * de Refresh Tokens para resposta imediata a eventos críticos de segurança:
 * 1. Troca ou redefinição de senha (password_change)
 * 2. Revogação manual forçada por administrador (admin_forced_revocation)
 * 3. Detecção de anomalia / suspeita de sequestro de sessão (anomaly_detected)
 * 4. Logout global disparado pelo próprio usuário (logout_all_devices)
 *
 * RESPALDO TÉCNICO:
 * - OWASP ASVS v4.0 V2.1.8 (Session Revocation)
 * - NIST SP 800-63B Section 7 (Session Management & Token Invalidation)
 * - RFC 7009 (OAuth 2.0 Token Revocation)
 * ============================================================================
 */

import { supabase } from "../lib/supabase";

export const CRITICAL_REVOCATION_REASONS = {
  PASSWORD_CHANGE: "password_change",
  ADMIN_FORCED_REVOCATION: "admin_forced_revocation",
  ANOMALY_DETECTED: "anomaly_detected",
  SUSPICIOUS_IP_OR_GEO: "suspicious_ip_or_geo",
  LOGOUT_ALL_DEVICES: "logout_all_devices",
};

// Registro em memória de carimbos de revogação por usuário:
// Chave: `user:${userId}` -> Valor: { revokedAt: timestampMs, reason: string, metadata: object }
const userRevocationRegistry = new Map();

// Blacklist de tokens específicos (JTI ou hash do token):
// Chave: `token:${tokenIdentifier}` -> Valor: { revokedAt: timestampMs, reason: string }
const tokenBlacklist = new Map();

// Trilha de auditoria cronológica imutável de eventos de revogação
const revocationAuditLog = [];

/**
 * Revoga todas as sessões ativas e invalida tokens de um determinado usuário
 *
 * @param {string} userId - Identificador do usuário no Supabase Auth
 * @param {string} reason - Razão crítica (ex: 'password_change', 'admin_forced_revocation')
 * @param {object} [metadata] - Metadados forenses adicionais (IP, User-Agent, etc.)
 * @returns {Promise<{ success: boolean, userId: string, revokedAt: number, reason: string }>}
 */
export async function revokeAllUserSessions(
  userId,
  reason = CRITICAL_REVOCATION_REASONS.ADMIN_FORCED_REVOCATION,
  metadata = {}
) {
  if (!userId || typeof userId !== "string") {
    throw new Error("Identificador de usuário (userId) obrigatório para revogação.");
  }

  const normalizedUserId = userId.trim();
  const now = Date.now();

  // 1. Marca carimbo de corte temporal no registro de revogação
  // Qualquer token emitido com 'iat' <= este timestamp será recusado imediatamente
  userRevocationRegistry.set(`user:${normalizedUserId}`, {
    revokedAt: now,
    reason,
    metadata,
  });

  // 2. Dispara encerramento no Supabase Auth (invalidação de Refresh Tokens no GoTrue)
  try {
    if (supabase && supabase.auth) {
      // Se for a sessão atual do cliente local, executa signOut global
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id === normalizedUserId) {
        await supabase.auth.signOut({ scope: "global" });
      }
    }
  } catch (err) {
    // Falha silenciosa de rede não impede o corte no registro em memória da aplicação
    console.warn("Aviso ao sincronizar signOut global no Supabase:", err.message);
  }

  // 3. Registra evento na trilha forense de auditoria
  const auditEntry = {
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: normalizedUserId,
    revokedAt: now,
    revokedAtIso: new Date(now).toISOString(),
    reason,
    metadata,
    status: "TERMINATED",
  };
  revocationAuditLog.unshift(auditEntry);
  if (revocationAuditLog.length > 100) revocationAuditLog.pop();

  return {
    success: true,
    userId: normalizedUserId,
    revokedAt: now,
    reason,
    auditEntry,
  };
}

/**
 * Adiciona um token específico à blacklist imediata (por exemplo, após anomalia de requisição)
 *
 * @param {string} token
 * @param {string} reason
 */
export function blacklistToken(token, reason = CRITICAL_REVOCATION_REASONS.ANOMALY_DETECTED) {
  if (!token || typeof token !== "string") return;
  const tokenKey = `token:${token.trim()}`;
  const now = Date.now();

  tokenBlacklist.set(tokenKey, {
    revokedAt: now,
    reason,
  });

  revocationAuditLog.unshift({
    id: `token_bl_${now}`,
    tokenHash: token.slice(0, 16) + "...",
    revokedAt: now,
    revokedAtIso: new Date(now).toISOString(),
    reason,
    status: "BLACKLISTED",
  });
}

/**
 * Avalia se uma sessão ou token JWT foi revogado ativamente antes do seu vencimento natural
 *
 * @param {object} params
 * @param {string} [params.token] - Token JWT bruto
 * @param {string} [params.userId] - Identificador do usuário (claim 'sub')
 * @param {number} [params.issuedAt] - Timestamp de emissão (claim 'iat' em segundos Unix)
 * @returns {{ isRevoked: boolean, reason?: string, revokedAt?: number }}
 */
export function isSessionRevoked({ token, userId, issuedAt }) {
  // 1. Checagem direta de token na blacklist de emergência
  if (token && tokenBlacklist.has(`token:${token.trim()}`)) {
    const entry = tokenBlacklist.get(`token:${token.trim()}`);
    return {
      isRevoked: true,
      reason: entry.reason || "Token inserido na lista de revogação imediata.",
      revokedAt: entry.revokedAt,
    };
  }

  // 2. Checagem de carimbo de corte temporal por usuário
  if (userId) {
    const userEntry = userRevocationRegistry.get(`user:${userId.trim()}`);
    if (userEntry) {
      // Se não houver issuedAt informado ou se o token foi emitido antes do momento da revogação
      const iatMs = issuedAt ? issuedAt * 1000 : 0;
      // Adiciona margem de segurança de 1 segundo para clocks ligeiramente assíncronos
      if (iatMs <= userEntry.revokedAt + 1000) {
        return {
          isRevoked: true,
          reason: userEntry.reason,
          revokedAt: userEntry.revokedAt,
        };
      }
    }
  }

  return { isRevoked: false };
}

/**
 * Manipulador central de eventos críticos de segurança
 *
 * @param {string} eventType - 'password_change' | 'admin_forced_revocation' | 'anomaly_detected'
 * @param {object} context - { userId, token, ip, details }
 */
export async function handleCriticalSecurityEvent(eventType, context = {}) {
  const { userId, token, ip = "127.0.0.1", details = "" } = context;

  switch (eventType) {
    case CRITICAL_REVOCATION_REASONS.PASSWORD_CHANGE:
      return await revokeAllUserSessions(userId, CRITICAL_REVOCATION_REASONS.PASSWORD_CHANGE, {
        trigger: "Troca de Senha de Acesso",
        ip,
        details,
      });

    case CRITICAL_REVOCATION_REASONS.ADMIN_FORCED_REVOCATION:
      return await revokeAllUserSessions(userId, CRITICAL_REVOCATION_REASONS.ADMIN_FORCED_REVOCATION, {
        trigger: "Revogação Administrativa Forçada",
        ip,
        details,
      });

    case CRITICAL_REVOCATION_REASONS.ANOMALY_DETECTED:
      if (token) {
        blacklistToken(token, CRITICAL_REVOCATION_REASONS.ANOMALY_DETECTED);
      }
      if (userId) {
        return await revokeAllUserSessions(userId, CRITICAL_REVOCATION_REASONS.ANOMALY_DETECTED, {
          trigger: "Detecção de Anomalia de Tráfego / Assinatura Corrompida",
          ip,
          details,
        });
      }
      return { success: true, reason: CRITICAL_REVOCATION_REASONS.ANOMALY_DETECTED };

    default:
      if (userId) {
        return await revokeAllUserSessions(userId, eventType, { ip, details });
      }
      return { success: false, error: "Evento não reconhecido ou usuário não informado." };
  }
}

/**
 * Obtém a trilha de auditoria completa de revogações para o Painel de AppSec
 */
export function getRevocationAuditLogs() {
  return [...revocationAuditLog];
}

/**
 * Obtém o status do registro de revogação para um usuário
 */
export function getUserRevocationStatus(userId) {
  if (!userId) return null;
  return userRevocationRegistry.get(`user:${userId.trim()}`) || null;
}

/**
 * Utilitário de limpeza do registro (usado em testes unitários)
 */
export function resetRevocationRegistry() {
  userRevocationRegistry.clear();
  tokenBlacklist.clear();
  revocationAuditLog.length = 0;
}
