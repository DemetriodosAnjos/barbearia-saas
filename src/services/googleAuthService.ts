/**
 * src/services/googleAuthService.ts
 *
 * Serviço de Integração Oficial do Google Identity Services (GIS) / Google OAuth 2.0.
 * Abre o modal nativo da API do Google, busca os dados e e-mails reais do usuário autenticado,
 * e aplica as regras de negócio de docs/entrar-com-google.md (RN-01 a RN-05, EX-01 a EX-05).
 */

import { supabase, resolveUnifiedTenantId } from "../lib/supabase";
import { safeStorage } from "../utils/safeStorage";
import { getResolvedApiUrl } from "./api";

export interface GoogleUserProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string | null;
  /** id_token do Google obtido via tokeninfo — usado para estabelecer sessão real no Supabase */
  _idToken?: string;
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

  return "790922179829-fqvl8jdt2l6ok4mn2mfg74hi649kcq89.apps.googleusercontent.com";
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
 *
 * Estratégia híbrida para obtenção do id_token:
 * 1. Usa `accounts.id.initialize` + `prompt()` (One Tap) para capturar o credential
 *    (id_token JWT) de forma silenciosa ANTES do popup principal. Esse id_token é
 *    necessário para `supabase.auth.signInWithIdToken` (sessão real com RLS).
 * 2. Usa `initTokenClient` para obter o access_token e buscar dados de perfil via
 *    userinfo — esse é o popup com seletor de conta que o usuário já conhece.
 *
 * O id_token capturado é armazenado em `profile._idToken` e utilizado em
 * `authenticateGoogleUser` para que produtos e serviços sejam visíveis via RLS.
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

  // Passo 1: Tenta capturar id_token via accounts.id (One Tap / Sign In with Google).
  // Executa silenciosamente — se o usuário já estiver logado no Google, retorna o credential.
  // Se não estiver ou recusar, retorna null e o fluxo continua normalmente com access_token.
  const idTokenFromOneTap = await new Promise<string | null>((resolveIdToken) => {
    if (!window.google?.accounts?.id) {
      return resolveIdToken(null);
    }

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; resolveIdToken(null); }
    }, 8000);

    try {
      window.google.accounts.id.initialize({
        client_id: resolvedClientId,
        callback: (credentialResponse: any) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolveIdToken(credentialResponse?.credential || null);
          }
        },
        auto_select: true,
        cancel_on_tap_outside: false,
      });
      window.google.accounts.id.prompt((notification: any) => {
        const skipped =
          notification.isNotDisplayed?.() ||
          notification.isSkippedMoment?.() ||
          notification.isDismissedMoment?.();
        if (skipped && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolveIdToken(null);
        }
      });
    } catch {
      if (!resolved) { resolved = true; clearTimeout(timeout); resolveIdToken(null); }
    }
  });

  // Passo 2: Usa initTokenClient para obter access_token e buscar dados do perfil.
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

          // Usa o id_token capturado via One Tap no Passo 1 (ou do próprio response se disponível).
          // O initTokenClient pode incluir id_token no response em alguns flows — verificamos ambos.
          const idToken: string | undefined =
            response.id_token || idTokenFromOneTap || undefined;

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
            _idToken: idToken,
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
/**
 * Consulta unificada no banco de dados para verificar se o e-mail já existe
 * em tenants (owner_email), barbers (email) ou profiles (email).
 * Utilizado para validação prévia na Etapa 1 do Onboarding e para Account Linking do Google.
 */
export async function findExistingAccountByEmail(email: string): Promise<{
  exists: boolean;
  tenant: any;
  barber: any;
  profile: any;
  barbershop: any;
}> {
  const normalizedEmail = (email || "").trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { exists: false, tenant: null, barber: null, profile: null, barbershop: null };
  }

  let tenantMatch: any = null;
  let barberMatch: any = null;
  let profileMatch: any = null;
  let barbershopMatch: any = null;

  try {
    // 1. Busca prioritária na tabela 'profiles' por email ou google_id
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, role, barbershop_id, email, avatar_url, google_id, auth_provider")
      .ilike("email", normalizedEmail);

    if (!pErr && profiles && profiles.length > 0) {
      profileMatch = profiles[0];
    }
  } catch (err) {
    console.warn("Aviso ao buscar profiles por e-mail:", err);
  }

  // 2. Se encontrou perfil com barbershop_id ou se for conta oficial do gestor Demetrio dos Anjos
  const isDemetrioAccount =
    normalizedEmail === "fullstackanjos01@gmail.com" ||
    normalizedEmail === "fullstackanjo01@gmail.com" ||
    normalizedEmail === "ddoanjos@gmail.com" ||
    normalizedEmail === "atendmentor@gmail.com";

  const shopIdCandidate =
    profileMatch?.barbershop_id ||
    (isDemetrioAccount ? "db3f8187-8771-4f7c-b2bf-b7486d4eb1b6" : undefined);
  if (shopIdCandidate) {
    try {
      const { data: bShop } = await supabase
        .from("barbershops")
        .select("*")
        .eq("id", shopIdCandidate)
        .maybeSingle();
      if (bShop) barbershopMatch = bShop;
    } catch {}

    try {
      const { data: tShop } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", shopIdCandidate)
        .maybeSingle();
      if (tShop) tenantMatch = tShop;
    } catch {}
  }

  // 3. Busca em 'tenants' por owner_email
  if (!tenantMatch) {
    try {
      const { data: tenants, error: tErr } = await supabase
        .from("tenants")
        .select("id, name, slug, owner_name, owner_email, status, phone, plan, logo_url")
        .ilike("owner_email", normalizedEmail);

      if (!tErr && tenants && tenants.length > 0) {
        tenantMatch = tenants[0];
        if (!barbershopMatch) {
          try {
            const { data: bShop } = await supabase
              .from("barbershops")
              .select("*")
              .eq("id", tenantMatch.id)
              .maybeSingle();
            if (bShop) barbershopMatch = bShop;
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Aviso ao buscar tenants por e-mail:", err);
    }
  }

  // 4. Busca complementar em 'barbershops' se ainda não encontrou
  if (!barbershopMatch) {
    try {
      const { data: bShops } = await supabase
        .from("barbershops")
        .select("*")
        .ilike("name", `%${normalizedEmail.split("@")[0]}%`)
        .limit(1);
      if (bShops && bShops.length > 0) {
        barbershopMatch = bShops[0];
      }
    } catch {}
  }

  // 5. Busca em 'barbers' por email
  try {
    const { data: barbers, error: bErr } = await supabase
      .from("barbers")
      .select("id, name, email, status, barbershop_id")
      .ilike("email", normalizedEmail);

    if (!bErr && barbers && barbers.length > 0) {
      const bItem: any = barbers[0];
      barberMatch = {
        ...bItem,
        avatar_url: bItem.avatar || bItem.avatar_url || null,
      };
      if (!barbershopMatch && bItem.barbershop_id) {
        try {
          const { data: bShop } = await supabase
            .from("barbershops")
            .select("*")
            .eq("id", bItem.barbershop_id)
            .maybeSingle();
          if (bShop) barbershopMatch = bShop;
        } catch {}
      }
    }
  } catch (err) {
    console.warn("Aviso ao buscar barbers por e-mail:", err);
  }

  const exists = Boolean(profileMatch || tenantMatch || barbershopMatch || barberMatch);

  return {
    exists,
    tenant: tenantMatch,
    barber: barberMatch,
    profile: profileMatch,
    barbershop: barbershopMatch,
  };
}

/**
 * Processa as Regras de Negócio oficiais de docs/entrar-com-google.md (RN-01 a RN-05)
 * com Account Linking Inteligente (Opção 2 - Recomendada).
 *
 * - Cenário 2 (E-mail JÁ existe no banco): Vincula a conta existente sem criar novo UUID
 *   ou tenant duplicado. Usuário entra direto na barbearia existente.
 * - Cenário 3 (E-mail NÃO existe no banco): NÃO insere no banco automaticamente. Retorna
 *   isNewUser = true para que o usuário seja conduzido ao setup limpo de Onboarding.
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
    // =========================================================================
    // SESSÃO REAL NO SUPABASE: Tenta estabelecer sessão nativa com id_token do Google.
    // Sem isso, queries subsequentes rodam como "anon" e a RLS bloqueia products/services.
    // =========================================================================
    if (profile._idToken) {
      try {
        const { error: signInErr } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: profile._idToken,
        });
        if (signInErr) {
          console.warn("[GoogleAuth] signInWithIdToken falhou (continuando sem sessão Supabase):", signInErr.message);
        } else {
          console.info("[GoogleAuth] Sessão Supabase estabelecida via id_token ✓");
        }
      } catch (signInEx) {
        console.warn("[GoogleAuth] signInWithIdToken lançou exceção (continuando):", signInEx);
      }
    }

    // Consulta centralizada de existência da conta no banco
    const accountCheck = await findExistingAccountByEmail(normalizedEmail);
    let tenantMatch = accountCheck.tenant;
    const barberMatch = accountCheck.barber;
    let profileMatch = accountCheck.profile;
    let barbershopMatch = accountCheck.barbershop;

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

    const isNewUser = !tenantMatch && !barberMatch && !profileMatch;

    // =========================================================================
    // CENÁRIO 3 (Opção 2): Usuário Google Novo (e-mail NÃO existe no banco)
    // NÃO cria UUID nem persiste tenant falso no banco de dados!
    // Retorna isNewUser = true para o Onboarding coletar os dados reais da barbearia.
    // =========================================================================
    if (isNewUser) {
      const candidateUser = {
        id: `usr_google_${profile.sub || Date.now()}`,
        email: normalizedEmail,
        name: profile.name || normalizedEmail.split("@")[0],
        given_name: profile.given_name,
        family_name: profile.family_name,
        role: "admin",
        avatarUrl:
          profile.picture ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || "Usuario")}&background=d97706&color=fff&bold=true`,
        googleId: profile.sub,
        emailVerified: true,
        status: "active",
        authProvider: "google",
        isNewUser: true,
        accountLinked: false,
        user_metadata: {
          name: profile.name || normalizedEmail.split("@")[0],
          owner_name: profile.name || normalizedEmail.split("@")[0],
          owner_email: normalizedEmail,
          picture: profile.picture,
          role: "admin",
        },
      };

      return {
        success: true,
        user: candidateUser,
        isNewUser: true,
        accountLinked: false,
      };
    }

    // =========================================================================
    // CENÁRIO 2 (Opção 2): E-mail JÁ existe no banco (Account Linking Inteligente)
    // Vincula a credencial do Google ao tenant/profile já existente.
    // Zero duplicidade de UUID ou registros em 'tenants' e 'barbershops'.
    // =========================================================================
    const isOwner = Boolean(tenantMatch);

    const resolvedName =
      profileMatch?.full_name ||
      tenantMatch?.owner_name ||
      profile.name ||
      barberMatch?.name ||
      normalizedEmail.split("@")[0];

    const resolvedAvatar =
      profile.picture ||
      profileMatch?.avatar_url ||
      tenantMatch?.logo_url ||
      barberMatch?.avatar ||
      barberMatch?.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedName)}&background=d97706&color=fff&bold=true`;

    // 1. Identificação precisa do ID da Barbearia através das tabelas do Supabase
    const barbeariaId =
      profileMatch?.barbershop_id ||
      barbershopMatch?.id ||
      tenantMatch?.id ||
      barberMatch?.barbershop_id ||
      resolveUnifiedTenantId(tenantMatch, { email: normalizedEmail });

    // 2. Identificação do UUID oficial do usuário no Supabase
    // profileMatch.id é o UUID oficial com chave estrangeira apontando para auth.users(id)
    const userId =
      profileMatch?.id ||
      tenantMatch?.id ||
      barberMatch?.id ||
      `usr_google_${profile.sub || Date.now()}`;

    // 3. Atualiza vínculo google_id e auth_provider de forma transparente na tabela 'profiles'
    if (profileMatch?.id) {
      try {
        await supabase
          .from("profiles")
          .update({
            google_id: profile.sub,
            auth_provider: "linked",
            email: normalizedEmail,
            avatar_url: profile.picture || profileMatch.avatar_url || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profileMatch.id);
      } catch (profErr) {
        console.warn("Aviso ao atualizar profile com vínculo Google:", profErr);
      }
    }

    // 4. Atualiza tabela 'tenants' se existir registro do proprietário
    if (tenantMatch?.id) {
      try {
        await supabase
          .from("tenants")
          .update({
            google_id: profile.sub,
            auth_provider: "linked",
            updated_at: new Date().toISOString(),
          })
          .eq("id", tenantMatch.id);
      } catch {}
    }

    if (barberMatch?.id) {
      try {
        await supabase
          .from("barbers")
          .update({
            google_id: profile.sub,
            auth_provider: "linked",
          })
          .eq("id", barberMatch.id);
      } catch {}
    }

    const isSuperAdmin =
      normalizedEmail === "atendmentor@gmail.com" ||
      (typeof import.meta !== "undefined" &&
        import.meta.env?.VITE_SUPERADMIN_EMAIL &&
        normalizedEmail === String(import.meta.env.VITE_SUPERADMIN_EMAIL).toLowerCase().trim());

    const resolvedRole = isSuperAdmin ? "superadmin" : (profileMatch?.role || "admin");
    const barbershopName = barbershopMatch?.name || tenantMatch?.name || "Minha Barbearia";

    const authenticatedUser = {
      id: userId, // Supabase Auth UUID sincronizado
      email: normalizedEmail,
      name: resolvedName,
      role: resolvedRole,
      barbeariaId,
      tenant_id: barbeariaId,
      barbershop_id: barbeariaId,
      barbershop_name: barbershopName,
      avatarUrl: resolvedAvatar,
      googleId: profile.sub,
      emailVerified: true,
      status: "active",
      authProvider: "linked",
      accountLinked: true,
      user_metadata: {
        name: resolvedName,
        role: resolvedRole,
        barbershop_name: barbershopName,
        picture: resolvedAvatar,
        tenant_id: barbeariaId,
        barbershop_id: barbeariaId,
      },
    };

    // RN-05: Emissão e Persistência de Sessão Segura
    const sessionToken = `g_sso_${btoa(
      JSON.stringify({
        sub: userId,
        email: normalizedEmail,
        role: authenticatedUser.role,
        barbeariaId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      })
    )}`;

    safeStorage.setItem("saas_jwt_access_token", sessionToken);
    safeStorage.setItem("access_token", sessionToken);
    safeStorage.setItem("saas_auth_user", JSON.stringify(authenticatedUser));
    safeStorage.setItem("saas_active_tenant", JSON.stringify({ id: barbeariaId, name: barbershopName }));
    safeStorage.setItem("saas_active_screen", "barbershop");

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("saas:auth-state-changed", { detail: authenticatedUser })
      );
    }

    return {
      success: true,
      user: authenticatedUser,
      accessToken: sessionToken,
      isNewUser: false,
      accountLinked: true,
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
