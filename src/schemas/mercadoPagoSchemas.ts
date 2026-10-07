/**
 * src/schemas/mercadoPagoSchemas.ts
 *
 * Schemas de validação estritos com Zod para o Gateway de Pagamentos Mercado Pago.
 * Implementa defesa contra Mass Assignment (.strip()), validação de CPF/CNPJ,
 * tipagem estrita de valores monetários e sanitização de payloads de webhook.
 */

import { z } from "zod";

export const CPF_REGEX = /^\d{11}$/;
export const CNPJ_REGEX = /^\d{14}$/;

/**
 * Schema para criação de preferência do Checkout Pro (Mercado Pago)
 */
export const mercadoPagoPreferenceSchema = z
  .object({
    planId: z
      .string({ required_error: "Identificador de plano é obrigatório" })
      .trim()
      .min(1, "Identificador de plano não pode ser vazio")
      .max(64, "Identificador de plano muito longo"),
    planName: z
      .string({ required_error: "Nome do plano é obrigatório" })
      .trim()
      .min(2, "Nome do plano deve ter no mínimo 2 caracteres")
      .max(100, "Nome do plano não pode exceder 100 caracteres"),
    price: z
      .number({ required_error: "Preço é obrigatório" })
      .positive("O preço deve ser maior que zero")
      .max(50000, "Preço máximo por transação excedido"),
    tenantId: z
      .string({ required_error: "ID da barbearia (tenant) é obrigatório" })
      .trim()
      .min(1, "Tenant ID não pode ser vazio")
      .max(64, "Tenant ID muito longo"),
    tenantName: z
      .string()
      .trim()
      .max(120, "Nome da barbearia muito longo")
      .default("Barbearia Cliente"),
    payerEmail: z
      .string({ required_error: "E-mail do pagador é obrigatório" })
      .trim()
      .email("E-mail do pagador inválido")
      .max(150, "E-mail muito longo"),
    payerName: z
      .string()
      .trim()
      .max(100, "Nome do pagador muito longo")
      .optional()
      .default("Gestor da Barbearia"),
    payerPhone: z
      .string()
      .trim()
      .max(20, "Telefone muito longo")
      .optional(),
    billingPeriod: z
      .enum(["monthly", "quarterly", "annual"])
      .default("monthly"),
    backUrl: z
      .string()
      .url("URL de retorno inválida")
      .optional(),
  })
  .strip();

export type MercadoPagoPreferenceInput = z.infer<typeof mercadoPagoPreferenceSchema>;

/**
 * Schema para geração de Pix Instantâneo via Mercado Pago
 */
export const mercadoPagoPixPaymentSchema = z
  .object({
    planId: z.string().trim().min(1, "ID do plano é obrigatório"),
    amount: z
      .number({ required_error: "Valor do Pix é obrigatório" })
      .positive("O valor deve ser positivo")
      .max(50000, "Valor máximo excedido"),
    tenantId: z.string().trim().min(1, "Tenant ID é obrigatório"),
    description: z
      .string()
      .trim()
      .max(200, "Descrição muito longa")
      .default("Assinatura BarberSaaS Enterprise"),
    payerEmail: z
      .string({ required_error: "E-mail do pagador é obrigatório" })
      .trim()
      .email("E-mail inválido"),
    payerFirstName: z.string().trim().max(60).default("Gestor"),
    payerLastName: z.string().trim().max(60).default("Barbearia"),
    payerTaxId: z
      .string()
      .trim()
      .refine((val) => {
        const clean = val.replace(/\D/g, "");
        return clean.length === 11 || clean.length === 14;
      }, "CPF ou CNPJ deve conter 11 ou 14 dígitos numéricos")
      .optional()
      .default("00000000000"),
    idempotencyKey: z
      .string()
      .trim()
      .max(128, "Chave de idempotência muito longa")
      .optional(),
  })
  .strip();

export type MercadoPagoPixInput = z.infer<typeof mercadoPagoPixPaymentSchema>;

/**
 * Schema de Notificação de Webhook do Mercado Pago (v1)
 */
export const mercadoPagoWebhookPayloadSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    live_mode: z.boolean().default(false),
    type: z.string().default("payment"),
    date_created: z.string().optional(),
    action: z.string().optional(),
    user_id: z.union([z.string(), z.number()]).optional(),
    api_version: z.string().optional(),
    data: z
      .object({
        id: z.union([z.string(), z.number()]),
      })
      .strip(),
  })
  .strip();

export type MercadoPagoWebhookPayload = z.infer<typeof mercadoPagoWebhookPayloadSchema>;
