/**
 * Task 3.2: Rate Limiter de Auth (SecOps)
 * Configuração de Rate Limit para a rota /auth/login:
 * - Limite: 5 tentativas por minuto por IP
 * - Resposta ao exceder: HTTP 429 (Too Many Requests)
 * - Headers: Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 */

const WINDOW_MS = 60 * 1000; // 1 minuto (60.000 ms)
const MAX_ATTEMPTS = 5; // Limite de 5 tentativas por minuto

// Armazenamento em memória (Sliding Log / Fixed Window por IP)
// Em clusters de produção com múltiplas réplicas, substituir por Redis (ioredis / node-redis)
const ipRateLimitStore = new Map();

/**
 * Limpa periodicamente entradas antigas da memória
 */
function cleanupExpiredIpEntries() {
  const now = Date.now();
  for (const [ip, data] of ipRateLimitStore.entries()) {
    if (now > data.resetTime) {
      ipRateLimitStore.delete(ip);
    }
  }
}

/**
 * Extrai o IP real do cliente considerando proxies reversos (Cloudflare, NGINX, AWS ALB)
 * @param {object} req - Request object
 * @returns {string}
 */
export function extractClientIp(req) {
  if (!req) return "127.0.0.1";
  
  const cfConnectingIp = req.headers?.["cf-connecting-ip"];
  if (cfConnectingIp && typeof cfConnectingIp === "string") return cfConnectingIp.trim();

  const xForwardedFor = req.headers?.["x-forwarded-for"];
  if (xForwardedFor) {
    const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    const firstIp = ips.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const xRealIp = req.headers?.["x-real-ip"];
  if (xRealIp && typeof xRealIp === "string") return xRealIp.trim();

  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "127.0.0.1";
}

/**
 * Avalia o rate limit para um determinado IP
 * @param {string} ip
 * @returns {{
 *   allowed: boolean,
 *   statusCode: number,
 *   remaining: number,
 *   limit: number,
 *   retryAfterSeconds: number,
 *   resetTime: number,
 *   headers: Record<string, string>,
 *   body?: object
 * }}
 */
export function checkLoginRateLimit(ip) {
  cleanupExpiredIpEntries();
  const now = Date.now();
  const safeIp = ip ? String(ip).trim() : "127.0.0.1";

  let record = ipRateLimitStore.get(safeIp);

  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + WINDOW_MS,
    };
    ipRateLimitStore.set(safeIp, record);
  }

  // Verifica se o limite foi atingido
  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    
    const headers = {
      "Retry-After": String(retryAfterSeconds),
      "X-RateLimit-Limit": String(MAX_ATTEMPTS),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(Math.floor(record.resetTime / 1000)),
      "Content-Type": "application/json",
    };

    return {
      allowed: false,
      statusCode: 429,
      remaining: 0,
      limit: MAX_ATTEMPTS,
      retryAfterSeconds,
      resetTime: record.resetTime,
      headers,
      body: {
        status: 429,
        error: "Too Many Requests",
        code: "AUTH_RATE_LIMIT_EXCEEDED",
        message: `Limite de ${MAX_ATTEMPTS} tentativas por minuto por IP excedido na rota /auth/login. Tente novamente em ${retryAfterSeconds} segundos.`,
        retryAfter: retryAfterSeconds,
      },
    };
  }

  // Incrementa a contagem de tentativas consumidas
  record.count += 1;
  const remaining = Math.max(0, MAX_ATTEMPTS - record.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

  const headers = {
    "X-RateLimit-Limit": String(MAX_ATTEMPTS),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.floor(record.resetTime / 1000)),
  };

  return {
    allowed: true,
    statusCode: 200,
    remaining,
    limit: MAX_ATTEMPTS,
    retryAfterSeconds,
    resetTime: record.resetTime,
    headers,
  };
}

/**
 * Reseta o contador para um IP (usado em testes ou operações de SecOps)
 * @param {string} [ip]
 */
export function resetLoginRateLimitStore(ip) {
  if (ip) {
    ipRateLimitStore.delete(ip.trim());
  } else {
    ipRateLimitStore.clear();
  }
}

/**
 * Middleware Express / Connect para a rota /auth/login
 * Bloqueia acima de 5 requisições por minuto por IP com HTTP 429
 * 
 * Uso:
 * import { loginRateLimiterMiddleware } from './loginRateLimiter.js';
 * app.post('/auth/login', loginRateLimiterMiddleware, loginController);
 */
export function loginRateLimiterMiddleware(req, res, next) {
  const clientIp = extractClientIp(req);
  const result = checkLoginRateLimit(clientIp);

  // Aplica headers padrão RFC em todas as respostas
  Object.entries(result.headers).forEach(([header, val]) => {
    res.setHeader?.(header, val);
  });

  if (!result.allowed) {
    return res.status(429).json(result.body);
  }

  if (typeof next === "function") {
    return next();
  }
}

/**
 * Configuração declarativa exportada para compatibilidade com 'express-rate-limit'
 * Caso a infraestrutura utilize o pacote express-rate-limit oficial
 */
export const expressRateLimitConfig = {
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // Limite de 5 tentativas por IP
  standardHeaders: true, // Retorna headers `RateLimit-*`
  legacyHeaders: true, // Retorna headers `X-RateLimit-*`
  statusCode: 429,
  message: {
    status: 429,
    error: "Too Many Requests",
    code: "AUTH_RATE_LIMIT_EXCEEDED",
    message: "Limite de 5 tentativas por minuto por IP excedido na rota /auth/login. Tente novamente em 1 minuto.",
  },
  keyGenerator: (req) => extractClientIp(req),
  handler: (req, res) => {
    res.status(429).json({
      status: 429,
      error: "Too Many Requests",
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      message: "Limite de 5 tentativas por minuto por IP excedido na rota /auth/login.",
    });
  },
};
