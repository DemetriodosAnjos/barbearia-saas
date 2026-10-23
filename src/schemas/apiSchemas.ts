/**
 * src/schemas/apiSchemas.ts
 *
 * Schemas de Validação Server-Side com Zod para Todas as Rotas da API.
 * 
 * Diretrizes Arquiteturais:
 * 1. Todos os schemas utilizam .strip() explicitamente para eliminar quaisquer propriedades
 *    não declaradas (Defesa contra Mass Assignment / Parameter Injection).
 * 2. Validação rigorosa de tipo, tamanho máximo de string, regex de email, UUID,
 *    telefones e limites de números/valores monetários.
 * 3. Sanitização contra injeção de scripts e payloads excessivos.
 */

import { z } from "zod";

// ============================================================================
// PADRÕES REUTILIZÁVEIS & VALIDAÇÕES ATÔMICAS
// ============================================================================

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const TIME_HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const PHONE_BR_REGEX = /^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/;

/**
 * UUID v4 estrito com mensagem customizada
 */
export const uuidSchema = z
  .string({ required_error: "ID é obrigatório" })
  .trim()
  .regex(UUID_REGEX, { message: "Formato de UUID inválido" });

/**
 * Identificador de recurso (UUID ou string alfanumérica segura com prefixo, max 64 chars)
 */
export const resourceIdSchema = z
  .string({ required_error: "Identificador de recurso é obrigatório" })
  .trim()
  .min(1, "Identificador não pode ser vazio")
  .max(64, "Identificador não pode exceder 64 caracteres")
  .regex(/^[a-zA-Z0-9_-]+$/, { message: "Identificador contém caracteres inválidos" });

/**
 * Limite de paginação
 */
export const paginationQuerySchema = z
  .object({
    limit: z.coerce
      .number()
      .int("Limit deve ser um número inteiro")
      .min(1, "Limite mínimo é 1")
      .max(100, "Limite máximo é 100")
      .default(20),
    offset: z.coerce
      .number()
      .int("Offset deve ser um número inteiro")
      .min(0, "Offset não pode ser negativo")
      .default(0),
    search: z.string().trim().max(100, "Busca não pode exceder 100 caracteres").optional(),
  })
  .strip();

// ============================================================================
// 1. ROTAS DE AUTENTICAÇÃO & GESTÃO DE SESSÃO
// ============================================================================

/**
 * POST /api/auth/login
 */
export const loginSchema = {
  body: z
    .object({
      email: z
        .string({ required_error: "E-mail é obrigatório" })
        .trim()
        .email("Formato de e-mail inválido")
        .max(255, "E-mail não pode exceder 255 caracteres"),
      password: z
        .string({ required_error: "Senha é obrigatória" })
        .min(8, "Senha deve ter no mínimo 8 caracteres")
        .max(128, "Senha não pode exceder 128 caracteres"),
      captchaToken: z
        .string()
        .trim()
        .max(4096, "Token CAPTCHA excede tamanho máximo")
        .optional(),
    })
    .strip(),
  headers: z
    .object({
      "x-forwarded-for": z.string().max(128).optional(),
      "user-agent": z.string().max(512).optional(),
      "x-correlation-id": z.string().max(64).optional(),
    })
    .strip(),
};

/**
 * POST /api/auth/register
 */
export const registerSchema = {
  body: z
    .object({
      name: z
        .string({ required_error: "Nome é obrigatório" })
        .trim()
        .min(2, "Nome deve ter no mínimo 2 caracteres")
        .max(120, "Nome não pode exceder 120 caracteres"),
      email: z
        .string({ required_error: "E-mail é obrigatório" })
        .trim()
        .email("Formato de e-mail inválido")
        .max(255, "E-mail não pode exceder 255 caracteres"),
      password: z
        .string({ required_error: "Senha é obrigatória" })
        .min(8, "A senha deve ter no mínimo 8 caracteres")
        .max(128, "A senha não pode exceder 128 caracteres"),
      phone: z
        .string()
        .trim()
        .regex(PHONE_BR_REGEX, "Telefone inválido (formato esperado: (XX) 9XXXX-XXXX)")
        .optional(),
      role: z
        .enum(["superadmin", "barbershop_admin", "barber", "receptionist", "client"], {
          errorMap: () => ({ message: "Papel de usuário inválido" }),
        })
        .default("client"),
      barbershop_name: z.string().trim().max(120).optional(),
    })
    .strip(),
};

/**
 * POST /api/auth/refresh-token
 */
export const refreshTokenSchema = {
  body: z
    .object({
      refreshToken: z
        .string({ required_error: "Refresh token é obrigatório" })
        .trim()
        .min(10, "Refresh token inválido")
        .max(4096, "Refresh token excede o tamanho permitido"),
    })
    .strip(),
};

/**
 * POST /api/auth/revoke-sessions
 */
export const revokeSessionsSchema = {
  body: z
    .object({
      userId: uuidSchema,
      trigger: z.enum(
        [
          "logout_all_devices",
          "password_change",
          "profile_update_by_admin",
          "user_blocked",
          "session_compromised",
        ],
        { errorMap: () => ({ message: "Gatilho de revogação inválido" }) }
      ),
      reason: z
        .string()
        .trim()
        .max(255, "Motivo não pode exceder 255 caracteres")
        .optional()
        .default("Revogação administrativa de segurança"),
    })
    .strip(),
};

// ============================================================================
// 2. ROTAS DE AGENDAMENTOS (/api/appointments)
// ============================================================================

/**
 * POST /api/appointments (Criação de Agendamento)
 */
export const createAppointmentSchema = {
  body: z
    .object({
      client_name: z
        .string({ required_error: "Nome do cliente é obrigatório" })
        .trim()
        .min(2, "Nome deve ter pelo menos 2 caracteres")
        .max(100, "Nome não pode ultrapassar 100 caracteres"),
      client_phone: z
        .string({ required_error: "Telefone do cliente é obrigatório" })
        .trim()
        .max(20, "Telefone não pode exceder 20 caracteres"),
      barber_id: resourceIdSchema,
      barber_name: z
        .string({ required_error: "Nome do barbeiro é obrigatório" })
        .trim()
        .min(2)
        .max(100),
      service_id: resourceIdSchema.optional(),
      service_name: z
        .string({ required_error: "Nome do serviço é obrigatório" })
        .trim()
        .min(2)
        .max(100),
      duration_minutes: z.coerce
        .number({ required_error: "Duração é obrigatória" })
        .int("Duração deve ser um valor inteiro")
        .min(5, "Duração mínima é de 5 minutos")
        .max(480, "Duração máxima permitida é 480 minutos (8 horas)"),
      price: z.coerce
        .number({ required_error: "Preço é obrigatório" })
        .positive("Preço deve ser positivo")
        .max(50000, "Valor do serviço excede o limite operacional de R$ 50.000"),
      start_time: z
        .string({ required_error: "Horário inicial é obrigatório" })
        .trim()
        .regex(TIME_HH_MM_REGEX, "Horário inicial inválido (use HH:MM)"),
      end_time: z
        .string({ required_error: "Horário final é obrigatório" })
        .trim()
        .regex(TIME_HH_MM_REGEX, "Horário final inválido (use HH:MM)"),
      date: z
        .string()
        .trim()
        .regex(DATE_ISO_REGEX, "Data inválida (use AAAA-MM-DD)")
        .optional(),
      notes: z
        .string()
        .trim()
        .max(500, "Observações não podem exceder 500 caracteres")
        .optional(),
      tenant_id: z.string().trim().max(100).optional(),
      client_id: z.string().trim().max(100).optional(),
    })
    .strip(),
};

/**
 * GET /api/appointments (Listagem com filtros)
 */
export const getAppointmentsSchema = {
  query: z
    .object({
      clientName: z.string().trim().max(100).optional(),
      barberId: resourceIdSchema.optional(),
      status: z
        .enum(["pending", "confirmed", "in_progress", "completed", "cancelled"])
        .optional(),
      startDate: z.string().trim().regex(DATE_ISO_REGEX, "Formato AAAA-MM-DD").optional(),
      endDate: z.string().trim().regex(DATE_ISO_REGEX, "Formato AAAA-MM-DD").optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    })
    .strip(),
};

/**
 * GET /api/appointments/:id
 * DELETE /api/appointments/:id
 */
export const appointmentParamsSchema = {
  params: z
    .object({
      id: resourceIdSchema,
    })
    .strip(),
};

/**
 * PUT & PATCH /api/appointments/:id (Atualização de Agendamento)
 * Prevenção de Mass Assignment: tenant_id, barbershop_id e id NÃO são permitidos no body.
 */
export const updateAppointmentSchema = {
  params: z
    .object({
      id: resourceIdSchema,
    })
    .strip(),
  body: z
    .object({
      client_name: z.string().trim().min(2).max(100).optional(),
      client_phone: z.string().trim().max(20).optional(),
      service_name: z.string().trim().min(2).max(100).optional(),
      barber_name: z.string().trim().min(2).max(100).optional(),
      duration_minutes: z.coerce.number().int().min(5).max(480).optional(),
      price: z.coerce.number().positive().max(50000).optional(),
      start_time: z.string().trim().regex(TIME_HH_MM_REGEX, "Formato HH:MM").optional(),
      end_time: z.string().trim().regex(TIME_HH_MM_REGEX, "Formato HH:MM").optional(),
      status: z
        .enum(["pending", "confirmed", "in_progress", "completed", "cancelled"], {
          errorMap: () => ({ message: "Status de agendamento inválido" }),
        })
        .optional(),
      notes: z.string().trim().max(500).optional(),
    })
    .strip(),
};

// ============================================================================
// 3. ROTAS DE CAIXA, COMANDAS & POS (/api/pos)
// ============================================================================

/**
 * POST /api/pos/comanda
 */
export const createComandaSchema = {
  body: z
    .object({
      client_id: resourceIdSchema.optional(),
      client_name: z.string().trim().min(2).max(100),
      barber_id: resourceIdSchema,
      items: z
        .array(
          z
            .object({
              id: resourceIdSchema,
              type: z.enum(["service", "product"]),
              name: z.string().trim().min(1).max(100),
              price: z.coerce.number().min(0).max(50000),
              quantity: z.coerce.number().int().min(1).max(100).default(1),
            })
            .strip()
        )
        .min(1, "Comanda deve conter ao menos um item")
        .max(50, "Comanda não pode exceder 50 itens"),
      payment_method: z.enum(["pix", "credit_card", "debit_card", "cash"], {
        errorMap: () => ({ message: "Forma de pagamento não suportada" }),
      }),
      discount: z.coerce.number().min(0).max(10000).default(0),
      notes: z.string().trim().max(300).optional(),
    })
    .strip(),
};

/**
 * POST /api/pos/settle-commission
 */
export const settleCommissionSchema = {
  params: z
    .object({
      barberId: resourceIdSchema,
    })
    .strip(),
  body: z
    .object({
      period: z.string().trim().min(3).max(50),
      amount: z.coerce.number().positive("Valor de comissão deve ser positivo").max(100000),
      pixKey: z.string().trim().min(5).max(120),
      notes: z.string().trim().max(255).optional(),
    })
    .strip(),
};

// ============================================================================
// 4. ROTAS DE SERVIÇOS & PRODUTOS (/api/services)
// ============================================================================

export const createServiceSchema = {
  body: z
    .object({
      name: z.string().trim().min(2, "Nome do serviço é obrigatório").max(100),
      price: z.coerce.number().positive("Preço deve ser positivo").max(10000),
      duration_minutes: z.coerce.number().int().min(5).max(300),
      category: z.string().trim().max(50).default("Geral"),
      description: z.string().trim().max(500).optional(),
      is_active: z.boolean().default(true),
    })
    .strip(),
};

export const updateServiceSchema = {
  params: z.object({ id: resourceIdSchema }).strip(),
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      price: z.coerce.number().positive().max(10000).optional(),
      duration_minutes: z.coerce.number().int().min(5).max(300).optional(),
      category: z.string().trim().max(50).optional(),
      description: z.string().trim().max(500).optional(),
      is_active: z.boolean().optional(),
    })
    .strip(),
};

// ============================================================================
// 5. ROTAS DE CLIENTES & FIDELIDADE (/api/clients)
// ============================================================================

export const searchClientsQuerySchema = {
  query: z
    .object({
      term: z.string().trim().max(100).optional(),
      phone: z.string().trim().max(20).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).default(0),
    })
    .strip(),
};

export const redeemLoyaltyRewardSchema = {
  params: z.object({ clientId: resourceIdSchema }).strip(),
  body: z
    .object({
      reward_id: resourceIdSchema,
      stamps_used: z.coerce.number().int().min(1).max(50).default(10),
    })
    .strip(),
};

// ============================================================================
// 6. ROTAS DE CONFIGURAÇÃO DE BARBEARIA (/api/settings)
// ============================================================================

export const updateBarbershopSettingsSchema = {
  body: z
    .object({
      name: z.string().trim().min(2).max(120).optional(),
      phone: z.string().trim().max(20).optional(),
      address: z.string().trim().max(255).optional(),
      opening_hour: z.string().trim().regex(TIME_HH_MM_REGEX, "Formato HH:MM").optional(),
      closing_hour: z.string().trim().regex(TIME_HH_MM_REGEX, "Formato HH:MM").optional(),
      allow_online_booking: z.boolean().optional(),
      cancellation_window_hours: z.coerce.number().int().min(0).max(72).optional(),
    })
    .strip(),
};

// ============================================================================
// EXPORTAÇÃO CENTRALIZADA DE TODOS OS SCHEMAS POR ROTA
// ============================================================================

export const API_SCHEMAS = {
  auth: {
    login: loginSchema,
    register: registerSchema,
    refreshToken: refreshTokenSchema,
    revokeSessions: revokeSessionsSchema,
  },
  appointments: {
    create: createAppointmentSchema,
    list: getAppointmentsSchema,
    params: appointmentParamsSchema,
    update: updateAppointmentSchema,
  },
  pos: {
    createComanda: createComandaSchema,
    settleCommission: settleCommissionSchema,
  },
  services: {
    create: createServiceSchema,
    update: updateServiceSchema,
  },
  clients: {
    search: searchClientsQuerySchema,
    redeem: redeemLoyaltyRewardSchema,
  },
  settings: {
    update: updateBarbershopSettingsSchema,
  },
};
