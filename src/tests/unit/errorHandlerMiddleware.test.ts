/**
 * src/tests/unit/errorHandlerMiddleware.test.ts
 *
 * Testes Unitários de Tratamento Global de Exceções, requestId e Omissão de Stacks.
 * Valida conformidade com CWE-209, OWASP A05:2021 (Security Misconfiguration) e LGPD/PCI-DSS.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  errorHandlerMiddleware,
  wrapEdgeFunctionHandler,
  sanitizePublicErrorResponse,
  resolveRequestId,
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  GENERIC_500_MESSAGE,
  GENERIC_500_CODE,
} from "../../middleware/errorHandlerMiddleware";
import {
  createSecureLogger,
  redactSensitiveData,
  maskCreditCardNumber,
  maskCpf,
  getInMemoryLogBuffer,
  clearInMemoryLogBuffer,
} from "../../utils/secureLogger";

describe("Middleware Centralizado de Tratamento de Erros e Exceções", () => {
  beforeEach(() => {
    clearInMemoryLogBuffer();
    vi.clearAllMocks();
  });

  describe("1. Geração e Propagação de requestId (UUID v4)", () => {
    it("deve gerar um UUID v4 único quando a requisição não fornecer um ID prévio", () => {
      const mockReq = { headers: {} };
      const requestId = resolveRequestId(mockReq);

      expect(requestId).toBeDefined();
      expect(typeof requestId).toBe("string");
      // Formato UUID v4: 8-4-4-4-12 hexadecimais
      const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(requestId).toMatch(uuidV4Regex);
    });

    it("deve adotar e preservar o header X-Request-Id se já vier fornecido pelo cliente/proxy", () => {
      const existingId = "550e8400-e29b-41d4-a716-446655440000";
      const mockReq = { headers: { "x-request-id": existingId } };
      const resolved = resolveRequestId(mockReq);

      expect(resolved).toBe(existingId);
    });
  });

  describe("2. Resposta HTTP 500 Padronizada e Omissão de Stack Traces", () => {
    it("deve retornar HTTP 500 com mensagem genérica e requestId diante de exceção não tratada", () => {
      const rawError = new Error("NullPointerException: Cannot read properties of undefined");
      const reqId = "test-req-uuid-1234";

      const sanitized = sanitizePublicErrorResponse(rawError, reqId);

      expect(sanitized.statusCode).toBe(500);
      expect(sanitized.body.success).toBe(false);
      expect(sanitized.body.error.code).toBe(GENERIC_500_CODE);
      expect(sanitized.body.error.message).toBe(GENERIC_500_MESSAGE);
      expect(sanitized.body.error.requestId).toBe(reqId);
      expect(sanitized.body.error.timestamp).toBeDefined();
    });

    it("deve ELIMINAR TOTALMENTE o stack trace do corpo da resposta HTTP", () => {
      const rawError = new Error("Falha crítica no processador interno");
      const reqId = "test-req-uuid-5678";

      const sanitized = sanitizePublicErrorResponse(rawError, reqId);
      const jsonString = JSON.stringify(sanitized.body);

      // Asserções estritas de ausência de stack trace
      expect((sanitized.body as any).stack).toBeUndefined();
      expect((sanitized.body.error as any).stack).toBeUndefined();
      expect(jsonString).not.toContain("stack");
      expect(jsonString).not.toContain("at ");
      expect(jsonString).not.toContain("node_modules");
      expect(jsonString).not.toContain(".ts:");
      expect(jsonString).not.toContain(".js:");
    });
  });

  describe("3. Supressão de Tabelas SQL e Variáveis de Ambiente", () => {
    it("deve suprimir nomes de tabelas do PostgreSQL e detalhes de queries do banco", () => {
      const sqlError = new Error(
        'error: relation "customers" does not exist at character 15 in SELECT * FROM customers WHERE id = 1'
      );
      const reqId = "test-sql-leak-uuid";

      const sanitized = sanitizePublicErrorResponse(sqlError, reqId);
      const jsonString = JSON.stringify(sanitized.body);

      expect(sanitized.statusCode).toBe(500);
      expect(sanitized.body.error.message).toBe(GENERIC_500_MESSAGE);
      expect(jsonString).not.toContain("customers");
      expect(jsonString).not.toContain("SELECT");
      expect(jsonString).not.toContain("FROM");
      expect(jsonString).not.toContain("relation");
    });

    it("deve suprimir violações de chave estrangeira com nomes de constraints", () => {
      const fkError = new Error(
        'insert or update on table "barbershop_appointments" violates foreign key constraint "fk_barbershop_tenants"'
      );
      const reqId = "test-fk-leak-uuid";

      const sanitized = sanitizePublicErrorResponse(fkError, reqId);
      const jsonString = JSON.stringify(sanitized.body);

      expect(sanitized.statusCode).toBe(500);
      expect(jsonString).not.toContain("barbershop_appointments");
      expect(jsonString).not.toContain("fk_barbershop_tenants");
    });

    it("deve suprimir variáveis de ambiente sensíveis, tokens e URLs de banco", () => {
      const envLeakError = new Error(
        "Connection failed: DATABASE_URL=postgresql://postgres:secretpassword123@db.supabase.co:5432/postgres SUPABASE_SERVICE_ROLE_KEY=eyJh..."
      );
      const reqId = "test-env-leak-uuid";

      const sanitized = sanitizePublicErrorResponse(envLeakError, reqId);
      const jsonString = JSON.stringify(sanitized.body);

      expect(sanitized.statusCode).toBe(500);
      expect(jsonString).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(jsonString).not.toContain("secretpassword123");
      expect(jsonString).not.toContain("DATABASE_URL");
      expect(sanitized.body.error.message).toBe(GENERIC_500_MESSAGE);
    });
  });

  describe("4. Preservação de Erros Operacionais (4xx)", () => {
    it("deve retornar 400 Bad Request com código e detalhes higienizados", () => {
      const badReq = new BadRequestError("Campo obrigatório ausente", "MISSING_REQUIRED_FIELD", {
        field: "client_name",
      });
      const reqId = "req-bad-request-400";

      const sanitized = sanitizePublicErrorResponse(badReq, reqId);

      expect(sanitized.statusCode).toBe(400);
      expect(sanitized.body.error.code).toBe("MISSING_REQUIRED_FIELD");
      expect(sanitized.body.error.message).toBe("Campo obrigatório ausente");
      expect((sanitized.body.error as any).details).toEqual({ field: "client_name" });
      expect(sanitized.body.error.requestId).toBe(reqId);
    });

    it("deve retornar 401, 403, 404 e 409 com seus respectivos status operacionais", () => {
      const unauth = new UnauthorizedError();
      const forbidden = new ForbiddenError();
      const notFound = new NotFoundError("Barbeiro não localizado");
      const conflict = new ConflictError("Horário já reservado por outro cliente");

      expect(sanitizePublicErrorResponse(unauth, "1").statusCode).toBe(401);
      expect(sanitizePublicErrorResponse(forbidden, "2").statusCode).toBe(403);
      expect(sanitizePublicErrorResponse(notFound, "3").statusCode).toBe(404);
      expect(sanitizePublicErrorResponse(conflict, "4").statusCode).toBe(409);
    });
  });

  describe("5. Execução do Middleware Express (errorHandlerMiddleware)", () => {
    it("deve interceptar erro e disparar res.status(500).json(...) com headers de segurança", () => {
      const mockReq = {
        method: "POST",
        url: "/api/v1/appointments",
        headers: { "x-request-id": "client-header-id-999" },
      };

      let capturedStatus = 0;
      let capturedBody: any = null;
      const capturedHeaders: Record<string, string> = {};

      const mockRes = {
        setHeader(name: string, val: string) {
          capturedHeaders[name] = val;
        },
        status(code: number) {
          capturedStatus = code;
          return this;
        },
        json(payload: any) {
          capturedBody = payload;
          return this;
        },
      };

      const unhandledErr = new TypeError("Cannot read properties of null (reading 'barberId')");

      errorHandlerMiddleware(unhandledErr, mockReq, mockRes);

      expect(capturedStatus).toBe(500);
      expect(capturedHeaders["X-Request-Id"]).toBe("client-header-id-999");
      expect(capturedHeaders["X-Content-Type-Options"]).toBe("nosniff");
      expect(capturedBody.error.message).toBe(GENERIC_500_MESSAGE);
      expect(capturedBody.error.requestId).toBe("client-header-id-999");
      expect(capturedBody.stack).toBeUndefined();
    });
  });

  describe("6. Wrapper de Segurança para Supabase Edge Functions (Deno)", () => {
    it("deve repassar resposta de sucesso de Edge Function adicionando X-Request-Id", async () => {
      const edgeHandler = wrapEdgeFunctionHandler(async (_req) => {
        return new Response(JSON.stringify({ success: true, data: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const mockRequest = new Request("https://edge.supabase.co/functions/v1/purge", {
        headers: { "x-request-id": "edge-req-123" },
      });

      const response = await edgeHandler(mockRequest);
      expect(response.status).toBe(200);
      expect(response.headers.get("X-Request-Id")).toBe("edge-req-123");

      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it("deve interceptar falhas não tratadas na Edge Function e retornar JSON 500 sem stack trace", async () => {
      const faultyEdgeHandler = wrapEdgeFunctionHandler(async (_req) => {
        throw new Error("Crash de conexão com PostgreSQL na Edge Function");
      });

      const mockRequest = new Request("https://edge.supabase.co/functions/v1/faulty");

      const response = await faultyEdgeHandler(mockRequest);
      expect(response.status).toBe(500);
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("X-Request-Id")).toBeDefined();

      const body = await response.json();
      expect(body.error.code).toBe(GENERIC_500_CODE);
      expect(body.error.message).toBe(GENERIC_500_MESSAGE);
      expect(body.stack).toBeUndefined();
      expect(body.error.stack).toBeUndefined();
    });
  });

  describe("7. Redação e Mascaramento no Logger Seguro (secureLogger)", () => {
    it("deve mascarar senhas e chaves sensíveis com [REDACTED]", () => {
      const payload = {
        username: "admin_barbearia",
        password: "SuperSecretPassword123!",
        current_password: "OldPassword123!",
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMC6Y5",
        nested: {
          client_secret: "sec_998877665544",
          authorization: "Bearer my-jwt-token-string",
        },
      };

      const redacted = redactSensitiveData(payload);

      expect(redacted.password).toBe("[REDACTED]");
      expect(redacted.current_password).toBe("[REDACTED]");
      expect(redacted.token).toBe("[REDACTED]");
      expect(redacted.nested.client_secret).toBe("[REDACTED]");
      expect(redacted.nested.authorization).toBe("[REDACTED]");
      expect(redacted.username).toBe("admin_barbearia");
    });

    it("deve mascarar cartões de crédito exibindo apenas os 4 últimos dígitos", () => {
      const cardMasked1 = maskCreditCardNumber("4532117890123456");
      expect(cardMasked1).toBe("****-****-****-3456");

      const payload = {
        customer_name: "Carlos Barber",
        credit_card: "5424180123456789",
        card_number: "4111222233334444",
        cvv: "123",
        security_code: "999",
      };

      const redacted = redactSensitiveData(payload);

      expect(redacted.credit_card).toBe("****-****-****-6789");
      expect(redacted.card_number).toBe("****-****-****-4444");
      expect(redacted.cvv).toBe("[REDACTED]");
      expect(redacted.security_code).toBe("[REDACTED]");
      expect(redacted.customer_name).toBe("Carlos Barber");
    });

    it("deve mascarar CPF mantendo padrão auditável de privacidade", () => {
      const masked = maskCpf("12345678901");
      expect(masked).toBe("***.***.789-**");

      const payload = { cpf: "98765432100" };
      const redacted = redactSensitiveData(payload);
      expect(redacted.cpf).toBe("***.***.321-**");
    });

    it("deve registrar logs estruturados no buffer de memória sem vazar dados sigilosos", () => {
      const logger = createSecureLogger({ serviceName: "test-service" });
      const reqId = "req-audit-log-001";

      logger.info("Requisição processada com sucesso", reqId, {
        user_id: "usr_123",
        password: "should_be_masked",
        credit_card: "4000123456789010",
      });

      const buffer = getInMemoryLogBuffer();
      expect(buffer.length).toBeGreaterThan(0);
      const latest = buffer[0];

      expect(latest.requestId).toBe(reqId);
      expect(latest.service).toBe("test-service");
      expect(latest.context?.user_id).toBe("usr_123");
      expect(latest.context?.password).toBe("[REDACTED]");
      expect(latest.context?.credit_card).toBe("****-****-****-9010");
    });
  });
});
