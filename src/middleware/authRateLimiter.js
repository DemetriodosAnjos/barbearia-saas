/**
 * ============================================================================
 * AUTH RATE LIMITER & ANTI-BRUTE FORCE MIDDLEWARE
 * ============================================================================
 * Módulo de mitigação de ataques de força bruta, credential stuffing
 * e ataques de dicionário em rotas de autenticação (Login, Registro e Recuperação).
 *
 * ESPECIFICAÇÃO DE SEGURANÇA:
 * 1. Limite estrito de 5 tentativas incorretas consecutivas (MAX_FAILED_ATTEMPTS = 5).
 * 2. Bloqueio temporário (Lockout) de 15 minutos (900.000 ms) ao atingir o limite.
 * 3. Identificação bivalente: rastreia por identificador do usuário (e-mail normalizado)
 *    e pelo IP do cliente (ou fingerprint/session) simultaneamente.
 * 4. Headers padrão de Rate-Limiting (IETF / RFC 6585 / Draft):
 *    - Retry-After
 *    - X-RateLimit-Limit
 *    - X-RateLimit-Remaining
 *    - X-RateLimit-Reset
 * 5. Proteção contra enumeração de usuários: Resposta estritamente genérica
 *    ("Credenciais inválidas") em qualquer falha de verificação de senha ou conta inexistente.
 * 6. Reset imediato do contador em caso de autenticação bem-sucedida.
 * ============================================================================
 */

export const RATE_LIMIT_CONFIG = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutos (900.000 ms)
  GENERIC_AUTH_ERROR_MESSAGE: "Credenciais inválidas",
  LOCKOUT_ERROR_MESSAGE:
    "Conta ou IP temporariamente bloqueados devido a múltiplas tentativas incorretas. Tente novamente em 15 minutos.",
};

// Armazenamento em memória para rastreamento de tentativas
// Chave: `id:${normalizedEmail}` ou `ip:${clientIp}`
const attemptsStore = new Map();

/**
 * Normaliza o identificador do usuário (e-mail em caixa baixa e sem espaços)
 * @param {string} identifier
 * @returns {string}
 */
export function normalizeIdentifier(identifier) {
  if (!identifier || typeof identifier !== "string") return "anonymous";
  return identifier.trim().toLowerCase();
}

/**
 * Obtém a chave de armazenamento para o identificador
 */
function getStoreKey(identifier, ip) {
  const normId = normalizeIdentifier(identifier);
  const safeIp = (ip || "127.0.0.1").trim();
  return {
    idKey: `user:${normId}`,
    ipKey: `ip:${safeIp}`,
  };
}

/**
 * Recupera ou inicializa o registro de tentativas
 */
function getRecord(key) {
  const now = Date.now();
  let record = attemptsStore.get(key);

  if (!record) {
    record = {
      failedCount: 0,
      lockedUntil: null,
      firstAttemptAt: now,
      lastAttemptAt: now,
    };
    attemptsStore.set(key, record);
    return record;
  }

  // Se o bloqueio já expirou, reseta o registro automaticamente
  if (record.lockedUntil && now > record.lockedUntil) {
    record.failedCount = 0;
    record.lockedUntil = null;
    record.firstAttemptAt = now;
  }

  return record;
}

/**
 * Checa o status de rate-limiting antes de processar a autenticação
 *
 * @param {object} params
 * @param {string} params.identifier - E-mail ou username do usuário
 * @param {string} [params.ip] - IP remoto do cliente
 * @returns {{
 *   allowed: boolean,
 *   isLocked: boolean,
 *   remainingAttempts: number,
 *   retryAfterSeconds: number,
 *   headers: Record<string, string>,
 *   message?: string
 * }}
 */
export function checkRateLimit({ identifier, ip = "127.0.0.1" }) {
  const now = Date.now();
  const { idKey, ipKey } = getStoreKey(identifier, ip);

  const idRecord = getRecord(idKey);
  const ipRecord = getRecord(ipKey);

  // Determina se há bloqueio ativo em nível de conta ou de IP
  const idLocked = idRecord.lockedUntil && now < idRecord.lockedUntil;
  const ipLocked = ipRecord.lockedUntil && now < ipRecord.lockedUntil;

  if (idLocked || ipLocked) {
    const lockedUntil = Math.max(
      idRecord.lockedUntil || 0,
      ipRecord.lockedUntil || 0
    );
    const retryAfterSeconds = Math.max(1, Math.ceil((lockedUntil - now) / 1000));
    const minutesLeft = Math.ceil(retryAfterSeconds / 60);

    const headers = {
      "Retry-After": String(retryAfterSeconds),
      "X-RateLimit-Limit": String(RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS),
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": String(Math.floor(lockedUntil / 1000)),
    };

    return {
      allowed: false,
      isLocked: true,
      statusCode: 429,
      remainingAttempts: 0,
      retryAfterSeconds,
      headers,
      message: `Conta temporariamente bloqueada por segurança devido a ${RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS} tentativas inválidas. Tente novamente em ${minutesLeft} minuto(s).`,
    };
  }

  // Calcula tentativas restantes (baseado no maior número de falhas entre ID e IP)
  const maxFailed = Math.max(idRecord.failedCount, ipRecord.failedCount);
  const remainingAttempts = Math.max(0, RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS - maxFailed);

  const headers = {
    "X-RateLimit-Limit": String(RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS),
    "X-RateLimit-Remaining": String(remainingAttempts),
    "X-RateLimit-Reset": String(Math.floor((now + RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS) / 1000)),
  };

  return {
    allowed: true,
    isLocked: false,
    statusCode: 200,
    remainingAttempts,
    retryAfterSeconds: 0,
    headers,
  };
}

/**
 * Registra uma falha de autenticação e aplica o bloqueio se atingir 5 tentativas
 *
 * @param {object} params
 * @param {string} params.identifier - E-mail do usuário
 * @param {string} [params.ip] - IP remoto do cliente
 * @returns {{
 *   locked: boolean,
 *   failedCount: number,
 *   remainingAttempts: number,
 *   lockedUntil?: number,
 *   retryAfterSeconds?: number,
 *   message: string
 * }}
 */
export function recordFailedAttempt({ identifier, ip = "127.0.0.1" }) {
  const now = Date.now();
  const { idKey, ipKey } = getStoreKey(identifier, ip);

  const idRecord = getRecord(idKey);
  const ipRecord = getRecord(ipKey);

  idRecord.failedCount += 1;
  idRecord.lastAttemptAt = now;

  ipRecord.failedCount += 1;
  ipRecord.lastAttemptAt = now;

  const currentMax = Math.max(idRecord.failedCount, ipRecord.failedCount);

  // Se atingiu o limite de 5 tentativas, ativa o lockout de 15 minutos
  if (currentMax >= RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS) {
    const lockedUntil = now + RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS;
    idRecord.lockedUntil = lockedUntil;
    ipRecord.lockedUntil = lockedUntil;

    const retryAfterSeconds = Math.ceil(RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS / 1000);

    return {
      locked: true,
      failedCount: currentMax,
      remainingAttempts: 0,
      lockedUntil,
      retryAfterSeconds,
      message: RATE_LIMIT_CONFIG.LOCKOUT_ERROR_MESSAGE,
    };
  }

  const remaining = RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS - currentMax;

  return {
    locked: false,
    failedCount: currentMax,
    remainingAttempts: remaining,
    // Garante resposta genérica para evitar enumeração de usuários
    message: RATE_LIMIT_CONFIG.GENERIC_AUTH_ERROR_MESSAGE,
  };
}

/**
 * Reseta o contador de tentativas após uma autenticação bem-sucedida
 *
 * @param {object} params
 * @param {string} params.identifier
 * @param {string} [params.ip]
 */
export function recordSuccessfulAttempt({ identifier, ip = "127.0.0.1" }) {
  const { idKey, ipKey } = getStoreKey(identifier, ip);
  attemptsStore.delete(idKey);
  // Opcionalmente decrementa ou remove falhas do IP após sucesso
  const ipRecord = attemptsStore.get(ipKey);
  if (ipRecord && !ipRecord.lockedUntil) {
    ipRecord.failedCount = 0;
  }
}

/**
 * Consulta o status atual de bloqueio de um identificador
 *
 * @param {string} identifier
 * @param {string} [ip]
 */
export function getLockoutStatus(identifier, ip = "127.0.0.1") {
  return checkRateLimit({ identifier, ip });
}

/**
 * Desbloqueio manual de emergência (uso por SuperAdmins ou testes unitários)
 *
 * @param {string} [identifier]
 * @param {string} [ip]
 */
export function resetAttempts(identifier, ip) {
  if (!identifier && !ip) {
    attemptsStore.clear();
    return;
  }
  if (identifier) {
    attemptsStore.delete(`user:${normalizeIdentifier(identifier)}`);
  }
  if (ip) {
    attemptsStore.delete(`ip:${ip.trim()}`);
  }
}

/**
 * Middleware Express compatível para rotas de backend/proxy
 * Exemplo de uso: app.post("/api/auth/login", authRateLimitMiddleware, loginHandler);
 */
export function authRateLimitMiddleware(req, res, next) {
  const clientIp =
    req.headers?.["cf-connecting-ip"] ||
    req.headers?.["x-forwarded-for"]?.split(",")[0] ||
    req.ip ||
    "127.0.0.1";

  const identifier = req.body?.email || req.body?.username || "anonymous";

  const check = checkRateLimit({ identifier, ip: clientIp });

  // Aplica headers de rate-limit na resposta HTTP
  Object.entries(check.headers).forEach(([header, value]) => {
    res.setHeader?.(header, value);
  });

  if (!check.allowed) {
    return res.status?.(429).json?.({
      error: "TOO_MANY_REQUESTS",
      message: check.message,
      retryAfterSeconds: check.retryAfterSeconds,
    }) || res;
  }

  if (next) next();
}
