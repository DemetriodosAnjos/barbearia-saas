/**
 * MOTOR DE ISOLAMENTO MULTI-TENANT, PREVENÇÃO BOLA & DEFESA IDOR
 * (Broken Object Level Authorization / Insecure Direct Object References)
 * 
 * Atende ao Prompt 02:
 * 1. Mapeamento de todas as rotas onde tenant_id, user_id ou resource_id são passados (path, query, body).
 * 2. Simulação de contas isoladas (Tenant A vs Tenant B).
 * 3. Tentativas de leitura, edição e exclusão no Tenant B usando token válido do Tenant A.
 * 4. Garantia estrita de que o filtro de isolamento vem do JWT verificado (auth.uid / tenant_id),
 *    ignorando sumariamente qualquer tenant_id arbitrário enviado pelo cliente.
 */

import { parseAndValidateJwt } from "../middleware/rbacMiddleware";
import { USER_ROLES } from "./authorizationMatrix";

// ========================================================
// 1. MAPEAMENTO DE ROTAS COM IDENTIFICADORES (BOLA / IDOR MATRIX)
// ========================================================
export const ROUTE_IDENTIFIER_MAP = [
  {
    endpoint: "/api/public/barbershops/:id",
    method: "GET",
    parameter: ":id (tenant_id / barbershop_id)",
    location: "path",
    classification: "PUBLIC",
    riskCategory: "Enumeração de Estabelecimentos",
    vulnerableBehavior: "Permitir dump de dados cadastrais confidenciais (CNPJ, repasses, dados bancários).",
    mitigationStrategy: "Expor apenas dados públicos (nome, logotipo, horário comercial). Bloquear dados sensíveis.",
    status: "PROTEGIDO",
  },
  {
    endpoint: "/api/public/appointments",
    method: "POST",
    parameter: "tenant_id",
    location: "body",
    classification: "PUBLIC",
    riskCategory: "Tenant Spoofing / Injeção de Agendamento Fantasma",
    vulnerableBehavior: "Atacante injeta agendamentos falsos em outra barbearia sem validação de existência.",
    mitigationStrategy: "Validação estrita de existência do tenant ativo + rate limiting por IP.",
    status: "PROTEGIDO",
  },
  {
    endpoint: "/api/client/cancel-appointment/:id",
    method: "POST",
    parameter: ":id (appointment_id)",
    location: "path",
    classification: "PRIVATE",
    riskCategory: "BOLA / IDOR de Cancelamento",
    vulnerableBehavior: "Cliente do Tenant A cancela agendamento de cliente do Tenant B alterando o ID no path.",
    mitigationStrategy: "Verificação dupla: appointment.tenant_id === auth.tenant_id E appointment.client_id === auth.uid.",
    status: "PROTEGIDO",
  },
  {
    endpoint: "/api/appointments/:id",
    method: "GET",
    parameter: ":id (appointment_id)",
    location: "path",
    classification: "PRIVATE",
    riskCategory: "BOLA / IDOR de Leitura",
    vulnerableBehavior: "Usuário acessa detalhes, histórico e anotações médicas/estéticas de outro cliente/tenant.",
    mitigationStrategy: "Filtro obrigatório do banco: WHERE id = :id AND tenant_id = auth.jwt.tenant_id.",
    status: "PROTEGIDO",
  },
  {
    endpoint: "/api/appointments/:id",
    method: "PUT",
    parameter: ":id (appointment_id), body.tenant_id",
    location: "path & body",
    classification: "ADMIN / EMPLOYEE",
    riskCategory: "BOLA / IDOR de Mutação e Reatribuição de Tenant",
    vulnerableBehavior: "Mudar o valor de agendamento do concorrente ou transferir clientes para outro tenant.",
    mitigationStrategy: "Ignorar body.tenant_id; validar posse do registro antes de qualquer UPDATE.",
    status: "PROTEGIDO",
  },
  {
    endpoint: "/api/appointments/:id",
    method: "DELETE",
    parameter: ":id (appointment_id)",
    location: "path",
    classification: "ADMIN",
    riskCategory: "BOLA / IDOR Destrutivo (Exclusão Cruzada)",
    vulnerableBehavior: "Admin do Tenant A exclui agendamentos do Tenant B para prejudicar concorrente.",
    mitigationStrategy: "WHERE id = :id AND tenant_id = auth.jwt.tenant_id; retornar 404 se não pertencer ao tenant.",
    status: "PROTEGIDO",
  },
  {
    endpoint: "/api/admin/financial/overview",
    method: "GET",
    parameter: "tenant_id",
    location: "query (?tenant_id=...)",
    classification: "ADMINISTRATIVE",
    riskCategory: "BOLA / Espionagem Financeira e DRE",
    vulnerableBehavior: "Admin de Alpha passa ?tenant_id=barbearia_beta e visualiza faturamento da concorrência.",
    mitigationStrategy: "Parâmetro de query é SUMARIAMENTE IGNORADO; query é forçada com auth.jwt.tenant_id.",
    status: "PROTEGIDO",
  },
  {
    endpoint: "/api/admin/tenants/settings",
    method: "PUT",
    parameter: "tenant_id",
    location: "body",
    classification: "ADMINISTRATIVE",
    riskCategory: "BOLA / Hijacking de Configuração e Chave Pix",
    vulnerableBehavior: "Admin injeta tenant_id da vítima no body e altera a chave Pix de recebimento de pagamentos.",
    mitigationStrategy: "tenant_id é injetado pelo servidor a partir do token verificado; body.tenant_id é descartado.",
    status: "PROTEGIDO",
  },
  {
    endpoint: "/api/admin/barbers/:id",
    method: "PATCH",
    parameter: ":id (barber_id)",
    location: "path",
    classification: "ADMINISTRATIVE",
    riskCategory: "BOLA / IDOR em Dados Funcionais",
    vulnerableBehavior: "Admin do Tenant A demite ou altera comissões de barbeiros do Tenant B.",
    mitigationStrategy: "Validação estrita de posse de equipe via RLS ou predicado seguro.",
    status: "PROTEGIDO",
  },
];

// ========================================================
// 2. BANCO DE DADOS EM MEMÓRIA (TENANT A vs TENANT B)
// ========================================================
export function createMultiTenantTestDatabase() {
  return {
    tenants: [
      {
        id: "barbearia_alpha",
        name: "Barbearia Alpha Prime",
        owner_id: "usr_admin_alpha",
        pix_key: "financeiro@alpha.com",
        commission_rate: 0.5,
      },
      {
        id: "barbearia_beta",
        name: "Barbearia Beta Concorrente",
        owner_id: "usr_admin_beta",
        pix_key: "diretoria@beta.com",
        commission_rate: 0.6,
      },
    ],
    appointments: [
      {
        id: "apt_alpha_01",
        tenant_id: "barbearia_alpha",
        client_id: "client_alpha_joao",
        client_name: "João Silva",
        service_name: "Corte Degradê",
        price: 60.0,
        status: "confirmed",
        notes: "Cliente fiel, cafezinho sem açúcar.",
      },
      {
        id: "apt_alpha_02",
        tenant_id: "barbearia_alpha",
        client_id: "client_alpha_pedro",
        client_name: "Pedro Santos",
        service_name: "Barba Terapia",
        price: 45.0,
        status: "confirmed",
        notes: "Pele sensível.",
      },
      {
        id: "apt_beta_01",
        tenant_id: "barbearia_beta",
        client_id: "client_beta_roberto",
        client_name: "Roberto Concorrente",
        service_name: "Corte Executivo VIP",
        price: 180.0, // Dado altamente confidencial
        status: "confirmed",
        notes: "Dados confidenciais: cliente VIP corporativo.",
      },
      {
        id: "apt_beta_02",
        tenant_id: "barbearia_beta",
        client_id: "client_beta_marcos",
        client_name: "Marcos Lima",
        service_name: "Coloração e Selagem",
        price: 250.0,
        status: "confirmed",
        notes: "Histórico confidencial.",
      },
    ],
    financial_overview: {
      barbearia_alpha: {
        mrr: 12500.0,
        gross_revenue: 15400.0,
        appointments_count: 240,
        average_ticket: 64.16,
      },
      barbearia_beta: {
        mrr: 38000.0,
        gross_revenue: 42800.0, // Segredo comercial
        appointments_count: 510,
        average_ticket: 83.92,
      },
    },
  };
}

// ========================================================
// 3. MOTOR DE EXECUÇÃO DE REQUISIÇÕES COM DEFESA BOLA / IDOR
// ========================================================
export class TenantIsolationEngine {
  constructor(initialDatabase = null) {
    this.db = initialDatabase || createMultiTenantTestDatabase();
  }

  /**
   * Reseta o banco de dados para o estado inicial
   */
  resetDatabase() {
    this.db = createMultiTenantTestDatabase();
  }

  /**
   * Processa uma requisição à API simulando gateway seguro com interceptação BOLA/IDOR
   */
  dispatch({
    path,
    method = "GET",
    token = null,
    body = {},
    query = {},
    params = {},
    vulnerabilityMode = false, // Se true, simula a falha ingênua antes da correção!
  }) {
    // 1. Validação de Autenticação (JWT)
    const jwtResult = parseAndValidateJwt(token);
    if (!jwtResult.valid) {
      return {
        status: 401,
        code: "UNAUTHENTICATED",
        error: "Unauthorized",
        message: jwtResult.error || "Token JWT ausente ou inválido.",
      };
    }

    const auth = jwtResult.payload;
    const authenticatedTenantId = auth.tenant_id;
    const isSuperAdmin = auth.role === USER_ROLES.SUPERADMIN;

    // ========================================================
    // MODO VULNERÁVEL (EVIDÊNCIA DE FALHA ANTES DA CORREÇÃO)
    // ========================================================
    if (vulnerabilityMode) {
      // FALHA: Aceita o tenant_id vindo do cliente (body, query ou path)
      const untrustedTenantId =
        query.tenant_id || body.tenant_id || params.tenant_id || authenticatedTenantId;

      // 1. Leitura de faturamento vulnerável
      if (path === "/api/admin/financial/overview") {
        const leaked = this.db.financial_overview[untrustedTenantId];
        return {
          status: 200,
          vulnerable: true,
          data: leaked,
          message: `[VULNERÁVEL] Dados do tenant '${untrustedTenantId}' retornados com base na query do cliente!`,
        };
      }

      // 2. Leitura de agendamento por ID sem filtro de tenant
      if (path.startsWith("/api/appointments/") && method === "GET") {
        const appointmentId = path.split("/").pop();
        const found = this.db.appointments.find((a) => a.id === appointmentId);
        if (found) {
          return {
            status: 200,
            vulnerable: true,
            data: found,
            message: `[VULNERÁVEL - BOLA/IDOR] Agendamento de outro tenant acessado sem validação de posse!`,
          };
        }
      }

      // 3. Mutação de agendamento vulnerável
      if (path.startsWith("/api/appointments/") && (method === "PUT" || method === "PATCH")) {
        const appointmentId = path.split("/").pop();
        const idx = this.db.appointments.findIndex((a) => a.id === appointmentId);
        if (idx !== -1) {
          this.db.appointments[idx] = { ...this.db.appointments[idx], ...body };
          return {
            status: 200,
            vulnerable: true,
            data: this.db.appointments[idx],
            message: `[VULNERÁVEL - BOLA] Registro modificado com sucesso em tenant alheio!`,
          };
        }
      }

      // 4. Exclusão vulnerável
      if (path.startsWith("/api/appointments/") && method === "DELETE") {
        const appointmentId = path.split("/").pop();
        const idx = this.db.appointments.findIndex((a) => a.id === appointmentId);
        if (idx !== -1) {
          const removed = this.db.appointments.splice(idx, 1)[0];
          return {
            status: 200,
            vulnerable: true,
            data: removed,
            message: `[VULNERÁVEL - BOLA] Registro excluído em tenant alheio!`,
          };
        }
      }
    }

    // ========================================================
    // MODO SEGURO: DEFESA BOLA / IDOR IMPLEMENTADA
    // Regra Fundamental #4: O tenant_id utilizado vem SEMPRE do JWT verificado!
    // Qualquer tenant_id enviado pelo cliente é SUMARIAMENTE IGNORADO ou REJEITADO.
    // ========================================================

    // 1. DETECÇÃO DE TENTATIVA DE TAMPERING / SPOOFING DE TENANT
    const clientProvidedTenantId =
      query.tenant_id || body.tenant_id || params.tenant_id;

    let spoofingAttemptDetected = false;
    if (
      clientProvidedTenantId &&
      clientProvidedTenantId !== authenticatedTenantId &&
      !isSuperAdmin
    ) {
      spoofingAttemptDetected = true;
    }

    // ========================================================
    // ROTA: /api/admin/financial/overview (GET)
    // ========================================================
    if (path === "/api/admin/financial/overview" && method === "GET") {
      if (auth.role !== USER_ROLES.ADMIN && !isSuperAdmin) {
        return {
          status: 403,
          code: "INSUFFICIENT_PERMISSIONS",
          message: "Acesso financeiro restrito ao perfil de Administrador.",
        };
      }

      // SEGURO: Força estritamente o tenant_id do JWT!
      const effectiveTenantId = isSuperAdmin
        ? clientProvidedTenantId || authenticatedTenantId
        : authenticatedTenantId;

      const data = this.db.financial_overview[effectiveTenantId];
      if (!data) {
        return { status: 404, message: "Registro financeiro não localizado." };
      }

      return {
        status: 200,
        tenant_scoping: "ENFORCED_FROM_JWT",
        effectiveTenantId,
        spoofingAttemptSuppressed: spoofingAttemptDetected,
        data,
      };
    }

    // ========================================================
    // ROTA: /api/appointments/:id (GET) - LEITURA BOLA / IDOR
    // ========================================================
    if (path.startsWith("/api/appointments/") && method === "GET") {
      const appointmentId = path.split("/").pop();
      const appointment = this.db.appointments.find((a) => a.id === appointmentId);

      if (!appointment) {
        return { status: 404, message: "Agendamento não encontrado." };
      }

      // VALIDAÇÃO BOLA: O recurso pertence ao tenant autenticado?
      if (!isSuperAdmin && appointment.tenant_id !== authenticatedTenantId) {
        return {
          status: 403,
          code: "CROSS_TENANT_ACCESS_DENIED",
          error: "Forbidden",
          message: `VIOLAÇÃO BOLA/IDOR DETECTADA: O recurso '${appointmentId}' pertence ao tenant '${appointment.tenant_id}'. Acesso negado para o token de '${authenticatedTenantId}'.`,
        };
      }

      return {
        status: 200,
        tenant_scoping: "ENFORCED_FROM_JWT",
        data: appointment,
      };
    }

    // ========================================================
    // ROTA: /api/appointments/:id (PUT / PATCH) - EDIÇÃO BOLA / IDOR
    // ========================================================
    if (
      path.startsWith("/api/appointments/") &&
      (method === "PUT" || method === "PATCH")
    ) {
      const appointmentId = path.split("/").pop();
      const appointment = this.db.appointments.find((a) => a.id === appointmentId);

      if (!appointment) {
        return { status: 404, message: "Agendamento não encontrado." };
      }

      // VALIDAÇÃO BOLA: Bloqueia mutação de registros de outro tenant
      if (!isSuperAdmin && appointment.tenant_id !== authenticatedTenantId) {
        return {
          status: 403,
          code: "CROSS_TENANT_MUTATION_DENIED",
          error: "Forbidden",
          message: `VIOLAÇÃO BOLA/IDOR BLOQUEADA: Tentativa de alteração no recurso '${appointmentId}' pertencente a outro tenant.`,
        };
      }

      // SEGURANÇA: Descarta qualquer tentativa de alterar o tenant_id via body
      const safePayload = { ...body };
      delete safePayload.tenant_id; // Impede realocação de tenant

      Object.assign(appointment, safePayload);

      return {
        status: 200,
        tenant_scoping: "ENFORCED_FROM_JWT",
        data: appointment,
        message: "Agendamento atualizado com sucesso dentro do tenant autorizado.",
      };
    }

    // ========================================================
    // ROTA: /api/appointments/:id (DELETE) - EXCLUSÃO BOLA / IDOR
    // ========================================================
    if (path.startsWith("/api/appointments/") && method === "DELETE") {
      const appointmentId = path.split("/").pop();
      const appointmentIndex = this.db.appointments.findIndex(
        (a) => a.id === appointmentId
      );

      if (appointmentIndex === -1) {
        return { status: 404, message: "Agendamento não encontrado." };
      }

      const targetAppointment = this.db.appointments[appointmentIndex];

      // VALIDAÇÃO BOLA: Bloqueia exclusão de registros de outro tenant
      if (!isSuperAdmin && targetAppointment.tenant_id !== authenticatedTenantId) {
        return {
          status: 403,
          code: "CROSS_TENANT_DELETION_DENIED",
          error: "Forbidden",
          message: `VIOLAÇÃO BOLA/IDOR BLOQUEADA: Tentativa de exclusão no recurso '${appointmentId}' pertencente ao tenant '${targetAppointment.tenant_id}'.`,
        };
      }

      const deleted = this.db.appointments.splice(appointmentIndex, 1)[0];

      return {
        status: 200,
        tenant_scoping: "ENFORCED_FROM_JWT",
        deletedResource: deleted,
        message: "Agendamento excluído com sucesso dentro do próprio tenant.",
      };
    }

    // ========================================================
    // ROTA: /api/admin/tenants/settings (PUT) - CONFIGURAÇÕES DO TENANT
    // ========================================================
    if (path === "/api/admin/tenants/settings" && method === "PUT") {
      if (auth.role !== USER_ROLES.ADMIN && !isSuperAdmin) {
        return {
          status: 403,
          code: "INSUFFICIENT_PERMISSIONS",
          message: "Acesso restrito ao perfil de Administrador.",
        };
      }

      // SEGURO: Ignora qualquer body.tenant_id injetado e aplica no tenant do JWT
      const targetTenantIndex = this.db.tenants.findIndex(
        (t) => t.id === authenticatedTenantId
      );

      if (targetTenantIndex === -1) {
        return { status: 404, message: "Tenant não encontrado." };
      }

      const safePayload = { ...body };
      delete safePayload.id;
      delete safePayload.tenant_id;

      Object.assign(this.db.tenants[targetTenantIndex], safePayload);

      return {
        status: 200,
        tenant_scoping: "ENFORCED_FROM_JWT",
        effectiveTenantId: authenticatedTenantId,
        spoofingAttemptSuppressed: spoofingAttemptDetected,
        data: this.db.tenants[targetTenantIndex],
        message: "Configurações da barbearia atualizadas no escopo do token autenticado.",
      };
    }

    return {
      status: 404,
      code: "ROUTE_NOT_FOUND",
      message: `Rota '${method} ${path}' não tratada no motor de teste.`,
    };
  }
}

// Instância singleton para uso em testes e painel QA
export const tenantIsolationEngine = new TenantIsolationEngine();
