import { parseAndValidateJwt } from "../middleware/rbacMiddleware";
import { USER_ROLES } from "../security/authorizationMatrix";
import { validateRequestData } from "../middleware/zodValidationMiddleware";
import { updateAppointmentSchema } from "../schemas/apiSchemas";

/**
 * DATABASE ACCESS REPOSITORY / MOCK INICIAL (Substituível pelo cliente Supabase / PostgreSQL)
 */
let appointmentStore = [
  {
    id: "apt_alpha_01",
    tenant_id: "barbearia_alpha",
    client_id: "client_alpha_joao",
    client_name: "João Silva",
    service_name: "Corte Degradê",
    price: 60.0,
    status: "confirmed",
    notes: "Cliente VIP Alpha",
  },
  {
    id: "apt_beta_01",
    tenant_id: "barbearia_beta",
    client_id: "client_beta_roberto",
    client_name: "Roberto Concorrente",
    service_name: "Corte Executivo VIP",
    price: 180.0,
    status: "confirmed",
    notes: "Dados confidenciais: cliente VIP Beta",
  },
];

export function resetAppointmentStore(customData = null) {
  if (customData) {
    appointmentStore = JSON.parse(JSON.stringify(customData));
  } else {
    appointmentStore = [
      {
        id: "apt_alpha_01",
        tenant_id: "barbearia_alpha",
        client_id: "client_alpha_joao",
        client_name: "João Silva",
        service_name: "Corte Degradê",
        price: 60.0,
        status: "confirmed",
        notes: "Cliente VIP Alpha",
      },
      {
        id: "apt_beta_01",
        tenant_id: "barbearia_beta",
        client_id: "client_beta_roberto",
        client_name: "Roberto Concorrente",
        service_name: "Corte Executivo VIP",
        price: 180.0,
        status: "confirmed",
        notes: "Dados confidenciais: cliente VIP Beta",
      },
    ];
  }
}

export function getAppointmentStore() {
  return appointmentStore;
}

/**
 * Task 2.1 - Backend Audit & Fix
 * Endpoint Refatorado: /api/appointments/:id (PUT & DELETE)
 * 
 * Regra Arquitetural Inviolável:
 * O tenant_id utilizado no escopo e nas operações de busca/mutação é extraído
 * ESTRITAMENTE do token JWT validado (auth.uid() / auth.tenant_id).
 * Quaisquer parâmetros de tenant_id enviados pelo cliente no body, query ou URL
 * são sumariamente descartados.
 */
export async function handleAppointmentResourceRequest(req, res = null) {
  // 1. Extração do Token JWT do cabeçalho Authorization
  const authHeader =
    req.headers?.authorization ||
    req.headers?.Authorization ||
    (typeof req.headers?.get === "function" ? req.headers.get("authorization") : "") ||
    "";

  const rawToken = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7).trim()
    : req.token || null;

  if (!rawToken) {
    const errorPayload = {
      status: 401,
      error: "Unauthorized",
      code: "AUTH_TOKEN_REQUIRED",
      message: "Acesso não autorizado: token JWT ausente.",
    };
    if (res?.status) return res.status(401).json(errorPayload);
    return new Response(JSON.stringify(errorPayload), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  // 2. Validação criptográfica do token JWT
  const jwtValidation = parseAndValidateJwt(rawToken);
  if (!jwtValidation.valid) {
    const errorPayload = {
      status: 401,
      error: "Unauthorized",
      code: "AUTH_TOKEN_INVALID",
      message: jwtValidation.error || "Token JWT inválido ou expirado.",
    };
    if (res?.status) return res.status(401).json(errorPayload);
    return new Response(JSON.stringify(errorPayload), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  // 3. Extração estrita do tenant_id a partir do JWT (auth.uid / tenant_id)
  const user = jwtValidation.payload;
  const verifiedTenantId = user.tenant_id || user.app_metadata?.tenant_id || user.user_metadata?.tenant_id || user.sub || user.userId;
  const isSuperAdmin = user.role === USER_ROLES.SUPERADMIN;

  const url = typeof req.url === "string" ? new URL(req.url, "http://localhost") : { pathname: req.path || "" };
  const method = (req.method || "GET").toUpperCase();
  const pathParts = (url.pathname || req.path || "").split("/").filter(Boolean);
  const resourceId = req.params?.id || pathParts[pathParts.length - 1];

  // 4. Busca do recurso no banco de dados
  const targetIndex = appointmentStore.findIndex((apt) => apt.id === resourceId);
  const targetAppointment = targetIndex !== -1 ? appointmentStore[targetIndex] : null;

  if (!targetAppointment) {
    const errorPayload = {
      status: 404,
      error: "Not Found",
      code: "RESOURCE_NOT_FOUND",
      message: `Recurso '${resourceId}' não encontrado.`,
    };
    if (res?.status) return res.status(404).json(errorPayload);
    return new Response(JSON.stringify(errorPayload), { status: 404, headers: { "Content-Type": "application/json" } });
  }

  // 5. Verificação estrita de BOLA / IDOR (Isolamento Multi-Tenant)
  // O recurso pertence ao tenant associado ao JWT do usuário?
  if (!isSuperAdmin && targetAppointment.tenant_id !== verifiedTenantId) {
    const bolaViolationPayload = {
      status: 403,
      error: "Forbidden",
      code: "CROSS_TENANT_ACCESS_DENIED",
      message: `VIOLAÇÃO BOLA/IDOR DETECTADA: O recurso '${resourceId}' pertence a outro tenant. Operação '${method}' rejeitada.`,
      incident: {
        attemptedResource: resourceId,
        resourceOwnerTenant: targetAppointment.tenant_id,
        requestorTenant: verifiedTenantId,
        requestorUser: user.userId || user.sub,
        timestamp: new Date().toISOString(),
      },
    };

    if (res?.status) return res.status(403).json(bolaViolationPayload);
    return new Response(JSON.stringify(bolaViolationPayload), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 6. Operação PUT: Validação estrita de Schema com Zod (.strip() e Anti-Mass Assignment)
  if (method === "PUT" || method === "PATCH") {
    // Validação estrita via Zod Schema
    const validationResult = validateRequestData(req, {
      body: updateAppointmentSchema.body,
      params: updateAppointmentSchema.params,
      maxPayloadBytes: 64 * 1024,
    });

    if (!validationResult.success) {
      const err = validationResult.errorResponse;
      if (res?.status) return res.status(err.status).json(err);
      return new Response(JSON.stringify(err), { status: err.status, headers: { "Content-Type": "application/json" } });
    }

    const sanitizedUpdate = validationResult.sanitizedData?.body || {};

    // Atualização mantendo tenant_id imutável (impossível sobrescrever tenant_id mesmo que injetado)
    appointmentStore[targetIndex] = {
      ...targetAppointment,
      ...sanitizedUpdate,
      tenant_id: targetAppointment.tenant_id, // Forçado do banco/JWT
      updated_at: new Date().toISOString(),
    };

    const successPayload = {
      status: 200,
      data: appointmentStore[targetIndex],
      tenantScoping: "ENFORCED_FROM_JWT",
      message: "Recurso atualizado com sucesso no escopo do tenant autenticado.",
    };

    if (res?.status) return res.status(200).json(successPayload);
    return new Response(JSON.stringify(successPayload), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // 7. Operação DELETE: Remoção segura dentro do tenant
  if (method === "DELETE") {
    const deletedResource = appointmentStore.splice(targetIndex, 1)[0];

    const successPayload = {
      status: 200,
      deletedResource,
      tenantScoping: "ENFORCED_FROM_JWT",
      message: "Recurso excluído com sucesso dentro do escopo do tenant autenticado.",
    };

    if (res?.status) return res.status(200).json(successPayload);
    return new Response(JSON.stringify(successPayload), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // 8. Operação GET: Leitura isolada
  const successPayload = {
    status: 200,
    data: targetAppointment,
    tenantScoping: "ENFORCED_FROM_JWT",
  };
  if (res?.status) return res.status(200).json(successPayload);
  return new Response(JSON.stringify(successPayload), { status: 200, headers: { "Content-Type": "application/json" } });
}
