import { describe, it, expect, beforeEach } from "vitest";
import { validateTurnstileToken } from "../../security/turnstileValidator.js";
import {
  checkLoginRateLimit,
  resetLoginRateLimitStore,
  loginRateLimiterMiddleware,
} from "../../middleware/loginRateLimiter.js";

describe("Módulo 3: Autenticação, CAPTCHA e Anti-Brute Force", () => {
  describe("Task 3.1: Validação Server-Side do Cloudflare Turnstile", () => {
    it("Rejeita token ausente, vazio ou nulo", async () => {
      const emptyRes = await validateTurnstileToken("");
      expect(emptyRes.success).toBe(false);
      expect(emptyRes.errorCodes).toContain("missing-input-response");

      const nullRes = await validateTurnstileToken(null);
      expect(nullRes.success).toBe(false);
      expect(nullRes.errorCodes).toContain("missing-input-response");
    });

    it("Rejeita tokens inválidos ou reprovados pela Cloudflare", async () => {
      const failRes = await validateTurnstileToken("turnstile_invalid_rejected_token");
      expect(failRes.success).toBe(false);
      expect(failRes.errorCodes).toContain("invalid-input-response");
    });

    it("Aprova token válido em modo de teste e registra timestamp/hostname", async () => {
      const validRes = await validateTurnstileToken("turnstile_pass_token_ok_998124", "192.168.1.50");
      expect(validRes.success).toBe(true);
      expect(validRes.hostname).toBeDefined();
      expect(validRes.action).toBe("login");
    });

    it("Bloqueia replay attacks quando o mesmo token é reutilizado", async () => {
      // Primeira submissão: aprovada
      const firstTry = await validateTurnstileToken("turnstile_pass_token_ok_998124");
      // Segunda submissão com mesmo token: rejeitada por Replay
      const secondTry = await validateTurnstileToken("turnstile_pass_token_ok_998124");
      expect(secondTry.success).toBe(false);
      expect(secondTry.errorCodes).toContain("token-already-consumed");
    });
  });

  describe("Task 3.2: Rate Limiter de Auth (/auth/login - 5 req/min por IP)", () => {
    const testIp = "203.0.113.195";

    beforeEach(() => {
      resetLoginRateLimitStore();
    });

    it("Permite as primeiras 5 tentativas na rota /auth/login para o mesmo IP", () => {
      for (let attempt = 1; attempt <= 5; attempt++) {
        const res = checkLoginRateLimit(testIp);
        expect(res.allowed).toBe(true);
        expect(res.statusCode).toBe(200);
        expect(res.remaining).toBe(5 - attempt);
      }
    });

    it("Retorna HTTP 429 na 6ª tentativa para o mesmo IP e injeta Retry-After", () => {
      // Executa 5 tentativas iniciais
      for (let i = 0; i < 5; i++) {
        checkLoginRateLimit(testIp);
      }

      // 6ª tentativa deve ser estritamente bloqueada
      const blockedRes = checkLoginRateLimit(testIp);
      expect(blockedRes.allowed).toBe(false);
      expect(blockedRes.statusCode).toBe(429);
      expect(blockedRes.body.status).toBe(429);
      expect(blockedRes.body.error).toBe("Too Many Requests");
      expect(blockedRes.body.code).toBe("AUTH_RATE_LIMIT_EXCEEDED");
      expect(blockedRes.headers["Retry-After"]).toBeDefined();
      expect(Number(blockedRes.headers["Retry-After"])).toBeGreaterThanOrEqual(1);
    });

    it("Isola a contagem entre diferentes endereços IP", () => {
      const attackerIp = "198.51.100.44";
      const legitimateIp = "198.51.100.99";

      // Esgota limite do IP do atacante
      for (let i = 0; i < 5; i++) {
        checkLoginRateLimit(attackerIp);
      }
      expect(checkLoginRateLimit(attackerIp).allowed).toBe(false);

      // IP legítimo deve continuar com todas as 5 tentativas permitidas
      const legitRes = checkLoginRateLimit(legitimateIp);
      expect(legitRes.allowed).toBe(true);
      expect(legitRes.remaining).toBe(4);
    });

    it("Middleware Express bloqueia requisição na 6ª chamada com status 429", () => {
      const mockReq = {
        headers: { "x-forwarded-for": "10.0.0.75" },
        method: "POST",
        url: "/auth/login",
      };

      const setHeaders = {};
      let responseStatus = null;
      let responseBody = null;

      const mockRes = {
        setHeader: (k, v) => { setHeaders[k] = v; },
        status: (code) => {
          responseStatus = code;
          return {
            json: (body) => { responseBody = body; },
          };
        },
      };

      let nextCalled = 0;
      const mockNext = () => { nextCalled += 1; };

      // Primeiras 5 chamadas invocam next()
      for (let i = 0; i < 5; i++) {
        loginRateLimiterMiddleware(mockReq, mockRes, mockNext);
      }
      expect(nextCalled).toBe(5);

      // 6ª chamada deve barrar sem invocar next() e retornar status 429
      loginRateLimiterMiddleware(mockReq, mockRes, mockNext);
      expect(nextCalled).toBe(5); // Não foi incrementado
      expect(responseStatus).toBe(429);
      expect(responseBody.error).toBe("Too Many Requests");
    });
  });
});
