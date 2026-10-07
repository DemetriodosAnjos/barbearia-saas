/**
 * src/tests/unit/webhookHmacIdempotency.test.ts
 *
 * Testes Unitários de Validação HMAC e Idempotência de Webhooks (Prompt 12).
 * Cobre Mercado Pago, Stripe, WhatsApp Cloud API e Provedores Genéricos.
 * 
 * Cenários Testados:
 * 1. Validação de Assinatura HMAC-SHA256 válida para Mercado Pago, Stripe e WhatsApp.
 * 2. Rejeição de assinaturas com segredo incorreto ou payload adulterado.
 * 3. Defesa contra Replay Attacks com janela de tolerância de 300 segundos.
 * 4. Comparação em tempo constante (timingSafeEqual) para imunidade contra CWE-208.
 * 5. Idempotência atômica: primeiro evento aceito (Fast ACK 200).
 * 6. Simulação de webhooks repetidos: detecção imediata de duplicidade (Fast ACK 200/202 sem reexecução).
 * 7. Bloqueio de corrida concorrente (Concurrency Lock TTL).
 * 8. Wrapper de Edge Function com cabeçalhos de segurança e resposta assíncrona.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  verifyMercadoPagoHmac,
  verifyStripeHmac,
  verifyWhatsAppHmac,
  verifyWebhookSignature,
  generateWebhookSignature,
  timingSafeEqualString,
  extractWebhookEventId,
  wrapSecureWebhookEdgeFunction,
} from "../../middleware/webhookHmacMiddleware";
import {
  acquireWebhookIdempotencyLock,
  markWebhookProcessed,
  markWebhookFailed,
  getWebhookRecord,
  resetWebhookIdempotencyStore,
  getWebhookMetrics,
  buildIdempotencyKey,
} from "../../security/webhookIdempotencyEngine";

describe("Segurança Avançada de Webhooks: Validação HMAC e Idempotência", () => {
  const MP_SECRET = "mp_webhook_secret_test_key_2026_xyz";
  const STRIPE_SECRET = "whsec_stripe_test_secret_998877665544";
  const WPP_SECRET = "whatsapp_meta_app_secret_test_332211";

  beforeEach(() => {
    resetWebhookIdempotencyStore();
  });

  describe("1. Comparação em Tempo Constante (Timing-Safe Comparison - CWE-208)", () => {
    it("deve retornar true para strings idênticas", () => {
      const s1 = "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0";
      const s2 = "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0";
      expect(timingSafeEqualString(s1, s2)).toBe(true);
    });

    it("deve retornar false para strings de tamanhos diferentes", () => {
      expect(timingSafeEqualString("short_str", "longer_string_value")).toBe(false);
    });

    it("deve retornar false para strings de mesmo tamanho com bytes diferentes", () => {
      const s1 = "abcdef0123456789abcdef0123456789";
      const s2 = "abcdef0123456789abcdef0123456780";
      expect(timingSafeEqualString(s1, s2)).toBe(false);
    });
  });

  describe("2. Validação Criptográfica HMAC: Mercado Pago", () => {
    const rawPayload = JSON.stringify({
      action: "payment.created",
      data: { id: "1234567890" },
      type: "payment",
      live_mode: true,
    });

    it("deve validar com sucesso a assinatura HMAC v1 do Mercado Pago", () => {
      const sigData = generateWebhookSignature("mercadopago", rawPayload, MP_SECRET, {
        dataId: "1234567890",
        xRequestId: "req-mp-test-uuid",
      });

      const headers = {
        "x-signature": sigData.headerValue,
        "x-request-id": "req-mp-test-uuid",
      };

      const result = verifyMercadoPagoHmac(headers, rawPayload, MP_SECRET);
      expect(result.valid).toBe(true);
      expect(result.provider).toBe("mercadopago");
    });

    it("deve rejeitar assinatura quando o segredo for inválido", () => {
      const sigData = generateWebhookSignature("mercadopago", rawPayload, MP_SECRET, {
        dataId: "1234567890",
        xRequestId: "req-mp-test-uuid",
      });

      const headers = {
        "x-signature": sigData.headerValue,
        "x-request-id": "req-mp-test-uuid",
      };

      const result = verifyMercadoPagoHmac(headers, rawPayload, "wrong_secret_key");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("não confere");
    });

    it("deve rejeitar quando o payload tiver sido adulterado (Payload Tampering)", () => {
      const sigData = generateWebhookSignature("mercadopago", rawPayload, MP_SECRET, {
        dataId: "1234567890",
        xRequestId: "req-mp-test-uuid",
      });

      const headers = {
        "x-signature": sigData.headerValue,
        "x-request-id": "req-mp-test-uuid",
      };

      // Payload adulterado com outro data.id
      const tamperedBody = JSON.stringify({
        action: "payment.created",
        data: { id: "9999999999" }, // Alterado
        type: "payment",
      });

      const result = verifyMercadoPagoHmac(headers, tamperedBody, MP_SECRET);
      expect(result.valid).toBe(false);
    });

    it("deve rejeitar webhook se o timestamp estiver expirado (Replay Attack - CWE-294)", () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutos atrás (limite é 5min/300s)
      const sigData = generateWebhookSignature("mercadopago", rawPayload, MP_SECRET, {
        timestamp: pastTimestamp,
        dataId: "1234567890",
        xRequestId: "req-mp-test-uuid",
      });

      const headers = {
        "x-signature": sigData.headerValue,
        "x-request-id": "req-mp-test-uuid",
      };

      const result = verifyMercadoPagoHmac(headers, rawPayload, MP_SECRET, { toleranceSeconds: 300 });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Replay attack bloqueado");
    });
  });

  describe("3. Validação Criptográfica HMAC: Stripe", () => {
    const stripePayload = JSON.stringify({
      id: "evt_1P8xYz2eZvKYlo2C",
      object: "event",
      type: "payment_intent.succeeded",
      data: { object: { amount: 15000, currency: "brl" } },
    });

    it("deve validar assinatura Stripe com header 'stripe-signature' correto", () => {
      const sigData = generateWebhookSignature("stripe", stripePayload, STRIPE_SECRET);
      const headers = {
        "stripe-signature": sigData.headerValue,
      };

      const result = verifyStripeHmac(headers, stripePayload, STRIPE_SECRET);
      expect(result.valid).toBe(true);
      expect(result.provider).toBe("stripe");
    });

    it("deve rejeitar assinatura Stripe se o payload for modificado", () => {
      const sigData = generateWebhookSignature("stripe", stripePayload, STRIPE_SECRET);
      const headers = {
        "stripe-signature": sigData.headerValue,
      };

      const tampered = stripePayload.replace("15000", "99999");
      const result = verifyStripeHmac(headers, tampered, STRIPE_SECRET);
      expect(result.valid).toBe(false);
    });
  });

  describe("4. Validação Criptográfica HMAC: WhatsApp Cloud API / Meta", () => {
    const wppPayload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WPP_BIZ_123456",
          changes: [
            {
              value: {
                messages: [{ id: "wamid.HBgLMTU1NTU1NTU1", text: { body: "Confirmar agendamento" } }],
              },
              field: "messages",
            },
          ],
        },
      ],
    });

    it("deve validar assinatura WhatsApp com header 'x-hub-signature-256'", () => {
      const sigData = generateWebhookSignature("whatsapp", wppPayload, WPP_SECRET);
      const headers = {
        "x-hub-signature-256": sigData.headerValue,
      };

      const result = verifyWhatsAppHmac(headers, wppPayload, WPP_SECRET);
      expect(result.valid).toBe(true);
      expect(result.provider).toBe("whatsapp");
    });

    it("deve rejeitar se faltar o header de assinatura", () => {
      const result = verifyWhatsAppHmac({}, wppPayload, WPP_SECRET);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Header 'x-hub-signature-256' ausente");
    });
  });

  describe("5. Extração de Identificador Único (Event ID)", () => {
    it("deve extrair eventId de payloads Mercado Pago, Stripe e WhatsApp", () => {
      const mpId = extractWebhookEventId("mercadopago", JSON.stringify({ data: { id: "98765" } }));
      expect(mpId).toBe("98765");

      const stripeId = extractWebhookEventId("stripe", JSON.stringify({ id: "evt_stripe_999" }));
      expect(stripeId).toBe("evt_stripe_999");

      const wppId = extractWebhookEventId(
        "whatsapp",
        JSON.stringify({
          entry: [{ changes: [{ value: { messages: [{ id: "msg_wpp_777" }] } }] }],
        })
      );
      expect(wppId).toBe("msg_wpp_777");
    });
  });

  describe("6. Controle de Idempotência e Simulação de Webhooks Repetidos", () => {
    const eventId = "evt_payment_1001";
    const payload = JSON.stringify({ event: "charge.success", amount: 80 });

    it("deve enfileirar novo webhook com status ENQUEUED e Fast ACK 200", () => {
      const res = acquireWebhookIdempotencyLock("mercadopago", eventId, payload);

      expect(res.isDuplicate).toBe(false);
      expect(res.status).toBe("ENQUEUED");
      expect(res.httpStatus).toBe(200);

      const saved = getWebhookRecord("mercadopago", eventId);
      expect(saved).not.toBeNull();
      expect(saved?.attemptsCount).toBe(1);
      expect(saved?.idempotencyKey).toBe(buildIdempotencyKey("mercadopago", eventId));
    });

    it("deve detectar webhook repetido após processamento e retornar Fast ACK 200 sem reexecutar", () => {
      // 1. Primeiro recebimento
      const first = acquireWebhookIdempotencyLock("mercadopago", eventId, payload);
      expect(first.isDuplicate).toBe(false);

      // 2. Worker conclui o processamento
      markWebhookProcessed("mercadopago", eventId, { commissionPaid: true });

      // 3. Gateway de pagamentos envia o MESMO webhook novamente (retry de rede)
      const second = acquireWebhookIdempotencyLock("mercadopago", eventId, payload);

      expect(second.isDuplicate).toBe(true);
      expect(second.status).toBe("DUPLICATE_PROCESSED");
      expect(second.httpStatus).toBe(200);
      expect(second.message).toContain("já processado anteriormente");

      // Verifica incremento do contador de tentativas
      const record = getWebhookRecord("mercadopago", eventId);
      expect(record?.attemptsCount).toBe(2);
    });

    it("deve bloquear execução concorrente quando o evento já estiver em processamento (Lock Concorrente)", () => {
      // Primeiro evento adquire lock
      acquireWebhookIdempotencyLock("stripe", "evt_concurrent_01", payload, 60);

      // Simula alteração do worker para status PROCESSING
      const key = buildIdempotencyKey("stripe", "evt_concurrent_01");
      const rec = getWebhookRecord("stripe", "evt_concurrent_01");
      if (rec) {
        rec.status = "PROCESSING";
      }

      // Segunda requisição simultânea chegando enquanto a primeira ainda roda
      const second = acquireWebhookIdempotencyLock("stripe", "evt_concurrent_01", payload, 60);
      expect(second.isDuplicate).toBe(true);
      expect(second.status).toBe("LOCKED_CONCURRENT");
      expect(second.httpStatus).toBe(202);
    });

    it("deve calcular métricas de duplicidades bloqueadas com precisão", () => {
      // 2 eventos únicos
      acquireWebhookIdempotencyLock("mercadopago", "evt_m1", payload);
      markWebhookProcessed("mercadopago", "evt_m1");

      acquireWebhookIdempotencyLock("stripe", "evt_s1", payload);
      markWebhookProcessed("stripe", "evt_s1");

      // 3 retentativas duplicadas em evt_m1
      acquireWebhookIdempotencyLock("mercadopago", "evt_m1", payload);
      acquireWebhookIdempotencyLock("mercadopago", "evt_m1", payload);
      acquireWebhookIdempotencyLock("mercadopago", "evt_m1", payload);

      const metrics = getWebhookMetrics();
      expect(metrics.totalUniqueEvents).toBe(2);
      expect(metrics.duplicatesBlocked).toBe(3);
      expect(metrics.byProvider.mercadopago.duplicates).toBe(3);
      expect(metrics.byProvider.stripe.duplicates).toBe(0);
    });
  });

  describe("7. Wrapper de Segurança para Supabase Edge Functions", () => {
    it("deve validar assinatura, registrar idempotência e responder 200 Fast ACK", async () => {
      const payload = JSON.stringify({ id: "evt_edge_777", status: "paid" });
      const sigData = generateWebhookSignature("stripe", payload, STRIPE_SECRET);

      let workerExecuted = false;
      const secureHandler = wrapSecureWebhookEdgeFunction(
        "stripe",
        STRIPE_SECRET,
        async (_eventId, _data) => {
          workerExecuted = true;
        }
      );

      const req = new Request("https://edge.supabase.co/functions/v1/webhook-stripe", {
        method: "POST",
        headers: {
          "stripe-signature": sigData.headerValue,
          "content-type": "application/json",
          "x-request-id": "req-edge-test-01",
        },
        body: payload,
      });

      const response = await secureHandler(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Request-Id")).toBe("req-edge-test-01");
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(json.received).toBe(true);
      expect(json.acknowledged).toBe(true);
      expect(json.eventId).toBe("evt_edge_777");
      expect(json.duplicate).toBe(false);

      // Espera microtask do worker
      await new Promise((r) => setTimeout(r, 10));
      expect(workerExecuted).toBe(true);
    });

    it("deve rejeitar com 401 se a assinatura HMAC for inválida", async () => {
      const secureHandler = wrapSecureWebhookEdgeFunction("stripe", STRIPE_SECRET);
      const req = new Request("https://edge.supabase.co/functions/v1/webhook-stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "t=123,v1=invalid_signature_hash",
        },
        body: JSON.stringify({ id: "fake_id" }),
      });

      const response = await secureHandler(req);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("UNAUTHORIZED_WEBHOOK");
    });
  });
});
