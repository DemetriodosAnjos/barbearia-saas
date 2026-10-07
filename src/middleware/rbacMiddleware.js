/**
 * MIDDLEWARE DE AUTORIZAÇÃO RBAC & NEGAÇÃO POR PADRÃO (DEFAULT DENY)
 * 
 * Regras Operacionais de AppSec:
 * 1. Negação por Padrão (Default Deny): Toda rota é fechada a menos que explicitamente
 *    declarada na matriz como isPublic: true.
 * 2. Ausência de Token / Token Inválido em rotas não públicas -> Retorna HTTP 401 (Unauthorized).
 * 3. Token Válido com Role insuficiente para a rota -> Retorna HTTP 403 (Forbidden).
 * 4. Rotas administrativas (/api/admin/*) exigem 'admin' ou 'superadmin'.
 * 5. Rotas de superadministrador (/api/superadmin/*) exigem 'superadmin'.
 */

import {
  findRouteDefinition,
  USER_ROLES,
} from "../security/authorizationMatrix";
import { isSessionRevoked } from "../security/sessionRevocationManager";

/**
 * Utilitário seguro para gerar tokens JWT sintéticos de teste
 */
export function generateSyntheticJwt({
  role = USER_ROLES.CLIENT,
  userId = "usr_synthetic_123",
  tenantId = "barbearia-vintage-club",
  expiresInSeconds = 3600,
} = {}) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const payload = {
    sub: userId,
    role: role,
    tenant_id: tenantId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const encodeBase64Url = (obj) => {
    const jsonStr = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  const encodedHeader = encodeBase64Url(header);
  const encodedPayload = encodeBase64Url(payload);
  const signature = "SYNTHETIC_SECURE_HMAC_SIGNATURE";

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Decodificador e validador de JWT para uso em middleware
 */
export function parseAndValidateJwt(token) {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Token não fornecido ou tipo inválido." };
  }

  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return { valid: false, error: "Formato de token JWT malformado (deve conter 3 segmentos)." };
  }

  try {
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonText = new TextDecoder().decode(bytes);
    const payload = JSON.parse(jsonText);

    // Validação de expiração temporal (claim 'exp')
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowInSeconds) {
      return { valid: false, error: "Token JWT expirado.", expired: true };
    }

    // Extrai o papel (role) de forma tolerante (Supabase user_metadata, app_metadata ou claim direta)
    const role =
      payload.role ||
      payload.app_metadata?.role ||
      payload.user_metadata?.role ||
      USER_ROLES.CLIENT;

    return {
      valid: true,
      payload: {
        ...payload,
        role,
      },
    };
  } catch (err) {
    return { valid: false, error: `Falha na decodificação do payload JWT: ${err.message}` };
  }
}

/**
 * Extrai o token do cabeçalho HTTP Authorization (Bearer token)
 */
export function extractBearerToken(headers = {}) {
  const authHeader =
    headers["authorization"] ||
    headers["Authorization"] ||
    headers["auth"] ||
    "";

  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  if (typeof authHeader === "string" && authHeader.trim().length > 0) {
    return authHeader.trim();
  }

  return null;
}

/**
 * MOTOR DE AUTORIZAÇÃO: DEFAULT DENY (Negação por Padrão)
 * Avalia o contexto da requisição e retorna { status: 200 | 401 | 403, error, user, route }
 */
export function evaluateAccess({ path, method = "GET", token = null, headers = {} }) {
  const extractedToken = token || extractBearerToken(headers);
  const routeDef = findRouteDefinition(path, method);

  // ========================================================
  // 1. AVALIAÇÃO DE ROTA PÚBLICA EXPLÍCITA
  // ========================================================
  if (routeDef && routeDef.isPublic === true) {
    // Rota pública declarada: acesso concedido sem obrigatoriedade de token
    return {
      authorized: true,
      status: 200,
      classification: routeDef.classification,
      isPublic: true,
      path,
      method,
      message: "Acesso público autorizado.",
      route: routeDef,
    };
  }

  // ========================================================
  // 2. PRINCÍPIO "DEFAULT DENY" (Negação por Padrão)
  // Rota privada registrada OU rota desconhecida/não mapeada
  // ========================================================
  const isUnmappedRoute = !routeDef;

  // 2.1 Verificação de Token JWT: Sem token ou token inválido = HTTP 401
  if (!extractedToken) {
    return {
      authorized: false,
      status: 401,
      error: "Unauthorized",
      code: "AUTH_TOKEN_MISSING",
      path,
      method,
      isUnmappedRoute,
      message: isUnmappedRoute
        ? `[DEFAULT DENY] A rota '${path}' não é pública e não está explicitamente liberada. Token JWT obrigatório.`
        : `Acesso não autorizado: a rota '${path}' exige autenticação via token JWT Bearer.`,
    };
  }

  const tokenValidation = parseAndValidateJwt(extractedToken);
  if (!tokenValidation.valid) {
    return {
      authorized: false,
      status: 401,
      error: "Unauthorized",
      code: tokenValidation.expired ? "AUTH_TOKEN_EXPIRED" : "AUTH_TOKEN_INVALID",
      path,
      method,
      message: `Token de autenticação rejeitado: ${tokenValidation.error}`,
    };
  }

  const user = tokenValidation.payload;
  const userRole = user.role;

  // 2.2 Verificação de Revogação Ativa de Sessão / Blacklist de JWT (OWASP ASVS V2.1.8)
  const revocationCheck = isSessionRevoked({
    token: extractedToken,
    userId: user.sub,
    issuedAt: user.iat,
  });

  if (revocationCheck.isRevoked) {
    return {
      authorized: false,
      status: 401,
      error: "Unauthorized",
      code: "SESSION_REVOKED_CRITICAL_EVENT",
      path,
      method,
      revokedAt: revocationCheck.revokedAt,
      revocationReason: revocationCheck.reason,
      message: `Sessão revogada imediatamente por evento crítico de segurança (${revocationCheck.reason || "Evento Crítico"}). Faça login novamente.`,
    };
  }

  // 2.2 Verificação de Papel (Role) para Rotas Desconhecidas (Default Deny Restrito)
  if (isUnmappedRoute) {
    // Por segurança de Negação por Padrão, rotas não mapeadas são restritas a superadmin
    if (userRole !== USER_ROLES.SUPERADMIN) {
      return {
        authorized: false,
        status: 403,
        error: "Forbidden",
        code: "DEFAULT_DENY_UNMAPPED_ROUTE",
        path,
        method,
        currentRole: userRole,
        requiredRoles: [USER_ROLES.SUPERADMIN],
        message: `[DEFAULT DENY] A rota '${path}' não foi declarada publicamente. Apenas perfil 'superadmin' pode transitar em endpoints não registrados.`,
      };
    }

    return {
      authorized: true,
      status: 200,
      path,
      method,
      user,
      isUnmappedRoute: true,
      message: "[DEFAULT DENY] Acesso concedido a rota não mapeada para perfil 'superadmin'.",
    };
  }

  // 2.3 Verificação de Papel (Role) na Matriz de Autorização
  const allowedRoles = routeDef.allowedRoles || [];
  const isRoleAllowed =
    userRole === USER_ROLES.SUPERADMIN || allowedRoles.includes(userRole);

  if (!isRoleAllowed) {
    return {
      authorized: false,
      status: 403,
      error: "Forbidden",
      code: "INSUFFICIENT_PERMISSIONS",
      path,
      method,
      currentRole: userRole,
      requiredRoles: allowedRoles,
      route: routeDef,
      message: `Acesso negado (HTTP 403): O perfil '${userRole}' não possui autorização para acessar '${path}'. Papéis permitidos: [${allowedRoles.join(
        ", "
      )}].`,
    };
  }

  // ========================================================
  // 3. ACESSO AUTORIZADO (HTTP 200)
  // ========================================================
  return {
    authorized: true,
    status: 200,
    path,
    method,
    user,
    route: routeDef,
    message: `Acesso concedido com sucesso para o perfil '${userRole}'.`,
  };
}

/**
 * Middleware compatível com Express / Connect / Edge Handlers
 * Uso: app.use(rbacDefaultDenyMiddleware);
 */
export function rbacDefaultDenyMiddleware(req, res, next) {
  const path = req.path || req.url?.split("?")[0] || "/";
  const method = req.method || "GET";
  const headers = req.headers || {};
  const token = req.token || extractBearerToken(headers);

  const result = evaluateAccess({ path, method, token, headers });

  if (result.authorized) {
    req.user = result.user;
    req.routeSecurity = result.route;
    if (typeof next === "function") return next();
    return result;
  }

  // Resposta HTTP de bloqueio (401 ou 403)
  const responsePayload = {
    status: result.status,
    error: result.error,
    code: result.code,
    message: result.message,
    path: result.path,
    method: result.method,
    currentRole: result.currentRole,
    requiredRoles: result.requiredRoles,
  };

  if (res && typeof res.status === "function" && typeof res.json === "function") {
    return res.status(result.status).json(responsePayload);
  }

  return responsePayload;
}

/**
 * Middleware compatível com Supabase Edge Functions (Deno / Fetch API padrão)
 * Uso:
 * Deno.serve(async (req) => {
 *   return await supabaseEdgeRbacMiddleware(req, async (reqWithUser) => {
 *     return new Response(JSON.stringify({ data: "ok" }), { headers: { "Content-Type": "application/json" } });
 *   });
 * });
 */
export async function supabaseEdgeRbacMiddleware(request, handler) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7).trim() : authHeader || null;

  const result = evaluateAccess({
    path,
    method,
    token,
    headers: Object.fromEntries(request.headers.entries()),
  });

  if (!result.authorized) {
    return new Response(
      JSON.stringify({
        status: result.status,
        error: result.error,
        code: result.code,
        message: result.message,
        path: result.path,
        method: result.method,
        currentRole: result.currentRole,
        requiredRoles: result.requiredRoles,
      }),
      {
        status: result.status,
        headers: {
          "Content-Type": "application/json",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  }

  // Anexa o usuário e contexto de segurança e repassa para a função handler
  request.user = result.user;
  request.routeSecurity = result.route;

  if (typeof handler === "function") {
    return await handler(request);
  }

  return new Response(JSON.stringify({ status: 200, message: "Authorized" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
