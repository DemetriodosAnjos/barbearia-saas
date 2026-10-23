/**
 * src/middleware/multiTierRateLimiter.ts
 *
 * Módulo Corporativo de Rate Limiting Multi-Camadas (Aplicação e Gateway de Borda)
 * Especialidade: Infrastructure Engineer / SRE & DevSecOps
 *
 * ESPECIFICAÇÃO DE DIRETRIZES (Prompt 22):
 * 1. Borda (Cloudflare WAF / Gateway): Mitigação de ataques volumétricos e limitação global por IP (300 req/min).
 * 2. Nível de Aplicação (Express / Supabase Edge Functions):
 *    - /auth/login: max 5 tentativas / min (Mitigação de Força Bruta e Credential Stuffing).
 *    - /api/payment: max 10 requisições / min (Prevenção de Carding Attacks e abuso em gateways de pagamento).
 *    - /api/* (Rotas gerais): max 100 requisições / min (Proteção volumétrica e estabilidade de CPU/Pool).
 * 3. Resposta Padronizada:
 *    - Status HTTP 429 Too Many Requests
 *    - Cabeçalho RFC 6585 compulsório: `Retry-After: <segundos>`
 *    - Cabeçalhos de especificação IETF: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
 *    - Cabeçalhos legados de compatibilidade: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
 */

export interface RateLimitTierConfig {
  id: string;
  name: string;
  pathPattern: string;
  maxRequests: number;
  windowSeconds: number;
  windowMs: number;
  description: string;
  actionOnExceed: "block_429" | "challenge_captcha";
}

export const RATE_LIMIT_TIERS: Record<string, RateLimitTierConfig> = {
  AUTH_LOGIN: {
    id: "AUTH_LOGIN",
    name: "Autenticação & Login (/auth/login)",
    pathPattern: "/auth/login",
    maxRequests: 5,
    windowSeconds: 60,
    windowMs: 60 * 1000,
    description: "Proteção contra força bruta, enumeração de senhas e ataques de dicionário.",
    actionOnExceed: "block_429",
  },
  PAYMENT_API: {
    id: "PAYMENT_API",
    name: "Processamento de Pagamentos (/api/payment)",
    pathPattern: "/api/payment",
    maxRequests: 10,
    windowSeconds: 60,
    windowMs: 60 * 1000,
    description: "Mitigação de carding attacks, fraudes em lote e sobrecarga de gateways Mercado Pago / Stripe.",
    actionOnExceed: "block_429",
  },
  GENERAL_API: {
    id: "GENERAL_API",
    name: "Rotas Gerais da API (/api/*)",
    pathPattern: "/api/*",
    maxRequests: 100,
    windowSeconds: 60,
    windowMs: 60 * 1000,
    description: "Estabilidade do pool de conexões do banco de dados e contenção de scraping/crawlers.",
    actionOnExceed: "block_429",
  },
  GLOBAL_EDGE: {
    id: "GLOBAL_EDGE",
    name: "Borda Global por IP (Cloudflare Gateway)",
    pathPattern: "/*",
    maxRequests: 300,
    windowSeconds: 60,
    windowMs: 60 * 1000,
    description: "Defesa perimetral Anycast contra ataques DDoS e botnets distribuídas.",
    actionOnExceed: "block_429",
  },
};

export interface RateLimitClientRecord {
  ip: string;
  routeKey: string;
  requestsCount: number;
  windowStart: number;
  windowExpiresAt: number;
  timestamps: number[];
}

export interface RateLimitCheckResult {
  allowed: boolean;
  statusCode: number;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds: number;
  clientIp: string;
  tier: RateLimitTierConfig;
  headers: Record<string, string>;
  errorBody?: {
    statusCode: number;
    error: string;
    message: string;
    route: string;
    limit: number;
    windowSeconds: number;
    retryAfterSeconds: number;
    timestamp: string;
  };
}

// Armazenamento em memória com sliding window log
class MemoryRateLimitStore {
  private store: Map<string, RateLimitClientRecord> = new Map();

  private makeKey(ip: string, routeKey: string): string {
    return `${ip.trim()}::${routeKey.trim()}`;
  }

  public recordAndCheck(
    ip: string,
    tier: RateLimitTierConfig,
    now: number = Date.now()
  ): {
    allowed: boolean;
    currentCount: number;
    remaining: number;
    retryAfterSeconds: number;
    resetSeconds: number;
  } {
    const key = this.makeKey(ip, tier.id);
    const existing = this.store.get(key);

    // Se não existe ou expirou a janela, cria novo registro
    if (!existing || now >= existing.windowExpiresAt) {
      const newRecord: RateLimitClientRecord = {
        ip,
        routeKey: tier.id,
        requestsCount: 1,
        windowStart: now,
        windowExpiresAt: now + tier.windowMs,
        timestamps: [now],
      };
      this.store.set(key, newRecord);

      return {
        allowed: true,
        currentCount: 1,
        remaining: tier.maxRequests - 1,
        retryAfterSeconds: 0,
        resetSeconds: Math.ceil(tier.windowSeconds),
      };
    }

    // Janela ainda ativa
    const resetSeconds = Math.max(
      1,
      Math.ceil((existing.windowExpiresAt - now) / 1000)
    );

    if (existing.requestsCount >= tier.maxRequests) {
      // Limite atingido -> Bloqueio HTTP 429
      return {
        allowed: false,
        currentCount: existing.requestsCount,
        remaining: 0,
        retryAfterSeconds: resetSeconds,
        resetSeconds,
      };
    }

    // Incrementa contador
    existing.requestsCount += 1;
    existing.timestamps.push(now);
    this.store.set(key, existing);

    return {
      allowed: true,
      currentCount: existing.requestsCount,
      remaining: Math.max(0, tier.maxRequests - existing.requestsCount),
      retryAfterSeconds: 0,
      resetSeconds,
    };
  }

  public reset(ip?: string, routeKey?: string): void {
    if (ip && routeKey) {
      this.store.delete(this.makeKey(ip, routeKey));
    } else if (ip) {
      for (const k of this.store.keys()) {
        if (k.startsWith(`${ip}::`)) this.store.delete(k);
      }
    } else {
      this.store.clear();
    }
  }

  public getSnapshot(): RateLimitClientRecord[] {
    return Array.from(this.store.values());
  }
}

export const inMemoryRateLimiter = new MemoryRateLimitStore();

/**
 * Extrai o endereço de IP real do cliente considerando proxies reversos e CDNs (Cloudflare, Vercel, AWS)
 */
export function extractClientIp(req: any): string {
  if (!req) return "127.0.0.1";

  // 1. Cloudflare True-Client-IP ou CF-Connecting-IP
  const cfConnectingIp = req.headers?.["cf-connecting-ip"] || req.headers?.["true-client-ip"];
  if (cfConnectingIp && typeof cfConnectingIp === "string") {
    return cfConnectingIp.trim();
  }

  // 2. X-Forwarded-For (primeiro IP do cabeçalho)
  const xForwardedFor = req.headers?.["x-forwarded-for"];
  if (xForwardedFor) {
    const rawStr = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    const clientIp = rawStr.split(",")[0]?.trim();
    if (clientIp) return clientIp;
  }

  // 3. X-Real-IP
  const xRealIp = req.headers?.["x-real-ip"];
  if (xRealIp && typeof xRealIp === "string") {
    return xRealIp.trim();
  }

  // 4. Conexão direta TCP
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "127.0.0.1";
}

/**
 * Determina o Tier apropriado com base no path da requisição
 */
export function resolveRateLimitTier(path: string): RateLimitTierConfig {
  const normalizedPath = (path || "/").toLowerCase().trim();

  if (normalizedPath.includes("/auth/login") || normalizedPath === "/auth/login") {
    return RATE_LIMIT_TIERS.AUTH_LOGIN;
  }
  if (normalizedPath.includes("/api/payment") || normalizedPath.startsWith("/api/payment")) {
    return RATE_LIMIT_TIERS.PAYMENT_API;
  }
  if (normalizedPath.startsWith("/api/")) {
    return RATE_LIMIT_TIERS.GENERAL_API;
  }

  return RATE_LIMIT_TIERS.GLOBAL_EDGE;
}

/**
 * Função de avaliação de Rate Limiting
 */
export function evaluateRateLimit(
  req: any,
  explicitTier?: RateLimitTierConfig
): RateLimitCheckResult {
  const clientIp = extractClientIp(req);
  const path = req.path || req.url || "/";
  const tier = explicitTier || resolveRateLimitTier(path);

  const evaluation = inMemoryRateLimiter.recordAndCheck(clientIp, tier);

  const headers: Record<string, string> = {
    "RateLimit-Limit": String(tier.maxRequests),
    "RateLimit-Remaining": String(evaluation.remaining),
    "RateLimit-Reset": String(evaluation.resetSeconds),
    "X-RateLimit-Limit": String(tier.maxRequests),
    "X-RateLimit-Remaining": String(evaluation.remaining),
    "X-RateLimit-Reset": String(evaluation.resetSeconds),
  };

  if (!evaluation.allowed) {
    headers["Retry-After"] = String(evaluation.retryAfterSeconds);

    return {
      allowed: false,
      statusCode: 429,
      limit: tier.maxRequests,
      remaining: 0,
      resetSeconds: evaluation.resetSeconds,
      retryAfterSeconds: evaluation.retryAfterSeconds,
      clientIp,
      tier,
      headers,
      errorBody: {
        statusCode: 429,
        error: "Too Many Requests",
        message: `Taxa de requisições excedida. Limite de ${tier.maxRequests} requisições por minuto atingido para a rota ${tier.pathPattern}.`,
        route: tier.pathPattern,
        limit: tier.maxRequests,
        windowSeconds: tier.windowSeconds,
        retryAfterSeconds: evaluation.retryAfterSeconds,
        timestamp: new Date().toISOString(),
      },
    };
  }

  return {
    allowed: true,
    statusCode: 200,
    limit: tier.maxRequests,
    remaining: evaluation.remaining,
    resetSeconds: evaluation.resetSeconds,
    retryAfterSeconds: 0,
    clientIp,
    tier,
    headers,
  };
}

/**
 * Middleware Express pronto para uso em produção
 */
export function multiTierRateLimiterMiddleware(req: any, res: any, next?: () => void) {
  const result = evaluateRateLimit(req);

  // Anexa headers na resposta
  for (const [header, val] of Object.entries(result.headers)) {
    if (res.setHeader) {
      res.setHeader(header, val);
    }
  }

  if (!result.allowed) {
    if (res.status && res.json) {
      return res.status(429).json(result.errorBody);
    }
    return result;
  }

  if (next) {
    next();
  }
  return result;
}

/**
 * Adaptador para Supabase Edge Functions (Deno / Fetch API)
 */
export function wrapEdgeFunctionWithRateLimit(
  handler: (req: Request) => Promise<Response>,
  tierOverride?: RateLimitTierConfig
) {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const mockExpressReq = {
      path: url.pathname,
      headers: Object.fromEntries(req.headers.entries()),
    };

    const evaluation = evaluateRateLimit(mockExpressReq, tierOverride);

    if (!evaluation.allowed) {
      return new Response(JSON.stringify(evaluation.errorBody), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...evaluation.headers,
        },
      });
    }

    const response = await handler(req);

    // Clona e adiciona os headers de rate limiting
    const newHeaders = new Headers(response.headers);
    for (const [k, v] of Object.entries(evaluation.headers)) {
      newHeaders.set(k, v);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };
}

/**
 * Simulador de tráfego volumétrico e rajada (Burst Simulator) para o Workbench de Testes
 */
export function simulateBurstTraffic(
  tierKey: keyof typeof RATE_LIMIT_TIERS,
  requestCount: number,
  clientIp: string = "192.168.1.100"
): {
  tier: RateLimitTierConfig;
  totalSent: number;
  allowedCount: number;
  blockedCount: number;
  firstBlockedIndex: number | null;
  sample429Response: RateLimitCheckResult | null;
  allResults: RateLimitCheckResult[];
} {
  const tier = RATE_LIMIT_TIERS[tierKey];
  // Reset temporário para o IP de simulação
  inMemoryRateLimiter.reset(clientIp, tier.id);

  const allResults: RateLimitCheckResult[] = [];
  let allowedCount = 0;
  let blockedCount = 0;
  let firstBlockedIndex: number | null = null;
  let sample429Response: RateLimitCheckResult | null = null;

  for (let i = 0; i < requestCount; i++) {
    const mockReq = {
      path: tier.pathPattern.replace("*", "test-endpoint"),
      headers: { "x-forwarded-for": clientIp },
    };

    const res = evaluateRateLimit(mockReq, tier);
    allResults.push(res);

    if (res.allowed) {
      allowedCount++;
    } else {
      blockedCount++;
      if (firstBlockedIndex === null) {
        firstBlockedIndex = i + 1;
        sample429Response = res;
      }
    }
  }

  return {
    tier,
    totalSent: requestCount,
    allowedCount,
    blockedCount,
    firstBlockedIndex,
    sample429Response,
    allResults,
  };
}
