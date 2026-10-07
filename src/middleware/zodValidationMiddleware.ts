/**
 * src/middleware/zodValidationMiddleware.ts
 *
 * Middleware Genérico de Validação de Schemas com Zod para Node.js / Express / TypeScript.
 *
 * Características e Defesas Implementadas:
 * 1. Validação Completa de Entradas: Valida `body`, `query`, `params` e `headers` customizados.
 * 2. Prevenção de Mass Assignment: Garante a aplicação de `.strip()` em todos os objetos,
 *    rejeitando e expurgando automaticamente quaisquer campos não declarados antes do
 *    processamento de qualquer regra de negócio.
 * 3. Limite de Payload (DoS Defense): Inspeciona o tamanho em bytes do payload recebido,
 *    bloqueando requisições acima do limite estabelecido antes de acionar o parser.
 * 4. Resposta Padronizada de Segurança: Retorna HTTP 400 Bad Request com estrutura
 *    detalhada, sem vazar stacktraces ou detalhes internos de infraestrutura.
 */

import { ZodError, ZodTypeAny, ZodObject } from "zod";

export interface SchemaValidationOptions {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
  headers?: ZodTypeAny;
  /** Limite máximo do payload do corpo em bytes (padrão: 256KB = 262144 bytes) */
  maxPayloadBytes?: number;
  /** Se true, rejeita explicitamente requisições com campos extras além de limpá-los */
  rejectUnknown?: boolean;
}

export interface ValidationIncidentResponse {
  status: 400 | 422;
  error: "Bad Request" | "Unprocessable Entity";
  code:
    | "SCHEMA_VALIDATION_ERROR"
    | "PAYLOAD_TOO_LARGE"
    | "PAYLOAD_NESTING_EXCEEDED"
    | "NULL_BYTE_DETECTED"
    | "MALFORMED_UNICODE_PAYLOAD"
    | "CONTRACT_VIOLATION";
  message: string;
  details: FormattedValidationError[];
  incident: {
    timestamp: string;
    path?: string;
    method?: string;
    correlationId?: string;
  };
}

const DEFAULT_MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB
const MAX_ALLOWED_NESTING_DEPTH = 15; // Proteção contra estouro de pilha e recursão excessiva

/**
 * Detecta recursão profunda e complexidade de aninhamento excessiva (Anti-DoS / AST bomb)
 */
export function calculateObjectDepth(obj: unknown, currentDepth = 0): number {
  if (currentDepth > MAX_ALLOWED_NESTING_DEPTH) return currentDepth;
  if (!obj || typeof obj !== "object") return currentDepth;
  
  let maxChildDepth = currentDepth;
  try {
    const values = Array.isArray(obj) ? obj : Object.values(obj as Record<string, unknown>);
    for (const val of values) {
      if (val && typeof val === "object") {
        const d = calculateObjectDepth(val, currentDepth + 1);
        if (d > maxChildDepth) maxChildDepth = d;
        if (maxChildDepth > MAX_ALLOWED_NESTING_DEPTH) return maxChildDepth;
      }
    }
  } catch {
    return MAX_ALLOWED_NESTING_DEPTH + 1;
  }
  return maxChildDepth;
}

/**
 * Detecta injeção de bytes nulos (\0, \u0000) em qualquer campo do payload (CWE-158)
 */
export function detectNullBytesInPayload(val: unknown): boolean {
  if (typeof val === "string") {
    return val.includes("\0") || val.includes("\u0000") || /%00/i.test(val);
  }
  if (!val || typeof val !== "object") return false;
  
  try {
    const entries = Array.isArray(val) ? val : Object.entries(val as Record<string, unknown>);
    for (const item of entries) {
      if (Array.isArray(val)) {
        if (detectNullBytesInPayload(item)) return true;
      } else {
        const [k, v] = item as [string, unknown];
        if (typeof k === "string" && (k.includes("\0") || k.includes("\u0000"))) return true;
        if (detectNullBytesInPayload(v)) return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Converte ZodError em lista limpa e amigável para APIs seguras
 */
export function formatZodErrors(error: ZodError, scope: string): FormattedValidationError[] {
  return error.issues.map((issue) => {
    const fieldPath = issue.path.length > 0 ? `${scope}.${issue.path.join(".")}` : scope;
    return {
      field: fieldPath,
      message: issue.message,
      code: issue.code,
    };
  });
}

/**
 * Verifica se um objeto possui propriedades extras não declaradas no ZodObject
 */
export function detectExtraKeys(rawObj: unknown, schema: ZodTypeAny): string[] {
  if (!rawObj || typeof rawObj !== "object" || Array.isArray(rawObj)) return [];
  if (!(schema instanceof ZodObject)) return [];

  const declaredKeys = new Set(Object.keys(schema.shape));
  const receivedKeys = Object.keys(rawObj as Record<string, unknown>);
  return receivedKeys.filter((key) => !declaredKeys.has(key));
}

/**
 * Validador estático e assíncrono para execução direta em rotas, lambdas ou testes
 */
export function validateRequestData(
  req: {
    body?: any;
    query?: any;
    params?: any;
    headers?: any;
    path?: string;
    url?: string;
    method?: string;
  },
  schemaOptions: SchemaValidationOptions
): {
  success: boolean;
  sanitizedData?: {
    body?: any;
    query?: any;
    params?: any;
    headers?: any;
  };
  errorResponse?: ValidationIncidentResponse;
} {
  const maxBytes = schemaOptions.maxPayloadBytes || DEFAULT_MAX_PAYLOAD_BYTES;
  const path = req.path || (typeof req.url === "string" ? req.url : "");
  const method = req.method || "POST";
  const allErrors: FormattedValidationError[] = [];
  const sanitized: { body?: any; query?: any; params?: any; headers?: any } = {};

  // 1. Verificação de Limite de Payload (Proteção DoS / Memory Exhaustion - 5MB+ Fuzzing)
  if (req.body !== undefined && req.body !== null) {
    let byteLength = 0;
    try {
      if (typeof req.body === "string") {
        byteLength = new TextEncoder().encode(req.body).length;
      } else if (Buffer.isBuffer(req.body)) {
        byteLength = req.body.length;
      } else {
        const bodyString = JSON.stringify(req.body);
        byteLength = new TextEncoder().encode(bodyString).length;
      }
    } catch {
      // Falha ao serializar (ex: referência circular ou overflow)
      return {
        success: false,
        errorResponse: {
          status: 400,
          error: "Bad Request",
          code: "PAYLOAD_NESTING_EXCEEDED",
          message: "Estrutura de dados corrompida ou com referência circular rejeitada.",
          details: [{ field: "body", message: "Payload malformado ou recursivo.", code: "circular_reference" }],
          incident: { timestamp: new Date().toISOString(), path, method },
        },
      };
    }

    if (byteLength > maxBytes) {
      return {
        success: false,
        errorResponse: {
          status: 400,
          error: "Bad Request",
          code: "PAYLOAD_TOO_LARGE",
          message: `Payload excede o limite máximo permitido de ${Math.round(maxBytes / 1024)}KB (${byteLength} bytes recebidos).`,
          details: [
            {
              field: "body",
              message: `Tamanho de payload (${byteLength} bytes) viola a política de segurança da API.`,
              code: "payload_too_large",
            },
          ],
          incident: {
            timestamp: new Date().toISOString(),
            path,
            method,
          },
        },
      };
    }

    // 1.1 Fuzzing Check: Verificação de Profundidade de Aninhamento (Anti-Recursion Bomb)
    const nestingDepth = calculateObjectDepth(req.body);
    if (nestingDepth > MAX_ALLOWED_NESTING_DEPTH) {
      return {
        success: false,
        errorResponse: {
          status: 422,
          error: "Unprocessable Entity",
          code: "PAYLOAD_NESTING_EXCEEDED",
          message: `Nível de profundidade do JSON (${nestingDepth}) ultrapassa o limite seguro de ${MAX_ALLOWED_NESTING_DEPTH} níveis.`,
          details: [
            {
              field: "body",
              message: "Profundidade de aninhamento excessiva detectada.",
              code: "max_depth_exceeded",
            },
          ],
          incident: { timestamp: new Date().toISOString(), path, method },
        },
      };
    }

    // 1.2 Fuzzing Check: Detecção de Caracteres Nulos (\0, \u0000)
    if (detectNullBytesInPayload(req.body)) {
      return {
        success: false,
        errorResponse: {
          status: 400,
          error: "Bad Request",
          code: "NULL_BYTE_DETECTED",
          message: "Caractere nulo (null byte \\u0000) detectado no payload. Rejeitado por segurança (CWE-158).",
          details: [
            {
              field: "body",
              message: "Injeção de caractere nulo terminador é proibida na API.",
              code: "poison_null_byte",
            },
          ],
          incident: { timestamp: new Date().toISOString(), path, method },
        },
      };
    }
  }

  // 2. Validação e Sanitização do Body com .strip()
  if (schemaOptions.body) {
    let rawBody = req.body ?? {};
    if (typeof rawBody === "string") {
      try {
        rawBody = JSON.parse(rawBody);
      } catch {
        return {
          success: false,
          errorResponse: {
            status: 400,
            error: "Bad Request",
            code: "SCHEMA_VALIDATION_ERROR",
            message: "JSON malformado no corpo da requisição.",
            details: [{ field: "body", message: "Corpo deve ser um JSON válido.", code: "invalid_json" }],
            incident: { timestamp: new Date().toISOString(), path, method },
          },
        };
      }
    }

    // Verificação opcional de rejeição explícita de campos não declarados (Mass Assignment alert)
    if (schemaOptions.rejectUnknown) {
      const extraKeys = detectExtraKeys(rawBody, schemaOptions.body);
      if (extraKeys.length > 0) {
        allErrors.push({
          field: "body",
          message: `Campos não declarados rejeitados por segurança (Anti-Mass Assignment): ${extraKeys.join(", ")}`,
          code: "unrecognized_keys",
        });
      }
    }

    // Aplicação estrita do schema Zod
    const bodyResult = schemaOptions.body.safeParse(rawBody);
    if (!bodyResult.success) {
      allErrors.push(...formatZodErrors(bodyResult.error, "body"));
    } else {
      sanitized.body = bodyResult.data;
    }
  }

  // 3. Validação e Sanitização dos Query Params com .strip()
  if (schemaOptions.query) {
    const rawQuery = req.query ?? {};
    const queryResult = schemaOptions.query.safeParse(rawQuery);
    if (!queryResult.success) {
      allErrors.push(...formatZodErrors(queryResult.error, "query"));
    } else {
      sanitized.query = queryResult.data;
    }
  }

  // 4. Validação e Sanitização dos Route Params com .strip()
  if (schemaOptions.params) {
    const rawParams = req.params ?? {};
    const paramsResult = schemaOptions.params.safeParse(rawParams);
    if (!paramsResult.success) {
      allErrors.push(...formatZodErrors(paramsResult.error, "params"));
    } else {
      sanitized.params = paramsResult.data;
    }
  }

  // 5. Validação e Sanitização dos Headers Customizados
  if (schemaOptions.headers) {
    const rawHeaders = req.headers ?? {};
    const headersResult = schemaOptions.headers.safeParse(rawHeaders);
    if (!headersResult.success) {
      allErrors.push(...formatZodErrors(headersResult.error, "headers"));
    } else {
      sanitized.headers = headersResult.data;
    }
  }

  // Se houver qualquer violação de schema
  if (allErrors.length > 0) {
    return {
      success: false,
      errorResponse: {
        status: 400,
        error: "Bad Request",
        code: "SCHEMA_VALIDATION_ERROR",
        message: "Falha na validação de schema dos dados de entrada.",
        details: allErrors,
        incident: {
          timestamp: new Date().toISOString(),
          path,
          method,
          correlationId: (req.headers && req.headers["x-correlation-id"]) || undefined,
        },
      },
    };
  }

  return {
    success: true,
    sanitizedData: sanitized,
  };
}

/**
 * Middleware compatível com Express (req, res, next)
 * 
 * Uso:
 * router.post("/appointments", validateSchemaMiddleware(createAppointmentSchema), handleCreateAppointment);
 */
export function validateSchemaMiddleware(schemaOptions: SchemaValidationOptions) {
  return (req: any, res: any, next: (err?: any) => void) => {
    const result = validateRequestData(req, schemaOptions);

    if (!result.success) {
      const response = result.errorResponse!;
      if (res?.status && typeof res.status === "function") {
        return res.status(response.status).json(response);
      }
      return new Response(JSON.stringify(response), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Substituição segura dos dados brutos pelos dados validados e com campos extras expurgados (.strip())
    if (result.sanitizedData?.body !== undefined) req.body = result.sanitizedData.body;
    if (result.sanitizedData?.query !== undefined) req.query = result.sanitizedData.query;
    if (result.sanitizedData?.params !== undefined) req.params = result.sanitizedData.params;

    if (typeof next === "function") {
      next();
    }
  };
}

export default {
  validateSchemaMiddleware,
  validateRequestData,
  formatZodErrors,
  detectExtraKeys,
};
