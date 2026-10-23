/**
 * src/tests/unit/zodSchemaValidation.test.ts
 *
 * Suíte de Testes Automatizados da Validação de Schemas Server-Side com Zod.
 * Cobertura Completa:
 * - Sanitização e Expurgo com .strip() (Anti-Mass Assignment)
 * - Validação de Body, Query, Params e Headers
 * - Validação de Tipos, Máximos de String, UUID e Email
 * - Bloqueio por Limite de Payload (DoS / Memory Overflow)
 * - Middleware Express (req, res, next) e Função Standalone
 */

import { describe, it, expect, vi } from "vitest";
import {
  validateRequestData,
  validateSchemaMiddleware,
  detectExtraKeys,
} from "../../middleware/zodValidationMiddleware";
import {
  loginSchema,
  registerSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  createComandaSchema,
  settleCommissionSchema,
  uuidSchema,
} from "../../schemas/apiSchemas";
import { z } from "zod";

describe("Módulo 7: Validação de Schema Server-Side com Zod & Anti-Mass Assignment", () => {
  describe("1. Prevenção de Mass Assignment & Expurgamento via .strip()", () => {
    it("deve remover silenciosamente campos maliciosos não declarados usando .strip()", () => {
      const maliciousPayload = {
        status: "confirmed",
        notes: "Cliente vip",
        // Campos injetados de Mass Assignment:
        role: "superadmin",
        is_admin: true,
        tenant_id: "outro_tenant_vitima",
        balance: 999999,
        __proto__: { polluted: true },
      };

      const result = validateRequestData(
        { body: maliciousPayload },
        { body: updateAppointmentSchema.body }
      );

      expect(result.success).toBe(true);
      expect(result.sanitizedData?.body).toBeDefined();

      // Campos legítimos devem ser mantidos
      expect(result.sanitizedData?.body.status).toBe("confirmed");
      expect(result.sanitizedData?.body.notes).toBe("Cliente vip");

      // Campos de Mass Assignment DEVEM ser expurgados pelo .strip()
      expect(result.sanitizedData?.body.role).toBeUndefined();
      expect(result.sanitizedData?.body.is_admin).toBeUndefined();
      expect(result.sanitizedData?.body.tenant_id).toBeUndefined();
      expect(result.sanitizedData?.body.balance).toBeUndefined();
    });

    it("deve rejeitar requisição com código 400 quando rejectUnknown: true for ativado", () => {
      const payloadWithExtras = {
        email: "joao@barbearia.com.br",
        password: "password123@",
        role_injected: "superadmin",
      };

      const result = validateRequestData(
        { body: payloadWithExtras },
        { body: loginSchema.body, rejectUnknown: true }
      );

      expect(result.success).toBe(false);
      expect(result.errorResponse?.status).toBe(400);
      expect(result.errorResponse?.code).toBe("SCHEMA_VALIDATION_ERROR");
      expect(result.errorResponse?.details[0].message).toContain("Anti-Mass Assignment");
    });
  });

  describe("2. Validação Rigorosa de Tipos e Formatos", () => {
    it("deve rejeitar e-mail inválido no login", () => {
      const invalidEmailPayload = {
        email: "email-invalido-sem-arroba",
        password: "password123@",
      };

      const result = validateRequestData(
        { body: invalidEmailPayload },
        { body: loginSchema.body }
      );

      expect(result.success).toBe(false);
      expect(result.errorResponse?.details[0].field).toBe("body.email");
      expect(result.errorResponse?.details[0].message).toContain("e-mail");
    });

    it("deve rejeitar senha com menos de 8 caracteres", () => {
      const shortPasswordPayload = {
        email: "teste@barbearia.com.br",
        password: "123",
      };

      const result = validateRequestData(
        { body: shortPasswordPayload },
        { body: loginSchema.body }
      );

      expect(result.success).toBe(false);
      expect(result.errorResponse?.details[0].field).toBe("body.password");
    });

    it("deve validar formato estrito de UUID v4", () => {
      expect(uuidSchema.safeParse("123e4567-e89b-12d3-a456-426614174000").success).toBe(true);
      expect(uuidSchema.safeParse("uuid-invalido-1234").success).toBe(false);
      expect(uuidSchema.safeParse("").success).toBe(false);
    });

    it("deve rejeitar tipos numéricos inválidos ou preços negativos no agendamento", () => {
      const invalidAppointment = {
        client_name: "Carlos Eduardo",
        client_phone: "11988887777",
        barber_id: "barber-123",
        barber_name: "Thiago",
        service_name: "Corte",
        duration_minutes: "sessenta_min", // Não é número
        price: -50.0, // Negativo
        start_time: "25:99", // Horário inválido
        end_time: "14:00",
      };

      const result = validateRequestData(
        { body: invalidAppointment },
        { body: createAppointmentSchema.body }
      );

      expect(result.success).toBe(false);
      const fields = result.errorResponse?.details.map((d) => d.field);
      expect(fields).toContain("body.price");
      expect(fields).toContain("body.start_time");
    });

    it("deve rejeitar strings com overflow além do tamanho máximo", () => {
      const hugeName = "A".repeat(150);
      const payload = {
        client_name: hugeName,
        client_phone: "11988887777",
        barber_id: "barber-123",
        barber_name: "Thiago",
        service_name: "Corte",
        duration_minutes: 30,
        price: 50.0,
        start_time: "10:00",
        end_time: "10:30",
      };

      const result = validateRequestData(
        { body: payload },
        { body: createAppointmentSchema.body }
      );

      expect(result.success).toBe(false);
      expect(result.errorResponse?.details[0].field).toBe("body.client_name");
      expect(result.errorResponse?.details[0].message).toContain("100 caracteres");
    });
  });

  describe("3. Limite de Payload (Proteção DoS)", () => {
    it("deve rejeitar payload que exceda o limite máximo de bytes configurado", () => {
      const hugePayload = {
        data: "X".repeat(2000),
      };

      const result = validateRequestData(
        { body: hugePayload },
        {
          body: z.object({ data: z.string() }).strip(),
          maxPayloadBytes: 1024, // Limite de 1KB
        }
      );

      expect(result.success).toBe(false);
      expect(result.errorResponse?.status).toBe(400);
      expect(result.errorResponse?.code).toBe("PAYLOAD_TOO_LARGE");
      expect(result.errorResponse?.message).toContain("limite máximo permitido");
    });
  });

  describe("4. Validação Integrada de Query, Params e Headers", () => {
    it("deve validar e sanitizar simultaneamente body, query, params e headers", () => {
      const req = {
        path: "/api/appointments/apt-001",
        method: "PUT",
        params: { id: "apt-001" },
        query: { notify: "true" },
        headers: { "x-correlation-id": "req-xyz-987" },
        body: { status: "completed", price: 75.0, unwanted_prop: "dropped" },
      };

      const result = validateRequestData(req, {
        params: z.object({ id: z.string().min(1) }).strip(),
        query: z.object({ notify: z.string().optional() }).strip(),
        headers: z.object({ "x-correlation-id": z.string() }).strip(),
        body: updateAppointmentSchema.body,
      });

      expect(result.success).toBe(true);
      expect(result.sanitizedData?.params.id).toBe("apt-001");
      expect(result.sanitizedData?.query.notify).toBe("true");
      expect(result.sanitizedData?.headers["x-correlation-id"]).toBe("req-xyz-987");
      expect(result.sanitizedData?.body.status).toBe("completed");
      expect(result.sanitizedData?.body.unwanted_prop).toBeUndefined();
    });
  });

  describe("5. Middleware Express (req, res, next)", () => {
    it("deve invocar next() e atribuir dados sanitizados quando válido", () => {
      const middleware = validateSchemaMiddleware({
        body: loginSchema.body,
      });

      const req = {
        body: {
          email: "admin@barbearia.com.br",
          password: "superSecurePassword123!",
          extra_field: "must_be_stripped",
        },
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(req.body.email).toBe("admin@barbearia.com.br");
      expect((req.body as any).extra_field).toBeUndefined();
    });

    it("deve responder com status 400 sem chamar next() quando inválido", () => {
      const middleware = validateSchemaMiddleware({
        body: loginSchema.body,
      });

      const req = { body: { email: "invalido", password: "1" } };
      let sentStatus = 0;
      let sentJson = null;

      const res = {
        status: (s: number) => {
          sentStatus = s;
          return {
            json: (payload: any) => {
              sentJson = payload;
            },
          };
        },
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(sentStatus).toBe(400);
      expect(sentJson).toHaveProperty("code", "SCHEMA_VALIDATION_ERROR");
      expect((sentJson as any).details.length).toBeGreaterThan(0);
    });
  });

  describe("6. Validação das Principais Rotas da Aplicação", () => {
    it("deve validar comanda de produtos e serviços no POS", () => {
      const validComanda = {
        client_name: "Marcelo D'Angelo",
        barber_id: "barber-thiago-01",
        items: [
          { id: "serv-corte", type: "service", name: "Corte Cabelo", price: 50, quantity: 1 },
          { id: "prod-pomada", type: "product", name: "Pomada Matte", price: 45, quantity: 2 },
        ],
        payment_method: "pix",
        discount: 10,
      };

      const result = validateRequestData({ body: validComanda }, { body: createComandaSchema.body });
      expect(result.success).toBe(true);
    });

    it("deve rejeitar comanda com itens vazios", () => {
      const emptyComanda = {
        client_name: "Cliente",
        barber_id: "barber-1",
        items: [],
        payment_method: "cash",
      };

      const result = validateRequestData({ body: emptyComanda }, { body: createComandaSchema.body });
      expect(result.success).toBe(false);
      expect(result.errorResponse?.details[0].message).toContain("ao menos um item");
    });
  });
});
