import { describe, it, expect, beforeEach } from "vitest";
import {
  RATE_LIMIT_TIERS,
  evaluateRateLimit,
  inMemoryRateLimiter,
  simulateBurstTraffic,
  resolveRateLimitTier,
} from "../../middleware/multiTierRateLimiter";
import cloudflareRules from "../../../cloudflare-rate-limiting-rules.json";

describe("Prompt 22: Rate Limiting Multi-Camadas (Aplicação & Gateway de Borda)", () => {
  beforeEach(() => {
    inMemoryRateLimiter.reset();
  });

  it("1. Deve resolver os Tiers corretos com base no path da requisição", () => {
    expect(resolveRateLimitTier("/auth/login").id).toBe("AUTH_LOGIN");
    expect(resolveRateLimitTier("/AUTH/LOGIN").id).toBe("AUTH_LOGIN");
    expect(resolveRateLimitTier("/api/payment/checkout").id).toBe("PAYMENT_API");
    expect(resolveRateLimitTier("/api/payment").id).toBe("PAYMENT_API");
    expect(resolveRateLimitTier("/api/appointments").id).toBe("GENERAL_API");
    expect(resolveRateLimitTier("/api/services/list").id).toBe("GENERAL_API");
    expect(resolveRateLimitTier("/index.html").id).toBe("GLOBAL_EDGE");
  });

  it("2. /auth/login: Deve permitir exatamente 5 requisições e bloquear a 6ª com HTTP 429 e Retry-After", () => {
    const clientIp = "192.168.10.1";
    const req = {
      path: "/auth/login",
      headers: { "x-forwarded-for": clientIp },
    };

    // 5 requisições permitidas
    for (let i = 1; i <= 5; i++) {
      const res = evaluateRateLimit(req);
      expect(res.allowed).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.remaining).toBe(5 - i);
      expect(res.limit).toBe(5);
      expect(res.headers["RateLimit-Limit"]).toBe("5");
      expect(res.headers["RateLimit-Remaining"]).toBe(String(5 - i));
    }

    // 6ª requisição deve ser sumariamente bloqueada com HTTP 429
    const blockedRes = evaluateRateLimit(req);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.remaining).toBe(0);
    expect(blockedRes.retryAfterSeconds).toBeGreaterThan(0);
    expect(blockedRes.headers["Retry-After"]).toBeDefined();
    expect(Number(blockedRes.headers["Retry-After"])).toBeGreaterThan(0);
    expect(blockedRes.errorBody?.error).toBe("Too Many Requests");
    expect(blockedRes.errorBody?.route).toBe("/auth/login");
  });

  it("3. /api/payment: Deve permitir exatamente 10 requisições e bloquear a 11ª com HTTP 429", () => {
    const clientIp = "192.168.20.1";
    const req = {
      path: "/api/payment",
      headers: { "cf-connecting-ip": clientIp },
    };

    // 10 requisições permitidas
    for (let i = 1; i <= 10; i++) {
      const res = evaluateRateLimit(req);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(10 - i);
    }

    // 11ª requisição deve ser bloqueada com 429
    const blockedRes = evaluateRateLimit(req);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.headers["Retry-After"]).toBeDefined();
    expect(blockedRes.errorBody?.limit).toBe(10);
  });

  it("4. Rotas Gerais /api/*: Deve permitir 100 requisições e conter abusos a partir da 101ª", () => {
    const clientIp = "192.168.30.1";
    const req = {
      path: "/api/services",
      headers: { "x-real-ip": clientIp },
    };

    // 100 requisições permitidas
    for (let i = 1; i <= 100; i++) {
      const res = evaluateRateLimit(req);
      expect(res.allowed).toBe(true);
    }

    // 101ª requisição bloqueada
    const blockedRes = evaluateRateLimit(req);
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.statusCode).toBe(429);
    expect(blockedRes.errorBody?.limit).toBe(100);
  });

  it("5. Deve manter isolamento estrito de cotas por endereço de IP (IP A não afeta IP B)", () => {
    const ipA = "10.0.0.1";
    const ipB = "10.0.0.2";

    const reqA = { path: "/auth/login", headers: { "x-forwarded-for": ipA } };
    const reqB = { path: "/auth/login", headers: { "x-forwarded-for": ipB } };

    // Esgota a cota de IP A
    for (let i = 0; i < 5; i++) {
      evaluateRateLimit(reqA);
    }
    expect(evaluateRateLimit(reqA).allowed).toBe(false);

    // IP B deve permanecer 100% liberado com cota intacta
    const resB = evaluateRateLimit(reqB);
    expect(resB.allowed).toBe(true);
    expect(resB.remaining).toBe(4);
  });

  it("6. Simulador de Rajada (Burst Simulator): Deve calcular com precisão métricas de estouro", () => {
    const sim = simulateBurstTraffic("AUTH_LOGIN", 8, "172.16.0.5");
    expect(sim.totalSent).toBe(8);
    expect(sim.allowedCount).toBe(5);
    expect(sim.blockedCount).toBe(3);
    expect(sim.firstBlockedIndex).toBe(6);
    expect(sim.sample429Response?.statusCode).toBe(429);
    expect(sim.sample429Response?.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("7. Arquivo de Regras de Borda Cloudflare (cloudflare-rate-limiting-rules.json): Validação de conformidade", () => {
    expect(cloudflareRules.managed_rulesets).toBeDefined();
    expect(cloudflareRules.managed_rulesets.length).toBeGreaterThanOrEqual(4);

    const loginRule = cloudflareRules.managed_rulesets.find(
      (r) => r.id === "rule-edge-login-bruteforce"
    );
    expect(loginRule).toBeDefined();
    expect(loginRule?.ratelimit.requests_per_period).toBe(5);
    expect(loginRule?.ratelimit.period).toBe(60);

    const paymentRule = cloudflareRules.managed_rulesets.find(
      (r) => r.id === "rule-edge-payment-antifraud"
    );
    expect(paymentRule).toBeDefined();
    expect(paymentRule?.ratelimit.requests_per_period).toBe(10);

    const apiRule = cloudflareRules.managed_rulesets.find(
      (r) => r.id === "rule-edge-general-api"
    );
    expect(apiRule).toBeDefined();
    expect(apiRule?.ratelimit.requests_per_period).toBe(100);
  });
});
