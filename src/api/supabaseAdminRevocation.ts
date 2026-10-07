/**
 * src/api/supabaseAdminRevocation.ts
 *
 * Módulo SecOps de Revogação Ativa de Sessões e Invalidação de Refresh Tokens via Supabase Admin API.
 * Padrões: RFC 7009 (OAuth 2.0 Token Revocation), RFC 7519, NIST SP 800-63B, OWASP ASVS v4.0 V2.1.8.
 */

import { createClient } from "@supabase/supabase-js";
import {
  revokeAllUserTokens,
  blockUser,
  unblockUser,
  evaluateTokenRevocationStatus,
  REVOCATION_TRIGGERS,
} from "../security/jwtLifecycleManager";

export interface RevokeAdminOptions {
  userId: string;
  trigger?: "logout_all_devices" | "password_change" | "profile_update_by_admin" | "user_blocked";
  adminId?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  supabaseUrl?: string;
  supabaseServiceKey?: string;
}

export interface RevokeAdminResult {
  success: boolean;
  userId: string;
  trigger: string;
  revokedAt: string;
  refreshTokensRevoked: boolean;
  sessionsDeactivatedCount: number;
  auditEventId: string;
  error?: string;
}

/**
 * Cria ou recupera a instância do cliente Supabase com chave de serviço (Service Role).
 */
export function getSupabaseAdminClient(customUrl?: string, customServiceKey?: string) {
  const url =
    customUrl ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "https://placeholder.supabase.co";

  const serviceKey =
    customServiceKey ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "placeholder_service_key";

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Executa a revogação de tokens de um usuário via Supabase Admin API (GoTrue global signOut)
 * e atualiza o estado de revogação no JWT Lifecycle Manager.
 */
export async function revokeUserTokensAdmin(
  options: RevokeAdminOptions
): Promise<RevokeAdminResult> {
  const {
    userId,
    trigger = REVOCATION_TRIGGERS.LOGOUT_ALL_DEVICES,
    adminId = "SECOPS_ADMIN",
    reason = "Revogação compulsória via Supabase Admin API",
    metadata = {},
  } = options;

  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    throw new Error("Identificador do usuário (userId) obrigatório.");
  }

  const normalizedUserId = userId.trim();
  const nowIso = new Date().toISOString();
  const supabaseAdmin = getSupabaseAdminClient(options.supabaseUrl, options.supabaseServiceKey);

  let refreshTokensRevoked = false;
  let sessionsDeactivatedCount = 0;

  // 1. Invoca a API Admin do GoTrue com signOut global (revoga todos os Refresh Tokens)
  try {
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(
      normalizedUserId,
      "global"
    );
    if (!signOutError) {
      refreshTokensRevoked = true;
    } else {
      console.warn(`[WARN] GoTrue signOut global: ${signOutError.message}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.warn(`[WARN] Falha ao comunicar com GoTrue Admin: ${msg}`);
  }

  // 2. Invalida sessões ativas na tabela relacional 'sessions'
  try {
    const { data: updatedSessions, error: dbError } = await supabaseAdmin
      .from("sessions")
      .update({
        is_active: false,
        revoked_at: nowIso,
        revocation_reason: `${trigger}: ${reason}`,
      })
      .eq("user_id", normalizedUserId)
      .eq("is_active", true)
      .select("id");

    if (!dbError && updatedSessions) {
      sessionsDeactivatedCount = updatedSessions.length;
    }
  } catch {
    // Tabela pode não estar provisionada no ambiente de testes local
  }

  // 3. Atualiza o gerenciador central de ciclo do JWT em memória (corte temporal imediato)
  const auditEventId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  if (trigger === REVOCATION_TRIGGERS.USER_BLOCKED) {
    blockUser(normalizedUserId, reason, adminId);
  } else {
    revokeAllUserTokens(normalizedUserId, trigger, adminId);
  }

  return {
    success: true,
    userId: normalizedUserId,
    trigger,
    revokedAt: nowIso,
    refreshTokensRevoked,
    sessionsDeactivatedCount,
    auditEventId,
  };
}

/**
 * Bloqueia um usuário e encerra todas as sessões ativas imediatamente.
 */
export async function blockUserAndRevokeSessionsAdmin(
  userId: string,
  reason: string,
  adminId = "SECOPS_ADMIN"
): Promise<RevokeAdminResult> {
  return await revokeUserTokensAdmin({
    userId,
    trigger: "user_blocked",
    reason,
    adminId,
  });
}

/**
 * Desbloqueia um usuário no gerenciador de segurança.
 */
export function unblockUserAdmin(userId: string, adminId = "SECOPS_ADMIN") {
  return unblockUser(userId, adminId);
}

/**
 * Verifica se um token específico ou usuário associado está com acesso revogado ou bloqueado.
 */
export function checkTokenRevocationStatus(token: string) {
  return evaluateTokenRevocationStatus(token);
}

export default {
  revokeUserTokensAdmin,
  blockUserAndRevokeSessionsAdmin,
  unblockUserAdmin,
  checkTokenRevocationStatus,
};
