/**
 * @file jwtService.ts
 * @description [BACKEND] Utilitários de assinatura, validação e gerenciamento de JWT.
 * 
 * Por que esta arquitetura de segurança foi adotada:
 * 1. HMAC-SHA256 (HS256) nativo do Node.js crypto: Elimina dependências externas vulneráveis a supply chain attacks
 *    e garante compatibilidade perfeita com qualquer runtime Node.js/TypeScript.
 * 2. Access Token com expiração de 15 minutos (15m = 900s): Janela mínima de exposição caso o token seja
 *    interceptado em trânsito.
 * 3. Refresh Token com expiração de 7 dias (7d = 604800s): Permite sessões convenientes sem comprometer a segurança,
 *    pois ele nunca é lido pelo JavaScript do cliente e transita exclusivamente via Cookie HttpOnly.
 * 4. Carimbo de Revogação e Tenant ID no Payload: Permite validação de RBAC (dono, barbeiro, cliente) e corte temporal.
 */

import crypto from 'node:crypto';

export interface UserJwtPayload {
  userId: string;
  email: string;
  role: 'owner' | 'barber' | 'client' | 'admin';
  barbeariaId: string;
  name?: string;
}

export interface AccessTokenClaims extends UserJwtPayload {
  tokenType: 'access';
  iat: number;
  exp: number;
}

export interface RefreshTokenClaims {
  userId: string;
  barbeariaId: string;
  tokenType: 'refresh';
  tokenVersion?: number;
  iat: number;
  exp: number;
}

// Configurações de tempo de vida estritamente aderentes aos requisitos
export const JWT_EXPIRATION = {
  ACCESS_TOKEN_SECONDS: 15 * 60, // 15 minutos
  REFRESH_TOKEN_SECONDS: 7 * 24 * 60 * 60, // 7 dias
  COOKIE_MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000, // 7 dias em milissegundos para express res.cookie
};

// Funções auxiliares para Base64URL conforme RFC 7515 (JWS)
function base64UrlEncode(data: string | Buffer): string {
  const base64 = (Buffer.isBuffer(data) ? data : Buffer.from(data)).toString('base64');
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Obtém os segredos de variáveis de ambiente com fallback para desenvolvimento seguro.
 */
function getSecrets() {
  const accessSecret = process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_super_secure_32chars_key';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_super_secure_32chars_key';
  return { accessSecret, refreshSecret };
}

/**
 * Assina criptograficamente um payload no padrão JWS (algoritmo HS256).
 */
function signJwt<T extends object>(payload: T, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest();

  const encodedSignature = base64UrlEncode(signature);
  return `${signatureInput}.${encodedSignature}`;
}

/**
 * Verifica a assinatura e expiração de um JWT usando crypto.timingSafeEqual (anti-timing attack).
 */
export function verifyJwt<T extends { exp: number; iat: number }>(token: string, secret: string): {
  valid: boolean;
  payload?: T;
  error?: 'MALFORMED' | 'INVALID_SIGNATURE' | 'EXPIRED';
} {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'MALFORMED' };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'MALFORMED' };
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Recalcula a assinatura esperada
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest();

  let receivedSignatureBuffer: Buffer;
  try {
    let b64 = encodedSignature.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    receivedSignatureBuffer = Buffer.from(b64, 'base64');
  } catch {
    return { valid: false, error: 'INVALID_SIGNATURE' };
  }

  if (receivedSignatureBuffer.length !== expectedSignature.length) {
    return { valid: false, error: 'INVALID_SIGNATURE' };
  }

  // Comparação em tempo constante para neutralizar Timing Attacks (CWE-208)
  const isValidSignature = crypto.timingSafeEqual(expectedSignature, receivedSignatureBuffer);
  if (!isValidSignature) {
    return { valid: false, error: 'INVALID_SIGNATURE' };
  }

  try {
    const payloadStr = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadStr) as T;

    const nowSeconds = Math.floor(Date.now() / 1000);
    // Verificação estrita de expiração (exp)
    if (payload.exp && payload.exp < nowSeconds) {
      return { valid: false, error: 'EXPIRED' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'MALFORMED' };
  }
}

/**
 * ETAPA 1.1: Assina o Access Token com expiração de 15 minutos (15m).
 * @param user Dados de negócio do usuário (papel/role e barbearia_id para isolamento multi-tenant)
 */
export function generateAccessToken(user: UserJwtPayload): string {
  const { accessSecret } = getSecrets();
  const now = Math.floor(Date.now() / 1000);

  const claims: AccessTokenClaims = {
    ...user,
    tokenType: 'access',
    iat: now,
    exp: now + JWT_EXPIRATION.ACCESS_TOKEN_SECONDS, // 15 minutos
  };

  return signJwt(claims, accessSecret);
}

/**
 * ETAPA 1.2: Assina o Refresh Token com expiração de 7 dias (7d).
 * @param user Identificadores mínimos necessários para renovar o acesso
 * @param tokenVersion Versão do token para invalidação em lote (opcional para revogação instantânea)
 */
export function generateRefreshToken(
  user: { userId: string; barbeariaId: string },
  tokenVersion: number = 1
): string {
  const { refreshSecret } = getSecrets();
  const now = Math.floor(Date.now() / 1000);

  const claims: RefreshTokenClaims = {
    userId: user.userId,
    barbeariaId: user.barbeariaId,
    tokenType: 'refresh',
    tokenVersion,
    iat: now,
    exp: now + JWT_EXPIRATION.REFRESH_TOKEN_SECONDS, // 7 dias
  };

  return signJwt(claims, refreshSecret);
}

/**
 * Valida especificamente um Access Token com o segredo correto.
 */
export function verifyAccessToken(token: string) {
  const { accessSecret } = getSecrets();
  return verifyJwt<AccessTokenClaims>(token, accessSecret);
}

/**
 * Valida especificamente um Refresh Token com o segredo de renovação.
 */
export function verifyRefreshToken(token: string) {
  const { refreshSecret } = getSecrets();
  return verifyJwt<RefreshTokenClaims>(token, refreshSecret);
}
