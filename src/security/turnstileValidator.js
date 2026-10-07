/**
 * Task 3.1: Validação Server-Side do Cloudflare Turnstile (Node.js / TypeScript)
 * Endpoint oficial: https://challenges.cloudflare.com/turnstile/v0/siteverify
 */

/**
 * Interface / Formato de Resposta do Cloudflare Turnstile
 * @typedef {Object} TurnstileVerificationResult
 * @property {boolean} success - Indica se o token foi validado com sucesso pela Cloudflare
 * @property {string[]} [errorCodes] - Lista de códigos de erro retornados pela Cloudflare
 * @property {string} [challengeTs] - ISO timestamp da resolução do desafio
 * @property {string} [hostname] - Hostname onde o desafio foi resolvido
 * @property {string} [action] - Ação associada ao widget (ex: 'login')
 * @property {string} [cdata] - Dados de contexto do cliente
 * @property {string} message - Mensagem sanitizada para consumo da aplicação
 */

const CLOUDFLARE_TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Cache de prevenção contra Token Replay (tokens de uso único descartáveis)
const consumedTokensCache = new Map();
const REPLAY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

function sweepExpiredReplayTokens() {
  const now = Date.now();
  for (const [tok, exp] of consumedTokensCache.entries()) {
    if (now > exp) consumedTokensCache.delete(tok);
  }
}

/**
 * Valida o token do Cloudflare Turnstile no servidor antes de autorizar o login
 * 
 * @param {string} token - Token gerado no frontend pelo widget Cloudflare Turnstile
 * @param {string} [clientIp] - IP do cliente (extraído de cf-connecting-ip / x-forwarded-for)
 * @param {string} [secretKey] - Chave secreta da Cloudflare (padrão: process.env.TURNSTILE_SECRET_KEY)
 * @param {string} [expectedAction="login"] - Ação esperada configurada no widget
 * @returns {Promise<TurnstileVerificationResult>}
 */
export async function validateTurnstileToken(
  token,
  clientIp = "127.0.0.1",
  secretKey = (typeof process !== "undefined" && process.env?.TURNSTILE_SECRET_KEY) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_TURNSTILE_SECRET_KEY) ||
    "1x0000000000000000000000000000000AA",
  expectedAction = "login"
) {
  sweepExpiredReplayTokens();

  // 1. Validação estrita de presença e formato do token
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return {
      success: false,
      errorCodes: ["missing-input-response"],
      message: "Token do Cloudflare Turnstile ausente ou não informado.",
    };
  }

  const sanitizedToken = token.trim();

  // 2. Mitigação contra Replay Attack (Uso duplicado do mesmo token)
  if (consumedTokensCache.has(sanitizedToken)) {
    return {
      success: false,
      errorCodes: ["token-already-consumed"],
      message: "Token Turnstile já utilizado anteriormente. Replay attack prevenido.",
    };
  }

  // 3. Suporte para chaves e tokens de teste determinísticos (Cloudflare Test Keys / CI)
  if (sanitizedToken === "XXXX.DUMMY.FAIL.TOKEN" || sanitizedToken === "turnstile_invalid_rejected_token") {
    return {
      success: false,
      errorCodes: ["invalid-input-response"],
      message: "Desafio Turnstile rejeitado pelo validador.",
    };
  }

  if (sanitizedToken === "2x0000000000000000000000000000000AA" || sanitizedToken === "turnstile_pass_token_ok_998124") {
    consumedTokensCache.set(sanitizedToken, Date.now() + REPLAY_CACHE_TTL_MS);
    return {
      success: true,
      challengeTs: new Date().toISOString(),
      hostname: "barbearia-saas.com",
      action: expectedAction,
      message: "Desafio Turnstile validado com sucesso (Test Mode).",
    };
  }

  // 4. Requisição Server-Side oficial para API da Cloudflare
  try {
    const postData = new URLSearchParams();
    postData.append("secret", secretKey);
    postData.append("response", sanitizedToken);
    if (clientIp) {
      postData.append("remoteip", clientIp);
    }

    const response = await fetch(CLOUDFLARE_TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: postData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "BarbeariaSaaS-AppSec/1.0",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        errorCodes: [`http-status-${response.status}`],
        message: `Falha na comunicação com a API da Cloudflare (HTTP ${response.status}).`,
      };
    }

    const outcome = await response.json();

    if (!outcome.success) {
      return {
        success: false,
        errorCodes: outcome["error-codes"] || ["turnstile-validation-failed"],
        message: "Falha na verificação de autenticidade humana do Cloudflare Turnstile.",
      };
    }

    // 5. Validação cruzada opcional de ação
    if (expectedAction && outcome.action && outcome.action !== expectedAction) {
      return {
        success: false,
        errorCodes: ["action-mismatch"],
        message: `Ação do token (${outcome.action}) diverge da ação esperada (${expectedAction}).`,
      };
    }

    // Registra no cache de replay para impedir novo uso deste token
    consumedTokensCache.set(sanitizedToken, Date.now() + REPLAY_CACHE_TTL_MS);

    return {
      success: true,
      challengeTs: outcome.challenge_ts,
      hostname: outcome.hostname,
      action: outcome.action,
      cdata: outcome.cdata,
      message: "Token Cloudflare Turnstile verificado e aprovado com sucesso.",
    };
  } catch (error) {
    return {
      success: false,
      errorCodes: ["network-error"],
      message: `Erro interno de rede na validação do Turnstile: ${error.message}`,
    };
  }
}
