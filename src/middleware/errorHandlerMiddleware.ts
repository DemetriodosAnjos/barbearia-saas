/**
 * src/middleware/errorHandlerMiddleware.ts
 *
 * Middleware Global de Tratamento de Erros e Exceções Centralizado.
 * Compatível com APIs Node.js/Express e Supabase Edge Functions (Deno/TypeScript).
 *
 * Características e Defesas de Segurança:
 * 1. Respostas HTTP 500 Padronizadas: Retorna estritamente uma mensagem genérica segura e um `requestId` (UUID único).
 * 2. Omissão Absoluta de Stack Traces: Elimina a propriedade `stack` do corpo de todas as respostas HTTP.
 * 3. Sanitização contra Vazamento de SQL: Suprime nomes de tabelas, colunas, queries e detalhes do PostgreSQL/Drizzle/Prisma.
 * 4. Sanitização contra Vazamento de Variáveis de Ambiente e Credenciais: Redige chaves do Supabase, URLs de banco e tokens.
 * 5. Logging Seguro Integrado: Envia logs estruturados para o `secureLogger` com redação de dados sigilosos e preservação de rastreabilidade (X-Request-Id).
 * 6. Compatibilidade Dual: Fornece middleware padrão Express `errorHandlerMiddleware` e wrapper para Edge Functions `wrapEdgeFunctionHandler`.
 */

import {
  secureLogger,
  generateRequestId,
  redactSensitiveData,
} from "../utils/secureLogger";

export const GENERIC_500_MESSAGE =
  "Ocorreu um erro interno no servidor. Por favor, tente novamente mais tarde ou contate o suporte com o identificador da requisição.";

export const GENERIC_500_CODE = "INTERNAL_SERVER_ERROR";

/**
 * Classes de Erros Operacionais Customizados
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 400,
    errorCode: string = "APPLICATION_ERROR",
    details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Requisição inválida", errorCode = "BAD_REQUEST", details?: unknown) {
    super(message, 400, errorCode, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Autenticação requerida", errorCode = "UNAUTHORIZED") {
    super(message, 401, errorCode);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acesso negado para este recurso", errorCode = "FORBIDDEN") {
    super(message, 403, errorCode);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado", errorCode = "NOT_FOUND") {
    super(message, 404, errorCode);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflito de integridade", errorCode = "RESOURCE_CONFLICT") {
    super(message, 409, errorCode);
  }
}

export class InternalServerError extends AppError {
  constructor(message = GENERIC_500_MESSAGE, errorCode = GENERIC_500_CODE) {
    super(message, 500, errorCode);
  }
}

/**
 * Padrões de Conteúdo Sensível de Infraestrutura que DEVEM ser suprimidos
 */
const SQL_LEAK_PATTERNS = [
  /relation\s+["']?[a-zA-Z0-9_.]+["']?\s+does not exist/gi,
  /syntax error at or near/gi,
  /violates foreign key constraint/gi,
  /duplicate key value violates unique constraint/gi,
  /column\s+["']?[a-zA-Z0-9_]+["']?\s+does not exist/gi,
  /pg_catalog/gi,
  /select\s+.*?\s+from/gi,
  /insert\s+into\s+[a-zA-Z0-9_]+/gi,
  /update\s+[a-zA-Z0-9_]+\s+set/gi,
  /delete\s+from\s+[a-zA-Z0-9_]+/gi,
  /\b(?:customers|barbershop_tenants|barbershop_appointments|users|auth\.users|fiscal_invoices|audit_logs)\b/gi,
];

const ENV_SECRET_PATTERNS = [
  /SUPABASE_SERVICE_ROLE_KEY/gi,
  /SUPABASE_URL/gi,
  /DATABASE_URL/gi,
  /JWT_SECRET/gi,
  /MERCADO_PAGO_ACCESS_TOKEN/gi,
  /postgres(?:ql)?:\/\/[^\s]+/gi,
  /ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+/g,
  /[a-zA-Z0-9_-]{32,}/g,
];

/**
 * Sanitiza o payload público de resposta para o cliente.
 * Garante que NUNCA haja stack traces, nomes de tabelas SQL ou variáveis de ambiente.
 */
export function sanitizePublicErrorResponse(
  error: unknown,
  requestId: string
): {
  statusCode: number;
  body: {
    success: false;
    error: {
      code: string;
      message: string;
      requestId: string;
      timestamp: string;
      details?: unknown;
    };
  };
} {
  const isOperational = error instanceof AppError && error.isOperational;
  const rawStatusCode = isOperational ? (error as AppError).statusCode : 500;
  const isInternal500 = rawStatusCode >= 500;

  let publicCode = isOperational ? (error as AppError).errorCode : GENERIC_500_CODE;
  let publicMessage = isOperational ? (error as AppError).message : GENERIC_500_MESSAGE;
  let publicDetails: unknown = undefined;

  // Se for 500 (ou erro não operacional inesperado), força mensagem genérica
  if (isInternal500 || !isOperational) {
    publicCode = GENERIC_500_CODE;
    publicMessage = GENERIC_500_MESSAGE;
    publicDetails = undefined; // Nunca vazar detalhes internos em erros 500
  } else if (isOperational && (error as AppError).details) {
    // Para erros 4xx operacionais com detalhes (ex: validação de formulário),
    // higienizar recursivamente para prevenir vazamento acidental
    publicDetails = redactSensitiveData((error as AppError).details);
  }

  // Defesa em Profundidade: Inspeção final na mensagem pública contra qualquer resquício de SQL ou credenciais
  for (const pattern of SQL_LEAK_PATTERNS) {
    if (pattern.test(publicMessage)) {
      publicMessage = GENERIC_500_MESSAGE;
      publicCode = GENERIC_500_CODE;
      break;
    }
  }

  for (const pattern of ENV_SECRET_PATTERNS) {
    if (pattern.test(publicMessage)) {
      publicMessage = GENERIC_500_MESSAGE;
      publicCode = GENERIC_500_CODE;
      break;
    }
  }

  const responseBody = {
    success: false as const,
    error: {
      code: publicCode,
      message: publicMessage,
      requestId,
      timestamp: new Date().toISOString(),
      ...(publicDetails !== undefined ? { details: publicDetails } : {}),
    },
  };

  // Verificação explícita: garantir que a chave 'stack' NUNCA exista no objeto retornado
  delete (responseBody as any).stack;
  delete (responseBody.error as any).stack;

  return {
    statusCode: isInternal500 ? 500 : rawStatusCode,
    body: responseBody,
  };
}

/**
 * Extrai ou gera o UUID de correlação da requisição
 */
export function resolveRequestId(req: any): string {
  if (req?.id && typeof req.id === "string") return req.id;
  const headerId =
    req?.headers?.["x-request-id"] ||
    req?.headers?.["X-Request-Id"] ||
    req?.headers?.get?.("x-request-id");
  if (headerId && typeof headerId === "string") return headerId;
  return generateRequestId();
}

/**
 * Middleware Centralizado de Erros para Express / Node.js
 * Assinatura padrão Express: (err, req, res, next)
 */
export function errorHandlerMiddleware(
  err: any,
  req: any,
  res: any,
  _next?: any
): void {
  const requestId = resolveRequestId(req);

  // 1. Log interno estruturado e seguro (registra stack trace e contexto apenas internamente)
  secureLogger.error(
    `[API Exception] ${err?.message || "Exceção não tratada capturada"}`,
    requestId,
    {
      method: req?.method,
      path: req?.url || req?.originalUrl,
      headers: req?.headers,
      ip: req?.ip,
    },
    err
  );

  // 2. Higienização rigorosa da resposta pública
  const { statusCode, body } = sanitizePublicErrorResponse(err, requestId);

  // 3. Envio seguro da resposta com headers anti-vazamento
  if (res && typeof res.status === "function") {
    if (typeof res.setHeader === "function") {
      res.setHeader("X-Request-Id", requestId);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("X-Content-Type-Options", "nosniff");
    }
    res.status(statusCode).json(body);
  }
}

/**
 * Wrapper de Segurança para Supabase Edge Functions / Deno HTTP Handlers
 * 
 * Uso:
 * serve(wrapEdgeFunctionHandler(async (req) => {
 *   // lógica da função
 *   return new Response(JSON.stringify({ ok: true }));
 * }));
 */
export function wrapEdgeFunctionHandler(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const requestId = req.headers.get("x-request-id") || generateRequestId();

    try {
      const response = await handler(req);
      // Anexar X-Request-Id na resposta se ainda não presente
      const headers = new Headers(response.headers);
      if (!headers.has("X-Request-Id")) {
        headers.set("X-Request-Id", requestId);
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (unhandledError) {
      // 1. Logging interno seguro com stack trace isolado
      secureLogger.error(
        `[Edge Function Exception] ${unhandledError instanceof Error ? unhandledError.message : "Falha na Edge Function"}`,
        requestId,
        {
          url: req.url,
          method: req.method,
        },
        unhandledError
      );

      // 2. Sanitização da resposta para o cliente
      const { statusCode, body } = sanitizePublicErrorResponse(unhandledError, requestId);

      return new Response(JSON.stringify(body), {
        status: statusCode,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Request-Id": requestId,
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  };
}
