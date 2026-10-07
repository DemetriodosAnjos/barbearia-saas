import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import { evaluateTokenRevocationStatus } from "../security/jwtLifecycleManager";

interface AuthenticatedSession {
  id: string;
  user_id: string;
  is_active: boolean;
  expires_at: string;
  cached_at: number;
}

interface DecodedTokenPayload {
  session_id?: string;
  sid?: string;
  sub?: string;
  user_id?: string;
  exp?: number;
  iat?: number;
}

export interface SessionRequest extends Request {
  sessionId?: string;
  user?: {
    id: string;
    sessionId: string;
    [key: string]: unknown;
  };
}

const CACHE_TTL_MS = 15_000;
const sessionCache = new Map<string, AuthenticatedSession>();

const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder_service_key";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function decodeJwtPayload(token: string): DecodedTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
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

export async function validateActiveSession(
  sessionId: string,
  userId: string
): Promise<{ active: boolean; error?: string }> {
  if (!sessionId || !userId) {
    return { active: false, error: "MISSING_SESSION_IDENTIFIERS" };
  }

  const cacheKey = `sess:${sessionId}:${userId}`;
  const now = Date.now();
  const cached = sessionCache.get(cacheKey);

  if (cached && now - cached.cached_at < CACHE_TTL_MS) {
    if (!cached.is_active || new Date(cached.expires_at).getTime() <= now) {
      sessionCache.delete(cacheKey);
      return { active: false, error: "SESSION_REVOKED" };
    }
    return { active: true };
  }

  const { data, error } = await supabase
    .from("sessions")
    .select("id, user_id, is_active, expires_at")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    sessionCache.delete(cacheKey);
    return { active: false, error: "SESSION_NOT_FOUND" };
  }

  if (!data.is_active || new Date(data.expires_at).getTime() <= now) {
    sessionCache.delete(cacheKey);
    return { active: false, error: "SESSION_REVOKED" };
  }

  sessionCache.set(cacheKey, {
    id: data.id,
    user_id: data.user_id,
    is_active: data.is_active,
    expires_at: data.expires_at,
    cached_at: now,
  });

  return { active: true };
}

export function invalidateSessionCache(sessionId: string, userId?: string): void {
  if (userId) {
    sessionCache.delete(`sess:${sessionId}:${userId}`);
  } else {
    for (const key of sessionCache.keys()) {
      if (key.startsWith(`sess:${sessionId}:`)) {
        sessionCache.delete(key);
      }
    }
  }
}

export function clearAllSessionCache(): void {
  sessionCache.clear();
}

export async function activeSessionMiddleware(
  req: SessionRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Unauthorized",
      code: "MISSING_AUTHORIZATION_HEADER",
      message: "Cabeçalho de autorização não fornecido.",
    });
    return;
  }

  const token = authHeader.substring(7).trim();

  // 1. Checagem de Revogação Ativa, Bloqueio de Usuário e TTL Máximo (15 min)
  const revCheck = evaluateTokenRevocationStatus(token);
  if (revCheck.revoked) {
    res.status(401).json({
      error: "Unauthorized",
      code: revCheck.code || "TOKEN_REVOKED",
      message: revCheck.reason || "Token revogado ou usuário bloqueado.",
    });
    return;
  }

  const payload = decodeJwtPayload(token);

  const sessionId = payload?.session_id || payload?.sid;
  const userId = payload?.sub || payload?.user_id;

  if (!sessionId || !userId) {
    res.status(401).json({
      error: "Unauthorized",
      code: "INVALID_SESSION_PAYLOAD",
      message: "Token de autenticação não contém identificador de sessão ativo.",
    });
    return;
  }

  const check = await validateActiveSession(sessionId, userId);

  if (!check.active) {
    res.status(401).json({
      error: "Unauthorized",
      code: "SESSION_REVOKED",
      message: "Esta sessão foi revogada ou expirou. Efetue login novamente.",
    });
    return;
  }

  req.sessionId = sessionId;
  req.user = {
    id: userId,
    sessionId,
    ...(payload || {}),
  };

  next();
}

export default activeSessionMiddleware;
