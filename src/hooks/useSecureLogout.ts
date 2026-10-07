/**
 * src/hooks/useSecureLogout.ts
 *
 * Hook React Centralizado para Logout Seguro, Invalidação de Cache e Higienização de Storage.
 *
 * Garante a orquestração segura entre o ciclo de vida do React,
 * o cliente GoTrue do Supabase, o cache em memória do React Query e o armazenamento local.
 *
 * Atende às diretrizes de:
 * 1. Saída manual intencional (botão "Sair")
 * 2. Saída por expiração de token / corte temporal (RFC 7009 / NIST SP 800-63B)
 * 3. Prevenção de dados do usuário anterior em logins subsequentes no mesmo navegador
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { executeLogout, LogoutAuditResult, LogoutOptions } from "../security/logoutService";
import { supabase } from "../lib/supabase";

export interface UseSecureLogoutOptions {
  onSuccess?: (audit: LogoutAuditResult) => void;
  defaultReason?: string;
  autoListenTokenExpiration?: boolean;
}

export function useSecureLogout(options: UseSecureLogoutOptions = {}) {
  const {
    onSuccess,
    defaultReason = "MANUAL_LOGOUT",
    autoListenTokenExpiration = true,
  } = options;

  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [lastAudit, setLastAudit] = useState<LogoutAuditResult | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const isLoggingOutRef = useRef<boolean>(false);
  const lastAuditRef = useRef<LogoutAuditResult | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Executa o logout seguro com higienização completa
   */
  const logout = useCallback(
    async (overrideOptions: Partial<LogoutOptions> = {}): Promise<LogoutAuditResult> => {
      if (isLoggingOutRef.current) {
        return (
          lastAuditRef.current || {
            success: true,
            timestamp: new Date().toISOString(),
            reason: overrideOptions.reason || defaultReason,
            supabaseSignOutSuccess: true,
            queryClientCleared: true,
            removedLocalStorageKeys: [],
            preservedLocalStorageKeys: [],
            sessionStorageCleared: true,
            memoryResetSuccess: true,
            durationMs: 0,
          }
        );
      }
      isLoggingOutRef.current = true;
      setIsLoggingOut(true);
      try {
        const audit = await executeLogout({
          reason: overrideOptions.reason || defaultReason,
          scope: overrideOptions.scope || "local",
          preservePreferences: overrideOptions.preservePreferences ?? true,
          onPostLogout: overrideOptions.onPostLogout,
        });

        lastAuditRef.current = audit;
        if (isMountedRef.current) {
          setLastAudit(audit);
        }

        if (typeof onSuccess === "function") {
          onSuccess(audit);
        }

        return audit;
      } finally {
        isLoggingOutRef.current = false;
        if (isMountedRef.current) {
          setIsLoggingOut(false);
        }
      }
    },
    [defaultReason, onSuccess]
  );

  /**
   * Monitoramento de expiração de token e eventos de corte de sessão
   */
  useEffect(() => {
    if (!autoListenTokenExpiration) return;

    // 1. Escuta mudanças de estado de autenticação no Supabase
    let authSubscription: { unsubscribe: () => void } | null = null;
    try {
      if (supabase?.auth?.onAuthStateChange) {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (isLoggingOutRef.current) return;
          if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
            // Dispara higienização automática se a sessão caiu
            logout({ reason: "TOKEN_EXPIRED" }).catch(() => {});
          }
        });
        authSubscription = data.subscription;
      }
    } catch (err) {
      console.warn("[SECOPS] Aviso ao registrar listener do Supabase Auth:", err);
    }

    // 2. Escuta eventos disparados por interceptadores de requisição HTTP (ex: 401 TOKEN_EXPIRED)
    const handleSessionExpiredEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ reason?: string }>;
      const reason = customEvent.detail?.reason || "TOKEN_EXPIRED";
      logout({ reason }).catch(() => {});
    };

    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("auth:session-expired", handleSessionExpiredEvent);
      window.addEventListener("security:token-revoked", handleSessionExpiredEvent);
    }

    return () => {
      if (authSubscription && typeof authSubscription.unsubscribe === "function") {
        authSubscription.unsubscribe();
      }
      if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
        window.removeEventListener("auth:session-expired", handleSessionExpiredEvent);
        window.removeEventListener("security:token-revoked", handleSessionExpiredEvent);
      }
    };
  }, [autoListenTokenExpiration, logout]);

  return {
    logout,
    isLoggingOut,
    lastAudit,
  };
}

export default useSecureLogout;
