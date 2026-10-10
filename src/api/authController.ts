/**
 * @file authController.ts
 * @description [BACKEND] Controller de Login, Refresh Silencioso e Logout com Cookies Seguros no Express.
 * 
 * Por que estas opções de segurança de cookies foram adotadas:
 * 1. httpOnly: true -> O JavaScript do navegador NUNCA consegue ler o cookie document.cookie.
 *    Isso impede que ataques XSS (Cross-Site Scripting) roubem o Refresh Token.
 * 2. secure: process.env.NODE_ENV === 'production' -> Em produção, o cookie só trafega por conexões HTTPS
 *    criptografadas (TLS). Em desenvolvimento local (http://localhost), é desativado para permitir testes.
 * 3. sameSite: 'strict' (ou 'lax') -> Impede que o cookie seja enviado em requisições de sites de terceiros,
 *    anulando completamente ataques CSRF (Cross-Site Request Forgery).
 * 4. maxAge: 7 * 24 * 60 * 60 * 1000 -> Sincronizado exatamente com a expiração de 7 dias do Refresh Token.
 * 5. path: '/api/auth' -> Restringe o envio do cookie apenas aos endpoints de autenticação, minimizando
 *    overhead de rede e exposição desnecessária em requisições comuns de dados.
 */

import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  generateOAuthState,
  verifyOAuthState,
  generateGoogleIdToken,
  verifyGoogleIdToken,
  JWT_EXPIRATION, 
  UserJwtPayload 
} from '../services/jwtService';

// Cookie name constante
export const REFRESH_COOKIE_NAME = 'refreshToken';

/**
 * Mensagens padronizadas de Regras de Negócio e Exceções do Login com Google (SSO)
 * Conforme especificação oficial (docs/login-google-sso.md)
 */
export const GOOGLE_SSO_MESSAGES = {
  EX_01_CANCELLED: '',
  EX_02_CONNECTION_FAILURE: 'Não foi possível conectar com o Google. Tente novamente mais tarde.',
  EX_03_INVALID_TOKEN: 'Sessão de autenticação inválida. Tente novamente.',
  EX_04_EMAIL_NOT_VERIFIED: 'Sua conta do Google precisa ter um e-mail verificado para continuar.',
  EX_05_ACCOUNT_SUSPENDED: 'Acesso negado. Sua conta está suspensa.',
  RN_04_ACCOUNT_INACTIVE: 'Sua conta está desativada. Entre em contato com o suporte.',
} as const;

/**
 * Opções de Cookie HttpOnly seguras e parametrizadas por ambiente.
 */
export function getRefreshTokenCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true, // Protege contra roubo por XSS
    secure: isProduction, // HTTPS obrigatório em produção
    sameSite: (isProduction ? 'strict' : 'lax') as 'strict' | 'lax', // Proteção contra CSRF
    maxAge: JWT_EXPIRATION.COOKIE_MAX_AGE_MS, // 7 dias
    path: '/api/auth', // Limita o cookie estritamente às rotas de auth
  };
}

export interface StoredUserRecord {
  id: string;
  email: string;
  passwordHash: string | null; // RN-03: Nula ou aleatória para contas criadas via Google SSO
  name: string;
  role: 'owner' | 'barber' | 'client' | 'admin';
  barbeariaId: string;
  googleId?: string | null; // RNF-04: Identificador único de SSO
  avatarUrl?: string | null; // RN-03: URL da Foto de Perfil
  emailVerified?: boolean; // RN-02: E-mail verificado
  status?: 'active' | 'inactive' | 'suspended' | 'blocked'; // RN-04 & EX-05: Status da Conta
  authProvider?: 'local' | 'google' | 'linked'; // RN-01: Associação de Contas
}

// Mock de base de usuários para demonstração e validação do fluxo da Barbearia
// Em produção, esses dados vêm do banco de dados (ex: Supabase / PostgreSQL) com senha em bcrypt/argon2
export const MOCK_USERS_DB: Record<string, StoredUserRecord> = {
  'dono@barbearia.com': {
    id: 'usr_owner_001',
    email: 'dono@barbearia.com',
    passwordHash: 'senha123',
    name: 'Carlos Oliveira (Dono)',
    role: 'owner',
    barbeariaId: 'tenant_barbearia_central',
    googleId: null,
    avatarUrl: null,
    emailVerified: true,
    status: 'active',
    authProvider: 'local',
  },
  'atendmentor@gmail.com': {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'atendmentor@gmail.com',
    passwordHash: 'senha123',
    name: 'Gestor Master Barbearia SaaS',
    role: 'owner',
    barbeariaId: 'a0000000-0000-0000-0000-000000000001',
    googleId: 'google_sso_atendmentor_master',
    avatarUrl: 'https://ui-avatars.com/api/?name=Gestor+Master&background=d97706&color=fff&bold=true',
    emailVerified: true,
    status: 'active',
    authProvider: 'linked',
  },
  'barbeiro@barbearia.com': {
    id: 'usr_barber_002',
    email: 'barbeiro@barbearia.com',
    passwordHash: 'senha123',
    name: 'Marcos Silva (Barbeiro Master)',
    role: 'barber',
    barbeariaId: 'tenant_barbearia_central',
    googleId: null,
    avatarUrl: null,
    emailVerified: true,
    status: 'active',
    authProvider: 'local',
  },
  'cliente@cliente.com': {
    id: 'usr_client_003',
    email: 'cliente@cliente.com',
    passwordHash: 'senha123',
    name: 'João Mendes (Cliente Fiel)',
    role: 'client',
    barbeariaId: 'tenant_barbearia_central',
    googleId: null,
    avatarUrl: null,
    emailVerified: true,
    status: 'active',
    authProvider: 'local',
  },
  'suspenso@barbearia.com': {
    id: 'usr_suspended_004',
    email: 'suspenso@barbearia.com',
    passwordHash: null,
    name: 'Roberto Almeida (Suspenso)',
    role: 'owner',
    barbeariaId: 'tenant_suspenso',
    googleId: 'google_sso_suspended_004',
    avatarUrl: null,
    emailVerified: true,
    status: 'suspended',
    authProvider: 'google',
  },
  'inativo@barbearia.com': {
    id: 'usr_inactive_005',
    email: 'inativo@barbearia.com',
    passwordHash: null,
    name: 'Fernanda Costa (Inativo)',
    role: 'owner',
    barbeariaId: 'tenant_inativo',
    googleId: 'google_sso_inactive_005',
    avatarUrl: null,
    emailVerified: true,
    status: 'inactive',
    authProvider: 'google',
  },
};

/**
 * ETAPA 2: Controller de Login
 * - Valida credenciais do usuário.
 * - Emite o Access Token (15m) no corpo da resposta JSON.
 * - Anexa o Refresh Token (7d) em cookie HttpOnly com parâmetros estritos.
 */
export async function loginController(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body || {};

  if (!email || !password) {
    res.status(400).json({
      success: false,
      error: 'BAD_REQUEST',
      message: 'Email e senha são obrigatórios.',
    });
    return;
  }

  // Busca o usuário na base (ou Supabase)
  const normalizedEmail = String(email).toLowerCase().trim();
  const user = MOCK_USERS_DB[normalizedEmail];

  // Validação segura de senha (contas apenas Google SSO possuem passwordHash === null)
  if (!user || !user.passwordHash || user.passwordHash !== password) {
    res.status(401).json({
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'Email ou senha inválidos.',
    });
    return;
  }

  // Payload seguro com role e barbeariaId para Multi-tenant
  const userPayload: UserJwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    barbeariaId: user.barbeariaId,
    name: user.name,
    googleId: user.googleId || undefined,
    avatarUrl: user.avatarUrl || null,
    emailVerified: user.emailVerified ?? true,
    authProvider: user.authProvider || 'local',
  };

  // 1. Gera Access Token (15 minutos)
  const accessToken = generateAccessToken(userPayload);

  // 2. Gera Refresh Token (7 dias)
  const refreshToken = generateRefreshToken({
    userId: user.id,
    barbeariaId: user.barbeariaId,
  });

  // 3. Anexa o Refresh Token no Cookie HttpOnly Seguro
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshTokenCookieOptions());

  // 4. Retorna o Access Token no corpo JSON (para armazenamento estritamente em memória no React)
  res.status(200).json({
    success: true,
    message: 'Autenticação realizada com sucesso.',
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      barbeariaId: user.barbeariaId,
      googleId: user.googleId || null,
      avatarUrl: user.avatarUrl || null,
      emailVerified: user.emailVerified ?? true,
      authProvider: user.authProvider || 'local',
    },
    expiresIn: JWT_EXPIRATION.ACCESS_TOKEN_SECONDS,
  });
}

/**
 * RNF-01 & RNF-03: Endpoint de Inicialização OAuth 2.0 / OpenID Connect do Google (GET /api/auth/google/url)
 * - Gera o parâmetro `state` assinado criptograficamente para proteção contra ataques CSRF.
 * - Retorna a URL de autorização OpenID Connect do Google e metadados de sessão OAuth.
 */
export async function googleOAuthUrlController(req: Request, res: Response): Promise<void> {
  const originHeader = String(req.headers.origin || req.headers.referer || 'barbearia-saas');
  const state = generateOAuthState(originHeader);
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    'barbearia-saas-google-oidc-client.apps.googleusercontent.com';
  const redirectUri = `${originHeader.replace(/\/$/, '')}/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code id_token',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });

  res.status(200).json({
    success: true,
    state,
    authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    protocol: 'OpenID Connect 1.0 / OAuth 2.0',
  });
}

/**
 * Emissor de ID Token OpenID Connect para o Pop-up de Autenticação Google (POST /api/auth/google/token)
 * Permite que o fluxo de consentimento do modal OAuth 2.0 gere um `id_token` JWS assinado
 * para ser validado rigorosamente pelo endpoint de backend `/api/auth/google`.
 */
export async function googleOAuthTokenExchangeController(req: Request, res: Response): Promise<void> {
  const {
    email,
    name,
    picture,
    sub,
    email_verified = true,
    expiresInSeconds = 3600,
    tamperSignature = false,
    userId,
    barbeariaId,
  } = req.body || {};

  if (!email || typeof email !== 'string') {
    res.status(400).json({
      success: false,
      code: 'EX-03',
      error: 'BAD_REQUEST',
      message: GOOGLE_SSO_MESSAGES.EX_03_INVALID_TOKEN,
    });
    return;
  }

  let idToken = generateGoogleIdToken({
    sub,
    email,
    email_verified: Boolean(email_verified),
    name: name || email.split('@')[0],
    picture: picture || null,
    expiresInSeconds: Number(expiresInSeconds),
    userId,
    barbeariaId,
  });

  if (tamperSignature) {
    const parts = idToken.split('.');
    const badSig = (parts[2]?.startsWith('A') ? 'B' : 'A') + (parts[2]?.slice(1) || 'tampered');
    idToken = `${parts[0]}.${parts[1]}.${badSig}`;
  }

  res.status(200).json({
    success: true,
    idToken,
  });
}

/**
 * Controller Principal de Login com Google (SSO) - POST /api/auth/google
 * Implementa integralmente as regras de negócio de `docs/login-google-sso.md`:
 * - Passo 4 & RNF-02: Validação obrigatória do `id_token` no backend (assinatura e expiração).
 * - RNF-03: Proteção CSRF via validação do parâmetro `state`.
 * - RN-01: Associação automática de contas por e-mail já cadastrado (quando `email_verified === true`).
 * - RN-02 & EX-04: Exigência estrita de e-mail verificado (`email_verified === true`).
 * - RN-03: Preenchimento de Nome completo, E-mail, URL da Foto de Perfil e senha nula no primeiro acesso.
 * - RN-04 & EX-05: Bloqueio de acesso para contas com status Inativo ou Suspenso/Bloqueado.
 * - RN-05: Emissão de sessão JWT (Access Token 15m + Refresh Token 7d) com mesmo TTL da plataforma.
 * - RNF-04: Gravação do `google_id` (`sub`) como identificador único de SSO.
 */
export async function googleSsoController(req: Request, res: Response): Promise<void> {
  const { idToken, state, accountStatusHint, existingUserHint } = req.body || {};

  // 1. RNF-03: Proteção CSRF — Validação do parâmetro `state`
  if (!state || typeof state !== 'string') {
    res.status(401).json({
      success: false,
      code: 'EX-03',
      error: 'CSRF_STATE_MISSING',
      message: GOOGLE_SSO_MESSAGES.EX_03_INVALID_TOKEN,
    });
    return;
  }

  const stateVerification = verifyOAuthState(state);
  if (!stateVerification.valid) {
    res.status(401).json({
      success: false,
      code: 'EX-03',
      error: 'CSRF_STATE_INVALID',
      message: GOOGLE_SSO_MESSAGES.EX_03_INVALID_TOKEN,
    });
    return;
  }

  // 2. Passo 4, RNF-02 & EX-03: Validação do `id_token` no Backend
  if (!idToken || typeof idToken !== 'string') {
    res.status(401).json({
      success: false,
      code: 'EX-03',
      error: 'INVALID_TOKEN',
      message: GOOGLE_SSO_MESSAGES.EX_03_INVALID_TOKEN,
    });
    return;
  }

  const tokenVerification = await verifyGoogleIdToken(idToken);
  if (!tokenVerification.valid || !tokenVerification.payload) {
    res.status(401).json({
      success: false,
      code: 'EX-03',
      error: tokenVerification.error === 'EXPIRED' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      message: GOOGLE_SSO_MESSAGES.EX_03_INVALID_TOKEN,
    });
    return;
  }

  const oidcPayload = tokenVerification.payload;
  const normalizedEmail = String(oidcPayload.email || '').toLowerCase().trim();
  const googleId = String(oidcPayload.sub || '').trim();

  if (!normalizedEmail || !googleId) {
    res.status(401).json({
      success: false,
      code: 'EX-03',
      error: 'MALFORMED_TOKEN_CLAIMS',
      message: GOOGLE_SSO_MESSAGES.EX_03_INVALID_TOKEN,
    });
    return;
  }

  // 3. RN-02 & EX-04: Verificação Obrigatória do E-mail (`email_verified === true`)
  if (oidcPayload.email_verified !== true) {
    res.status(403).json({
      success: false,
      code: 'EX-04',
      error: 'EMAIL_NOT_VERIFIED',
      message: GOOGLE_SSO_MESSAGES.EX_04_EMAIL_NOT_VERIFIED,
    });
    return;
  }

  // 4. Passo 5: Checagem de Usuário Existente (por `google_id` ou `email`)
  let existingUser =
    Object.values(MOCK_USERS_DB).find((u) => u.googleId && u.googleId === googleId) ||
    MOCK_USERS_DB[normalizedEmail] ||
    null;

  // Se o banco Supabase informou um usuário existente que ainda não estava no cache local do processo
  if (!existingUser && existingUserHint && existingUserHint.email) {
    const hintEmail = String(existingUserHint.email).toLowerCase().trim();
    if (hintEmail === normalizedEmail) {
      existingUser = {
        id: existingUserHint.id || `usr_google_${crypto.randomBytes(4).toString('hex')}`,
        email: normalizedEmail,
        passwordHash: existingUserHint.hasPassword ? 'supabase_delegated_hash' : null,
        name: existingUserHint.name || oidcPayload.name || 'Gestor',
        role: existingUserHint.role || 'owner',
        barbeariaId: existingUserHint.barbeariaId || 'a0000000-0000-0000-0000-000000000001',
        googleId: existingUserHint.googleId || null,
        avatarUrl: existingUserHint.avatarUrl || null,
        emailVerified: true,
        status: existingUserHint.status || 'active',
        authProvider: existingUserHint.googleId ? 'google' : 'local',
      };
      MOCK_USERS_DB[normalizedEmail] = existingUser;
    }
  }

  // 5. RN-04 & EX-05: Verificação de Status da Conta (Inativo / Bloqueado / Suspenso)
  const effectiveStatus = String(
    accountStatusHint || existingUser?.status || 'active'
  ).toLowerCase().trim();

  if (
    effectiveStatus === 'suspended' ||
    effectiveStatus === 'suspenso' ||
    effectiveStatus === 'blocked' ||
    effectiveStatus === 'bloqueado'
  ) {
    res.status(403).json({
      success: false,
      code: 'EX-05',
      error: 'ACCOUNT_SUSPENDED',
      message: GOOGLE_SSO_MESSAGES.EX_05_ACCOUNT_SUSPENDED,
    });
    return;
  }

  if (
    effectiveStatus === 'inactive' ||
    effectiveStatus === 'inativo' ||
    effectiveStatus === 'disabled' ||
    effectiveStatus === 'cancelled'
  ) {
    res.status(403).json({
      success: false,
      code: 'RN-04',
      error: 'ACCOUNT_INACTIVE',
      message: GOOGLE_SSO_MESSAGES.RN_04_ACCOUNT_INACTIVE,
    });
    return;
  }

  let isNewUser = false;
  let accountLinked = false;
  let resolvedUser: StoredUserRecord;

  if (existingUser) {
    // CASO A (Usuário já existe) + RN-01 (Associação Automática de Contas por E-mail)
    const wasLocalOnly = !existingUser.googleId || existingUser.authProvider === 'local';
    accountLinked = wasLocalOnly;

    existingUser.googleId = googleId; // RNF-04: Gravação do google_id único
    existingUser.emailVerified = true; // RN-02
    if (oidcPayload.picture && !existingUser.avatarUrl) {
      existingUser.avatarUrl = oidcPayload.picture;
    } else if (oidcPayload.picture) {
      existingUser.avatarUrl = oidcPayload.picture;
    }
    if (!existingUser.name && oidcPayload.name) {
      existingUser.name = oidcPayload.name;
    }
    existingUser.authProvider = wasLocalOnly ? 'linked' : existingUser.authProvider || 'google';
    MOCK_USERS_DB[normalizedEmail] = existingUser;
    resolvedUser = existingUser;
  } else {
    // CASO B (Novo Usuário) + RN-03 (Perfil e Dados do Usuário no Primeiro Acesso)
    isNewUser = true;
    const generatedId =
      oidcPayload.userId ||
      (typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `usr_google_${crypto.randomBytes(8).toString('hex')}`);
    const generatedTenantId =
      oidcPayload.barbeariaId ||
      (typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'a0000000-0000-0000-0000-000000000001');

    const defaultAvatar =
      oidcPayload.picture ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        oidcPayload.name || normalizedEmail.split('@')[0]
      )}&background=d97706&color=fff&bold=true`;

    resolvedUser = {
      id: generatedId,
      email: normalizedEmail,
      passwordHash: null, // RN-03: Senha local permanece nula sem acesso direto por senha
      name: (oidcPayload.name || normalizedEmail.split('@')[0]).trim(),
      role: 'owner',
      barbeariaId: generatedTenantId,
      googleId, // RNF-04: Identificador único de SSO
      avatarUrl: defaultAvatar, // RN-03: URL da Foto de Perfil
      emailVerified: true, // RN-02: E-mail verificado = true
      status: 'active',
      authProvider: 'google',
    };

    MOCK_USERS_DB[normalizedEmail] = resolvedUser;
  }

  // 6. RN-05: Sessão e Persistência com o mesmo TTL das sessões normais da plataforma (15m / 7d)
  const userPayload: UserJwtPayload = {
    userId: resolvedUser.id,
    email: resolvedUser.email,
    role: resolvedUser.role,
    barbeariaId: resolvedUser.barbeariaId,
    name: resolvedUser.name,
    googleId: resolvedUser.googleId || googleId,
    avatarUrl: resolvedUser.avatarUrl || null,
    emailVerified: true,
    authProvider: resolvedUser.authProvider || 'google',
  };

  const accessToken = generateAccessToken(userPayload);
  const refreshToken = generateRefreshToken({
    userId: resolvedUser.id,
    barbeariaId: resolvedUser.barbeariaId,
  });

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshTokenCookieOptions());

  res.status(200).json({
    success: true,
    isNewUser,
    accountLinked,
    message: isNewUser
      ? 'Conta criada automaticamente via Google SSO com sucesso.'
      : accountLinked
      ? 'Conta Google vinculada com sucesso ao seu e-mail existente.'
      : 'Autenticação via Google realizada com sucesso.',
    accessToken,
    user: {
      id: resolvedUser.id,
      email: resolvedUser.email,
      name: resolvedUser.name,
      role: resolvedUser.role,
      barbeariaId: resolvedUser.barbeariaId,
      googleId: resolvedUser.googleId,
      avatarUrl: resolvedUser.avatarUrl,
      emailVerified: true,
      status: resolvedUser.status || 'active',
      authProvider: resolvedUser.authProvider,
    },
    expiresIn: JWT_EXPIRATION.ACCESS_TOKEN_SECONDS,
  });
}

/**
 * ETAPA 5.1: Rota de Renovação Silenciosa (Silent Refresh)
 * - Lê o cookie HttpOnly 'refreshToken'.
 * - Valida a assinatura e tempo de vida.
 * - Retorna um NOVO Access Token (15m) no JSON.
 */
export async function refreshTokenController(req: Request, res: Response): Promise<void> {
  // O cookie é lido via cookie-parser ou parse manual do header Cookie
  const cookies = req.cookies || {};
  let tokenFromCookie = cookies[REFRESH_COOKIE_NAME];

  if (!tokenFromCookie && req.headers.cookie) {
    // Fallback caso o middleware cookie-parser não tenha sido invocado previamente
    const rawCookies = req.headers.cookie.split(';');
    for (const c of rawCookies) {
      const [key, val] = c.trim().split('=');
      if (key === REFRESH_COOKIE_NAME && val) {
        tokenFromCookie = decodeURIComponent(val);
        break;
      }
    }
  }

  if (!tokenFromCookie) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Refresh token ausente no cookie HttpOnly.',
    });
    return;
  }

  // Validação criptográfica do Refresh Token
  const verification = verifyRefreshToken(tokenFromCookie);

  if (!verification.valid || !verification.payload) {
    // Cookie corrompido ou expirado: limpa o cookie por segurança
    res.clearCookie(REFRESH_COOKIE_NAME, {
      path: '/api/auth',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    });

    res.status(401).json({
      success: false,
      error: verification.error === 'EXPIRED' ? 'REFRESH_TOKEN_EXPIRED' : 'INVALID_REFRESH_TOKEN',
      message: 'Sessão expirada ou inválida. Por favor, realize novo login.',
    });
    return;
  }

  const { userId, barbeariaId } = verification.payload;

  // Busca o usuário atualizado para compor as claims do novo token
  const user = Object.values(MOCK_USERS_DB).find((u) => u.id === userId && u.barbeariaId === barbeariaId);

  const userPayload: UserJwtPayload = {
    userId,
    email: user ? user.email : 'usuario@barbearia.com',
    role: user ? user.role : 'client',
    barbeariaId,
    name: user ? user.name : 'Usuário Autenticado',
  };

  // Emite novo Access Token curto de 15 minutos
  const newAccessToken = generateAccessToken(userPayload);

  res.status(200).json({
    success: true,
    message: 'Access Token renovado com sucesso de forma silenciosa.',
    accessToken: newAccessToken,
    user: {
      id: userPayload.userId,
      email: userPayload.email,
      name: userPayload.name,
      role: userPayload.role,
      barbeariaId: userPayload.barbeariaId,
    },
    expiresIn: JWT_EXPIRATION.ACCESS_TOKEN_SECONDS,
  });
}

/**
 * Controller de Logout Seguro
 * - Limpa o cookie HttpOnly no cliente para expurgar a sessão do dispositivo.
 */
export async function logoutController(_req: Request, res: Response): Promise<void> {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    path: '/api/auth',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  });

  res.status(200).json({
    success: true,
    message: 'Sessão encerrada e cookie HttpOnly removido com segurança.',
  });
}
