/**
 * src/security/apiContractValidator.ts
 *
 * Módulo de Validação de Contrato Client-Side com Zod e Resiliência de APIs (Front-End Architecture).
 *
 * Padrões e Normas:
 * - Robustness Principle (Postel's Law): Seja tolerante no que aceita e rigoroso no que envia.
 * - OWASP Top 10 A04:2021 (Insecure Design) & CWE-20 (Improper Input Validation).
 * - Fallback Graceful Degradation: Degradação suave da UI com contingência quando o contrato é violado.
 *
 * Responsabilidades:
 * 1. Validar cargas brutas recebidas de APIs (Supabase, REST, Webhooks) antes de popularem o estado do React.
 * 2. Prevenir falhas em cascata ("Cannot read properties of undefined", "NaN", "TypeError").
 * 3. Classificar o estado dos dados em: ÍNTEGRO (100% OK), PARCIAL (sanitizado com contingência) ou CORROMPIDO (fallback total).
 * 4. Registrar logs e telemetria de divergência de schema para auditoria de frontend.
 */

import { z } from "zod";

// ============================================================================
// 1. SCHEMAS DE CONTRATO CLIENT-SIDE (RESILIENTES COM CASTING E FALLBACKS)
// ============================================================================

/**
 * Contrato de Serviço da Barbearia
 */
export const clientServiceContractSchema = z
  .object({
    id: z.coerce.string().min(1).default(() => `serv-${Date.now()}`),
    barbershopId: z.coerce.string().nullable().optional(),
    barbershop_id: z.coerce.string().nullable().optional(),
    name: z.string().trim().min(1, "Nome do serviço é obrigatório").default("Serviço"),
    category: z.string().trim().nullable().default("Cabelo"),
    durationMinutes: z.coerce.number().int().positive().nullable().default(30),
    duration_minutes: z.coerce.number().nullable().optional(),
    price: z.coerce.number().min(0).nullable().default(0),
    active: z.boolean().nullable().default(true),
    description: z.string().nullable().optional(),
    tag: z.string().nullable().optional(),
    commissionPercent: z.coerce.number().nullable().optional(),
    commission_percent: z.coerce.number().nullable().optional(),
  })
  .passthrough();

export type ClientServiceItem = z.infer<typeof clientServiceContractSchema>;

/**
 * Contrato de Barbeiro / Profissional da Equipe
 */
export const clientBarberContractSchema = z
  .object({
    id: z.coerce.string().min(1).default(() => `barber-${Date.now()}`),
    barbershopId: z.coerce.string().nullable().optional(),
    barbershop_id: z.coerce.string().nullable().optional(),
    name: z.string().trim().min(1, "Nome do barbeiro é obrigatório").default("Profissional"),
    displayName: z.string().trim().nullable().optional(),
    display_name: z.string().trim().nullable().optional(),
    role: z.string().trim().nullable().default("Barbeiro"),
    avatar: z.string().trim().nullable().optional().default("Scissors"),
    rating: z.coerce.number().min(0).max(5).nullable().default(5.0),
    reviewCount: z.coerce.number().int().min(0).nullable().default(0),
    review_count: z.coerce.number().int().min(0).nullable().default(0),
    status: z.string().nullable().default("active"),
    specialties: z.any().transform((v) => (Array.isArray(v) ? v : [])).default([]),
    phone: z.string().trim().nullable().optional().default(""),
    email: z.string().trim().nullable().optional(),
    pixKey: z.string().trim().nullable().optional().default(""),
    pix_key: z.string().trim().nullable().optional(),
    serviceCommission: z.coerce.number().min(0).max(100).nullable().default(50),
    service_commission: z.coerce.number().nullable().optional(),
    productCommission: z.coerce.number().min(0).max(100).nullable().default(10),
    product_commission: z.coerce.number().nullable().optional(),
    commission_percentage: z.coerce.number().nullable().optional(),
    commissionPercentage: z.coerce.number().nullable().optional(),
    notes: z.string().nullable().optional().default(""),
    schedule: z.any().nullable().optional(),
    breaks: z.any().nullable().optional(),
    createdAt: z.any().nullable().optional(),
    created_at: z.any().nullable().optional(),
  })
  .passthrough();

export type ClientBarberItem = z.infer<typeof clientBarberContractSchema>;

/**
 * Contrato de Agendamento
 */
export const clientAppointmentContractSchema = z
  .object({
    id: z.coerce.string().min(1).default(() => `apt-${Date.now()}`),
    barberId: z.coerce.string().nullable().default("barber-1"),
    barber_id: z.coerce.string().nullable().optional(),
    barbershop_id: z.coerce.string().nullable().optional(),
    barberName: z.string().trim().nullable().default("Barbeiro"),
    barber_name: z.string().trim().nullable().optional(),
    clientName: z.string().trim().min(1, "Nome do cliente é obrigatório").default("Cliente"),
    client_name: z.string().trim().nullable().optional(),
    clientPhone: z.string().trim().nullable().default("(00) 00000-0000"),
    client_phone: z.string().trim().nullable().optional(),
    serviceName: z.string().trim().nullable().default("Corte Tradicional"),
    service_name: z.string().trim().nullable().optional(),
    startTime: z.string().nullable().default("09:00"),
    start_time: z.string().nullable().optional(),
    endTime: z.string().nullable().default("09:45"),
    end_time: z.string().nullable().optional(),
    durationMinutes: z.coerce.number().int().positive().nullable().default(30),
    duration_minutes: z.coerce.number().nullable().optional(),
    price: z.coerce.number().min(0).nullable().default(0),
    status: z.any().transform((v) => (typeof v === "string" ? v : "confirmed")).default("confirmed"),
    isPaid: z.boolean().nullable().default(false),
    is_paid: z.boolean().nullable().optional(),
    isVip: z.boolean().nullable().default(false),
    is_vip: z.boolean().nullable().optional(),
    notes: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    createdAt: z.any().nullable().optional(),
    created_at: z.any().nullable().optional(),
  })
  .passthrough();

export type ClientAppointmentItem = z.infer<typeof clientAppointmentContractSchema>;

/**
 * Contrato de Ponto de Venda / Produto
 */
export const clientPosProductContractSchema = z
  .object({
    id: z.coerce.string().min(1),
    name: z.string().trim().default("Produto"),
    category: z.string().trim().default("Geral"),
    price: z.coerce.number().min(0).default(0),
    stock: z.coerce.number().int().min(0).default(0),
    commissionRate: z.coerce.number().min(0).max(1).default(0.1),
    barcode: z.string().optional(),
  })
  .strip();

export type ClientPosProductItem = z.infer<typeof clientPosProductContractSchema>;

/**
 * Contrato de Produto do Estoque e PDV da Barbearia
 */
export const clientProductContractSchema = z
  .object({
    id: z.coerce.string().min(1).default(() => `prod-${Date.now()}`),
    barbershopId: z.coerce.string().nullable().optional(),
    barbershop_id: z.coerce.string().nullable().optional(),
    name: z.string().trim().min(1).default("Produto"),
    category: z.string().trim().default("Vitrine"),
    icon: z.string().optional(),
    costPrice: z.coerce.number().min(0).default(0),
    cost_price: z.coerce.number().min(0).nullable().optional(),
    price: z.coerce.number().min(0).default(0),
    stock: z.coerce.number().int().min(0).default(0),
    commissionPercent: z.coerce.number().min(0).max(100).default(10),
    commission_percent: z.coerce.number().nullable().optional(),
    active: z.boolean().nullable().default(true),
  })
  .passthrough();

export type ClientProductItem = z.infer<typeof clientProductContractSchema>;

// ============================================================================
// 2. TIPOS DE RETORNO E TELEMETRIA DE CONTRATO
// ============================================================================

export type ContractIntegrityStatus = "INTACT" | "PARTIAL_RECOVERED" | "CORRUPTED_FALLBACK";

export interface ContractValidationResult<T> {
  data: T;
  status: ContractIntegrityStatus;
  isIntact: boolean;
  isPartial: boolean;
  isCorrupted: boolean;
  originalCount: number;
  validCount: number;
  droppedCount: number;
  errors: {
    index?: number;
    field?: string;
    message: string;
    receivedValue?: unknown;
  }[];
  timestamp: string;
  entityName: string;
}

export interface ContractTelemetryRecord {
  id: string;
  timestamp: string;
  entityName: string;
  status: ContractIntegrityStatus;
  errorsCount: number;
  summary: string;
}

// Buffer circular de telemetria de contratos na sessão (máx. 100 registros)
const contractViolationBuffer: ContractTelemetryRecord[] = [];

// ============================================================================
// 3. MOTOR CENTRALIZADO DE VALIDAÇÃO DE CONTRATOS
// ============================================================================

/**
 * Valida uma coleção de itens contra um schema Zod individual.
 * Se um item específico estiver corrompido, sanitiza ou descarta isoladamente
 * sem derrubar a lista inteira.
 */
export function validateArrayContract<T>(
  raw: unknown,
  itemSchema: z.ZodType<T>,
  entityName = "Entidade",
  fallbackList: T[] = []
): ContractValidationResult<T[]> {
  const timestamp = new Date().toISOString();

  // 1. Caso extremo: dado recebido não é array (ex: payload 500 em formato { error: "..." } ou nulo)
  if (!Array.isArray(raw)) {
    const errorRecord: ContractTelemetryRecord = {
      id: `CTR-ERR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp,
      entityName,
      status: "CORRUPTED_FALLBACK",
      errorsCount: 1,
      summary: `Contrato totalmente corrompido: esperava Array, recebeu ${typeof raw}`,
    };
    contractViolationBuffer.unshift(errorRecord);
    if (contractViolationBuffer.length > 100) contractViolationBuffer.pop();

    return {
      data: fallbackList,
      status: "CORRUPTED_FALLBACK",
      isIntact: false,
      isPartial: false,
      isCorrupted: true,
      originalCount: 0,
      validCount: fallbackList.length,
      droppedCount: 0,
      errors: [
        {
          message: `Payload recebido para '${entityName}' não é um Array válido (tipo recebido: ${typeof raw}). Fallback de contingência acionado.`,
          receivedValue: raw,
        },
      ],
      timestamp,
      entityName,
    };
  }

  // 2. Validação granular item por item
  const validItems: T[] = [];
  const errors: ContractValidationResult<T[]>["errors"] = [];
  let droppedCount = 0;

  raw.forEach((rawItem, idx) => {
    // Normalização inicial de snake_case para camelCase se aplicável
    const normalizedItem = normalizeKeysToCamel(rawItem);
    const parseResult = itemSchema.safeParse(normalizedItem);

    if (parseResult.success) {
      validItems.push(parseResult.data);
    } else {
      droppedCount++;
      parseResult.error.issues.forEach((issue) => {
        errors.push({
          index: idx,
          field: issue.path.join("."),
          message: issue.message,
          receivedValue: (rawItem as Record<string, unknown>)?.[issue.path[0] as string],
        });
      });
    }
  });

  const isIntact = errors.length === 0;
  const isPartial = errors.length > 0 && validItems.length > 0;
  const isCorrupted = validItems.length === 0 && raw.length > 0;

  const status: ContractIntegrityStatus = isIntact
    ? "INTACT"
    : isPartial
    ? "PARTIAL_RECOVERED"
    : "CORRUPTED_FALLBACK";

  // Se houver anomalias, registra no buffer de telemetria
  if (!isIntact) {
    const errorRecord: ContractTelemetryRecord = {
      id: `CTR-WARN-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp,
      entityName,
      status,
      errorsCount: errors.length,
      summary: `${errors.length} divergências de schema detectadas em '${entityName}'. ${validItems.length} itens recuperados, ${droppedCount} descartados.`,
    };
    contractViolationBuffer.unshift(errorRecord);
    if (contractViolationBuffer.length > 100) contractViolationBuffer.pop();

    console.warn(`[API-CONTRACT-RESILIENCE] '${entityName}':`, errorRecord.summary, errors);
  }

  return {
    data: isCorrupted ? fallbackList : validItems,
    status,
    isIntact,
    isPartial,
    isCorrupted,
    originalCount: raw.length,
    validCount: validItems.length,
    droppedCount,
    errors,
    timestamp,
    entityName,
  };
}

/**
 * Valida um objeto único contra um schema Zod com fallback seguro
 */
export function validateSingleContract<T>(
  raw: unknown,
  schema: z.ZodType<T>,
  fallback: T,
  entityName = "Registro"
): ContractValidationResult<T> {
  const timestamp = new Date().toISOString();

  if (!raw || typeof raw !== "object") {
    return {
      data: fallback,
      status: "CORRUPTED_FALLBACK",
      isIntact: false,
      isPartial: false,
      isCorrupted: true,
      originalCount: 0,
      validCount: 1,
      droppedCount: 1,
      errors: [{ message: `Dado recebido não é um objeto válido: ${typeof raw}`, receivedValue: raw }],
      timestamp,
      entityName,
    };
  }

  const normalized = normalizeKeysToCamel(raw);
  const parseResult = schema.safeParse(normalized);

  if (parseResult.success) {
    return {
      data: parseResult.data,
      status: "INTACT",
      isIntact: true,
      isPartial: false,
      isCorrupted: false,
      originalCount: 1,
      validCount: 1,
      droppedCount: 0,
      errors: [],
      timestamp,
      entityName,
    };
  }

  const errors = parseResult.error.issues.map((iss) => ({
    field: iss.path.join("."),
    message: iss.message,
    receivedValue: (raw as Record<string, unknown>)?.[iss.path[0] as string],
  }));

  console.warn(`[API-CONTRACT-RESILIENCE] Falha no schema de '${entityName}':`, errors);

  return {
    data: fallback,
    status: "CORRUPTED_FALLBACK",
    isIntact: false,
    isPartial: false,
    isCorrupted: true,
    originalCount: 1,
    validCount: 0,
    droppedCount: 1,
    errors,
    timestamp,
    entityName,
  };
}

// ============================================================================
// 4. PARSERS ESPECIALIZADOS PARA O SAAS DA BARBEARIA
// ============================================================================

/**
 * Valida contrato de Serviços
 */
export function validateServicesContract(
  raw: unknown,
  fallback: ClientServiceItem[] = []
): ContractValidationResult<ClientServiceItem[]> {
  return validateArrayContract(raw, clientServiceContractSchema, "Serviços", fallback);
}

/**
 * Valida contrato de Barbeiros
 */
export function validateBarbersContract(
  raw: unknown,
  fallback: ClientBarberItem[] = []
): ContractValidationResult<ClientBarberItem[]> {
  return validateArrayContract(raw, clientBarberContractSchema, "Barbeiros", fallback);
}

/**
 * Valida contrato de Agendamentos
 */
export function validateAppointmentsContract(
  raw: unknown,
  fallback: ClientAppointmentItem[] = []
): ContractValidationResult<ClientAppointmentItem[]> {
  return validateArrayContract(raw, clientAppointmentContractSchema, "Agendamentos", fallback);
}

/**
 * Valida contrato de Produtos do Catálogo e Estoque
 */
export function validateProductsContract(
  raw: unknown,
  fallback: ClientProductItem[] = []
): ContractValidationResult<ClientProductItem[]> {
  return validateArrayContract(raw, clientProductContractSchema, "Produtos", fallback);
}

/**
 * Retorna os registros de telemetria de divergência de contratos
 */
export function getContractViolationLogs(): ContractTelemetryRecord[] {
  return [...contractViolationBuffer];
}

/**
 * Limpa o buffer de telemetria de contratos
 */
export function clearContractViolationLogs(): void {
  contractViolationBuffer.length = 0;
}

// ============================================================================
// 5. HELPER DE NORMALIZAÇÃO TOLERANTE (SNAKE_CASE -> CAMELCASE)
// ============================================================================

function normalizeKeysToCamel(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;

  const result: Record<string, unknown> = {};
  const entries = Object.entries(obj as Record<string, unknown>);

  entries.forEach(([key, val]) => {
    // Mantém a chave original
    result[key] = val;

    // Se tiver snake_case, converte para camelCase de conveniência
    if (key.includes("_")) {
      const camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = val;
    }

    // Mapeamentos específicos tolerantes de campos conhecidos do Supabase
    if (key === "duration_minutes") result["durationMinutes"] = val;
    if (key === "display_name") result["displayName"] = val;
    if (key === "review_count") result["reviewCount"] = val;
    if (key === "barber_id") result["barberId"] = val;
    if (key === "barber_name") result["barberName"] = val;
    if (key === "client_name") result["clientName"] = val;
    if (key === "client_phone") result["clientPhone"] = val;
    if (key === "service_name") result["serviceName"] = val;
    if (key === "start_time") result["startTime"] = val;
    if (key === "end_time") result["endTime"] = val;
    if (key === "is_paid") result["isPaid"] = val;
    if (key === "is_vip") result["isVip"] = val;
    if (key === "commission_rate") result["commissionRate"] = val;
    if (key === "commission_percentage") {
      result["commissionPercentage"] = val;
      if (result["serviceCommission"] === undefined) result["serviceCommission"] = val;
    }
    if (key === "service_commission") result["serviceCommission"] = val;
    if (key === "product_commission") result["productCommission"] = val;
    if (key === "cost_price") result["costPrice"] = val;
    if (key === "commission_percent") result["commissionPercent"] = val;
    if (key === "pix_key") result["pixKey"] = val;

    // Se 'breaks' for um objeto com metadados complementares (phone, email, pixKey, etc.)
    if (key === "breaks" && val && typeof val === "object" && !Array.isArray(val)) {
      const extra = val as Record<string, unknown>;
      if (extra.phone && !result["phone"]) result["phone"] = extra.phone;
      if (extra.email && !result["email"]) result["email"] = extra.email;
      if (extra.pix_key && !result["pixKey"]) result["pixKey"] = extra.pix_key;
      if (extra.product_commission !== undefined && result["productCommission"] === undefined) {
        result["productCommission"] = extra.product_commission;
      }
      if (extra.service_commission !== undefined && result["serviceCommission"] === undefined) {
        result["serviceCommission"] = extra.service_commission;
      }
      if (extra.notes && !result["notes"]) result["notes"] = extra.notes;

      // Normaliza breaks para que seja sempre um Array no estado do React
      if (Array.isArray(extra.intervals)) {
        result["breaks"] = extra.intervals;
      } else if (extra.startTime || extra.start_time || extra.breakStart) {
        result["breaks"] = [extra];
      } else {
        result["breaks"] = [];
      }
    }
  });

  return result;
}

export default {
  clientServiceContractSchema,
  clientBarberContractSchema,
  clientAppointmentContractSchema,
  clientPosProductContractSchema,
  clientProductContractSchema,
  validateArrayContract,
  validateSingleContract,
  validateServicesContract,
  validateBarbersContract,
  validateAppointmentsContract,
  validateProductsContract,
  getContractViolationLogs,
  clearContractViolationLogs,
};
