/**
 * src/api/mercadoPagoEndpoints.ts
 *
 * Endpoints e Handlers de API para Integração do Mercado Pago.
 * Atua como a camada de mediação segura (Server Proxy / API Route).
 */

import { mercadoPago, type PreferenceResult, type PixPaymentResult } from "../services/mercadoPagoService";
import type { MercadoPagoPreferenceInput, MercadoPagoPixInput } from "../schemas/mercadoPagoSchemas";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  requestId?: string;
}

/**
 * Endpoint de Criação de Preferência do Checkout Pro
 * POST /api/mercadopago/preference
 */
export async function createPreferenceEndpoint(
  input: MercadoPagoPreferenceInput
): Promise<ApiResponse<PreferenceResult>> {
  const requestId = `req_mp_${Date.now().toString(36)}`;
  try {
    const preference = await mercadoPago.createPlanPreference(input);
    return {
      success: true,
      data: preference,
      requestId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Falha ao gerar preferência de pagamento no Mercado Pago",
      code: "MP_PREFERENCE_ERROR",
      requestId,
    };
  }
}

/**
 * Endpoint de Emissão de Pix Instantâneo
 * POST /api/mercadopago/pix
 */
export async function createPixEndpoint(
  input: MercadoPagoPixInput
): Promise<ApiResponse<PixPaymentResult>> {
  const requestId = `req_mp_pix_${Date.now().toString(36)}`;
  try {
    const pixResult = await mercadoPago.createPixPayment(input);
    return {
      success: true,
      data: pixResult,
      requestId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Falha ao emitir Pix Instantâneo via Mercado Pago",
      code: "MP_PIX_ERROR",
      requestId,
    };
  }
}

/**
 * Endpoint de Webhook para Notificação de Pagamentos
 * POST /api/mercadopago/webhook
 */
export async function handleWebhookEndpoint(
  headers: Record<string, string | null | undefined>,
  rawPayload: unknown
): Promise<ApiResponse<{ processed: boolean; paymentId: string }>> {
  const requestId = headers["x-request-id"] || `req_whk_${Date.now().toString(36)}`;
  const signature = headers["x-signature"] || null;

  try {
    // 1. Extração segura de ID
    const payloadObj = (typeof rawPayload === "object" && rawPayload !== null) ? rawPayload as any : {};
    const dataId = String(payloadObj.data?.id || payloadObj.id || "");

    // 2. Validação Criptográfica HMAC
    const verification = await mercadoPago.verifyWebhookSignature(signature, dataId, requestId);
    if (!verification.valid && signature !== null) {
      return {
        success: false,
        error: `Assinatura do webhook inválida: ${verification.reason}`,
        code: "INVALID_WEBHOOK_SIGNATURE",
        requestId,
      };
    }

    // 3. Processamento Idempotente do Webhook
    const res = await mercadoPago.processWebhook(rawPayload);

    return {
      success: true,
      data: {
        processed: res.processed,
        paymentId: res.paymentId,
      },
      requestId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Erro no processamento do webhook",
      code: "WEBHOOK_PROCESSING_ERROR",
      requestId,
    };
  }
}

/**
 * Endpoint de Status de Saúde e Configuração da API
 * GET /api/mercadopago/status
 */
export function getGatewayStatusEndpoint(): ApiResponse<ReturnType<typeof mercadoPago.getConfig>> {
  return {
    success: true,
    data: mercadoPago.getConfig(),
  };
}
