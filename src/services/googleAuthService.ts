/**
 * src/services/googleAuthService.ts
 *
 * Serviço de Integração Oficial do Google Identity Services (GIS) / Google OAuth 2.0.
 * Abre o modal nativo da API do Google, busca os dados e e-mails reais do usuário autenticado,
 * e aplica as regras de negócio de docs/entrar-com-google.md (RN-01 a RN-05, EX-01 a EX-05).
 */

import { supabase } from "../lib/supabase";
import { safeStorage } from "../utils/safeStorage";

export interface GoogleUserProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string | null;
}

export interface GoogleAuthResult {
  success: boolean;
  user?: any;
  accessToken?: string;
  isNewUser?: boolean;
  accountLinked?: boolean;
  error?: string;
  code?: string;
  cancelled?: boolean;
}

export const GOOGLE_SSO_MESSAGES = {
  EX_01_CANCELLED: "",
  EX_02_CONNECTION_FAILURE: "Não foi possível conectar com o Google. Tente novamente mais tarde.",
  EX_03_INVALID_TOKEN: "Sessão de autenticação inválida. Tente novamente.",
  EX_04_EMAIL_NOT_VERIFIED: "Sua conta do Google precisa ter um e-mail verificado para continuar.",
  EX_05_ACCOUNT_SUSPENDED: "Acesso negado. Sua conta está suspensa.",
  RN_04_ACCOUNT_INACTIVE: "Sua conta está desativada. Entre em contato com o suporte.",
};

declare global {
  interface Window {
    google?: any;
  }
}

/**
 * Carrega a biblioteca oficial Google Identity Services (https://accounts.google.com/gsi/client)
 */
export function loadGoogleGsiScript(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return resolve(false);
    }

    if (window.google?.accounts?.oauth2 || window.google?.accounts?.id) {
      return resolve(true);
    }

    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
}

/**
 * Obtém o Client ID do Google configurado (no .env ou safeStorage)
 */
export function getGoogleClientId(): string {
  const envClientId = (
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GOOGLE_CLIENT_ID) ||
    ""
  ).trim();

  if (envClientId) return envClientId;

  const storedClientId = (safeStorage.getItem("google_client_id") || "").trim();
  if (storedClientId) return storedClientId;

  return "";
}

/**
 * Salva o Google Client ID informado pelo usuário
 */
export function saveGoogleClientId(clientId: string): void {
  if (clientId && clientId.trim()) {
    safeStorage.setItem("google_client_id", clientId.trim());
  }
}

/**
 * Abre o modal oficial do Google (Google Identity Services / OAuth 2.0 Popup)
 * e retorna os dados reais do perfil (e-mail real, nome, foto, verificação).
 */
export async function requestGoogleAccountProfile(clientId?: string): Promise<GoogleUserProfile> {
  await loadGoogleGsiScript();

  const resolvedClientId = (clientId || getGoogleClientId()).trim();

  if (!resolvedClientId) {
    throw new Error("MISSING_CLIENT_ID");
  }

  if (!window.google?.accounts?.oauth2) {
    throw new Error("GOOGLE_GSI_NOT_LOADED");
  }

  return new Promise((resolve, reject) => {
    let hasResolved = false;

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: resolvedClientId,
      scope: "openid email profile",
      callback: async (response: any) => {
        if (hasResolved) return;
        hasResolved = true;

        if (response.error) {
          if (
            response.error === "access_denied" ||
            response.error === "popup_closed"
          ) {
            return reject(new Error("CANCELLED"));
          }
          return reject(new Error(response.error_description || response.error));
        }

        if (!response.access_token) {
          return reject(new Error("MISSING_ACCESS_TOKEN"));
        }

        try {
          // Busca informações reais do usuário na API oficial do Google
          const userInfoResponse = await fetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            {
              headers: {
                Authorization: `Bearer ${response.access_token}`,
                Accept: "application/json",
              },
            }
          );

          if (!userInfoResponse.ok) {
            throw new Error("FAILED_USERINFO_FETCH");
          }

          const profileData = await userInfoResponse.json();

          const profile: GoogleUserProfile = {
            sub: String(profileData.sub || ""),
            email: String(profileData.email || "").toLowerCase().trim(),
            email_verified:
              profileData.email_verified === true ||
              profileData.email_verified === "true",
            name: String(
              profileData.name ||
                profileData.given_name ||
                profileData.email ||
                "Usuário Google"
            ),
            given_name: profileData.given_name,
            family_name: profileData.family_name,
            picture: profileData.picture || null,
          };

          resolve(profile);
        } catch (fetchErr) {
          reject(fetchErr);
        }
      },
      error_callback: (err: any) => {
        if (hasResolved) return;
        hasResolved = true;
        if (err?.type === "popup_closed") {
          return reject(new Error("CANCELLED"));
        }
        reject(new Error(err?.message || "GOOGLE_POPUP_ERROR"));
      },
    });

    // Abre o seletor nativo do Google com prompt para escolher a conta real
    tokenClient.requestAccessToken({ prompt: "select_account" });
  });
}

/**
 * Processa as Regras de Negócio oficiais de docs/entrar-com-google.md (RN-01 a RN-05)
 * a partir do perfil real retornado pela API do Google.
 */
export async function authenticateGoogleUser(
  profile: GoogleUserProfile
): Promise<GoogleAuthResult> {
  const normalizedEmail = (profile.email || "").toLowerCase().trim();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return {
      success: false,
      code: "EX-03",
      error: GOOGLE_SSO_MESSAGES.EX_03_INVALID_TOKEN,
    };
  }

  // RN-02 & EX-04: Verificação do E-mail
  if (!profile.email_verified) {
    return {
      success: false,
      code: "EX-04",
      error: GOOGLE_SSO_MESSAGES.EX_04_EMAIL_NOT_VERIFIED,
    };
  }

  try {
    // RN-01: Associação de Contas por E-mail
    // 1. Busca em 'tenants' (owner_email)
    let tenantMatch: any = null;
    try {
      const { data: tenants, error: tErr } = await supabase
        .from("tenants")
        .select("id, name, owner_name, owner_email, status, logo_url")
        .ilike("owner_email", normalizedEmail);

      if (!tErr && tenants && tenants.length > 0) {
        tenantMatch = tenants[0];
      }
    } catch (err) {
      console.warn("Aviso ao buscar tenants para Google SSO:", err);
    }

    // 2. Busca em 'barbers' (email)
    let barberMatch: any = null;
    try {
      const { data: barbers, error: bErr } = await supabase
        .from("barbers")
        .select("id, name, email, status, tenant_id, avatar_url, barbershop_id")
        .ilike("email", normalizedEmail);

      if (!bErr && barbers && barbers.length > 0) {
        barberMatch = barbers[0];
      }
    } catch (err) {
      console.warn("Aviso ao buscar barbers para Google SSO:", err);
    }

    // RN-04 & EX-05: Checagem de Status da Conta
    const matchedRecord = tenantMatch || barberMatch;
    if (matchedRecord) {
      const recordStatus = String(matchedRecord.status || "active").toLowerCase();
      if (recordStatus === "suspended" || recordStatus === "blocked") {
        return {
          success: false,
          code: "EX-05",
          error: GOOGLE_SSO_MESSAGES.EX_05_ACCOUNT_SUSPENDED,
        };
      }
      if (recordStatus === "inactive") {
        return {
          success: false,
          code: "RN-04",
          error: GOOGLE_SSO_MESSAGES.RN_04_ACCOUNT_INACTIVE,
        };
      }
    }

    // Monta o usuário autenticado da sessão
    const isOwner = Boolean(tenantMatch);
    const isBarber = !isOwner && Boolean(barberMatch);
    const isNewUser = !tenantMatch && !barberMatch;

    const resolvedName =
      profile.name ||
      tenantMatch?.owner_name ||
      barberMatch?.name ||
      normalizedEmail.split("@")[0];

    const resolvedAvatar =
      profile.picture ||
      tenantMatch?.logo_url ||
      barberMatch?.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedName)}&background=d97706&color=fff&bold=true`;

    const userId = tenantMatch
      ? tenantMatch.id
      : barberMatch
      ? barberMatch.id
      : `usr_google_${profile.sub || Date.now()}`;

    const barbeariaId = tenantMatch
      ? tenantMatch.id
      : barberMatch
      ? barberMatch.tenant_id || barberMatch.barbershop_id || "a0000000-0000-0000-0000-000000000001"
      : "a0000000-0000-0000-0000-000000000001";

    const authenticatedUser = {
      id: userId,
      email: normalizedEmail,
      name: resolvedName,
      role: isOwner ? "owner" : isBarber ? "barber" : "client",
      barbeariaId,
      barbershop_name: tenantMatch?.name || undefined,
      avatarUrl: resolvedAvatar,
      googleId: profile.sub,
      emailVerified: true,
      status: "active",
      authProvider: isNewUser ? "google" : "linked",
      user_metadata: {
        name: resolvedName,
        role: isOwner ? "admin" : isBarber ? "barber" : "client",
        barbershop_name: tenantMatch?.name || "Barbearia",
        picture: resolvedAvatar,
      },
    };

    // RN-05: Emissão e Persistência de Sessão
    const sessionToken = `g_sso_${btoa(
      JSON.stringify({
        sub: userId,
        email: normalizedEmail,
        role: authenticatedUser.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 900,
      })
    )}`;

    safeStorage.setItem("saas_jwt_access_token", sessionToken);
    safeStorage.setItem("saas_auth_user", JSON.stringify(authenticatedUser));

    return {
      success: true,
      user: authenticatedUser,
      accessToken: sessionToken,
      isNewUser,
      accountLinked: !isNewUser,
    };
  } catch (err: any) {
    console.error("Erro ao autenticar usuário Google:", err);
    return {
      success: false,
      code: "EX-02",
      error: GOOGLE_SSO_MESSAGES.EX_02_CONNECTION_FAILURE,
    };
  }
}
