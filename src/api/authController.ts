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

import type { Request, Response } from 'express';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken,
  JWT_EXPIRATION, 
  UserJwtPayload 
} from '../services/jwtService';

// Cookie name constante
export const REFRESH_COOKIE_NAME = 'refreshToken';

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

// Mock de base de usuários para demonstração e validação do fluxo da Barbearia
// Em produção, esses dados vêm do banco de dados (ex: Supabase / PostgreSQL) com senha em bcrypt/argon2
export const MOCK_USERS_DB: Record<string, {
  id: string;
  email: string;
  passwordHash: string; // Hash simulado
  name: string;
  role: 'owner' | 'barber' | 'client';
  barbeariaId: string;
}> = {
  'dono@barbearia.com': {
    id: 'usr_owner_001',
    email: 'dono@barbearia.com',
    passwordHash: 'senha123',
    name: 'Carlos Oliveira (Dono)',
    role: 'owner',
    barbeariaId: 'tenant_barbearia_central',
  },
  'barbeiro@barbearia.com': {
    id: 'usr_barber_002',
    email: 'barbeiro@barbearia.com',
    passwordHash: 'senha123',
    name: 'Marcos Silva (Barbeiro Master)',
    role: 'barber',
    barbeariaId: 'tenant_barbearia_central',
  },
  'cliente@cliente.com': {
    id: 'usr_client_003',
    email: 'cliente@cliente.com',
    passwordHash: 'senha123',
    name: 'João Mendes (Cliente Fiel)',
    role: 'client',
    barbeariaId: 'tenant_barbearia_central',
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

  // Validação segura de senha
  if (!user || user.passwordHash !== password) {
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
