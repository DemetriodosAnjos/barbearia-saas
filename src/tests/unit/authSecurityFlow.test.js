import { describe, it, expect, beforeEach } from "vitest";
import {
  verifyTurnstileToken,
  validateCaptchaChallenge,
  resetCaptchaTokenCache,
  CAPTCHA_TEST_TOKENS,
} from "../../security/captchaValidator";
import {
  checkRateLimit,
  recordFailedAttempt,
  recordSuccessfulAttempt,
  resetAttempts,
  RATE_LIMIT_CONFIG,
  normalizeIdentifier,
  authRateLimitMiddleware,
} from "../../middleware/authRateLimiter";
import {
  secureLogin,
  secureSignUp,
  securePasswordResetRequest,
  auditPasswordHashingPolicy,
  AUTH_SECURITY_CONSTANTS,
} from "../../security/authSecurityService";

describe("1. CAPTCHA Validation Engine (Turnstile & hCaptcha)", () => {
  beforeEach(() => {
    resetCaptchaTokenCache();
  });

  it("approves valid Turnstile test token", async () => {
    const res = await verifyTurnstileToken(CAPTCHA_TEST_TOKENS.VALID_PASS, {
      expectedAction: "login",
    });

    expect(res.success).toBe(true);
    expect(res.message).toContain("validado com sucesso");
    expect(res.details).toBeDefined();
    expect(res.details.action).toBe("login");
  });

  it("rejects authentication when CAPTCHA token is missing or empty", async () => {
    const resNull = await verifyTurnstileToken(null);
    const resEmpty = await verifyTurnstileToken("   ");

    expect(resNull.success).toBe(false);
    expect(resNull.errorCode).toBe("MISSING_CAPTCHA_TOKEN");

    expect(resEmpty.success).toBe(false);
    expect(resEmpty.errorCode).toBe("MISSING_CAPTCHA_TOKEN");
  });

  it("rejects invalid/bot CAPTCHA tokens", async () => {
    const res = await verifyTurnstileToken(CAPTCHA_TEST_TOKENS.INVALID_FAIL);

    expect(res.success).toBe(false);
    expect(res.errorCode).toBe("INVALID_CAPTCHA_RESPONSE");
  });

  it("rejects expired CAPTCHA tokens", async () => {
    const res = await verifyTurnstileToken(CAPTCHA_TEST_TOKENS.EXPIRED);

    expect(res.success).toBe(false);
    expect(res.errorCode).toBe("EXPIRED_CAPTCHA_TOKEN");
  });

  it("mitigates Token Replay Attacks by rejecting previously consumed tokens", async () => {
    // Primeira utilização: sucesso
    const firstUse = await verifyTurnstileToken(CAPTCHA_TEST_TOKENS.VALID_PASS);
    expect(firstUse.success).toBe(true);

    // Segunda utilização do mesmo token (Replay Attack): deve ser bloqueado
    const replayUse = await verifyTurnstileToken(CAPTCHA_TEST_TOKENS.VALID_PASS);
    expect(replayUse.success).toBe(false);
    expect(replayUse.errorCode).toBe("TOKEN_ALREADY_CONSUMED");
  });

  it("supports hCaptcha validation through unified interface", async () => {
    const validH = await validateCaptchaChallenge("hcaptcha-valid-sample-tok", {
      provider: "hcaptcha",
    });
    expect(validH.success).toBe(true);

    const invalidH = await validateCaptchaChallenge("invalid-hcaptcha-token", {
      provider: "hcaptcha",
    });
    expect(invalidH.success).toBe(false);
    expect(invalidH.errorCode).toBe("INVALID_HCAPTCHA_RESPONSE");
  });
});

describe("2. Anti-Brute Force Middleware & Lockout Policy", () => {
  const testUser = "barbeiro.teste@vintageclub.com";
  const testIp = "192.168.1.105";

  beforeEach(() => {
    resetAttempts();
  });

  it("allows authentication with 5 remaining attempts on fresh start", () => {
    const check = checkRateLimit({ identifier: testUser, ip: testIp });

    expect(check.allowed).toBe(true);
    expect(check.isLocked).toBe(false);
    expect(check.remainingAttempts).toBe(5);
    expect(check.headers["X-RateLimit-Limit"]).toBe("5");
    expect(check.headers["X-RateLimit-Remaining"]).toBe("5");
  });

  it("normalizes user identifier (case-insensitive and trimmed)", () => {
    expect(normalizeIdentifier("  Carlos.Silva@Barbearia.COM ")).toBe(
      "carlos.silva@barbearia.com"
    );
  });

  it("exports expected anti-brute force configuration constants", () => {
    expect(RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS).toBe(5);
    expect(RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS).toBe(15 * 60 * 1000);
  });

  it("decrements remaining attempts on failed login attempts", () => {
    const f1 = recordFailedAttempt({ identifier: testUser, ip: testIp });
    expect(f1.locked).toBe(false);
    expect(f1.failedCount).toBe(1);
    expect(f1.remainingAttempts).toBe(4);

    const f2 = recordFailedAttempt({ identifier: testUser, ip: testIp });
    expect(f2.locked).toBe(false);
    expect(f2.failedCount).toBe(2);
    expect(f2.remainingAttempts).toBe(3);
  });

  it("triggers temporary lockout strictly on the 5th failed attempt", () => {
    for (let i = 1; i <= 4; i++) {
      const res = recordFailedAttempt({ identifier: testUser, ip: testIp });
      expect(res.locked).toBe(false);
    }

    // 5ª tentativa consecutiva incorreta ativa o bloqueio
    const fifthAttempt = recordFailedAttempt({ identifier: testUser, ip: testIp });
    expect(fifthAttempt.locked).toBe(true);
    expect(fifthAttempt.remainingAttempts).toBe(0);
    expect(fifthAttempt.retryAfterSeconds).toBe(900); // 15 minutos = 900s
    expect(fifthAttempt.message).toContain("bloqueados devido a múltiplas tentativas");

    // Verificação subsequente bloqueia com HTTP 429
    const blockedCheck = checkRateLimit({ identifier: testUser, ip: testIp });
    expect(blockedCheck.allowed).toBe(false);
    expect(blockedCheck.isLocked).toBe(true);
    expect(blockedCheck.statusCode).toBe(429);
    expect(blockedCheck.headers["Retry-After"]).toBeDefined();
    expect(blockedCheck.headers["X-RateLimit-Remaining"]).toBe("0");
  });

  it("resets failed attempts immediately upon successful login", () => {
    // 3 falhas acumuladas
    recordFailedAttempt({ identifier: testUser, ip: testIp });
    recordFailedAttempt({ identifier: testUser, ip: testIp });
    recordFailedAttempt({ identifier: testUser, ip: testIp });

    let status = checkRateLimit({ identifier: testUser, ip: testIp });
    expect(status.remainingAttempts).toBe(2);

    // Sucesso na autenticação
    recordSuccessfulAttempt({ identifier: testUser, ip: testIp });

    // Status deve retornar ao máximo de 5 tentativas
    status = checkRateLimit({ identifier: testUser, ip: testIp });
    expect(status.remainingAttempts).toBe(5);
    expect(status.isLocked).toBe(false);
  });

  it("provides compatible Express middleware setting headers and returning 429", () => {
    // Simula 5 falhas no IP
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt({ identifier: "any@domain.com", ip: "10.0.0.1" });
    }

    let capturedStatus = null;
    let capturedBody = null;
    const headersSent = {};

    const req = {
      body: { email: "any@domain.com" },
      headers: { "cf-connecting-ip": "10.0.0.1" },
    };

    const res = {
      setHeader: (key, val) => {
        headersSent[key] = val;
      },
      status: (code) => {
        capturedStatus = code;
        return {
          json: (body) => {
            capturedBody = body;
          },
        };
      },
    };

    let nextCalled = false;
    authRateLimitMiddleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(capturedStatus).toBe(429);
    expect(capturedBody.error).toBe("TOO_MANY_REQUESTS");
    expect(headersSent["Retry-After"]).toBeDefined();
  });
});

describe("3. Anti-User Enumeration (Generic Responses)", () => {
  beforeEach(() => {
    resetAttempts();
    resetCaptchaTokenCache();
  });

  it("returns generic 'Credenciais inválidas' message when password is wrong", async () => {
    const result = await secureLogin({
      email: "gestor.existente@vintageclub.com",
      password: "wrong_password_attempt",
      skipCaptchaForTest: true,
    });

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(401);
    // Não pode informar se a senha está errada para o usuário existente
    expect(result.error).toBe(AUTH_SECURITY_CONSTANTS.GENERIC_ERROR_MESSAGE);
    expect(result.error).toBe("Credenciais inválidas");
  });

  it("returns identical generic 'Credenciais inválidas' message when user does NOT exist", async () => {
    const result = await secureLogin({
      email: "inexistente.totalmente.aleatorio.9912@naoexiste.com",
      password: "any_dummy_password",
      skipCaptchaForTest: true,
    });

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(401);
    // Mensagem idêntica impede enumeração e scraping de diretório de usuários
    expect(result.error).toBe(AUTH_SECURITY_CONSTANTS.GENERIC_ERROR_MESSAGE);
    expect(result.error).toBe("Credenciais inválidas");
  });

  it("returns neutral confirmation on password reset request regardless of email existence", async () => {
    const existing = await securePasswordResetRequest({
      email: "gestor@vintageclub.com",
      skipCaptchaForTest: true,
    });

    const nonExisting = await securePasswordResetRequest({
      email: "conta_fantasma_desconhecida@barbearia.com",
      skipCaptchaForTest: true,
    });

    expect(existing.success).toBe(true);
    expect(nonExisting.success).toBe(true);
    expect(existing.message).toBe(nonExisting.message);
    expect(existing.message).toContain("Se o e-mail informado estiver cadastrado");
  });
});

describe("4. Password Hashing Delegation to Supabase Auth", () => {
  it("audits that password hashing is exclusively delegated to Supabase Auth (Argon2id/bcrypt)", () => {
    const policy = auditPasswordHashingPolicy();

    expect(policy.clientSideHashingDetected).toBe(false);
    expect(policy.status).toBe("CONFORME_OWASP_ASVS");
    expect(policy.serverSideDelegatedTarget).toContain("Supabase GoTrue Auth");
    expect(policy.delegatedAlgorithms).toContain("Argon2id");
    expect(policy.delegatedAlgorithms).toContain("bcrypt (Cost Factor >= 10)");
  });
});

describe("5. End-to-End Secure Login Orchestration", () => {
  beforeEach(() => {
    resetAttempts();
    resetCaptchaTokenCache();
  });

  it("blocks login if CAPTCHA challenge is not fulfilled", async () => {
    const loginAttempt = await secureLogin({
      email: "dono@barbearia.com",
      password: "ValidPassword123!",
      captchaToken: null, // Sem token
    });

    expect(loginAttempt.success).toBe(false);
    expect(loginAttempt.isCaptchaError).toBe(true);
    expect(loginAttempt.statusCode).toBe(400);
  });

  it("blocks login if CAPTCHA token is fake or bot-generated", async () => {
    const loginAttempt = await secureLogin({
      email: "dono@barbearia.com",
      password: "ValidPassword123!",
      captchaToken: CAPTCHA_TEST_TOKENS.INVALID_FAIL,
    });

    expect(loginAttempt.success).toBe(false);
    expect(loginAttempt.isCaptchaError).toBe(true);
    expect(loginAttempt.statusCode).toBe(400);
  });

  it("enforces full anti-brute force pipeline with valid CAPTCHA: 5 failures lock account", async () => {
    const targetEmail = "alvo.ataque@vintageclub.com";

    for (let i = 1; i <= 5; i++) {
      // Re-injeta token para cada tentativa simulando usuário ou bot resolvendo captcha
      resetCaptchaTokenCache();
      const attempt = await secureLogin({
        email: targetEmail,
        password: `senha_errada_${i}`,
        captchaToken: CAPTCHA_TEST_TOKENS.VALID_PASS,
      });

      if (i < 5) {
        expect(attempt.success).toBe(false);
        expect(attempt.isLocked).toBe(false);
        expect(attempt.statusCode).toBe(401);
        expect(attempt.error).toBe("Credenciais inválidas");
        expect(attempt.remainingAttempts).toBe(5 - i);
      } else {
        // 5ª falha: aciona lockout
        expect(attempt.success).toBe(false);
        expect(attempt.isLocked).toBe(true);
        expect(attempt.statusCode).toBe(429);
        expect(attempt.remainingAttempts).toBe(0);
        expect(attempt.retryAfterSeconds).toBeGreaterThan(0);
      }
    }

    // Tentativa subsequente é barrada imediatamente pelo rate-limiter
    const lockedAttempt = await secureLogin({
      email: targetEmail,
      password: "qualquer_senha",
      skipCaptchaForTest: true,
    });
    expect(lockedAttempt.isLocked).toBe(true);
    expect(lockedAttempt.statusCode).toBe(429);
  });
});

describe("6. Secure Registration & Password Recovery Pipeline", () => {
  beforeEach(() => {
    resetAttempts();
    resetCaptchaTokenCache();
  });

  it("blocks registration if CAPTCHA token is missing", async () => {
    const res = await secureSignUp({
      email: "novo.dono@barbearia.com",
      password: "MinhaSenhaForte2026!",
      captchaToken: null,
    });

    expect(res.success).toBe(false);
    expect(res.isCaptchaError).toBe(true);
    expect(res.statusCode).toBe(400);
    expect(res.error).toContain("CAPTCHA");
  });

  it("blocks registration if CAPTCHA token is fraudulent/bot", async () => {
    const res = await secureSignUp({
      email: "bot.cadastrador@spam.com",
      password: "MinhaSenhaForte2026!",
      captchaToken: CAPTCHA_TEST_TOKENS.INVALID_FAIL,
    });

    expect(res.success).toBe(false);
    expect(res.isCaptchaError).toBe(true);
    expect(res.statusCode).toBe(400);
  });

  it("blocks password reset request when CAPTCHA is missing and not skipped", async () => {
    const res = await securePasswordResetRequest({
      email: "usuario@barbearia.com",
      captchaToken: null,
      skipCaptchaForTest: false,
    });

    expect(res.success).toBe(false);
    expect(res.statusCode).toBe(400);
    expect(res.error).toContain("segurança");
  });

  it("processes password reset with valid CAPTCHA returning uniform neutral message", async () => {
    const res = await securePasswordResetRequest({
      email: "usuario@barbearia.com",
      captchaToken: CAPTCHA_TEST_TOKENS.VALID_PASS,
      skipCaptchaForTest: false,
    });

    expect(res.success).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.message).toBe(AUTH_SECURITY_CONSTANTS.PASSWORD_RECOVERY_GENERIC_MESSAGE);
  });
});
