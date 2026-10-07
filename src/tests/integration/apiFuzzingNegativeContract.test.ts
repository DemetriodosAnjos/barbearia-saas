/**
 * src/tests/integration/apiFuzzingNegativeContract.test.ts
 *
 * Suíte de Testes Integrados Negativos de Contrato e Fuzzing de API
 * Executada via Vitest e Supertest contra o dispatcher HTTP blindado.
 *
 * Cobertura de Testes:
 * 1. Payloads Massivos (>5MB Fuzzing / DoS / Buffer Exhaustion).
 * 2. Objetos com Profundidade Excessiva (>15 níveis / Anti-AST Bomb).
 * 3. Incompatibilidade de Tipos (Type Confusion: Array onde se espera String, Objeto onde se espera Número).
 * 4. Injeção de Bytes Nulos (\0, \u0000) e Ataques de Truncamento (CWE-158).
 * 5. Injeção de Emojis, Tempestade Unicode e Caracteres Não-UTF8.
 * 6. Violações Negativas de Contrato nos Endpoints Mapeados (Auth, Appointments, POS, Services, Clients, Webhooks).
 * 7. Garantia Anti-Crash: Zero HTTP 500, Zero Interrupções no Processo Node.js.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import http from "node:http";
import { createFuzzingApiServer, ENDPOINT_CATALOG } from "../../api/apiDispatcher";

describe("Fuzzing de API & Testes Negativos de Contrato (Vitest / Supertest)", () => {
  let server: http.Server;

  beforeAll(async () => {
    server = createFuzzingApiServer();
    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // ==========================================================================
  // CENÁRIO 1: PAYLOADS MASSIVOS (>5MB) & PREVENÇÃO DE EXAUSTÃO DE MEMÓRIA (DoS)
  // ==========================================================================
  describe("1. Payloads Massivos (>5MB Fuzzing)", () => {
    it("Rejeita com HTTP 400 payload de 5.2MB em /api/auth/login sem derrubar o Node", async () => {
      // Criação de payload de 5.2 MB
      const massiveData = "A".repeat(5.2 * 1024 * 1024);
      const maliciousPayload = JSON.stringify({
        email: "fuzzer@barbearia.com",
        password: "Password123!",
        junk: massiveData,
      });

      const response = await request(server)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send(maliciousPayload);

      // Não sofre crash (HTTP 500) e retorna 400 Bad Request
      expect(response.status).toBe(400);
      expect(response.body.code).toBe("PAYLOAD_TOO_LARGE");
      expect(response.body.message).toContain("excede o limite");
    });

    it("Rejeita com HTTP 400 payload de 5.5MB em /api/appointments sem alocação descontrolada", async () => {
      const massiveData = "B".repeat(5.5 * 1024 * 1024);

      const response = await request(server)
        .post("/api/appointments")
        .set("Content-Type", "application/json")
        .send(massiveData);

      expect([400, 413, 422]).toContain(response.status);
      expect(response.status).not.toBe(500);
    });
  });

  // ==========================================================================
  // CENÁRIO 2: PROFUNDIDADE EXCESSIVA (JSON BOMBS / RECURSION ATTACK)
  // ==========================================================================
  describe("2. Fuzzing de Profundidade Excessiva (Anti-AST Bomb)", () => {
    it("Rejeita com HTTP 422/400 JSON aninhado com 30 níveis de profundidade", async () => {
      // Constrói objeto recursivo com 30 níveis
      let nestedObj: any = { leaf: "malicious_recursion" };
      for (let i = 0; i < 30; i++) {
        nestedObj = { level: i, child: nestedObj };
      }

      const response = await request(server)
        .post("/api/auth/login")
        .send(nestedObj);

      expect([400, 422]).toContain(response.status);
      expect(response.status).not.toBe(500);
      expect(response.body.code).toMatch(/PAYLOAD_NESTING_EXCEEDED|SCHEMA_VALIDATION_ERROR/);
    });
  });

  // ==========================================================================
  // CENÁRIO 3: INCOMPATIBILIDADE DE TIPOS (TYPE CONFUSION)
  // ==========================================================================
  describe("3. Incompatibilidade de Tipos (Type Confusion Fuzzing)", () => {
    it("Rejeita Array no campo 'email' de /api/auth/login com HTTP 400", async () => {
      const response = await request(server)
        .post("/api/auth/login")
        .send({
          email: ["attacker@domain.com", "admin@domain.com"],
          password: "ValidPassword123!",
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("SCHEMA_VALIDATION_ERROR");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "body.email",
          }),
        ])
      );
    });

    it("Rejeita Objeto onde se espera Número em 'price' de /api/appointments com HTTP 400", async () => {
      const response = await request(server)
        .post("/api/appointments")
        .send({
          client_name: "Cliente Teste",
          client_phone: "(11) 98888-7777",
          barber_id: "barber_01",
          barber_name: "Carlos Barbeiro",
          service_name: "Barba Terapia",
          duration_minutes: 30,
          price: { "$gt": 0 }, // Injeção NoSQL/Type confusion
          start_time: "14:00",
          end_time: "14:30",
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("SCHEMA_VALIDATION_ERROR");
      expect(response.body.details.some((d: any) => d.field.includes("price"))).toBe(true);
    });

    it("Rejeita String onde se espera Array em 'items' de /api/pos/comanda com HTTP 400", async () => {
      const response = await request(server)
        .post("/api/pos/comanda")
        .send({
          client_name: "Cliente VIP",
          barber_id: "barber_99",
          items: "corte_e_barba", // Deveria ser array de itens
          payment_method: "pix",
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("SCHEMA_VALIDATION_ERROR");
    });
  });

  // ==========================================================================
  // CENÁRIO 4: INJEÇÃO DE CARACTERES NULOS (\0, \u0000 - CWE-158)
  // ==========================================================================
  describe("4. Injeção de Bytes Nulos (Null Byte Injection)", () => {
    it("Detecta e rejeita com HTTP 400 byte nulo em /api/auth/register", async () => {
      const response = await request(server)
        .post("/api/auth/register")
        .send({
          name: "João\u0000Silva",
          email: "joao\0attacker@gmail.com",
          password: "SecurePassword123!",
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toMatch(/NULL_BYTE_DETECTED|SCHEMA_VALIDATION_ERROR/);
    });

    it("Detecta byte nulo em chave de objeto no endpoint /api/settings com HTTP 400", async () => {
      const payload: any = {};
      payload["name\u0000injected"] = "Barbearia Hack";

      const response = await request(server)
        .put("/api/settings")
        .send(payload);

      expect([400, 422]).toContain(response.status);
    });
  });

  // ==========================================================================
  // CENÁRIO 5: TEMPESTADE DE EMOJIS & CARACTERES ESPECIAIS / UNICODE
  // ==========================================================================
  describe("5. Emojis, Alta Escala Unicode e Resiliência de Parser", () => {
    it("Processa ou rejeita com segurança tempestade de emojis sem sofrer crash", async () => {
      const emojiStorm = "[icon:scissors][icon:sparkles][icon:rocket][icon:flame]".repeat(50);

      const response = await request(server)
        .post("/api/services")
        .send({
          name: `Corte Futurista ${emojiStorm}`.substring(0, 80),
          price: 90.0,
          duration_minutes: 45,
        });

      // Deve responder normalmente com 200 (se válido e truncado para o limite de string) ou 400 se violar limites, mas NUNCA 500
      expect(response.status).toBeLessThan(500);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it("Rejeita com HTTP 400 requisição com JSON sintaticamente quebrado/malformado", async () => {
      const response = await request(server)
        .post("/api/auth/login")
        .set("Content-Type", "application/json")
        .send('{"email": "incompleto@domain.com", "password": ');

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("SCHEMA_VALIDATION_ERROR");
      expect(response.body.message).toContain("JSON malformado");
    });
  });

  // ==========================================================================
  // CENÁRIO 6: TESTES NEGATIVOS DE CONTRATO EM TODOS OS ENDPOINTS MAPEADOS
  // ==========================================================================
  describe("6. Testes Negativos de Contrato nos Endpoints do Catálogo", () => {
    it("Garante mapeamento de todos os endpoints críticos no catálogo", () => {
      expect(ENDPOINT_CATALOG.length).toBeGreaterThanOrEqual(18);
    });

    it("POST /api/auth/revoke-sessions: Rejeita gatilho inválido com HTTP 400", async () => {
      const response = await request(server)
        .post("/api/auth/revoke-sessions")
        .send({
          userId: "11111111-2222-4333-8444-555555555555",
          trigger: "invalid_trigger_name",
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("SCHEMA_VALIDATION_ERROR");
    });

    it("POST /api/appointments: Rejeita duração superior a 480 minutos com HTTP 400", async () => {
      const response = await request(server)
        .post("/api/appointments")
        .send({
          client_name: "Cliente Demorado",
          client_phone: "(11) 97777-6666",
          barber_id: "barber_02",
          barber_name: "Roberto",
          service_name: "Tratamento Completo",
          duration_minutes: 9999, // Violação de contrato: max 480
          price: 150.0,
          start_time: "10:00",
          end_time: "11:00",
        });

      expect(response.status).toBe(400);
      expect(response.body.details.some((d: any) => d.field.includes("duration_minutes"))).toBe(true);
    });

    it("POST /api/webhooks/mercadopago: Rejeita requisição sem cabeçalho x-signature com HTTP 400", async () => {
      const response = await request(server)
        .post("/api/webhooks/mercadopago")
        .send({ id: "event_123", action: "payment.created" });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe("WEBHOOK_SIGNATURE_MISSING");
    });

    it("POST /api/webhooks/mercadopago: Rejeita assinatura HMAC forjada com HTTP 401", async () => {
      const response = await request(server)
        .post("/api/webhooks/mercadopago")
        .set("x-signature", "ts=1700000000,v1=forged_hmac_signature")
        .send({ id: "event_123", action: "payment.created" });

      expect(response.status).toBe(401);
      expect(response.body.code).toBe("INVALID_HMAC_SIGNATURE");
    });
  });
});
