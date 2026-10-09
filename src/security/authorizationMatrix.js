/**
 * MATRIZ DE AUTORIZAÇÃO E CONTROLE DE ACESSO (RBAC)
 * Princípio Fundamental: DEFAULT DENY (Negação por Padrão)
 * 
 * Regra: Qualquer rota que não esteja explicitamente registrada com isPublic: true
 * deve obrigatoriamente exigir um token JWT válido. Tentativas de acesso sem token
 * resultam em HTTP 401 (Unauthorized) e tentativas com token válido mas sem o papel
 * exigido resultam em HTTP 403 (Forbidden).
 */

export const USER_ROLES = {
  ANON: "anon",
  CLIENT: "client",
  EMPLOYEE: "employee",
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
};

export const ROUTE_CLASSIFICATIONS = {
  PUBLIC: "PUBLIC",                 // Acesso irrestrito (sem necessidade de JWT)
  PRIVATE: "PRIVATE",               // Requer qualquer usuário autenticado (client, employee, admin, superadmin)
  EMPLOYEE: "EMPLOYEE",             // Requer papel employee, admin ou superadmin
  ADMINISTRATIVE: "ADMINISTRATIVE", // Requer papel admin (gestor/dono de barbearia) ou superadmin
  SUPERADMIN: "SUPERADMIN",         // Requer papel superadmin estrito
};

/**
 * Matriz Formal de Rotas de API e Telas de UI
 */
export const AUTHORIZATION_MATRIX = [
  // ========================================================
  // 1. ROTAS PÚBLICAS (Isentas de JWT)
  // ========================================================
  {
    path: "/api/health",
    method: "GET",
    classification: ROUTE_CLASSIFICATIONS.PUBLIC,
    isPublic: true,
    allowedRoles: [USER_ROLES.ANON, USER_ROLES.CLIENT, USER_ROLES.EMPLOYEE, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
    description: "Verificação de integridade operacional do sistema (Healthcheck)",
    securityRationale: "Monitoramento de infraestrutura sem exposição de dados sensíveis.",
  },
  {
    path: "/api/auth/login",
    method: "POST",
    classification: ROUTE_CLASSIFICATIONS.PUBLIC,
    isPublic: true,
    allowedRoles: [USER_ROLES.ANON],
    description: "Autenticação com credenciais (e-mail/senha) e emissão de JWT",
    securityRationale: "Porta de entrada pública para obtenção de identidade.",
  },
  {
    path: "/api/auth/reset-password",
    method: "POST",
    classification: ROUTE_CLASSIFICATIONS.PUBLIC,
    isPublic: true,
    allowedRoles: [USER_ROLES.ANON],
    description: "Disparo e validação de OTP para redefinição de senha",
    securityRationale: "Recuperação de conta para usuários com acesso perdido.",
  },
  {
    path: "/api/public/barbershops/:id",
    method: "GET",
    classification: ROUTE_CLASSIFICATIONS.PUBLIC,
    isPublic: true,
    allowedRoles: [USER_ROLES.ANON, USER_ROLES.CLIENT, USER_ROLES.EMPLOYEE, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
    description: "Consulta pública dos dados institucionais da barbearia para agendamento",
    securityRationale: "Permite ao cliente visualizar nome, horário de funcionamento e endereço.",
  },
  {
    path: "/api/public/services",
    method: "GET",
    classification: ROUTE_CLASSIFICATIONS.PUBLIC,
    isPublic: true,
    allowedRoles: [USER_ROLES.ANON, USER_ROLES.CLIENT, USER_ROLES.EMPLOYEE, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
    description: "Catálogo público de serviços e preços vigentes",
    securityRationale: "Visualização do cardápio de serviços para clientes.",
  },
  {
    path: "/api/public/barbers",
    method: "GET",
    classification: ROUTE_CLASSIFICATIONS.PUBLIC,
    isPublic: true,
    allowedRoles: [USER_ROLES.ANON, USER_ROLES.CLIENT, USER_ROLES.EMPLOYEE, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
    description: "Lista de profissionais ativos e especialidades para escolha do cliente",
    securityRationale: "Seleção do barbeiro desejado no funil de agendamento.",
  },
  {
    path: "/api/public/appointments",
    method: "POST",
    classification: ROUTE_CLASSIFICATIONS.PUBLIC,
    isPublic: true,
    allowedRoles: [USER_ROLES.ANON, USER_ROLES.CLIENT],
    description: "Criação de agendamento anônimo pelo cliente final via App Web",
    securityRationale: "Permite a conversão direta de clientes sem fricção de cadastro prévio.",
  },

  // ========================================================
  // 2. ROTAS PRIVADAS / AUTENTICADAS (Requer JWT de qualquer usuário autenticado)
  // ========================================================
  {
    path: "/api/me",
    method: "GET",
    classification: ROUTE_CLASSIFICATIONS.PRIVATE,
    isPublic: false,
    allowedRoles: [USER_ROLES.CLIENT, USER_ROLES.EMPLOYEE, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
    description: "Perfil e dados de sessão do usuário atualmente autenticado",
    securityRationale: "Acesso aos dados pessoais protegidos pelo token JWT da sessão.",
  },
  {
    path: "/api/client/my-appointments",
    method: "GET",
    classification: ROUTE_CLASSIFICATIONS.PRIVATE,
    isPublic: false,
    allowedRoles: [USER_ROLES.CLIENT, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
    description: "Histórico e próximos agendamentos do próprio cliente",
    securityRationale: "Isolamento de privacidade: cliente só visualiza seus próprios registros.",
  },
  {
    path: "/api/client/cancel-appointment/:id",
    method: "POST",
    classification: ROUTE_CLASSIFICATIONS.PRIVATE,
    isPublic: false,
    allowedRoles: [USER_ROLES.CLIENT, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
    description: "Cancelamento de agendamento pertencente ao cliente",
    securityRationale: "Impede cancelamento indevido de agendamentos de terceiros.",
  },

  // ========================================================
  // 3. ROTAS DE FUNCIONÁRIOS / BARBEIROS (Requer role employee, admin ou superadmin)
  // ========================================================
  {
    path: "/api/employee/schedule",
    method: "GET",
    classification: ROUTE_CLASSIFICATIONS.EMPLOYEE,
    isPublic: false,
    allowedRoles: [USER_ROLES.EMPLOYEE, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
    description: "Grade de atendimentos e horários do próprio barbeiro",
    securityRationale: "Barbeiro acessa sua fila sem expor a barbearia inteira.",
  },
  {
    path: "/api/employee/commissions",
    method: "GET",
    classification: ROUTE_CLASSIFICATIONS.EMPLOYEE,
    isPublic: false,
    allowedRoles: [USER_ROLES.EMPLOYEE, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
    description: "Demonstrativo individual de comissões e repasses do profissional",
    securityRationale: "Proteção salarial: cada barbeiro acessa apenas suas próprias comissões.",
  },
  {
    path: "/api/employee/status",
    method: "PATCH",
    classification: ROUTE_CLASSIFICATIONS.EMPLOYEE,
    isPublic: false,
    allowedRoles: [USER_ROLES.EMPLOYEE, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
    description: "Atualização de status do barbeiro (em pausa, ativo, almoço)",
    securityRationale: "Apenas o próprio profissional ou o gestor pode alterar sua disponibilidade.",
  },

  // ========================================================
  // 4. ROTAS ADMINISTRATIVAS DA BARBEARIA (Requer role admin ou superadmin)
  // ========================================================
  {
    path: "/api/admin/tenants/settings",
    method: "PUT",
    classification: ROUTE_CLASSIFICATIONS.ADMINISTRATIVE,
    isPublic: false,
    allowedRoles: [USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
    description: "Configurações institucionais, horários e branding da barbearia",
    securityRationale: "Acesso restrito ao dono/gestor; funcionários e clientes não podem alterar parâmetros.",
  },
  {
    path: "/api/admin/barbers",
    method: "GET",
    classification: ROUTE_CLASSIFICATIONS.ADMINISTRATIVE,
    isPublic: false,
    allowedRoles: [USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
    description: "Gestão completa da equipe, taxas de comissão e cadastro de barbeiros",
    securityRationale: "Dados salariais e contratuais da equipe exigem perfil administrativo.",
  },
  {
    path: "/api/admin/barbers",
    method: "POST",
    classification: ROUTE_CLASSIFICATIONS.ADMINISTRATIVE,
    isPublic: false,
    allowedRoles: [USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
    description: "Admissão e cadastro de novos barbeiros na equipe",
    securityRationale: "Criação de novos acessos restrita ao administrador.",
  },
  {
    path: "/api/admin/services",
    method: "POST",
    classification: ROUTE_CLASSIFICATIONS.ADMINISTRATIVE,
    isPublic: false,
    allowedRoles: [USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
    description: "Criação, edição e exclusão de serviços e tabelas de preços",
    securityRationale: "Precificação e catálogo só podem ser alterados pelo gestor da barbearia.",
  },
  {
    path: "/api/admin/financial/overview",
    method: "GET",
    classification: ROUTE_CLASSIFICATIONS.ADMINISTRATIVE,
    isPublic: false,
    allowedRoles: [USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
    description: "Faturamento bruto, fluxo de caixa, ticket médio e balanço financeiro",
    securityRationale: "Informações financeiras confidenciais do estabelecimento.",
  },
  {
    path: "/api/admin/reports",
    method: "GET",
    classification: ROUTE_CLASSIFICATIONS.ADMINISTRATIVE,
    isPublic: false,
    allowedRoles: [USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
    description: "Relatórios de retenção de clientes, volume de agendamentos e cancelamentos",
    securityRationale: "Métricas gerenciais estratégicas de negócio.",
  },

  // ========================================================
  // 5. ROTAS DE SUPERADMINISTRADOR (Requer role superadmin)
  // ========================================================
  {
    path: "/api/superadmin/tenants",
    method: "GET",
    classification: ROUTE_CLASSIFICATIONS.SUPERADMIN,
    isPublic: false,
    allowedRoles: [USER_ROLES.SUPERADMIN],
    description: "Listagem e controle global de todas as barbearias assinantes da plataforma",
    securityRationale: "Privilégio master do SaaS: segregação entre barbearias não se aplica aqui.",
  },
  {
    path: "/api/superadmin/tenants/status",
    method: "PATCH",
    classification: ROUTE_CLASSIFICATIONS.SUPERADMIN,
    isPublic: false,
    allowedRoles: [USER_ROLES.SUPERADMIN],
    description: "Bloqueio ou liberação de barbearias inadimplentes",
    securityRationale: "Apenas o dono da plataforma SaaS tem autorização para suspender contas.",
  },
  {
    path: "/api/superadmin/plans",
    method: "POST",
    classification: ROUTE_CLASSIFICATIONS.SUPERADMIN,
    isPublic: false,
    allowedRoles: [USER_ROLES.SUPERADMIN],
    description: "Criação e precificação de planos de assinatura do SaaS",
    securityRationale: "Definição de modelo de negócio da plataforma.",
  },
  {
    path: "/api/superadmin/metrics",
    method: "GET",
    classification: ROUTE_CLASSIFICATIONS.SUPERADMIN,
    isPublic: false,
    allowedRoles: [USER_ROLES.SUPERADMIN],
    description: "Métricas globais da plataforma (MRR, Churn, ARR)",
    securityRationale: "Dados proprietários e sensíveis dos fundadores do SaaS.",
  },
];

/**
 * Mapeamento das Telas do Frontend (React Router / Telas)
 */
export const UI_SCREEN_MATRIX = [
  {
    screenId: "client-app",
    name: "App do Cliente (Agendamento)",
    classification: ROUTE_CLASSIFICATIONS.PUBLIC,
    isPublic: true,
    allowedRoles: [USER_ROLES.ANON, USER_ROLES.CLIENT, USER_ROLES.EMPLOYEE, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
  },
  {
    screenId: "login",
    name: "Tela de Login & Recuperação",
    classification: ROUTE_CLASSIFICATIONS.PUBLIC,
    isPublic: true,
    allowedRoles: [USER_ROLES.ANON, USER_ROLES.CLIENT, USER_ROLES.EMPLOYEE, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
  },
  {
    screenId: "onboarding",
    name: "Onboarding de Nova Barbearia",
    classification: ROUTE_CLASSIFICATIONS.PUBLIC,
    isPublic: true,
    allowedRoles: [USER_ROLES.ANON, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
  },
  {
    screenId: "design-system",
    name: "UI Kit & Design System",
    classification: ROUTE_CLASSIFICATIONS.PUBLIC,
    isPublic: true,
    allowedRoles: [USER_ROLES.ANON, USER_ROLES.CLIENT, USER_ROLES.EMPLOYEE, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
  },
  {
    screenId: "barbershop",
    name: "Painel da Barbearia (Gestão)",
    classification: ROUTE_CLASSIFICATIONS.ADMINISTRATIVE,
    isPublic: false,
    allowedRoles: [USER_ROLES.EMPLOYEE, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
  },
  {
    screenId: "superadmin",
    name: "Painel Master SuperAdmin",
    classification: ROUTE_CLASSIFICATIONS.SUPERADMIN,
    isPublic: true,
    allowedRoles: [USER_ROLES.ANON, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
  },
  {
    screenId: "qa-panel",
    name: "QA Studio & DevSecOps",
    classification: ROUTE_CLASSIFICATIONS.PUBLIC,
    isPublic: true,
    allowedRoles: [USER_ROLES.ANON, USER_ROLES.CLIENT, USER_ROLES.EMPLOYEE, USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN],
  },
];

/**
 * Função utilitária: Normaliza e faz correspondência de rotas com parâmetros
 * Ex: '/api/public/barbershops/abc-123' corresponde a '/api/public/barbershops/:id'
 */
export function matchRoutePattern(pattern, actualPath) {
  if (pattern === actualPath) return true;
  const patternSegments = pattern.split("/").filter(Boolean);
  const actualSegments = actualPath.split("/").filter(Boolean);

  if (patternSegments.length !== actualSegments.length) return false;

  for (let i = 0; i < patternSegments.length; i++) {
    const p = patternSegments[i];
    const a = actualSegments[i];
    if (p.startsWith(":")) continue; // Parâmetro dinâmico
    if (p.toLowerCase() !== a.toLowerCase()) return false;
  }

  return true;
}

/**
 * Localiza a definição da rota na matriz oficial
 */
export function findRouteDefinition(path, method = "GET") {
  const normalizedMethod = (method || "GET").toUpperCase();
  return (
    AUTHORIZATION_MATRIX.find((route) => {
      const methodMatches =
        route.method === "*" || route.method === normalizedMethod;
      return methodMatches && matchRoutePattern(route.path, path);
    }) || null
  );
}

/**
 * Localiza a definição da tela na matriz de UI
 */
export function findScreenDefinition(screenId) {
  return UI_SCREEN_MATRIX.find((s) => s.screenId === screenId) || null;
}
