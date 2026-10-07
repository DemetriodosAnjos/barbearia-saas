/**
 * Sistema de Validação Estrita de Entradas e Proteção contra Mass Assignment
 * 
 * Regra Arquitetural: Não confunda validação de formulário com autorização.
 * - Validação de Formulário: Garante formato, tipos, limites e integridade dos dados de entrada.
 * - Autorização (RBAC/RLS): Garante se o sujeito autenticado (JWT auth.uid()) possui direito de mutação.
 */

// Roles estritamente permitidas para criação/edição comum
export const ALLOWED_BARBER_ROLES = ["barber", "assistant", "receptionist"];

// Tipos MIME permitidos para uploads de imagem (rejeita executáveis, scripts e SVGs com código embutido)
export const ALLOWED_AVATAR_MIMES = ["image/jpeg", "image/png", "image/webp"];
export const FORBIDDEN_FILE_EXTENSIONS = [
  ".exe",
  ".sh",
  ".bat",
  ".php",
  ".phtml",
  ".js",
  ".html",
  ".svg", // SVGs podem conter scripts embutidos (<svg onload=...>)
  ".py",
  ".rb",
];

// Campos estritamente protegidos contra Mass Assignment / Injeção de Privilégios
export const PRIVILEGED_FIELDS = [
  "role",
  "is_admin",
  "is_superadmin",
  "superadmin",
  "permissions",
  "is_paid",
  "tenant_id",
  "balance",
  "credits",
  "created_at",
  "updated_at",
];

/**
 * Validador genérico de Schema com rejeição estrita de campos desconhecidos
 */
export function validateSchema(payload, schema, options = { rejectUnknown: true, callerRole: "client" }) {
  const errors = [];
  const sanitized = {};

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      isValid: false,
      errors: ["Payload inválido: o corpo da requisição deve ser um objeto JSON."],
      sanitized: null,
    };
  }

  // 1. Detecção e Bloqueio de Mass Assignment (Campos Extras / Não previstos no Schema)
  const payloadKeys = Object.keys(payload);
  const schemaKeys = Object.keys(schema);

  for (const key of payloadKeys) {
    if (!schemaKeys.includes(key)) {
      if (options.rejectUnknown) {
        // Se o campo for sensível (role: "admin", is_paid: true), gera erro de segurança crítico
        if (PRIVILEGED_FIELDS.includes(key.toLowerCase())) {
          errors.push(
            `VIOLAÇÃO DE SEGURANÇA (Mass Assignment): O campo protegido '${key}' não pode ser atribuído diretamente pelo cliente.`
          );
        } else {
          errors.push(`Campo desconhecido não permitido no schema: '${key}'.`);
        }
      }
    }
  }

  // 2. Validação campo a campo do Schema
  for (const [fieldName, rule] of Object.entries(schema)) {
    const value = payload[fieldName];

    // Validação de obrigatoriedade
    if (rule.required && (value === undefined || value === null || value === "")) {
      errors.push(`O campo '${fieldName}' é obrigatório.`);
      continue;
    }

    if (value === undefined || value === null) {
      if (rule.default !== undefined) {
        sanitized[fieldName] = rule.default;
      }
      continue;
    }

    // Validação de Tipo
    if (rule.type) {
      const actualType = typeof value;
      if (rule.type === "number") {
        if (actualType !== "number" || isNaN(value)) {
          errors.push(`Tipo inválido para '${fieldName}': esperado number, recebido ${actualType}.`);
          continue;
        }
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`O campo '${fieldName}' deve ser no mínimo ${rule.min}.`);
          continue;
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`O campo '${fieldName}' deve ser no máximo ${rule.max}.`);
          continue;
        }
      } else if (rule.type === "string") {
        if (actualType !== "string") {
          errors.push(`Tipo inválido para '${fieldName}': esperado string, recebido ${actualType}.`);
          continue;
        }
        const strVal = value.trim();
        if (rule.minLength && strVal.length < rule.minLength) {
          errors.push(`O campo '${fieldName}' deve ter no mínimo ${rule.minLength} caracteres.`);
          continue;
        }
        if (rule.maxLength && strVal.length > rule.maxLength) {
          errors.push(
            `O campo '${fieldName}' ultrapassa o limite máximo permitido de ${rule.maxLength} caracteres (recebido: ${strVal.length}).`
          );
          continue;
        }
        if (rule.regex && !rule.regex.test(strVal)) {
          errors.push(`O formato do campo '${fieldName}' é inválido.`);
          continue;
        }
        if (rule.allowedValues && !rule.allowedValues.includes(strVal)) {
          errors.push(
            `Valor não permitido para '${fieldName}'. Permitidos: [${rule.allowedValues.join(", ")}].`
          );
          continue;
        }
        sanitized[fieldName] = strVal;
        continue;
      } else if (rule.type === "boolean") {
        if (actualType !== "boolean") {
          errors.push(`Tipo inválido para '${fieldName}': esperado boolean, recebido ${actualType}.`);
          continue;
        }
      } else if (rule.type === "array") {
        if (!Array.isArray(value)) {
          errors.push(`Tipo inválido para '${fieldName}': esperado array, recebido ${actualType}.`);
          continue;
        }
      }
    }

    sanitized[fieldName] = value;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : null,
  };
}

/**
 * Schemas Oficiais das Entidades da Aplicação
 */
export const SCHEMAS = {
  // Schema de Agendamento pelo Cliente (Body)
  appointmentBooking: {
    client_name: { type: "string", required: true, minLength: 2, maxLength: 80 },
    client_phone: { type: "string", required: true, minLength: 10, maxLength: 20 },
    barber_id: { type: "string", required: false, maxLength: 40 },
    barber_name: { type: "string", required: true, maxLength: 80 },
    service_name: { type: "string", required: true, minLength: 2, maxLength: 120 },
    duration_minutes: { type: "number", required: true, min: 5, max: 480 },
    price: { type: "number", required: true, min: 0, max: 10000 },
    start_time: { type: "string", required: true, minLength: 4, maxLength: 10 },
    end_time: { type: "string", required: true, minLength: 4, maxLength: 10 },
  },

  // Schema de Cadastro de Cliente (Body)
  clientDirectory: {
    name: { type: "string", required: true, minLength: 2, maxLength: 80 },
    phone: { type: "string", required: true, minLength: 10, maxLength: 20 },
    cpf: { type: "string", required: false, maxLength: 20 },
    birth_date: { type: "string", required: false, maxLength: 15 },
    frequency_days: { type: "number", required: false, min: 1, max: 365, default: 18 },
    notes: { type: "string", required: false, maxLength: 500, default: "" }, // Limite de 500 chars para evitar DoS
  },

  // Schema de Barbeiro/Profissional (Body)
  barberMember: {
    name: { type: "string", required: true, minLength: 2, maxLength: 80 },
    display_name: { type: "string", required: false, maxLength: 80 },
    role: {
      type: "string",
      required: true,
      allowedValues: ALLOWED_BARBER_ROLES, // Bloqueia 'admin', 'superadmin'
    },
    specialties: { type: "array", required: false, default: [] },
  },

  // Schema de Query Parameters
  queryParams: {
    screen: {
      type: "string",
      required: false,
      maxLength: 30,
      allowedValues: [
        "client-app",
        "barbershop",
        "superadmin",
        "onboarding",
        "login",
        "design-system",
        "qa-panel",
      ],
    },
    tenant_id: { type: "string", required: false, maxLength: 50 },
    barbeiro: { type: "string", required: false, maxLength: 60 },
  },

  // Schema de Path Parameters
  pathParams: {
    id: {
      type: "string",
      required: true,
      minLength: 1,
      maxLength: 60,
      regex: /^[a-zA-Z0-9_-]+$/, // Bloqueia path traversal '../' e SQLi
    },
  },
};

/**
 * Validador de Upload de Arquivos / Avatares
 */
export function validateAvatarUpload(file) {
  const errors = [];

  if (!file) {
    return { isValid: false, errors: ["Nenhum arquivo enviado."] };
  }

  // 1. Limite de Tamanho (Máximo 2MB = 2.097.152 bytes)
  const MAX_SIZE = 2 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    errors.push(
      `O arquivo tem ${(file.size / (1024 * 1024)).toFixed(2)}MB, excedendo o limite máximo de 2MB.`
    );
  }

  // 2. Validação de Extensão (Rejeita executáveis e scripts)
  const fileName = (file.name || "").toLowerCase();
  for (const ext of FORBIDDEN_FILE_EXTENSIONS) {
    if (fileName.endsWith(ext)) {
      errors.push(
        `Extensão perigosa '${ext}' bloqueada. Arquivos executáveis ou scripts não são permitidos.`
      );
      break;
    }
  }

  // 3. Validação de MIME Type (Apenas JPEG, PNG, WEBP)
  const mimeType = (file.type || "").toLowerCase();
  if (!ALLOWED_AVATAR_MIMES.includes(mimeType)) {
    errors.push(
      `Tipo MIME '${mimeType || "desconhecido"}' não suportado. Envie apenas imagens JPG, PNG ou WEBP.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    fileDetails: {
      name: file.name,
      sizeBytes: file.size,
      mimeType: file.type,
    },
  };
}
