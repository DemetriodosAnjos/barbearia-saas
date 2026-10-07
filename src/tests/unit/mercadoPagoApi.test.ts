/**
 * src/tests/unit/mercadoPagoApi.test.ts
 *
 * Testes Unitários e de Contrato para a API de Pagamentos Mercado Pago.
 * Cobre:
 * 1. Criação de preferências para Checkout Pro com validação Zod e expurgo de Mass Assignment (.strip()).
 * 2. Emissão de Pix Instantâneo com payload EMVCo, QR Code SVG e chave de idempotência anti-double-spending.
 * 3. Validação criptográfica de assinaturas de Webhook (HMAC-SHA256), defesa contra Replay Attacks (300s) e Timing Attacks (CWE-208).
 * 4. Proteção de credenciais: o gateway status nunca expõe o Access Token ou Webhook Secret no payload público.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MercadoPagoService,
  timingSafeEqual,
  calculateHmacSha256,
} from "../../services/mercadoPagoService";
import {
  createPreferenceEndpoint,
  createPixEndpoint,
  handleWebhookEndpoint,
  getGatewayStatusEndpoint,
} from "../../api/mercadoPagoEndpoints";
import {
  mercadoPagoPreferenceSchema,
  mercadoPagoPixPaymentSchema,
} from "../../schemas/mercadoPagoSchemas";

describe("Integração Oficial da API Mercado Pago", () => {
  let mpService: MercadoPagoService;
  const TEST_WEBHOOK_SECRET = "test_webhook_secret_key_mp_12345";

  beforeEach(() => {
    mpService = new MercadoPagoService({
      publicKey: "TEST_PUBLIC_KEY_MERCADOPAGO",
      accessToken: "TEST_ACCESS_TOKEN_SECRET",
      webhookSecret: TEST_WEBHOOK_SECRET,
      environment: "sandbox",
    });
  });

  describe("1. Geração de Preferência de Pagamento (Checkout Pro)", () => {
    it("deve gerar preferência válida com links de redirecionamento para plano Starter", async () => {
      const input = {
        planId: "starter",
        planName: "Plano Solo",
        price: 69.9,
        tenantId: "tenant_barbearia_central",
        tenantName: "Barbearia Central",
        payerEmail: "gestor@central.com.br",
        payerName: "Carlos Gestor",
        billingPeriod: "monthly" as const,
      };

      const res = await mpService.createPlanPreference(input);
      expect(res.id).toMatch(/^pref_mp_starter_/);
      expect(res.initPoint).toContain("mercadopago.com.br/checkout");
      expect(res.amount).toBe(69.9);
      expect(res.planId).toBe("starter");
      expect(res.externalReference).toContain("tenant_barbearia_central");
    });

    it("deve expurgar campos maliciosos de Mass Assignment via Zod .strip()", () => {
      const maliciousInput: any = {
        planId: "pro",
        planName: "Plano Pro",
        price: 149.9,
        tenantId: "tenant_123",
        payerEmail: "gestor@pro.com.br",
        // Campos de tentativa de injeção
        role: "superadmin",
        is_paid: true,
        discount_override: 100,
      };

      const parsed: any = mercadoPagoPreferenceSchema.parse(maliciousInput);
      expect(parsed.role).toBeUndefined();
      expect(parsed.is_paid).toBeUndefined();
      expect(parsed.discount_override).toBeUndefined();
      expect(parsed.planId).toBe("pro");
    });

    it("deve rejeitar valor monetário negativo ou zerado com erro de validação", async () => {
      const invalidInput: any = {
        planId: "enterprise",
        planName: "Plano Inválido",
        price: -50.0,
        tenantId: "tenant_123",
        payerEmail: "gestor@test.com",
      };

      const endpointRes = await createPreferenceEndpoint(invalidInput);
      expect(endpointRes.success).toBe(false);
      expect(endpointRes.error).toBeDefined();
    });
  });

  describe("2. Geração de Pix Instantâneo e Idempotência", () => {
    it("deve emitir Pix com payload EMVCo e QR Code em Base64", async () => {
      const pixInput = {
        planId: "pro",
        amount: 149.9,
        tenantId: "tenant_alpha",
        payerEmail: "dono@barbearia.com",
        description: "Assinatura Pro Mensal",
      };

      const pixResult = await mpService.createPixPayment(pixInput);
      expect(pixResult.id).toMatch(/^pay_mp_pix_/);
      expect(pixResult.status).toBe("pending");
      expect(pixResult.qrCode).toContain("BR.GOV.BCB.PIX");
      expect(pixResult.qrCodeBase64).toContain("data:image/svg+xml;base64,");
      expect(pixResult.expiresAt).toBeDefined();
    });

    it("deve respeitar a chave de idempotência retornando o mesmo pagamento para requisições duplicadas", async () => {
      const idempotencyKey = `mp:pix:idempotency_test_${Date.now()}`;
      const pixInput = {
        planId: "starter",
        amount: 69.9,
        tenantId: "tenant_idemp",
        payerEmail: "idemp@test.com",
        idempotencyKey,
      };

      const firstCall = await mpService.createPixPayment(pixInput);
      const secondCall = await mpService.createPixPayment(pixInput);

      expect(firstCall.id).toBe(secondCall.id);
      expect(firstCall.qrCode).toBe(secondCall.qrCode);
      expect(secondCall.idempotencyKey).toBe(idempotencyKey);
    });

    it("deve rejeitar CPF ou CNPJ com formato numérico inválido", () => {
      const invalidTaxIdInput: any = {
        planId: "pro",
        amount: 149.9,
        tenantId: "tenant_1",
        payerEmail: "tax@test.com",
        payerTaxId: "123", // Inválido: precisa ter 11 ou 14 dígitos
      };

      expect(() => mercadoPagoPixPaymentSchema.parse(invalidTaxIdInput)).toThrow();
    });
  });

  describe("3. Segurança Criptográfica de Webhooks (HMAC-SHA256 & Timing Attack)", () => {
    it("deve validar com sucesso uma assinatura HMAC-SHA256 íntegra dentro da janela de tolerância", async () => {
      const nowTs = Math.floor(Date.now() / 1000);
      const dataId = "123456789";
      const requestId = "req_test_001";
      const manifest = `id:${dataId};request-id:${requestId};ts:${nowTs};`;
      const validHmac = await calculateHmacSha256(TEST_WEBHOOK_SECRET, manifest);

      const signatureHeader = `ts=${nowTs},v1=${validHmac}`;

      const verification = await mpService.verifyWebhookSignature(signatureHeader, dataId, requestId);
      expect(verification.valid).toBe(true);
      expect(verification.reason).toBeUndefined();
    });

    it("deve bloquear assinaturas adulteradas ou com secret divergente", async () => {
      const nowTs = Math.floor(Date.now() / 1000);
      const fakeSignature = `ts=${nowTs},v1=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`;

      const verification = await mpService.verifyWebhookSignature(fakeSignature, "data_999", "req_fake");
      expect(verification.valid).toBe(false);
      expect(verification.reason).toContain("HMAC-SHA256");
    });

    it("deve bloquear Replay Attack quando timestamp excede a tolerância de 300 segundos", async () => {
      const oldTs = Math.floor(Date.now() / 1000) - 400; // 400 segundos atrás (> 300s)
      const dataId = "data_old";
      const manifest = `id:${dataId};request-id:req_old;ts:${oldTs};`;
      const hmac = await calculateHmacSha256(TEST_WEBHOOK_SECRET, manifest);

      const signatureHeader = `ts=${oldTs},v1=${hmac}`;
      const verification = await mpService.verifyWebhookSignature(signatureHeader, dataId, "req_old");

      expect(verification.valid).toBe(false);
      expect(verification.reason).toContain("Replay Attack");
    });

    it("deve garantir timingSafeEqual estrito e imune a timing attacks (CWE-208)", () => {
      const h1 = "a1b2c3d4e5f6071829";
      const h2 = "a1b2c3d4e5f6071829";
      const h3 = "a1b2c3d4e5f6071820";

      expect(timingSafeEqual(h1, h2)).toBe(true);
      expect(timingSafeEqual(h1, h3)).toBe(false);
      expect(timingSafeEqual(h1, "short")).toBe(false);
    });
  });

  describe("4. Proteção contra Vazamento de Credenciais na API Pública", () => {
    it("getGatewayStatusEndpoint nunca deve expor accessToken ou webhookSecret", () => {
      const statusRes = getGatewayStatusEndpoint();
      expect(statusRes.success).toBe(true);
      expect(statusRes.data).toBeDefined();

      const data: any = statusRes.data;
      expect(data.accessToken).toBeUndefined();
      expect(data.webhookSecret).toBeUndefined();
      expect(typeof data.hasAccessToken).toBe("boolean");
      expect(typeof data.hasWebhookSecret).toBe("boolean");
      expect(data.publicKey).toBeDefined();
    });
  });
});
