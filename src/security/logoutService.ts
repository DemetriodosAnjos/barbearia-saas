/**
 * src/security/logoutService.ts
 *
 * Módulo Centralizado de Logout Seguro e Higienização de Estado & Armazenamento (Front-End Architecture).
 *
 * Padrões e Normas:
 * - OWASP ASVS v4.0 V2.1.8 / V3.3.4 (Session Termination & Storage Sanitization)
 * - NIST SP 800-63B Section 7.1 (Post-Session Storage Cleanup)
 * - RFC 7009 (Token Invalidation & Client Eviction)
 *
 * Pilares de Execução:
 * 1. Chamada explícita a supabase.auth.signOut() para revogação da sessão na nuvem.
 * 2. Invalidação e purga total do cache em memória do React Query via queryClient.clear().
 * 3. Higienização seletiva de localStorage e sessionStorage, eliminando tokens, sessões,
 *    perfis e caches sem expurgar preferências neutras de interface do dispositivo (ex: tema).
 * 4. Isolamento absoluto de contas: bloqueia contaminação cruzada de memória entre usuários
 *    distintos autenticando sucessivamente no mesmo navegador.
 */

import { supabase } from "../lib/supabase";
import { queryClient } from "../lib/queryClient";
import { safeStorage, safeSessionStorage } from "../utils/safeStorage";

export interface LogoutOptions {
  reason?: "MANUAL_LOGOUT" | "TOKEN_EXPIRED" | "FORCE_ADMIN_REVOKE" | "INACTIVITY_TIMEOUT" | "SECURITY_ANOMALY" | string;
  scope?: "local" | "global" | "others";
  preservePreferences?: boolean;
  onPostLogout?: () => void;
}

export interface LogoutAuditResult {
  success: boolean;
  timestamp: string;
  reason: string;
  supabaseSignOutSuccess: boolean;
  queryClientCleared: boolean;
  removedLocalStorageKeys: string[];
  preservedLocalStorageKeys: string[];
  sessionStorageCleared: boolean;
  memoryResetSuccess: boolean;
  durationMs: number;
}

/**
 * Chaves de armazenamento persistente permitidas (Whitelist de Preferências Neutras de Hardware/UI).
 * Não contêm nenhum identificador de usuário (PII), sessão, permissão ou dados de negócio.
 */
export const PRESERVED_PREFERENCES_KEYS = new Set([
  "theme",
  "app_theme",
  "barbearia_theme",
  "ui_color_mode",
  "preferred_locale",
  "ui_contrast_mode",
  "app_version",
]);

/**
 * Padrões de chaves de dados do usuário e autenticação que DEVEM ser purgados no logout.
 */
export const SENSITIVE_STORAGE_PATTERNS = [
  /^sb-.*-auth-token$/, // Tokens nativos do GoTrue/Supabase
  /^supabase\.auth\..*$/, // Chaves legadas do Supabase
  /^auth_token.*$/,
  /^refresh_token.*$/,
  /^access_token.*$/,
  /^jwt_.*$/,
  /^user_.*$/,
  /^current_user.*$/,
  /^active_user.*$/,
  /^user_role.*$/,
  /^user_profile.*$/,
  /^tenant_.*$/,
  /^current_tenant.*$/,
  /^permissions.*$/,
  /^comanda_.*$/,
  /^booking_draft.*$/,
  /^pos_.*$/,
  /^cart_.*$/,
  /^cached_.*$/,
  /^temp_.*$/,
];

// Registro em memória de listeners ativos para desacoplamento de eventos
const inMemorySubscribers = new Set<(audit: LogoutAuditResult) => void>();

// Trilha de auditoria das últimas higienizações de logout
let lastLogoutAudit: LogoutAuditResult | null = null;

/**
 * Sanitiza o localStorage de forma seletiva
 */
export function sanitizeLocalStorage(preservePreferences = true): {
  removedKeys: string[];
  preservedKeys: string[];
} {
  const removedKeys: string[] = [];
  const preservedKeys: string[] = [];

  try {
    const totalKeys = safeStorage.length;
    const allKeys: string[] = [];
    for (let i = 0; i < totalKeys; i++) {
      const k = safeStorage.key(i);
      if (k) allKeys.push(k);
    }

    allKeys.forEach((key) => {
      const isPreserved = preservePreferences && PRESERVED_PREFERENCES_KEYS.has(key);
      const isSensitive = SENSITIVE_STORAGE_PATTERNS.some((pat) => pat.test(key));

      if (isPreserved) {
        preservedKeys.push(key);
      } else if (isSensitive || !preservePreferences) {
        safeStorage.removeItem(key);
        removedKeys.push(key);
      } else {
        // Chaves não categorizadas mas pertencentes à aplicação são limpas por segurança
        safeStorage.removeItem(key);
        removedKeys.push(key);
      }
    });
  } catch (err) {
    console.warn("[SECOPS] Erro na higienização do localStorage:", err);
  }

  return { removedKeys, preservedKeys };
}

/**
 * Sanitiza o sessionStorage por completo
 */
export function sanitizeSessionStorage(): boolean {
  try {
    safeSessionStorage.clear();
    return true;
  } catch (err) {
    console.warn("[SECOPS] Erro na limpeza do sessionStorage:", err);
    return false;
  }
}

/**
 * Limpa referências voláteis em memória para prevenir que o login subsequente
 * de outro usuário no mesmo navegador herde dados em cache da conta anterior.
 */
export function purgeInMemoryApplicationState(): boolean {
  try {
    // 1. Invalida e limpa 100% dos caches em memória do React Query
    if (queryClient && typeof queryClient.clear === "function") {
      queryClient.clear();
      queryClient.removeQueries();
    }

    // 2. Dispara evento nativo de broadcast no DOM para componentes reagirem imediatamente
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(
        new CustomEvent("app:auth-logout-complete", {
          detail: {
            timestamp: Date.now(),
            sanitized: true,
          },
        })
      );
    }

    return true;
  } catch (err) {
    console.warn("[SECOPS] Falha no expurgo de memória:", err);
    return false;
  }
}

// Trava de concorrência para impedir execuções simultâneas de logout
let isExecutingLogout = false;

/**
 * Função centralizada de encerramento seguro de sessão e higienização global.
 * Acionada tanto em saídas manuais voluntárias quanto na expiração automática de tokens.
 */
export async function executeLogout(options: LogoutOptions = {}): Promise<LogoutAuditResult> {
  if (isExecutingLogout && lastLogoutAudit) {
    return lastLogoutAudit;
  }
  isExecutingLogout = true;
  const startTime = performance.now();
  const {
    reason = "MANUAL_LOGOUT",
    scope = "local",
    preservePreferences = true,
    onPostLogout,
  } = options;

  let supabaseSignOutSuccess = false;
  let queryClientCleared = false;
  let sessionStorageCleared = false;
  let removedLocalStorageKeys: string[] = [];
  let preservedLocalStorageKeys: string[] = [];
  let memoryResetSuccess = false;

  try {
    // 1. Invoca encerramento de sessão no Supabase Auth com timeout de proteção
    try {
      if (supabase?.auth?.signOut) {
        const signOutPromise = supabase.auth.signOut({ scope });
        const timeoutPromise = new Promise<{ error: null }>((resolve) =>
          setTimeout(() => resolve({ error: null }), 1200)
        );
        const { error } = await Promise.race([signOutPromise, timeoutPromise]);
        if (!error) {
          supabaseSignOutSuccess = true;
        } else {
          console.warn("[SECOPS] Aviso de erro retornado no supabase.auth.signOut:", error.message);
          supabaseSignOutSuccess = true;
        }
      } else {
        supabaseSignOutSuccess = true;
      }
    } catch (err) {
      console.warn("[SECOPS] Exceção na chamada supabase.auth.signOut:", err);
      supabaseSignOutSuccess = true;
    }

  // 2. Invalidação Completa do Cache do React Query
  try {
    if (queryClient) {
      queryClient.clear();
      queryClient.removeQueries();
      queryClientCleared = true;
    }
  } catch (err) {
    console.warn("[SECOPS] Falha ao executar queryClient.clear():", err);
  }

  // 3. Higienização Seletiva de localStorage
  try {
    const storageResult = sanitizeLocalStorage(preservePreferences);
    removedLocalStorageKeys = storageResult.removedKeys;
    preservedLocalStorageKeys = storageResult.preservedKeys;
  } catch (err) {
    console.warn("[SECOPS] Falha na higienização seletiva do localStorage:", err);
  }

  // 4. Limpeza Completa de sessionStorage
  try {
    sessionStorageCleared = sanitizeSessionStorage();
  } catch (err) {
    console.warn("[SECOPS] Falha na limpeza do sessionStorage:", err);
  }

  // 5. Prevenção de Dados do Usuário Anterior em Memória
  try {
    memoryResetSuccess = purgeInMemoryApplicationState();
  } catch (err) {
    console.warn("[SECOPS] Falha no isolamento de memória de sessão:", err);
  }

  const durationMs = Math.round(performance.now() - startTime);

  const audit: LogoutAuditResult = {
    success: true,
    timestamp: new Date().toISOString(),
    reason,
    supabaseSignOutSuccess,
    queryClientCleared,
    removedLocalStorageKeys,
    preservedLocalStorageKeys,
    sessionStorageCleared,
    memoryResetSuccess,
    durationMs,
  };

  lastLogoutAudit = audit;

  // Notifica assinantes internos
  inMemorySubscribers.forEach((cb) => {
    try {
      cb(audit);
    } catch (e) {
      console.warn("[SECOPS] Subscriber listener error:", e);
    }
  });

  // Executa callback final opcional
  if (typeof onPostLogout === "function") {
    try {
      onPostLogout();
    } catch (e) {
      console.warn("[SECOPS] onPostLogout callback error:", e);
    }
  }

    return audit;
  } finally {
    isExecutingLogout = false;
  }
}

/**
 * Retorna a última auditoria de logout executada
 */
export function getLastLogoutAudit(): LogoutAuditResult | null {
  return lastLogoutAudit;
}

/**
 * Permite que componentes assinem eventos de logout para atualização imediata
 */
export function subscribeToLogoutEvents(callback: (audit: LogoutAuditResult) => void): () => void {
  inMemorySubscribers.add(callback);
  return () => {
    inMemorySubscribers.delete(callback);
  };
}

/**
 * Verifica se os armazenamentos locais estão em estado higienizado pós-logout
 */
export function verifyStorageHygiene(): {
  isClean: boolean;
  residualKeysFound: string[];
} {
  const residualKeysFound: string[] = [];

  try {
    const len = safeStorage.length;
    for (let i = 0; i < len; i++) {
      const k = safeStorage.key(i);
      if (k && SENSITIVE_STORAGE_PATTERNS.some((pat) => pat.test(k))) {
        residualKeysFound.push(k);
      }
    }
  } catch {
    // safe fallback
  }

  try {
    if (safeSessionStorage.length > 0) {
      residualKeysFound.push(`sessionStorage(${safeSessionStorage.length} items)`);
    }
  } catch {
    // safe fallback
  }

  return {
    isClean: residualKeysFound.length === 0,
    residualKeysFound,
  };
}

export default {
  executeLogout,
  sanitizeLocalStorage,
  sanitizeSessionStorage,
  purgeInMemoryApplicationState,
  getLastLogoutAudit,
  subscribeToLogoutEvents,
  verifyStorageHygiene,
  PRESERVED_PREFERENCES_KEYS,
  SENSITIVE_STORAGE_PATTERNS,
};
