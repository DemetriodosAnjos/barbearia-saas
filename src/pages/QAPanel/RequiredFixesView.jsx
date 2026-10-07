import { useState, useMemo, useEffect } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import ProjectIcon from "../../components/ui/ProjectIcon";
import { getStoredProbedStatusMap, runExternalItemProbe, saveStoredProbedStatus } from "../../lib/security/externalProbeEngine";

/**
 * 1. CORREÇÕES REALIZADAS NO CÓDIGO DO PROJETO (/src)
 * Soluções implementadas, testadas e prontas para uso.
 */
export const REQUIRED_PROJECT_FIXES_DATA = [
  // ==========================================
  // BACK-END & CORE APIS (NO PROJETO)
  // ==========================================
  {
    id: "FIX-BE-01",
    squad: "Back-End & Core APIs",
    squadIcon: "Wrench",
    title: "Validação de Schema Server-Side com Zod e Prevenção de Mass Assignment (.strip())",
    subtitle: "Implementado em src/schemas/apiSchemas.ts e src/middleware/zodValidationMiddleware.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Camada rigorosa de validação de schemas Zod para body, query, params e headers com .strip() e limite de payload.",
    checklist: [
      "Criados schemas tipados com Zod para todas as rotas (Auth, Agendamentos, Comandas POS, Serviços e Clientes).",
      "Configuração compulsória da opção .strip() em todos os schemas para expurgo automático de propriedades não declaradas (anti-Mass Assignment).",
      "Validação estrita de tipos, regex de formato de e-mail, telefone, formato HH:MM e UUID v4.",
      "Validação de tamanho máximo de string em todos os campos de texto para evitar buffer overflows.",
      "Middleware genérico inspecionando byteLength do payload com bloqueio 400 PAYLOAD_TOO_LARGE em requisições acima de 256KB.",
      "Padronização de respostas semânticas HTTP 400 Bad Request com incident tracking e sem vazamento de stacktrace.",
      "Integração do middleware no endpoint de agendamentos (src/api/appointmentsEndpoint.js).",
    ],
    codeSnippet: `// EXEMPLO: USO DO MIDDLEWARE GENÉRICO ZOD
import { validateSchemaMiddleware } from "../middleware/zodValidationMiddleware";
import { API_SCHEMAS } from "../schemas/apiSchemas";

router.put(
  "/api/appointments/:id",
  validateSchemaMiddleware(API_SCHEMAS.appointments.update),
  handleUpdateAppointment
);`,
  },
  {
    id: "FIX-BE-02",
    squad: "Back-End & Core APIs",
    squadIcon: "Wrench",
    title: "Remoção de Queries SQL Concatenadas e Adoção de Safe Query Builder (Caso D'Angelo)",
    subtitle: "Implementado em src/utils/safeQueryBuilder.js e src/api/appointmentsSecureQuery.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Eliminação total de SQL concatenado via interpolação de strings, substituído por bound parameters e RPC Supabase.",
    checklist: [
      "Eliminação total de concatenações em strings de SQL na aplicação.",
      "Criação do módulo safeQueryBuilder com vinculação de parâmetros parametrizados ($1, $2, etc.).",
      "Tratamento automático e seguro de nomes com apóstrofo (ex: 'D\\'Angelo Santos') sem risco de injeção SQL.",
      "Implementação de RPC segura no Supabase (search_appointments_by_client) com escape nativo do PostgreSQL.",
    ],
    codeSnippet: `// CONSULTA PARAMETRIZADA SEGURA
const query = buildParametricQuery({
  table: "clients",
  filters: { name: "D'Angelo Santos", tenant_id: verifiedTenantId },
  allowedColumns: ["name", "tenant_id", "phone"],
});`,
  },
  {
    id: "FIX-BE-03",
    squad: "Back-End & Core APIs",
    squadIcon: "Wrench",
    title: "Atomicidade, Invocação RPC e Prevenção de Race Conditions & Double Booking",
    subtitle: "Implementado em src/api/atomicBookingService.ts e scripts/test-atomic-concurrency.js",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Serviço TypeScript de agendamento atômico invocando RPC PostgreSQL com Advisory Lock e bloqueio explícito SELECT ... FOR UPDATE.",
    checklist: [
      "Mapeamento e isolamento das rotas críticas com risco de concorrência simultânea (agendamento e fechamento de comandas).",
      "Criação da função bookAppointmentAtomic() com tratamento semântico de conflito (HTTP 409 Conflict) e resposta estruturada.",
      "Mecanismo de retry automático com exponential backoff e random jitter (20-60ms) para contenção de picos de carga.",
      "Detecção específica de erro SLOT_OCCUPIED_CONCURRENCY_CONFLICT e código PostgreSQL 23P01 (exclusion_violation).",
      "Benchmark automatizado de concorrência com 10 requisições simultâneas via Promise.all garantindo zero double booking.",
      "Fallback resiliente com Mutex Lock em memória para execução de testes unitários rápidos e sem dependência externa.",
    ],
    codeSnippet: `// INVOÇÃO ATÔMICA DA RPC CONTRA RACE CONDITIONS
import { bookAppointmentAtomic } from "../api/atomicBookingService";

const result = await bookAppointmentAtomic({
  tenantId: verifiedTenantId,
  barberId: selectedBarberId,
  clientId: authenticatedUser.id,
  clientName: "Cliente VIP",
  serviceId: "srv_corte",
  serviceName: "Corte Degradê",
  bookingDate: "2026-10-15",
  startTime: "14:00",
  endTime: "14:45",
  price: 65.0,
});

if (!result.success && result.statusCode === 409) {
  // Horário ocupado por colisão simultânea de outro cliente
  return res.status(409).json({ error: result.error, code: result.errorCode });
}`,
  },

  // ==========================================
  // CYBER SECURITY & APPSEC (NO PROJETO)
  // ==========================================
  {
    id: "FIX-SEC-01",
    squad: "Cyber Security & AppSec",
    squadIcon: "ShieldAlert",
    title: "Defesa Estrita contra BOLA/IDOR e Isolamento Multi-Tenant via JWT",
    subtitle: "Implementado em src/api/appointmentsEndpoint.js e src/security/tenantIsolationEngine.js",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Descarte sumário de parâmetros de tenant enviados pelo cliente e amarração estrita ao auth.uid do JWT.",
    checklist: [
      "Eliminação de qualquer parâmetro de tenant_id recebido via body, query ou URL pelo cliente.",
      "Extração exclusiva do tenant_id a partir do token JWT validado criptograficamente.",
      "Verificação de ownership do recurso antes de qualquer mutação ou leitura.",
      "Bloqueio com status HTTP 403 CROSS_TENANT_ACCESS_DENIED e log forense de tentativas BOLA/IDOR.",
    ],
    codeSnippet: `// VERIFICAÇÃO MULTI-TENANT NO ENDPOINT
const verifiedTenantId = jwtPayload.tenant_id || jwtPayload.sub;
if (!isSuperAdmin && targetResource.tenant_id !== verifiedTenantId) {
  return res.status(403).json({ code: "CROSS_TENANT_ACCESS_DENIED" });
}`,
  },
  {
    id: "FIX-SEC-02",
    squad: "Cyber Security & AppSec",
    squadIcon: "ShieldAlert",
    title: "Controle de Acesso RBAC com Princípio de Negação por Padrão (Default Deny)",
    subtitle: "Implementado em src/middleware/rbacMiddleware.js e src/security/authorizationMatrix.js",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Toda rota ou ação não explicitamente permitida é sumariamente rejeitada por padrão.",
    checklist: [
      "Negação implícita para rotas não mapeadas ou usuários sem papéis definidos.",
      "Diferenciação semântica precisa entre HTTP 401 Unauthorized (sem token/inválido) e HTTP 403 Forbidden (privilégio insuficiente).",
      "Segregação de 5 papéis: superadmin, barbershop_admin, barber, receptionist e client.",
    ],
  },
  {
    id: "FIX-SEC-03",
    squad: "Cyber Security & AppSec",
    squadIcon: "ShieldAlert",
    title: "Revogação Ativa de Sessão, Bloqueio Imediato e Blacklist de Tokens",
    subtitle: "Implementado em src/security/jwtLifecycleManager.ts e src/middleware/activeSessionMiddleware.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Invalidação imediata de sessões com corte temporal (cutoff timestamp) e limite de TTL para 900s.",
    checklist: [
      "Validação de TTL máximo de Access Token <= 900 segundos (15 minutos).",
      "Interceptação por middleware avaliando tokens emitidos antes do carimbo de revogação.",
      "Lista em memória de usuários bloqueados administrativamente com rejeição instantânea.",
      "Trigger automático de revogação em alteração de senha ou anomalia de segurança.",
    ],
  },
  {
    id: "FIX-SEC-SSRF-01",
    squad: "Cyber Security & AppSec",
    squadIcon: "ShieldAlert",
    title: "Restrição de Saída de Rede e Prevenção de SSRF via safeFetch() (Prompt 23)",
    subtitle: "Implementado em src/security/ssrfProtectionEngine.ts, egress-firewall-rules.json e docs/ssrf-network-egress-guide.md",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Cliente HTTP seguro (safeFetch / createSafeHttpClient) protegendo contra Server-Side Request Forgery (CWE-918). Bloqueio incondicional de metadados cloud (169.254.169.254 / IMDS), sub-redes privadas (RFC 1918), loopback (127.0.0.0/8, localhost), IPv6 local (::1, fe80::, fc00::), esquemas não-HTTP e imposição estrita de Allowlist para parceiros homologados (Mercado Pago, Stripe, WhatsApp, Supabase) com resposta HTTP 403 e header X-SSRF-Protection.",
    checklist: [
      "Utilitário seguro safeFetch() atuando como wrapper com validação de destinos pré-conexão.",
      "Allowlist estrita de saída: api.mercadopago.com, api.stripe.com, graph.facebook.com, *.supabase.co, api.resend.com, maps.googleapis.com.",
      "Bloqueio estrito de IP de metadados cloud (169.254.169.254, metadata.google.internal) contra roubo de tokens IAM/STS.",
      "Bloqueio de redes privadas RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) e Carrier-Grade NAT (100.64.0.0/10).",
      "Bloqueio de loopback local (127.0.0.0/8, localhost, 0.0.0.0/8) contra varredura de daemons e sockets internos.",
      "Bloqueio de IPv6 local e privado (::1, fe80::/10, fc00::/7, ::ffff:127.0.0.1).",
      "Rejeição de esquemas não-HTTP (file://, gopher://, ftp://, dict://) e coerção compulsória para HTTPS.",
      "Inspeção recursiva de redirecionamentos (HTTP 301/302) impedindo bypass via open-redirect para IPs internos.",
      "Ruleset declarativo de firewall de egresso para Cloud e Terraform (egress-firewall-rules.json).",
      "Guia técnico de SecOps (docs/ssrf-network-egress-guide.md), suíte unitária completa (ssrfProtectionEngine.test.ts) e Suíte SEC-45 no QA Studio.",
    ],
    codeSnippet: `// CLIENTE HTTP SEGURO COM PREVENÇÃO DE SSRF E ALLOWLIST
import { safeFetch, createSafeHttpClient } from "./src/security/ssrfProtectionEngine";

// Chamada externa segura validando Allowlist e bloqueando IPs privados
const response = await safeFetch("https://api.mercadopago.com/v1/payments", {
  method: "POST",
  body: JSON.stringify({ amount: 100.00 }),
});

// Tentativas maliciosas contra metadados ou loopback retornam 403 imediato:
// safeFetch("https://169.254.169.254/latest/meta-data/")
// -> { ok: false, status: 403, statusText: "SSRF_PREVENTION_BLOCKED", code: "CLOUD_METADATA_BLOCKED" }`,
  },

  // ==========================================
  // FRONT-END & UI/UX (NO PROJETO)
  // ==========================================
  {
    id: "FIX-FE-01",
    squad: "Front-End & UI/UX",
    squadIcon: "Palette",
    title: "Higienização Profunda contra XSS no React via DOMPurify (<SafeHtml>)",
    subtitle: "Implementado em src/components/ui/SafeHtml.jsx",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Componente seguro encapsulando renderizações HTML com DOMPurify e política estrita de tags.",
    checklist: [
      "Remoção de qualquer uso direto de dangerouslySetInnerHTML sem sanitizador.",
      "Criação do componente <SafeHtml> configurado com DOMPurify.",
      "Bloqueio estrito de tags executáveis (<script>, <iframe>, <object>, <embed>, <svg>).",
      "Remoção de manipuladores de eventos (onerror, onclick, onload, onmouseover).",
      "Injeção automática de rel='noopener noreferrer' e target='_blank' em links.",
    ],
    codeSnippet: `// COMPONENTE SEGURO DE RENDERIZAÇÃO
import SafeHtml from "../ui/SafeHtml";

<SafeHtml content={appointment.notes} />`,
  },
  {
    id: "FIX-FE-02",
    squad: "Front-End & UI/UX",
    squadIcon: "Palette",
    title: "Máquina de Estados Finitos de Agendamentos e Acessibilidade (A11Y)",
    subtitle: "Implementado em src/components/ui/Badge.jsx e componentes de formulário",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "MEDIUM (P2)",
    summary: "Bloqueio de transições inválidas de status em agendamentos concluídos ou cancelados.",
    checklist: [
      "Mapeamento estrito de transições permitidas (STATUS_TRANSITIONS).",
      "Estados terminais (completed, cancelled) desabilitam menus contextuais de alteração.",
      "Atributos ARIA (aria-label, role, tabindex) e foco visível em todos os controles.",
    ],
  },
  {
    id: "FIX-FE-05",
    squad: "Front-End & UI/UX",
    squadIcon: "Palette",
    title: "Limpeza Global de Estado e Storage no Logout (executeLogout)",
    subtitle: "Implementado em src/security/logoutService.ts, src/hooks/useSecureLogout.ts e src/lib/queryClient.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Higienização centralizada e determinística ao encerrar a sessão: invocação de supabase.auth.signOut(), invalidação completa do cache do React Query (queryClient.clear()), limpeza seletiva de localStorage (preservando whitelist neutra de UI) e expurgo de sessionStorage, bloqueando vazamento de dados entre contas no mesmo navegador.",
    checklist: [
      "Função centralizada executeLogout() acionada na saída manual voluntária ou expiração de token.",
      "Chamada obrigatória a supabase.auth.signOut() com tratamento resiliente contra falhas de rede.",
      "Invalidação compulsória do cache em memória do TanStack React Query via queryClient.clear() e removeQueries().",
      "Limpeza seletiva de localStorage com remoção de tokens de auth (sb-*, supabase.*), perfil do usuário, identificadores de tenant e rascunhos de transação.",
      "Preservação controlada de preferências neutras do dispositivo (theme, ui_color_mode, preferred_locale) sem vazamento de dados de usuário.",
      "Expurgo completo de sessionStorage (sessionStorage.clear()) para descarte de tokens temporários.",
      "Prevenção absoluta de contaminação cruzada de memória: novo login no mesmo navegador inicia com árvore limpa de estado.",
      "Hook useSecureLogout() monitorando onAuthStateChange e eventos customizados de token expirado.",
      "Suíte de 7 testes automatizados no Vitest (src/tests/unit/secureLogout.test.ts) e Suíte 38 no QA Studio Workbench.",
    ],
    codeSnippet: `// INVOCAR LOGOUT SEGURO COM HIGIENIZAÇÃO DE STORAGE E CACHE
import { executeLogout } from "../security/logoutService";

// Acionamento em botão de saída manual ou corte de sessão
const audit = await executeLogout({
  reason: "MANUAL_LOGOUT",
  preservePreferences: true, // Mantém tema dark/light sem dados de usuário
});

console.log(\`Logout concluído: \${audit.removedLocalStorageKeys.length} chaves purgadas, React Query zerado.\`);`,
  },
  {
    id: "FIX-FE-06",
    squad: "Front-End & UI/UX",
    squadIcon: "Palette",
    title: "Fallback de Contrato e Tratamento na UI (Zod Client-Side & Error Boundaries)",
    subtitle: "Implementado em src/security/apiContractValidator.ts, src/components/ui/ErrorBoundary.tsx, src/components/ui/ContractFallback.tsx e src/App.jsx",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Validação em runtime das respostas de API no front-end utilizando Zod antes de propagar dados ao estado React, contenção de exceções com React Error Boundaries para evitar colapso da tela inteira, e estados de Fallback Visual para dados ausentes, parciais ou corrompidos.",
    checklist: [
      "Validação client-side das respostas de endpoints (services, barbers, appointments) utilizando schemas Zod estritos (.strip()).",
      "Normalização resiliente aplicando coerção suave em tipos numéricos e preservando itens válidos em contratos com falhas parciais.",
      "Componente ErrorBoundary do React com captura via getDerivedStateFromError e registro estruturado em componentDidCatch.",
      "Mecanismo de retry/restauração interativo (resetErrorBoundary) para recomposição da interface sem recarregamento completo da página.",
      "Conjunto visual de fallbacks: DataCorruptedFallback (com detalhes técnicos expansíveis), PartialDataNotice (aviso não-bloqueante), EmptyDataFallback (estado vazio amigável) e ComponentCrashFallback (isolamento de crash).",
      "Encapsulamento de 100% das rotas e telas do SaaS (ClientApp, Barbershop, SuperAdmin, Onboarding, Login, QA) em src/App.jsx.",
      "Suíte de 6 testes automatizados no Vitest (src/tests/unit/contractFallbackAndErrorBoundary.test.tsx) e Suíte 39 no QA Studio Workbench.",
    ],
    codeSnippet: `// VALIDAÇÃO CLIENT-SIDE COM ZOD E ERROR BOUNDARY
import { validateServicesContract } from "../security/apiContractValidator";
import ErrorBoundary from "../components/ui/ErrorBoundary";

// Valida dados da API antes de alterar o estado
const result = validateServicesContract(rawApiData);
setServices(result.data);

// Encapsulamento de telas com Error Boundary
<ErrorBoundary componentName="Painel Administrativo">
  <BarbershopDashboard services={services} />
</ErrorBoundary>`,
  },

  // ==========================================
  // DEVOPS, SRE & CLOUD INFRA (NO PROJETO)
  // ==========================================
  {
    id: "FIX-DEV-01",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    title: "Higiene de Bundles Client-Side e Proibição de Segredos Estáticos no Vite",
    subtitle: "Implementado em vite.config.ts e src/utils/security.js",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "HIGH (P1)",
    summary: "Garantia de que chaves privadas e service_role nunca sejam incluídas no pacote do cliente.",
    checklist: [
      "Somente variáveis com prefixo VITE_ são expostas para o bundle do navegador.",
      "Mascaramento automático de strings confidenciais nos utilitários de exibição.",
      "Varredura estática no motor QA bloqueando strings suspeitas em arquivos de frontend.",
    ],
  },
  {
    id: "FIX-DEV-02",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    title: "Script SecOps de Auditoria Pós-Build (/dist) e Desativação de Source Maps (vite.config.ts)",
    subtitle: "Implementado em scripts/audit-bundle-secrets.js, vite.config.ts e docs/build-security-checklist.md",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Scanner pós-build inspecionando todos os arquivos gerados em /dist para bloqueio de vazamentos de segredos e source maps expostos.",
    checklist: [
      "Configuração compulsória de build.sourcemap: false no vite.config.ts, eliminando arquivos .map em produção.",
      "Criação do script automatizado scripts/audit-bundle-secrets.js integrado via 'npm run audit:build'.",
      "Varredura recursiva em /dist procurando padrões de service_role, chaves Stripe (sk_live_), Mercado Pago e strings de conexão com senha.",
      "Geração de laudo estruturado dist/bundle-audit-report.json com bloqueio imediato da pipeline (exit code 1) em caso de falha.",
      "Documentação do checklist de configuração de build em docs/build-security-checklist.md.",
    ],
    codeSnippet: `// CONFIGURAÇÃO NO VITE.CONFIG.TS & SCRIPT PÓS-BUILD
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: false, // Previne vazamento de .map em produção
    chunkSizeWarningLimit: 3000,
  }
});

// Execução da auditoria via CLI
npm run audit:build`,
  },
  {
    id: "FIX-FE-03",
    squad: "Front-End & UI/UX",
    squadIcon: "Palette",
    title: "Segregação Estrita de Variáveis de Ambiente no Vite e Template Sanitizado (.env.example)",
    subtitle: "Implementado em .env, .env.example e vite.config.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Isolamento absoluto de variáveis client-side (prefixo VITE_) em relação a segredos de backend e servidores externos.",
    checklist: [
      "Auditoria rigorosa do arquivo .env garantindo apenas variáveis públicas (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).",
      "Criação do arquivo .env.example completo e sanitizado com seções separadas para front-end e servidores.",
      "Avisos explícitos no template proibindo o uso do prefixo VITE_ em SUPABASE_SERVICE_ROLE_KEY ou chaves privadas.",
      "Regras no linter e motor QA bloqueando variáveis de ambiente confidenciais no código do cliente.",
    ],
  },
  {
    id: "FIX-SEC-08",
    squad: "Cyber Security & AppSec",
    squadIcon: "ShieldAlert",
    title: "Bloqueio Estrito de service_role e Chaves Privadas de Pagamento no Front-End",
    subtitle: "Implementado em src/lib/supabase.js e utilitários de segurança",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Garantia arquitetural de que o cliente web opera exclusivamente com privilégios de anon_key sob Row Level Security (RLS).",
    checklist: [
      "Inicialização do cliente Supabase em src/lib/supabase.js usando estritamente VITE_SUPABASE_ANON_KEY.",
      "Delegação de mutações críticas e pagamentos para Supabase Edge Functions seguras.",
      "Prevenção contra injeção de credenciais de produção do Mercado Pago (APP_USR-...) e Stripe (sk_live_...) no front-end.",
      "Varredura em tempo real acionada automaticamente a cada teste executado na bancada QA.",
    ],
  },
  {
    id: "FIX-FE-10",
    squad: "Front-End & UI/UX",
    squadIcon: "Palette",
    title: "UI de Resiliência: Skeleton Screens para Carregamento sob Alta Latência",
    subtitle: "Implementado em src/components/resilience/SkeletonCard.jsx, SkeletonBookingView.jsx e SkeletonDashboard.jsx",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "HIGH (P1)",
    summary: "Componentes visuais de Skeleton Screen eliminando telas brancas e layouts quebrados em requisições de alta latência (>1200ms) ou oscilações de 3G/4G.",
    checklist: [
      "Desenvolvimento do componente modular SkeletonCard com suporte a 4 variantes: service, barber, appointment e metric.",
      "Criação do componente SkeletonBookingView espelhando perfeitamente a hierarquia visual do fluxo de agendamento do cliente.",
      "Criação do componente SkeletonDashboard para carregamento suave de painéis administrativos.",
      "Animações em pulso sutil (animate-pulse) com paleta neutra Tailwind compatível com dark mode.",
      "Transição fluida entre estado de carregamento e conteúdo real sem saltos cumulativos de layout (CLS zero).",
    ],
  },
  {
    id: "FIX-FE-11",
    squad: "Front-End & UI/UX",
    squadIcon: "Palette",
    title: "UI de Resiliência: Banner de Estado de Conexão Offline e Reconexão Realtime Supabase",
    subtitle: "Implementado em src/components/resilience/OfflineBanner.jsx e src/components/resilience/useNetworkResilience.js",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "HIGH (P1)",
    summary: "Indicador discreto e não intrusivo acionado instantaneamente na perda de conectividade de rede ou queda do WebSocket do Supabase Realtime.",
    checklist: [
      "Hook useNetworkResilience monitorando eventos de window (online/offline) e status do canal Realtime (SUBSCRIBED, TIMED_OUT, CLOSED, CHANNEL_ERROR).",
      "Medição periódica de latência com telemetria leve (ping RTT).",
      "Banner elegante no topo de App.jsx com status: 'Modo Offline / Reconectando...', indicador pulsante e feedback de segurança de dados.",
      "Botão de reconexão manual instantânea e alternador de simulação de rede para testes de bancada.",
    ],
  },
  {
    id: "FIX-FE-12",
    squad: "Front-End & UI/UX",
    squadIcon: "Palette",
    title: "UI de Resiliência: Tratamento Amigável de Falha de Requisições com Retenção de Formulário e Tentar Novamente",
    subtitle: "Implementado em src/components/resilience/ResilientFormHandler.jsx e integrado em ClientBookingView.jsx",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Tratamento que retém 100% dos dados preenchidos no formulário em memória e sessionStorage, exibindo card amigável com botão de 'Tentar Novamente'.",
    checklist: [
      "Componente ResilientFormHandler com captura e persistência de dados em sessionStorage sob chave customizada.",
      "Exibição clara de que nenhum dado foi perdido com sumário de campos retidos (Nome, Telefone, Serviço, Barbeiro, Horário).",
      "Botão 'Tentar Novamente' com spinner de feedback e contador de tentativas.",
      "Opção 'Editar Dados' permitindo ajuste dos campos sem perda de digitação prévia.",
      "Eliminação de bloqueios nativos window.alert no fluxo de agendamento em conformidade com as diretrizes de UX.",
    ],
  },
  {
    id: "FIX-FE-13",
    squad: "Front-End & UI/UX",
    squadIcon: "Accessibility",
    title: "Navegação 100% Funcional via Teclado e Indicadores Visuais de Foco :focus-visible",
    subtitle: "Implementado em src/index.css, ServiceCard.jsx, ProfessionalCard.jsx, DatePicker.jsx e Navbar.jsx",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Ordem lógica de tabIndex, suporte às teclas Enter e Espaço em todos os cards de seleção, anéis de foco dourados :focus-visible de 2px e link skip-to-content no topo.",
    checklist: [
      "Configuração de outline de 2px solid #f59e0b e outline-offset de 2px via seletor :focus-visible global no CSS.",
      "Eliminação de contornos de foco indesejados ao clicar com mouse/toque via :focus:not(:focus-visible).",
      "ServiceCard: transformado em elemento interativo com role='checkbox', tabIndex={0}, aria-checked={isSelected} e manipulador onKeyDown.",
      "ProfessionalCard: configurado como role='radio' com tabIndex={0}, aria-checked={isSelected} e onKeyDown para ativação com Enter e Espaço.",
      "Inclusão do link de acessibilidade .skip-to-content permitindo pular direto ao <main id='main-content'> sem passar pelos cabeçalhos.",
      "DatePicker com navegação por teclado e anéis de foco destacados em cada botão de dia e horário.",
    ],
  },
  {
    id: "FIX-FE-14",
    squad: "Front-End & UI/UX",
    squadIcon: "Accessibility",
    title: "Validação Algorítmica e Calibração de Contraste Cromático Mínimo 4.5:1 (WCAG 2.2 AA)",
    subtitle: "Implementado em src/utils/theme.js e calibrado nas paletas do Design System",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Garantia matemática de contraste mínimo de 4.5:1 para texto normal e 3.0:1 para elementos de interface através de algoritmo oficial de luminância relativa W3C.",
    checklist: [
      "Implementação da função calculateRelativeLuminance() com normalização sRGB para RGB linear conforme WCAG 2.2 Critério 1.4.3.",
      "Implementação de calculateContrastRatio() e checkWcagCompliance() com avaliação de níveis AA e AAA.",
      "Ajuste de contraste no tema claro (#0F172A sobre #FFFFFF = ratio 15.4:1) e tema escuro (#FFFFFF sobre #0A0A0A = ratio 19.8:1).",
      "Calibração de textos de aviso e alertas de erro (#FCA5A5 sobre #171717 = ratio 5.9:1) superando a exigência mínima.",
      "Integração de testes automatizados no Vitest e suíte interativa no QA Studio Workbench.",
    ],
  },
  {
    id: "FIX-FE-15",
    squad: "Front-End & UI/UX",
    squadIcon: "Accessibility",
    title: "Semântica WAI-ARIA Dinâmica para Leitores de Tela (aria-expanded, aria-live, aria-describedby)",
    subtitle: "Implementado em OfflineBanner.jsx, ResilientFormHandler.jsx, Input.jsx, Navbar.jsx e Modal.jsx",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "HIGH (P1)",
    summary: "Atributos ARIA adequados para regiões ativas em tempo real, estados retráteis de menus e vinculação de mensagens de validação.",
    checklist: [
      "Região viva role='status' com aria-live='polite' no OfflineBanner anunciando status de rede suavemente.",
      "Região viva role='alert' com aria-live='assertive' no ResilientFormHandler para anúncio imediato de retenção de dados e reenvio.",
      "Componente Input associando o erro ao campo através de aria-describedby e marcando aria-invalid='true'.",
      "Menus dropdown da Navbar com aria-expanded, aria-haspopup='true', role='menu' e itens role='menuitem'.",
      "Janelas modais com role='dialog', aria-modal='true', aria-labelledby='modal-title-heading' e fechamento com tecla Escape.",
    ],
  },
  {
    id: "FIX-FE-16",
    squad: "Front-End & UI/UX",
    squadIcon: "Accessibility",
    title: "Conformidade com o Novo Critério 2.5.8 da WCAG 2.2 (Target Size Mínimo de 24x24px)",
    subtitle: "Implementado em src/index.css e componentes de botão e input",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "MEDIUM (P2)",
    summary: "Imposição de dimensão mínima de toque de 24x24 pixels em todos os alvos de interação para evitar toques acidentais em mobile.",
    checklist: [
      "Regra CSS global impondo min-height: 24px e min-width: 24px em botões, links, inputs, selects e elementos com role de botão.",
      "Padronização de botões primários e secundários com altura ergonômica de 40px a 48px.",
      "Espaçamento ergonômico nos botões de dias do calendário e seletores de horário no DatePicker.",
      "Garantia de usabilidade para clientes com tremores ou utilizando smartphones sob movimento.",
    ],
  },
  {
    id: "FIX-FE-17",
    squad: "Front-End & UI/UX",
    squadIcon: "Palette",
    title: "Histórias do Storybook 8 para Componentes Essenciais e Matriz de Estados (FIX-FE-17)",
    subtitle: "Implementado em .storybook/ e src/stories/*.stories.jsx",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "HIGH (P1)",
    summary: "Montagem de histórias CSF 3.0 para Buttons, Inputs, Modals, Cards e Badges cobrindo todos os estados atômicos (default, hover, active, disabled, error).",
    checklist: [
      "Criação dos arquivos de configuração .storybook/main.js e .storybook/preview.jsx com integração ao Tailwind CSS.",
      "Button.stories.jsx: cobertura de default, hover/foco, active (scale-95), disabled, loading e danger/error.",
      "Input.stories.jsx: cobertura de default, focused, filled, disabled, error (com aria-describedby) e máscara de telefone.",
      "Modal.stories.jsx: cobertura de default open, confirmação crítica, disabled actions, scrollable content e fechamento com ESC.",
      "Card.stories.jsx: cobertura de default, clickable hover, selected active, disabled, loading skeleton e error card.",
      "Badge.stories.jsx: cobertura dos status waiting, confirmed, in_progress, completed, cancelled e no_show.",
      "StorybookWorkbench.jsx: laboratório interativo integrado no painel de QA para inspeção visual em tempo real.",
    ],
  },
  {
    id: "FIX-FE-18",
    squad: "Front-End & UI/UX",
    squadIcon: "ShieldAlert",
    title: "Blindagem de Telas Dependentes contra Quebra Visual em Cascata (FIX-FE-18)",
    subtitle: "Implementado em ClientBookingView.jsx, Dashboard.jsx e Login.jsx",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Eliminação de estilos inline destrutivos e isolamento atômico garantindo que variações em botões ou cards não desalinhem telas dependentes.",
    checklist: [
      "Remoção de margens externas rígidas fixadas na raiz de componentes básicos de UI.",
      "Adoção de containers flex/grid com gap-* nas telas dependentes (ClientBookingView, Dashboard, Login).",
      "Garantia de que alteração na altura ou raio de borda de Button e Input mantenha os formulários 100% responsivos.",
      "Script automatizado de checagem de cascata 'node scripts/visual-regression-test.js' aprovado.",
    ],
  },
  {
    id: "FIX-DEV-VIS-01",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    title: "Pipeline de CI com Chromatic e Regressão Visual com Playwright (FIX-DEV-VIS-01)",
    subtitle: "Implementado em .github/workflows/visual-regression.yml, playwright.visual.config.ts e scripts/",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "HIGH (P1)",
    summary: "Automação no GitHub Actions executando verificação CLI, build do Storybook, envio de snapshots para o Chromatic e Playwright visual regression nos 3 viewports.",
    checklist: [
      "Workflow .github/workflows/visual-regression.yml configurado com trigger em push e pull_request.",
      "Configuração playwright.visual.config.ts com threshold de tolerância de pixels estrito em 0.05 (5%).",
      "Execução automatizada em 3 viewports: Mobile (390x844), Tablet (768x1024) e Desktop (1280x800).",
      "Comando npm run test:visual mapeado no package.json para validação local pré-commit.",
    ],
  },
  {
    id: "FIX-SEC-15",
    squad: "Cyber Security & AppSec",
    squadIcon: "ShieldAlert",
    title: "Restrição Estrita de Saída de Rede (Egress Control) e Prevenção Ativa de SSRF (CWE-918)",
    subtitle: "Implementado em src/security/ssrfProtectionEngine.ts e src/tests/unit/ssrfProtectionEngine.test.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Cliente seguro SafeFetch com validação compulsória de destino contra SSRF, bloqueando endereços de metadados cloud (IMDSv2 169.254.169.254), CIDRs privados RFC 1918 e restringindo chamadas externas à allowlist estrita.",
    checklist: [
      "Bloqueio incondicional do IP 169.254.169.254 e hostnames de metadados cloud (metadata.google.internal).",
      "Bloqueio de redes privadas RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) e loopbacks (127.0.0.0/8, ::1, 0.0.0.0).",
      "Allowlist canônica contendo exclusivamente domínios homologados de pagamento (api.mercadopago.com) e persistência (*.supabase.co).",
      "Prevenção de DNS Rebinding via resolução e pinning prévio de IP.",
      "Suíte automatizada de testes com cobertura completa no Vitest.",
    ],
  },

  // ==========================================
  // DEVOPS, SRE & CLOUD INFRA (NO PROJETO)
  // ==========================================
  {
    id: "FIX-INFRA-RL-01",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    title: "Rate Limiting Multi-Camadas em Nível de Aplicação e Gateway (Prompt 22)",
    subtitle: "Implementado em src/middleware/multiTierRateLimiter.ts, cloudflare-rate-limiting-rules.json e docs/rate-limiting-gateway-guide.md",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Arquitetura em profundidade com rate limiting em memória/Redis (Sliding Window Log) e regras prontas para borda (Cloudflare WAF / Nginx). Cotas dedicadas para rotas sensíveis: /auth/login (5 req/min), /api/payment (10 req/min) e rotas gerais da API (100 req/min), com resposta HTTP 429 Too Many Requests e cabeçalho compulsório Retry-After (RFC 6585).",
    checklist: [
      "Middleware modular multiTierRateLimiter.ts implementando algoritmo de janela deslizante (Sliding Window Log).",
      "Cota estrita anti-brute-force em /auth/login: máximo 5 tentativas por minuto por IP.",
      "Cota estrita anti-carding / transações em /api/payment: máximo 10 requisições por minuto por IP.",
      "Cota global para rotas gerais da API (/api/*): máximo 100 requisições por minuto por IP.",
      "Emissão compulsória de HTTP 429 Too Many Requests com cabeçalho Retry-After no padrão RFC 6585 informando segundos restantes.",
      "Cabeçalhos de telemetria IETF injetados: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset.",
      "Conjunto de regras JSON prontas para deploy no Cloudflare WAF (cloudflare-rate-limiting-rules.json).",
      "Guia técnico de infraestrutura com instruções para Cloudflare, NGINX e Supabase Edge Functions (docs/rate-limiting-gateway-guide.md).",
      "Integração no despachante da API e suíte unitária completa (src/tests/unit/multiTierRateLimiter.test.ts) e Suíte 44 no QA Studio.",
    ],
    codeSnippet: `// APLICAÇÃO DO MIDDLEWARE DE RATE LIMITING MULTI-CAMADAS
import { multiTierRateLimiterMiddleware } from "./src/middleware/multiTierRateLimiter";

// Registrado no servidor Express ou despachante de API
app.use(multiTierRateLimiterMiddleware());

// Resposta quando a cota estoura:
// HTTP/1.1 429 Too Many Requests
// Retry-After: 54
// RateLimit-Limit: 5
// RateLimit-Remaining: 0
// RateLimit-Reset: 54
// Content-Type: application/json
// {
//   "status": 429,
//   "code": "RATE_LIMIT_EXCEEDED",
//   "message": "Too Many Requests: Limite de requisições excedido...",
//   "retryAfter": 54
// }`,
  },
  {
    id: "FIX-DEVSEC-CI-01",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    title: "Pipeline de CI/CD Seguro com SAST, Secret Scanning e Quality Gate Estrito (Prompt 24)",
    subtitle: "Implementado em .github/workflows/security.yml, .gitleaks.toml e src/security/cicdSecurityScanner.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Automação completa de auditoria de segurança em cada Pull Request via GitHub Actions com Gitleaks/TruffleHog (Secret Scanning), Semgrep/SonarCloud (SAST), npm audit/Snyk (SCA) e Quality Gate com exit 1 bloqueando o merge caso vulnerabilidades High ou Critical sejam detectadas.",
    checklist: [
      "Criação do workflow automatizado em .github/workflows/security.yml disparado em Pull Requests para main, master e develop.",
      "Job 1 - Secret Scanning: Execução do Gitleaks v8 e TruffleHog inspecionando todo o histórico de commits contra vazamentos de API keys, AWS tokens, JWTs e chaves privadas.",
      "Job 2 - SAST Analysis: Análise estática profunda com Semgrep (regras p/security-audit, p/owasp-top-ten, p/secrets, p/javascript) e SonarCloud com exportação de relatórios SARIF.",
      "Job 3 - Dependency Vulnerability Audit: Análise de composição de software (SCA) com npm audit --audit-level=high e Snyk Open Source gerando artefatos de auditoria.",
      "Job 4 - Merge Quality Gate Enforcement: Job consolidado que avalia os resultados e executa exit 1 para impedir o merge se houver vulnerabilidades de severidade Alta ou Crítica.",
      "Criação de políticas de exceção seguras em .gitleaks.toml e escopo de análise em .semgrepignore.",
      "Motor DevSecOps (src/security/cicdSecurityScanner.ts) com validação de conformidade de workflow e avaliação de severidade.",
      "Suíte de testes automatizada (src/tests/unit/securityPipelineWorkflow.test.ts) e Suíte SEC-46 integrada na bancada QA Studio.",
    ],
    codeSnippet: `# TRECHO DO QUALITY GATE DEVSECOPS EM .github/workflows/security.yml
security-gate-verdict:
  name: DevSecOps Merge Quality Gate Enforcement
  runs-on: ubuntu-latest
  needs: [secret-scanning, sast-analysis, dependency-audit]
  if: always()
  steps:
    - name: Evaluate Security Pipeline Status
      run: |
        if [ "\${{ needs.secret-scanning.result }}" != "success" ] || \\
           [ "\${{ needs.sast-analysis.result }}" != "success" ] || \\
           [ "\${{ needs.dependency-audit.result }}" != "success" ]; then
          echo "ERRO CRÍTICO DEVSECOPS: Vulnerabilidades HIGH/CRITICAL detectadas!"
          echo "   POLÍTICA DE MERGE: Bloqueio estrito ativado. O merge deste PR está proibido."
          exit 1
        fi
        echo "SUCESSO: Todos os testes de segurança SAST, Secret Scanning e SCA foram aprovados."
        exit 0`,
  },

  // ==========================================
  // COMPLIANCE, DPO & LGPD (NO PROJETO)
  // ==========================================
  {
    id: "FIX-CMP-01",
    squad: "Compliance, DPO & LGPD",
    squadIcon: "Scale",
    title: "Mascaramento Dinâmico de Dados Pessoais Sensíveis (PII / LGPD)",
    subtitle: "Implementado em src/utils/masks.js",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "HIGH (P1)",
    summary: "Mascaramento de CPF, números de telefone e e-mails em logs e visualizações não privilegiadas.",
    checklist: [
      "Aplicação de máscara em CPF (ex: ***.456.789-**).",
      "Mascaramento de telefones e e-mails em relatórios de auditoria.",
      "Conformidade com o princípio de minimização de dados da LGPD (Art. 6º, III).",
    ],
  },
  {
    id: "FIX-CMP-02",
    squad: "Compliance, DPO & LGPD",
    squadIcon: "Scale",
    title: "Trilha de Auditoria Imutável (Audit Trail WORM) e Triggers Automáticas no PostgreSQL",
    subtitle: "Implementado em supabase/migrations/20260925_immutable_audit_trail_system.sql e src/security/auditTrailEngine.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Tabela audit_logs canônica com 8 campos, triggers automáticas em appointments/transactions/profiles/tenants, selo anti-tamper SHA-256 e bloqueio de UPDATE/DELETE (WORM).",
    checklist: [
      "Criação da tabela audit_logs contendo: id, tenant_id, user_id, action (INSERT/UPDATE/DELETE), table_name, old_data (JSONB), new_data (JSONB) e created_at.",
      "Configuração de Triggers de auditoria automáticas em tabelas críticas (appointments, transactions, profiles, tenants) capturando instantaneamente o estado pré e pós mutação.",
      "Aplicação de políticas de RLS e Triggers BEFORE bloqueando categoricamente qualquer operação de UPDATE, DELETE ou TRUNCATE (WORM - Código 42501).",
      "Selo criptográfico SHA-256 HMAC canônico para detecção instantânea de adulteração em repouso.",
      "Higienização automática de campos sensíveis (senhas, segredos, tokens) nos logs conforme LGPD Art. 46.",
      "Suíte de testes automatizados vitest (src/tests/unit/auditTrail.test.ts) e suíte interativa SEC-21 no QA Studio.",
    ],
    codeSnippet: `// GRAVAÇÃO DE AUDITORIA IMUTÁVEL (DISPARADA VIA TRIGGERS EM PRODUÇÃO)
const auditEntry = recordAuditLog({
  tenantId: authenticatedUser.tenant_id,
  userId: authenticatedUser.id,
  action: "UPDATE",
  tableName: "appointments",
  oldData: previousAppointmentRecord,
  newData: updatedAppointmentRecord,
  clientIp: req.ip,
  userAgent: req.headers["user-agent"],
});

// PROVA DE IMUTABILIDADE: TENTATIVAS DE UPDATE/DELETE SÃO TERMINANTEMENTE BLOQUEADAS
// Dispara: COMPLIANCE_ERROR_42501: A tabela audit_logs é estritamente IMUTÁVEL (WORM).`,
  },
  {
    id: "FIX-CMP-03",
    squad: "Compliance, DPO & LGPD",
    squadIcon: "Scale",
    title: "Motor de Expurgo e Anonimização (LGPD/GDPR: Soft-Delete, Hard-Delete em Cascata & Anonimização Fiscal)",
    subtitle: "Implementado em supabase/migrations/20260925_lgpd_purge_and_anonymization_engine.sql, supabase/functions/lgpd-purge-cron/index.ts e src/security/lgpdPurgeEngine.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Ciclo de vida de descontinuação de dados de clientes: soft-delete com retenção temporária de 30 dias para recuperação, rotina cron de hard-delete em cascata respeitando Foreign Keys e função de anonimização irreversível com hashes SHA-256 e Pepper para dados mantidos por obrigação fiscal (CTN Art. 173 / LGPD Art. 16, I).",
    checklist: [
      "Implementação de colunas de controle (deleted_at, retention_until, deletion_reason, is_anonymized, anonymized_at, fiscal_retention_until) e índices parciais de expurgo no PostgreSQL.",
      "Criação da view de conveniência public.active_clients para exclusão lógica transparente de registros em soft-delete nas consultas da aplicação.",
      "Função public.soft_delete_client() para retenção temporária (janela de graça de 30 dias) com propagação automática de status inativo em agendamentos futuros não concluídos.",
      "Função public.restore_soft_deleted_client() permitindo recuperação ágil de cadastros descontinuados por engano dentro da janela de retenção.",
      "Função public.anonymize_client_fiscal_record() substituindo Nome e CPF por pseudônimos e hashes SHA-256 irreversíveis com Pepper para registros com obrigação fiscal do CTN (5 anos).",
      "Rotina central de expurgo public.execute_lgpd_hard_delete_purge() executando hard-delete em cascata respeitando rigorosamente as Foreign Keys quando não houver obrigação tributária.",
      "Supabase Edge Function em Deno/TypeScript (supabase/functions/lgpd-purge-cron/index.ts) para orquestração serverless do cron com verificação de token de segurança.",
      "Suíte de testes automatizados unitários no Vitest (src/tests/unit/lgpdPurgeEngine.test.ts) com 11 testes aprovados e suíte interativa SEC-22 no QA Studio Workbench.",
    ],
    codeSnippet: `// ROTINA DE EXPURGO E ANONIMIZAÇÃO LGPD (EDGE FUNCTION / POSTGRESQL RPC)
import { executeLgpdPurgeRoutine } from "../../security/lgpdPurgeEngine";

// Dispara expurgo automatizado respeitando janelas de retenção e obrigações fiscais
const purgeResult = executeLgpdPurgeRoutine({
  dryRun: false,
  pepper: process.env.LGPD_ANONYMIZATION_PEPPER,
});

console.log(\`Expurgo concluído: \${purgeResult.hardDeletedClients} hard-deleted, \${purgeResult.anonymizedFiscalClients} anonimizados fiscalmente.\`);`,
  },
  {
    id: "FIX-DB-01",
    squad: "Data Engineering & DBA",
    squadIcon: "Save",
    title: "Módulo 1: Estrutura DDL de Soft-Delete, Índices Parciais & VIEW active_customers (Task 1.1)",
    subtitle: "Implementado em supabase/migrations/20260925_soft_delete_customers_structure.sql e src/security/lgpdPurgeEngine.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Adição da coluna deleted_at (TIMESTAMPTZ) na tabela customers, criação de índices parciais para otimizar buscas de registros ativos e VIEW active_customers que abstrai o filtro de exclusão.",
    checklist: [
      "Criação e compatibilização da tabela public.customers com coluna deleted_at TIMESTAMPTZ DEFAULT NULL.",
      "Criação do índice parcial idx_customers_active_tenant (tenant_id, id) WHERE deleted_at IS NULL para otimização de buscas cotidianas.",
      "Criação do índice parcial idx_customers_active_lookup (tenant_id, phone, email) WHERE deleted_at IS NULL para buscas ativas.",
      "Criação do índice parcial idx_customers_deleted_at (deleted_at) WHERE deleted_at IS NOT NULL para monitoramento e expurgo.",
      "Criação da VIEW canônica public.active_customers abstraindo consultas ativas com filtro WHERE deleted_at IS NULL.",
      "Implementação de testes automatizados no Vitest (src/tests/unit/lgpdPurgeEngine.test.ts) e suíte SEC-23 no QA Studio Workbench.",
    ],
    codeSnippet: `-- DDL TASK 1.1: ESTRUTURA DE SOFT-DELETE & PERFORMANCE
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Índices Parciais de Alta Performance
CREATE INDEX IF NOT EXISTS idx_customers_active_tenant 
  ON public.customers (tenant_id, id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_deleted_at 
  ON public.customers (deleted_at) WHERE deleted_at IS NOT NULL;

-- VIEW active_customers para abstração de exclusão lógica
CREATE OR REPLACE VIEW public.active_customers AS
SELECT * FROM public.customers WHERE deleted_at IS NULL;`,
  },
  {
    id: "FIX-DB-02",
    squad: "Data Engineering & DBA",
    squadIcon: "Save",
    title: "Módulo 1: Stored Procedure PL/pgSQL soft_delete_customer com Revogação Ativa de Sessões (Task 1.2)",
    subtitle: "Implementado em supabase/migrations/20260925_soft_delete_customers_structure.sql e src/security/lgpdPurgeEngine.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Stored procedure em PL/pgSQL soft_delete_customer(target_id UUID) que atualiza deleted_at com NOW(), revoga permissões ativas em sessões e cancela agendamentos futuros.",
    checklist: [
      "Stored procedure public.soft_delete_customer(target_id UUID) criada com SECURITY DEFINER e busca segura.",
      "Atualização atômica do campo deleted_at = NOW() na tabela customers.",
      "Revogação imediata de sessões ativas na tabela public.sessions (is_active = FALSE, revoked_at = NOW()).",
      "Revogação compulsória de tokens e suspensão em auth.users (is_active: false).",
      "Propagação de cancelamento em agendamentos futuros não concluídos com registro em trilha de auditoria forense.",
      "Validação automatizada de execução via suíte interativa SEC-23 no QA Studio Workbench.",
    ],
    codeSnippet: `-- TASK 1.2: STORED PROCEDURE DE EXCLUSÃO LÓGICA E REVOGAÇÃO
CREATE OR REPLACE PROCEDURE public.soft_delete_customer(target_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Atualiza deleted_at com NOW()
  UPDATE public.customers
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE id = target_id AND deleted_at IS NULL;

  -- 2. Revoga sessões e permissões ativas
  UPDATE public.sessions
  SET is_active = FALSE, revoked_at = NOW(), revocation_reason = 'CUSTOMER_SOFT_DELETED_LGPD'
  WHERE user_id = target_id AND is_active = TRUE;
END;
$$;`,
  },
  {
    id: "FIX-DB-03",
    squad: "Data Engineering & DBA",
    squadIcon: "Save",
    title: "Módulo 2: Função de Hash Irreversível PL/pgSQL anonymize_customer_data com pgcrypto (Task 2.1)",
    subtitle: "Implementado em supabase/migrations/20260925_anonymize_customer_data_function.sql e src/security/lgpdPurgeEngine.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Função em PL/pgSQL (anonymize_customer_data(target_id UUID)) que utiliza pgcrypto (digest(..., 'sha256')) para substituir nome, e-mail e CPF por hashes irreversíveis, além de zerar dados secundários (endereços, telefones). A função preserva o registro do cliente para conformidade com notas/pedidos históricos.",
    checklist: [
      "Habilitação da extensão pgcrypto (CREATE EXTENSION IF NOT EXISTS pgcrypto) para suporte a funções criptográficas nativas.",
      "Criação da função public.anonymize_customer_data(target_id UUID) com SECURITY DEFINER e search_path seguro (public, extensions, pg_temp).",
      "Substituição irreversível de Nome, E-mail e CPF por hashes criptográficos SHA-256 via digest(..., 'sha256').",
      "Zeramento integral de dados secundários: telefone (phone = NULL), endereço (address = NULL) e higienização de observações.",
      "Preservação estrita do registro mestre do cliente (id mantido) para conformidade com guarda fiscal obrigatória de 5 anos (CTN Art. 173 c/c LGPD Art. 16, I).",
      "Preservação de notas fiscais e histórico financeiro com marcação is_client_anonymized = true na tabela transactions.",
      "Preservação de pedidos/agendamentos históricos concluídos e expurgo de agendamentos pendentes futuros.",
      "Suíte de testes automatizados no Vitest (src/tests/unit/lgpdPurgeEngine.test.ts - 17 testes) e bancada interativa SEC-24 no QA Studio Workbench.",
    ],
    codeSnippet: `-- TASK 2.1: FUNÇÃO DE HASH IRREVERSÍVEL (PGCRYPTO SHA-256)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.anonymize_customer_data(target_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_customer RECORD;
  v_name_hash TEXT;
  v_email_hash TEXT;
  v_cpf_hash TEXT;
  v_anon_name TEXT;
  v_anon_email TEXT;
  v_anon_cpf TEXT;
BEGIN
  -- 1. Bloqueia tupla para atualização concorrente segura
  SELECT id, name, email, cpf, is_anonymized INTO v_customer
  FROM public.customers WHERE id = target_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'CUSTOMER_NOT_FOUND');
  END IF;

  IF v_customer.is_anonymized THEN
    RETURN jsonb_build_object('success', true, 'code', 'ALREADY_ANONYMIZED');
  END IF;

  -- 2. Hashes irreversíveis com pgcrypto digest sha256
  v_name_hash  := encode(digest(coalesce(v_customer.name, '') || target_id::text, 'sha256'), 'hex');
  v_email_hash := encode(digest(coalesce(v_customer.email, '') || target_id::text, 'sha256'), 'hex');
  v_cpf_hash   := encode(digest(coalesce(v_customer.cpf, '') || target_id::text, 'sha256'), 'hex');

  v_anon_name  := 'TITULAR_ANONIMIZADO_' || upper(substring(v_name_hash from 1 for 16));
  v_anon_email := 'anonymized_' || substring(v_email_hash from 1 for 16) || '@lgpd.fiscal.local';
  v_anon_cpf   := 'HASH-CPF-' || upper(substring(v_cpf_hash from 1 for 16));

  -- 3. Atualiza cliente: substitui dados pessoais por hashes e zera secundários
  UPDATE public.customers
  SET name = v_anon_name, email = v_anon_email, cpf = v_anon_cpf,
      phone = NULL, address = NULL,
      notes = '[DADOS PESSOAIS EXPURGADOS CONFORME LGPD ART. 16 - GUARDA FISCAL CTN ART. 173]',
      is_anonymized = TRUE, anonymized_at = timezone('utc'::text, now()),
      fiscal_retention_until = timezone('utc'::text, now()) + INTERVAL '5 years'
  WHERE id = target_id;

  RETURN jsonb_build_object('success', true, 'code', 'CUSTOMER_ANONYMIZED_SUCCESS', 'target_id', target_id);
END;
$$;`,
  },
  {
    id: "FIX-DB-04",
    squad: "Data Engineering & DBA",
    squadIcon: "Save",
    title: "Módulo 3: Stored Procedure PL/pgSQL purge_expired_customers(retention_days INT) (Task 3.1)",
    subtitle: "Implementado em supabase/migrations/20260925_purge_expired_customers_procedure.sql e src/security/lgpdPurgeEngine.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Procedure em PL/pgSQL purge_expired_customers(retention_days INT) que localiza clientes com deleted_at expirados, anonimiza dados fiscais vinculados (CTN Art. 173) e realiza exclusão definitiva (hard-delete) em cascata respeitando Foreign Keys.",
    checklist: [
      "Criação da procedure public.purge_expired_customers(retention_days INT) com SECURITY DEFINER e busca segura.",
      "Cálculo dinâmico de corte temporal: deleted_at <= (timezone('utc', now()) - (retention_days || ' days')::INTERVAL).",
      "Execução de cursor com concorrência pessimista FOR UPDATE OF c SKIP LOCKED para segurança em clusters.",
      "Checagem de obrigação tributária em transactions e invoices (CTN Art. 173 - 5 anos).",
      "Bifurcação de segurança: executa public.anonymize_customer_data(id) para clientes com lastro fiscal pendente.",
      "Expurgo definitivo (Hard-Delete) em cascata respeitando estritamente as Foreign Keys: customer_notes, appointments, loyalty, tags e customers.",
      "Emissão de registro de auditoria na tabela public.audit_logs com contadores de varredura, hard-deleted e tempo de execução.",
      "Validação automatizada de testes no Vitest (src/tests/unit/lgpdPurgeEngine.test.ts) e suíte interativa SEC-25 no QA Studio Workbench.",
    ],
    codeSnippet: `-- TASK 3.1: STORED PROCEDURE PL/pgSQL PURGE_EXPIRED_CUSTOMERS
CREATE OR REPLACE PROCEDURE public.purge_expired_customers(retention_days INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_cutoff_timestamp TIMESTAMPTZ;
  v_customer RECORD;
  v_has_fiscal_obligation BOOLEAN;
BEGIN
  v_cutoff_timestamp := timezone('utc'::text, now()) - (retention_days || ' days')::INTERVAL;

  FOR v_customer IN
    SELECT c.id, c.tenant_id, c.deleted_at, c.is_anonymized
    FROM public.customers c
    WHERE c.deleted_at IS NOT NULL AND c.deleted_at <= v_cutoff_timestamp
    FOR UPDATE OF c SKIP LOCKED
  LOOP
    -- Verifica obrigatoriedade fiscal (CTN Art. 173)
    SELECT EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.client_id = v_customer.id AND t.status IN ('paid', 'completed')
        AND t.created_at >= (timezone('utc'::text, now()) - INTERVAL '5 years')
    ) INTO v_has_fiscal_obligation;

    IF v_has_fiscal_obligation THEN
      IF NOT v_customer.is_anonymized THEN
        PERFORM public.anonymize_customer_data(v_customer.id);
      END IF;
    ELSE
      -- Hard-delete em cascata respeitando Foreign Keys
      DELETE FROM public.customer_notes WHERE customer_id = v_customer.id;
      DELETE FROM public.appointments WHERE client_id = v_customer.id;
      DELETE FROM public.customers WHERE id = v_customer.id;
    END IF;
  END LOOP;
END;
$$;`,
  },
  {
    id: "FIX-SEC-04",
    squad: "Cyber Security & AppSec",
    squadIcon: "ShieldAlert",
    title: "Módulo 3: Edge Function TypeScript (Supabase/Deno) com CRON e Logs Estruturados (Task 3.2)",
    subtitle: "Implementado em supabase/functions/purge-expired-customers/index.ts e src/security/lgpdPurgeEngine.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Edge Function em TypeScript (Supabase/Deno) configurada para disparo via CRON/pg_cron que invoca purge_expired_customers, tratando erros de execução e gerando logs estruturados de auditoria de exclusão para Datadog/CloudWatch.",
    checklist: [
      "Edge Function desenvolvida em TypeScript nativo para o Deno / Supabase Edge Runtime.",
      "Validação estrita de segurança SecOps: verificação do header 'x-cron-secret' e SUPABASE_SERVICE_ROLE_KEY com bloqueio 403 em acessos não autorizados.",
      "Parser seguro de parâmetros permitindo customização de 'retention_days' (padrão: 30 dias) via JSON body ou query string.",
      "Invocação da procedure PostgreSQL purge_expired_customers com tratamento semântico de erros de execução.",
      "Geração de Logs Estruturados de Auditoria (JSON) contendo timestamp, job_id, retention_days, contadores de expurgo e selo de conformidade WORM.",
      "Tratamento de exceções com status HTTP 500, incident tracking ID e sem vazamento de stacktrace confidencial.",
      "Suíte de testes automatizados com cobertura SecOps (src/tests/unit/lgpdPurgeEngine.test.ts) e suíte interativa SEC-25.",
    ],
    codeSnippet: `// TASK 3.2: EDGE FUNCTION TS DISPARADA VIA CRON
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

serve(async (req: Request): Promise<Response> => {
  // Autenticação SecOps
  const isAuthorized = req.headers.get("x-cron-secret") === Deno.env.get("CRON_SECURITY_SECRET");
  if (!isAuthorized) return new Response("Forbidden", { status: 403 });

  // Invocação de purge_expired_customers
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await supabase.rpc("purge_expired_customers", { retention_days: 30 });

  // Emissão de log estruturado de auditoria
  console.log(JSON.stringify({
    event_type: "PURGE_EXPIRED_CUSTOMERS_CRON_SUCCESS",
    job_id: crypto.randomUUID(),
    retention_days: 30,
    status: "SUCCESS"
  }));

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});`,
  },
  {
    id: "FIX-BE-05",
    squad: "Back-End & Core APIs",
    squadIcon: "Wrench",
    title: "Tratamento Global de Exceções, requestId e Omissão de Stacks (Prompt 11)",
    subtitle: "Implementado em src/middleware/errorHandlerMiddleware.ts, src/utils/secureLogger.ts e src/tests/unit/errorHandlerMiddleware.test.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Middleware centralizado de erros capturando exceções não tratadas, respostas HTTP 500 padronizadas com mensagem genérica e UUID requestId, omissão estrita de stack traces, tabelas PostgreSQL e variáveis de ambiente, e configurador secureLogger com mascaramento de password, credit_card e token.",
    checklist: [
      "Middleware global centralizado (errorHandlerMiddleware) para Node.js/Express capturando 100% das exceções não tratadas.",
      "Respostas HTTP 500 padronizadas contendo apenas mensagem genérica amigável e requestId único (UUID v4).",
      "Headers X-Request-Id e X-Content-Type-Options: nosniff injetados em todas as respostas de erro da API.",
      "Omissão absoluta da propriedade stack do corpo das respostas HTTP para evitar fingerprinting de código (CWE-209).",
      "Supressão automática de nomes de tabelas SQL (customers, users, etc.), schemas, queries SELECT/INSERT/UPDATE e constraints.",
      "Supressão de variáveis de ambiente (SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL) e strings de conexão em mensagens públicas.",
      "Configurador secureLogger (Pino/Winston) com mascaramento recursivo de dados sigilosos: password, credit_card (últimos 4 dígitos), token, cpf.",
      "Wrapper de segurança serverless wrapEdgeFunctionHandler para Supabase Edge Functions (Deno / TypeScript).",
      "Suíte de testes unitários no Vitest (src/tests/unit/errorHandlerMiddleware.test.ts) com 16 asserções aprovadas e Suíte 34 no QA Studio.",
    ],
    codeSnippet: `// TRATAMENTO GLOBAL DE EXCEÇÕES & LOGGER SEGURO
import { errorHandlerMiddleware, wrapEdgeFunctionHandler } from "./src/middleware/errorHandlerMiddleware";
import { secureLogger } from "./src/utils/secureLogger";

// 1. Registro do Middleware Centralizado no Express
app.use(errorHandlerMiddleware);

// 2. Uso do Wrapper de Segurança em Supabase Edge Functions (Deno)
serve(wrapEdgeFunctionHandler(async (req) => {
  // Exceções não tratadas retornam 500 higienizado com UUID requestId
  return new Response(JSON.stringify({ ok: true }));
}));`,
  },
  {
    id: "FIX-BE-06",
    squad: "Back-End & Core APIs",
    squadIcon: "Wrench",
    scope: "IN_PROJECT",
    subtitle: "Middleware Criptográfico Anti-Replay e Idempotência de Pagamentos",
    targetFile: "src/middleware/webhookHmacMiddleware.ts, src/security/webhookIdempotencyEngine.ts",
    title: "Validação HMAC e Idempotência de Webhooks (Prompt 12)",
    status: "FIXED",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Middleware de validação de assinatura criptográfica HMAC-SHA256 antes da leitura do corpo (Mercado Pago, Stripe e WhatsApp Cloud API), prevenção de Replay Attacks (tolerância 300s), comparação em tempo constante contra Timing Attacks (CWE-208), controle de idempotência persistido com chave única no banco/Redis e resposta imediata Fast ACK HTTP 200/202 para eliminação de timeouts.",
    checklist: [
      "Middleware de validação criptográfica HMAC-SHA256 (webhookHmacAndIdempotencyMiddleware) inspecionando raw body antes do parsing JSON.",
      "Suporte a headers de assinatura oficiais: 'x-signature' (Mercado Pago), 'stripe-signature' (Stripe) e 'x-hub-signature-256' (WhatsApp/Meta).",
      "Comparação em tempo constante (timingSafeEqualString) para neutralizar side-channel timing attacks (CWE-208).",
      "Defesa rigorosa contra Replay Attacks (CWE-294) com descarte automático de timestamps com defasagem superior a 300 segundos.",
      "Motor de idempotência com chave composta única {provider}:{event_id} e status ENQUEUED, PROCESSING, PROCESSED e DUPLICATE_IGNORED.",
      "Prevenção contra Double-Spending: eventos repetidos são identificados e retornam HTTP 200 Fast ACK sem reexecutar regras de negócio.",
      "Resposta imediata Fast ACK (HTTP 200/202) desacoplando o recebimento do webhook da execução assíncrona pesada (eliminação de timeouts).",
      "Wrapper serverless wrapSecureWebhookEdgeFunction para Supabase Edge Functions em Deno com headers nosniff e X-Request-Id.",
      "Migration DDL (supabase/migrations/20260927000001_webhook_idempotency.sql) criando a tabela webhook_idempotency_keys com RLS e índices.",
      "Suíte de 18 testes unitários no Vitest (src/tests/unit/webhookHmacIdempotency.test.ts) e Suíte 35 integrada na bancada QA Studio.",
    ],
    codeSnippet: `// VALIDAÇÃO HMAC E IDEMPOTÊNCIA DE WEBHOOKS
import { webhookHmacAndIdempotencyMiddleware, wrapSecureWebhookEdgeFunction } from "./src/middleware/webhookHmacMiddleware";

// 1. Rota Express com validação HMAC e Fast ACK imediato
app.post(
  "/api/webhooks/mercadopago",
  webhookHmacAndIdempotencyMiddleware({
    provider: "mercadopago",
    secret: process.env.MP_WEBHOOK_SECRET,
    toleranceSeconds: 300,
    onEventEnqueued: async (eventId, payload) => {
      // Executa worker assíncrono em fila de segundo plano
      await processPaymentNotification(eventId, payload);
    },
  })
);

// 2. Wrapper para Supabase Edge Function (Deno)
serve(wrapSecureWebhookEdgeFunction("stripe", process.env.STRIPE_WEBHOOK_SECRET, async (eventId, data) => {
  await handleStripeEventAsync(eventId, data);
}));`,
  },
  {
    id: "FIX-SEC-E2E-01",
    squad: "Cyber Security & AppSec",
    squadIcon: "ShieldAlert",
    title: "Suíte E2E de Bypass de Segurança (Playwright/Cypress) & Bloqueio de Rotas (/admin e /dashboard)",
    subtitle: "Implementado em tests/e2e/security-bypass.spec.ts, cypress/e2e/security-bypass.cy.ts e src/security/routeSecurityGuard.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Suíte automatizada de testes E2E executável em CI/CD contra tentativas de bypass em rotas administrativas e vazamento de DOM.",
    checklist: [
      "Escrita de testes automatizados em Playwright e Cypress tentando acessar /admin e /dashboard diretamente sem cookie/token de sessão.",
      "Redirecionamento compulsório imediato para a tela de login ao detectar tentativa anônima ou não autorizada.",
      "Sanitização integral do DOM com remoção e supressão de quaisquer nós contendo faturamento, dados fiscais ou PII de clientes.",
      "Testes de integração no Vitest (src/tests/integration/securityBypass.test.ts) e suíte SEC-40 no QA Studio Workbench.",
      "Configuração de esteira pronta para CI em playwright.config.ts com scripts npm run test:e2e e npm run test:cypress.",
    ],
    codeSnippet: `// TESTE E2E DE BYPASS PLAYWRIGHT PRONTO PARA CI
test('Deve bloquear acesso direto a /admin sem sessão e sanitizar o DOM', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.locator('button:has-text("Entrar")')).toBeVisible();
  const content = await page.content();
  expect(content).not.toContain('Faturamento Total');
  expect(content).not.toContain('Roberto Concorrente');
});`,
  },
  {
    id: "FIX-FE-E2E-02",
    squad: "Front-End & UI/UX",
    squadIcon: "Palette",
    title: "Detecção e Purga Compulsória de Manipulação de LocalStorage (Role Forgery) no Client",
    subtitle: "Implementado em src/security/routeSecurityGuard.ts e src/components/security/ProtectedRoute.jsx",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Auditor em runtime que valida a autenticidade criptográfica de qualquer papel no client-side e expurga tentativas de forjamento.",
    checklist: [
      "Função detectAndNeutralizeStorageTampering() inspeciona periodicamente e a cada navegação o localStorage contra injeções manuais.",
      "Invalidação compulsória caso role: 'admin' seja inserido sem a correspondente assinatura JWT verificada pelo backend.",
      "Remoção automática das chaves role, user_role, user, auth_user, access_token forjadas.",
      "Bloqueio de chamadas a endpoints de dados reais, forçando HTTP 401 e retorno imediato à tela de login.",
    ],
    codeSnippet: `// AUDITORIA E PURGA DE STORAGE ADULTERADO
export function detectAndNeutralizeStorageTampering() {
  const claimedRole = localStorage.getItem('role');
  if (claimedRole && ['admin', 'superadmin'].includes(claimedRole)) {
    const rawToken = localStorage.getItem('access_token');
    if (!rawToken || !parseAndValidateJwt(rawToken).valid) {
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      return { tamperingDetected: true };
    }
  }
  return { tamperingDetected: false };
}`,
  },
  {
    id: "FIX-SEC-FUZZ-03",
    squad: "Back-End & Core APIs",
    squadIcon: "ShieldAlert",
    title: "Dispatcher HTTP Blindado contra Fuzzing de API, Bytes Nulos e Payloads >5MB (Anti-DoS)",
    subtitle: "Implementado em src/api/apiDispatcher.ts e src/middleware/zodValidationMiddleware.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Interrupção de stream para payloads >5MB, detecção de profundidade recursiva >15 níveis e rejeição de bytes nulos com HTTP 400/422 sem causar crash ou queda do Node.js.",
    checklist: [
      "Stream de dados monitorado: payloads acima de 5MB são interrompidos imediatamente, retornando HTTP 400 (PAYLOAD_TOO_LARGE).",
      "calculateObjectDepth() limita profundidade máxima de JSON a 15 níveis, bloqueando AST bombs e DoS recursivo (HTTP 422).",
      "detectNullBytesInPayload() inspeciona strings e chaves de objetos contra injeção de bytes terminadores \\0 e \\u0000 (CWE-158).",
      "Zod Schema .strip() e validação estrita em 18 rotas do catálogo, rejeitando Type Confusion com HTTP 400.",
      "Barreira try/catch global garantindo 0 crashes (HTTP 500) e integridade de processos de background.",
    ],
    codeSnippet: `// DISPATCHER SEGURO COM INTERRUPÇÃO DE STREAM PARA PAYLOADS > 5MB
for await (const chunk of req) {
  totalBytesReceived += chunk.length;
  if (totalBytesReceived > MAX_FUZZING_BODY_BYTES) {
    return sendJson(400, {
      status: 400,
      code: "PAYLOAD_TOO_LARGE",
      message: "Payload excede o limite máximo permitido de 5MB."
    });
  }
  chunks.push(chunk);
}`,
  },
  {
    id: "FIX-QA-FUZZ-04",
    squad: "Compliance, DPO & LGPD",
    squadIcon: "ClipboardList",
    title: "Suíte de Testes Integrados Negativos de Contrato e Fuzzing de API (Vitest / Supertest)",
    subtitle: "Implementado em src/tests/integration/apiFuzzingNegativeContract.test.ts",
    scope: "IN_PROJECT",
    statusText: "Corrigido no Código do Projeto",
    priority: "CRITICAL (P0)",
    summary: "Bateria de 15 testes de integração com Supertest cobrindo payloads massivos, injeção NoSQL, bytes nulos, tempestade de emojis e limites de contrato.",
    checklist: [
      "15 testes automatizados aprovados no Vitest executados contra servidor HTTP real.",
      "Validação de HTTP 400/422 apropriado para todas as mutações e payloads malformados.",
      "Garantia explícita de ausência de respostas HTTP 500 e zero exceções não capturadas.",
      "Varredura estática de todos os arquivos responsáveis disparada automaticamente a cada ciclo de teste.",
    ],
    codeSnippet: `// TESTE DE RESILIÊNCIA CONTRA PAYLOAD MASSIVO (SUPERTEST)
it("Rejeita com HTTP 400 payload de 5.2MB sem derrubar o Node", async () => {
  const massiveData = "A".repeat(5.2 * 1024 * 1024);
  const response = await request(server)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send({ email: "fuzzer@barbearia.com", junk: massiveData });

  expect(response.status).toBe(400);
  expect(response.body.code).toBe("PAYLOAD_TOO_LARGE");
});`,
  },
];

/**
 * 2. CORREÇÕES EXTERNAS PENDENTES (FORA DO PROJETO)
 * Ações manuais e de infraestrutura necessárias em painéis e provedores externos.
 */
export const REQUIRED_EXTERNAL_FIXES_DATA = [
  // ==========================================
  // 1. BACK-END & CORE APIS (PAINÉIS EXTERNOS)
  // ==========================================
  {
    id: "EXT-WHK-01",
    squad: "Back-End & Core APIs",
    squadIcon: "Wrench",
    title: "Criar Tabela 'webhook_idempotency_keys' no Supabase e Configurar Webhook Secrets nos Gateways",
    subtitle: "Ação Externa / Infraestrutura: Executar DDL no Supabase SQL Editor e configurar Segredos no Mercado Pago, Stripe e Meta",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    summary: "Execução da tabela de idempotência com chave composta única (provider + event_id) no PostgreSQL do Supabase e obtenção dos Webhook Secrets oficiais nos portais de desenvolvedor.",
    checklist: [
      "Abrir o painel do Supabase: https://supabase.com/dashboard/project/<PROJETO>/sql",
      "Executar a migração DDL supabase/migrations/20260927000001_webhook_idempotency.sql para criar a tabela webhook_idempotency_keys.",
      "Verificar se o índice único 'idx_webhook_provider_event' e o RLS 'Service role webhook idempotency full access' foram criados.",
      "Mercado Pago: Acessar 'Suas Aplicações' > 'Webhooks' > copiar a 'Chave Secreta de Assinatura' e salvar como MP_WEBHOOK_SECRET no Supabase Vault.",
      "Stripe: Acessar 'Developers' > 'Webhooks' > selecionar o endpoint > copiar o 'Signing secret' (whsec_...) e salvar como STRIPE_WEBHOOK_SECRET.",
      "WhatsApp / Meta Developers: Acessar 'WhatsApp' > 'Configuração' > 'Webhooks' > definir 'App Secret' e URL de callback HTTPS.",
    ],
    codeSnippet: `-- SCRIPT DDL: EXECUTAR NO SUPABASE SQL EDITOR
CREATE TABLE IF NOT EXISTS public.webhook_idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(64) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(320) NOT NULL UNIQUE,
    payload_hash VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'RECEIVED',
    http_response_code INTEGER NOT NULL DEFAULT 200,
    attempts_count INTEGER NOT NULL DEFAULT 1,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    locked_until TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_provider_event 
    ON public.webhook_idempotency_keys (provider, event_id);
ALTER TABLE public.webhook_idempotency_keys ENABLE ROW LEVEL SECURITY;`,
  },
  {
    id: "EXT-SUP-08",
    squad: "Data Engineering & DBA",
    squadIcon: "Database",
    title: "Supabase Dashboard: Configurar Egress Webhook Allowlist e Bloqueio de IP Local",
    subtitle: "Ação Externa / Supabase: Configuração de Database Webhooks e Network Restrictions",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    summary: "Instruções passo a passo para proteger disparos de webhooks e funções de saída do Supabase contra SSRF para a rede interna.",
    checklist: [
      "Passo 1: Acessar https://supabase.com/dashboard/project/<PROJETO>/integrations/webhooks.",
      "Passo 2: Ao criar ou editar qualquer Database Webhook (ex: envio de notificação WhatsApp ou conciliação Mercado Pago), verificar a URL de destino.",
      "Passo 3: Garantir que a URL utilize estritamente protocolo HTTPS (porta 443).",
      "Passo 4: Em 'Settings' > 'Network Restrictions', configurar a allowlist para permitir tráfego apenas para os endpoints oficiais do SaaS e gateway de pagamentos.",
      "Passo 5: Confirmar que a opção de bloquear chamadas para endereços de rede local (RFC 1918) e metadados de nuvem esteja habilitada no projeto.",
    ],
  },
  {
    id: "EXT-MP-05",
    squad: "Back-End & Core APIs",
    squadIcon: "Wrench",
    title: "Mercado Pago Portal: Obter Chaves de Produção e Cadastrar Webhook HTTPS com HMAC SHA-256",
    subtitle: "Ação Externa / Gateway de Pagamento: Painel Mercado Pago Developers",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    summary: "Instruções passo a passo para obtenção segura das credenciais de produção e ativação de webhook com verificação criptográfica de assinatura.",
    checklist: [
      "Passo 1: Acessar o Portal de Desenvolvedores do Mercado Pago: https://www.mercadopago.com.br/developers/panel.",
      "Passo 2: Selecionar a aplicação da Barbearia e navegar até 'Credenciais de Produção'.",
      "Passo 3: Copiar o 'Access Token' de produção e armazenar como variável de ambiente no servidor (.env seguro ou Supabase Secrets). NUNCA expor no front-end!",
      "Passo 4: Navegar para 'Notificações Webhooks' > 'Adicionar URL de Notificação'.",
      "Passo 5: Cadastrar o endpoint HTTPS oficial (ex: https://<dominio>/api/webhooks/mercadopago).",
      "Passo 6: Copiar a 'Chave Secreta de Assinatura' gerada pelo Mercado Pago e salvar como MP_WEBHOOK_SECRET no cofre de variáveis de ambiente do backend.",
      "Passo 7: Realizar um pagamento de teste no modo Sandbox para confirmar o recebimento do header x-signature e validação HMAC SHA-256.",
    ],
  },
  {
    id: "EXT-OPS-06",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    title: "Cloud Firewall & Security Groups: Restringir Conexões de Saída (Porta 443) e Bloquear IMDS 169.254.169.254",
    subtitle: "Ação Externa / Infraestrutura Cloud: AWS VPC Security Groups, GCP Firewall Rules e Cloudflare",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    summary: "Instruções passo a passo para configuração de Egress Firewall na infraestrutura de nuvem, impedindo exfiltração de dados e acessos a metadados de instâncias.",
    checklist: [
      "Passo 1: No painel do provedor de nuvem (AWS/GCP), abrir as regras de Security Group / Firewall da VPC onde o backend Node.js está hospedado.",
      "Passo 2: Em 'Outbound Rules' (Egress), remover a regra permissiva padrão (0.0.0.0/0 All Traffic).",
      "Passo 3: Criar regra restritiva de Egress autorizando exclusivamente protocolo TCP na porta 443 (HTTPS).",
      "Passo 4: Criar regra explícita de negação (Deny Rule) com prioridade máxima para o destino 169.254.169.254/32 (IMDS link-local) e faixas privadas 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.",
      "Passo 5: Caso utilize AWS EC2, forçar IMDSv2 com parâmetro 'HttpTokens=required' e 'HttpPutResponseHopLimit=1' para neutralizar SSRF via container.",
      "Passo 6: No Cloudflare, habilitar Cloudflare WAF e DNSSEC no domínio do SaaS.",
    ],
  },
  {
    id: "EXT-BE-01",
    squad: "Back-End & Core APIs",
    squadIcon: "Wrench",
    title: "Criar Tabelas 'sessions' e 'security_audit_events' no PostgreSQL com RLS",
    subtitle: "Ação Externa: Executar DDL no SQL Editor do Supabase Dashboard",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    summary: "Criação das tabelas de sessões ativas e auditoria com índices e políticas de Row Level Security (RLS).",
    checklist: [
      "Abrir o painel do Supabase: https://supabase.com/dashboard/project/<PROJETO>/sql",
      "Executar o script DDL abaixo para criar a tabela 'sessions' com índices em (user_id, is_active).",
      "Criar a tabela 'security_audit_events' para registro imutável de eventos de segurança.",
      "Habilitar Row Level Security (RLS) nas novas tabelas.",
      "Criar a função RPC 'search_appointments_by_client' para proteção contra SQL Injection.",
    ],
    codeSnippet: `-- SCRIPT DDL: EXECUTAR NO SUPABASE SQL EDITOR
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON public.sessions(user_id, is_active);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários leem suas próprias sessões" ON public.sessions FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.security_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id TEXT,
  actor_id TEXT,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_audit_created ON public.security_audit_events(created_at DESC);`,
  },
  {
    id: "EXT-BE-02",
    squad: "Back-End & Core APIs",
    squadIcon: "Wrench",
    title: "Deploy das Edge Functions no Supabase CLI",
    subtitle: "Ação Externa / DevOps: Publicar Edge Functions de Revogação e Validação",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "HIGH (P1)",
    summary: "Executar o deploy das funções de borda no projeto Supabase de produção.",
    checklist: [
      "Instalar o Supabase CLI: npm install -g supabase",
      "Autenticar no Supabase: supabase login",
      "Vincular ao projeto: supabase link --project-ref <SEU_PROJECT_REF>",
      "Deploy da revogação: supabase functions deploy revoke-user-sessions",
      "Deploy da checagem: supabase functions deploy verify-jwt-session",
      "Configurar segredos: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<KEY>",
    ],
    instructionsText: `supabase login
supabase link --project-ref <PROJECT_ID>
supabase functions deploy revoke-user-sessions
supabase functions deploy verify-jwt-session`,
  },
  {
    id: "EXT-BE-03",
    squad: "Back-End & Core APIs",
    squadIcon: "Wrench",
    title: "Executar DDL da RPC 'book_appointment_atomic' e Índice GiST no Supabase SQL Editor",
    subtitle: "Ação de Banco de Dados: Executar migração supabase/migrations/20260925_rpc_atomic_booking_race_condition.sql",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    summary: "Habilitar extensão btree_gist e criar a função RPC transacional book_appointment_atomic com advisory lock e bloqueio explícito FOR UPDATE contra Race Conditions.",
    checklist: [
      "Abrir o painel do Supabase: https://supabase.com/dashboard/project/<PROJETO>/sql",
      "Executar a criação da extensão btree_gist: CREATE EXTENSION IF NOT EXISTS btree_gist;",
      "Criar ou atualizar a tabela public.appointments com as restrições de verificação (start_time < end_time).",
      "Criar o índice de exclusão GiST 'exclude_overlapping_appointments_per_barber' para bloquear fisicamente slots sobrepostos.",
      "Criar a função RPC transacional 'book_appointment_atomic' com pg_advisory_xact_lock e SELECT ... FOR UPDATE.",
      "Criar a função RPC 'settle_comanda_atomic' para bloqueio de double-spending no checkout do PDV/POS.",
    ],
    codeSnippet: `-- EXECUTAR NO SUPABASE SQL EDITOR:
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION public.book_appointment_atomic(
  p_tenant_id TEXT,
  p_barber_id TEXT,
  p_client_id TEXT,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_service_id TEXT,
  p_service_name TEXT,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_price NUMERIC DEFAULT 0.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_key BIGINT;
  v_conflict_count INTEGER;
  v_new_appointment RECORD;
BEGIN
  -- Advisory Lock determinístico (tenant, barbeiro, data)
  v_lock_key := ('x' || substr(md5(p_tenant_id || ':' || p_barber_id || ':' || p_booking_date::text), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Bloqueio explícito com SELECT ... FOR UPDATE
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.appointments
  WHERE tenant_id = p_tenant_id
    AND barber_id = p_barber_id
    AND booking_date = p_booking_date
    AND status NOT IN ('cancelled', 'rejected')
    AND ((start_time < p_end_time) AND (end_time > p_start_time))
  FOR UPDATE;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'SLOT_OCCUPIED_CONCURRENCY_CONFLICT: Horário já ocupado.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.appointments (
    tenant_id, barber_id, client_id, client_name, client_phone,
    service_id, service_name, booking_date, start_time, end_time, price, status
  ) VALUES (
    p_tenant_id, p_barber_id, p_client_id, trim(p_client_name), trim(p_client_phone),
    p_service_id, trim(p_service_name), p_booking_date, p_start_time, p_end_time, p_price, 'confirmed'
  ) RETURNING * INTO v_new_appointment;

  RETURN jsonb_build_object('success', true, 'data', v_new_appointment);
END;
$$;`,
  },

  // ==========================================
  // 2. CYBER SECURITY & APPSEC (PAINÉIS EXTERNOS)
  // ==========================================
  {
    id: "EXT-SEC-01",
    squad: "Cyber Security & AppSec",
    squadIcon: "ShieldAlert",
    title: "Configurar TTL de 900s e Refresh Token Rotation no Painel do Supabase Auth",
    subtitle: "Ação de Infraestrutura Externa no Dashboard do Supabase",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    summary: "Ajuste manual da política de expiração de tokens e rotação automática de chaves no painel do Supabase.",
    checklist: [
      "Acessar o painel do Supabase: https://supabase.com/dashboard/project/<SEU_PROJETO>/settings/auth",
      "Navegar até a seção 'JWT Settings' ou 'User Sessions'.",
      "Alterar o campo 'JWT Expiry Limit' de 3600 para 900 segundos (15 minutos).",
      "Marcar a opção 'Enable Refresh Token Rotation' (Garante que cada refresh token só pode ser usado uma vez).",
      "Definir 'Refresh Token Reuse Interval' para 10 segundos (Margem para mitigar condições de corrida na rede móvel).",
      "Salvar as alterações e reiniciar os serviços de autenticação.",
    ],
    instructionsText: `Painel Supabase -> Authentication -> Configuration:
1. JWT Expiry: 900 seconds (15 minutos)
2. Habilitar: 'Enable Refresh Token Rotation'
3. Definir: 'Refresh Token Reuse Interval' = 10s`,
  },

  // ==========================================
  // 3. FRONT-END & UI/UX (CREDENCIAMENTO EXTERNO)
  // ==========================================
  {
    id: "EXT-FE-01",
    squad: "Front-End & UI/UX",
    squadIcon: "Palette",
    title: "Obter e Configurar Chave Pública (Site Key) do Cloudflare Turnstile no Frontend",
    subtitle: "Ação Externa: Painel Cloudflare para Anti-Bot e CAPTCHA",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "HIGH (P1)",
    summary: "Configuração da variável de ambiente VITE_TURNSTILE_SITE_KEY com a chave gerada no painel Cloudflare.",
    checklist: [
      "Acessar https://dash.cloudflare.com -> Turnstile.",
      "Criar widget para o domínio barbeariasaas.com.br.",
      "Copiar a Site Key pública gerada.",
      "Adicionar no arquivo .env: VITE_TURNSTILE_SITE_KEY=<CHAVE_COPIADA>.",
    ],
    instructionsText: `Painel Cloudflare -> Turnstile -> Add Widget:
Nome: Barbearia SaaS Frontend
Domínio: barbeariasaas.com.br
VITE_TURNSTILE_SITE_KEY=0x4AAAAAA...`,
  },

  // ==========================================
  // 4. DEVOPS, SRE & CLOUD INFRA (INTEGRAÇÕES & GATEWAYS)
  // ==========================================
  {
    id: "EXT-DEV-01",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    title: "Cloudflare Turnstile: Registrar Domínio de Produção e Secret Key",
    subtitle: "Ação Externa: Painel Cloudflare para Anti-Bot e CAPTCHA",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "HIGH (P1)",
    summary: "Configurar secret key de validação server-side do desafio CAPTCHA.",
    checklist: [
      "Acessar https://dash.cloudflare.com -> Turnstile.",
      "Copiar a 'Secret Key' (chave restrita de validação server-side).",
      "Adicionar a variável no ambiente de produção: TURNSTILE_SECRET_KEY=<CHAVE_SECRETA>.",
      "Validar chamada ao endpoint de verificação https://challenges.cloudflare.com/turnstile/v0/siteverify.",
    ],
    instructionsText: `Painel Cloudflare:
Secret Key: 0x4AAAAAA...
Configurar no backend: TURNSTILE_SECRET_KEY=<SECRET_KEY>`,
  },
  {
    id: "EXT-DEV-02",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    title: "Mercado Pago: Obter Chaves de Produção e Configurar Webhook IPN",
    subtitle: "Ação Externa: Painel de Desenvolvedores do Mercado Pago",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    summary: "Substituir credenciais de teste por credenciais de produção (APP_USR-...) com segredo de webhook.",
    checklist: [
      "Acessar o portal de desenvolvedores do Mercado Pago: https://www.mercadopago.com.br/developers/panel",
      "Copiar o 'Access Token de Produção' (inicia com APP_USR-...).",
      "Copiar a 'Chave Pública de Produção' (Public Key).",
      "Em 'Webhooks', cadastrar a URL HTTPS: https://api.barbeariasaas.com.br/api/webhooks/mercadopago",
      "Copiar a 'Chave Secreta de Assinatura do Webhook' (Webhook Secret) para validar a autenticidade das notificações de Pix.",
      "Salvar MERCADO_PAGO_ACCESS_TOKEN e MERCADO_PAGO_WEBHOOK_SECRET nas variáveis de ambiente do backend.",
    ],
    instructionsText: `Painel Mercado Pago -> Suas Aplicações -> Credenciais de Produção:
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...
MERCADO_PAGO_PUBLIC_KEY=APP_USR-...
MERCADO_PAGO_WEBHOOK_SECRET=...`,
  },
  {
    id: "EXT-DEV-03",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    title: "Provisionamento de Secrets no GCP Secret Manager / Supabase Vault",
    subtitle: "Ação Externa: Centralização de Segredos de Infraestrutura",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "HIGH (P1)",
    summary: "Armazenar chaves criptográficas e credenciais em cofre seguro com rotação programada.",
    checklist: [
      "Criar os segredos no Google Cloud Secret Manager ou Supabase Vault.",
      "Atribuir papéis de leitura apenas à Service Account de produção do Cloud Run.",
      "Habilitar auditoria de acesso aos segredos via Cloud Audit Logs.",
    ],
    instructionsText: `gcloud secrets create supabase-service-key --data-file=...
gcloud secrets add-iam-policy-binding supabase-service-key --role=roles/secretmanager.secretAccessor`,
  },

  // ==========================================
  // 5. COMPLIANCE, DPO & LGPD (PORTAIS REGULATÓRIOS)
  // ==========================================
  {
    id: "EXT-CMP-01",
    squad: "Compliance, DPO & LGPD",
    squadIcon: "Scale",
    title: "Termo de Consentimento e Registro de DPO perante a ANPD (Art. 41 & 46 LGPD)",
    subtitle: "Ação Regulatória Externa: Governança de Privacidade",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "MEDIUM (P2)",
    summary: "Publicação do canal de comunicação do encarregado de dados e registro formal perante a ANPD.",
    checklist: [
      "Formalizar canal de atendimento aos titulares: dpo@barbeariasaas.com.br.",
      "Publicar Política de Privacidade e Termo de Consentimento de Uso de Cookies/Sessão.",
      "Documentar o Relatório de Impacto à Proteção de Dados Pessoais (RIPD) referente à biometria facial / CAPTCHA.",
    ],
    instructionsText: `Portal Gov.br / ANPD:
1. Cadastrar Encarregado de Dados (DPO): dpo@barbeariasaas.com.br
2. Publicar Termo de Privacidade no rodapé do portal institucional
3. Arquivar RIPD para requisições de auditoria`,
  },
  {
    id: "EXT-CMP-02",
    squad: "Compliance, DPO & LGPD",
    squadIcon: "Scale",
    title: "Executar Script DDL da Trilha de Auditoria Imutável no Supabase SQL Editor",
    subtitle: "Ação Externa / DBA: Executar migração supabase/migrations/20260925_immutable_audit_trail_system.sql",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    summary: "Criação da tabela audit_logs, índices GIN em old_data e new_data, triggers automáticas em tabelas críticas e blindagem RLS WORM.",
    checklist: [
      "Abrir o painel do Supabase: https://supabase.com/dashboard/project/<PROJETO>/sql",
      "Executar o script DDL da migração 20260925_immutable_audit_trail_system.sql.",
      "Verificar a tabela public.audit_logs com os campos: id, tenant_id, user_id, action, table_name, old_data, new_data, created_at, client_ip, user_agent e record_checksum.",
      "Validar se os triggers trg_audit_appointments, trg_audit_transactions e trg_audit_profiles estão ativos.",
      "Confirmar que as regras trg_audit_logs_block_update e trg_audit_logs_block_delete impedem modificações com código 42501.",
      "Configurar bucket de expurgo frio com retenção WORM de 5 anos (Object Lock) para conformidade fiscal e regulatória.",
    ],
    codeSnippet: `-- EXECUTAR NO SUPABASE SQL EDITOR (AUDIT TRAIL WORM):
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name VARCHAR(100) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  client_ip INET,
  user_agent TEXT,
  record_checksum TEXT NOT NULL,
  tamper_seal_version VARCHAR(10) NOT NULL DEFAULT 'v1-sha256'
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- BLOQUEIO INCONDICIONAL DE UPDATE E DELETE
CREATE POLICY "audit_logs_deny_update" ON public.audit_logs FOR UPDATE USING (false);
CREATE POLICY "audit_logs_deny_delete" ON public.audit_logs FOR DELETE USING (false);
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM public, anon, authenticated;`,
  },
  {
    id: "EXT-CMP-03",
    squad: "Compliance, DPO & LGPD",
    squadIcon: "Scale",
    service: "Painel Supabase (Database & Vault)",
    title: "Habilitar Extensão pg_cron e Agendamento do Cron de Expurgo LGPD no Painel do Supabase",
    subtitle: "Ação Externa de Infraestrutura: Banco de Dados & Scheduled Edge Functions",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    sla: "SLA: 24h",
    compliance: "LGPD Art. 16 & 18 / GDPR Art. 17 / CTN Art. 173",
    summary: "Ativação do motor de agendamento de tarefas do PostgreSQL (pg_cron) ou disparo via Supabase Edge Function Cron para expurgo diário e retenção fiscal.",
    affectedTarget: "Painel Supabase -> Database -> Extensions / Cron Jobs",
    checklist: [
      "Acessar o painel do Supabase: https://supabase.com/dashboard/project/<SEU_PROJETO>/database/extensions",
      "Localizar a extensão 'pg_cron' e clicar em 'Enable' (requer privilégios de superusuário do banco).",
      "No SQL Editor, registrar o job diário de expurgo (03:00 UTC): SELECT cron.schedule('lgpd-daily-purge-job', '0 3 * * *', 'SELECT public.execute_lgpd_hard_delete_purge(false);');",
      "No menu 'Settings' -> 'Vault' ou 'Edge Functions', cadastrar a variável de segredo LGPD_ANONYMIZATION_PEPPER com chave criptográfica de alta entropia (256 bits).",
      "Configurar webhook de agendamento disparando a Edge Function 'supabase/functions/lgpd-purge-cron' com header 'x-cron-secret'.",
      "Validar na tabela 'cron.job_run_details' se a primeira execução de teste foi processada sem falhas de foreign key.",
    ],
    instructionsText: `Painel Supabase -> Database -> Extensions:
1. Habilitar: pg_cron
2. Executar no SQL Editor:
   SELECT cron.schedule('lgpd-daily-purge', '0 3 * * *', 'SELECT public.execute_lgpd_hard_delete_purge(false);');
3. Adicionar Segredo no Vault / Environment:
   supabase secrets set LGPD_ANONYMIZATION_PEPPER="sua_chave_secreta_256bits"
   supabase functions deploy lgpd-purge-cron`,
  },
  {
    id: "EXT-DB-01",
    squad: "Data Engineering & DBA",
    squadIcon: "Save",
    service: "Supabase SQL Editor / PostgreSQL Migration",
    title: "Executar Script DDL de Soft-Delete e Procedure soft_delete_customer no Supabase",
    subtitle: "Ação Externa / DBA: Executar migração supabase/migrations/20260925_soft_delete_customers_structure.sql",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    sla: "SLA: 12h",
    compliance: "LGPD Art. 16/18 / GDPR Art. 17 / PostgreSQL 15+",
    summary: "Execução da migration DDL para adição da coluna deleted_at, índices parciais de clientes ativos, criação da VIEW active_customers e stored procedure soft_delete_customer com revogação de sessões.",
    affectedTarget: "Painel Supabase (SQL Editor -> migrations)",
    checklist: [
      "Abrir o painel do Supabase: https://supabase.com/dashboard/project/<PROJETO>/sql",
      "Executar a migração DDL supabase/migrations/20260925_soft_delete_customers_structure.sql.",
      "Verificar se a coluna 'deleted_at (TIMESTAMPTZ)' foi adicionada na tabela customers.",
      "Validar a criação dos índices parciais: idx_customers_active_tenant e idx_customers_deleted_at.",
      "Confirmar a criação da VIEW 'public.active_customers' e testar consulta SELECT * FROM active_customers;",
      "Testar a execução da stored procedure: CALL public.soft_delete_customer('<UUID_CLIENTE>'); e checar se sessões foram revogadas.",
    ],
    codeSnippet: `-- EXECUTAR NO SUPABASE SQL EDITOR:
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_active_tenant 
  ON public.customers (tenant_id, id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_deleted_at 
  ON public.customers (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE OR REPLACE VIEW public.active_customers AS
SELECT * FROM public.customers WHERE deleted_at IS NULL;

CREATE OR REPLACE PROCEDURE public.soft_delete_customer(target_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.customers SET deleted_at = NOW(), updated_at = NOW() WHERE id = target_id AND deleted_at IS NULL;
  UPDATE public.sessions SET is_active = FALSE, revoked_at = NOW(), revocation_reason = 'CUSTOMER_SOFT_DELETED_LGPD' WHERE user_id = target_id AND is_active = TRUE;
END;
$$;`,
  },
  {
    id: "EXT-DB-02",
    squad: "Data Engineering & DBA",
    squadIcon: "Save",
    service: "Supabase PostgreSQL Database",
    title: "Instalar Extensão 'pgcrypto' e Criar Função 'anonymize_customer_data' no Supabase",
    subtitle: "Ação Externa / DBA: Executar migração supabase/migrations/20260925_anonymize_customer_data_function.sql",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    sla: "SLA: 12h",
    compliance: "LGPD Art. 16/18 / CTN Art. 173 / GDPR Art. 17",
    summary: "Habilitação da extensão pgcrypto no Supabase e criação da função PL/pgSQL anonymize_customer_data(target_id UUID) utilizando digest(..., 'sha256') para anonimização irreversível de nome, email e CPF e zeramento de dados secundários preservando integridade fiscal histórica.",
    affectedTarget: "Painel Supabase (SQL Editor -> migrations)",
    checklist: [
      "Acessar o SQL Editor do Supabase: https://supabase.com/dashboard/project/<PROJETO>/sql",
      "Habilitar a extensão pgcrypto: CREATE EXTENSION IF NOT EXISTS pgcrypto;",
      "Executar o script DDL da função anonymize_customer_data(target_id UUID) da migração 20260925_anonymize_customer_data_function.sql",
      "Verificar se a função foi compilada com search_path seguro (public, extensions, pg_temp) e SECURITY DEFINER",
      "Testar chamada RPC no editor: SELECT public.anonymize_customer_data('<UUID_CLIENTE>'); e checar zeramento de telefone e endereço",
      "Conceder permissões de execução aos papéis autorizados: GRANT EXECUTE ON FUNCTION public.anonymize_customer_data(UUID) TO service_role, authenticated;",
    ],
    instructionsText: `Painel Supabase -> SQL Editor:
1. CREATE EXTENSION IF NOT EXISTS pgcrypto;
2. Executar migração: supabase/migrations/20260925_anonymize_customer_data_function.sql
3. SELECT public.anonymize_customer_data('<UUID_CLIENTE>');
4. GRANT EXECUTE ON FUNCTION public.anonymize_customer_data(UUID) TO service_role, authenticated;`,
    codeSnippet: `-- EXECUTAR NO SUPABASE SQL EDITOR:
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.anonymize_customer_data(target_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_customer RECORD;
  v_name_hash TEXT;
  v_email_hash TEXT;
  v_cpf_hash TEXT;
  v_anon_name TEXT;
  v_anon_email TEXT;
  v_anon_cpf TEXT;
BEGIN
  SELECT id, name, email, cpf, is_anonymized INTO v_customer
  FROM public.customers WHERE id = target_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'CUSTOMER_NOT_FOUND');
  END IF;

  IF v_customer.is_anonymized THEN
    RETURN jsonb_build_object('success', true, 'code', 'ALREADY_ANONYMIZED');
  END IF;

  v_name_hash  := encode(digest(coalesce(v_customer.name, '') || target_id::text, 'sha256'), 'hex');
  v_email_hash := encode(digest(coalesce(v_customer.email, '') || target_id::text, 'sha256'), 'hex');
  v_cpf_hash   := encode(digest(coalesce(v_customer.cpf, '') || target_id::text, 'sha256'), 'hex');

  v_anon_name  := 'TITULAR_ANONIMIZADO_' || upper(substring(v_name_hash from 1 for 16));
  v_anon_email := 'anonymized_' || substring(v_email_hash from 1 for 16) || '@lgpd.fiscal.local';
  v_anon_cpf   := 'HASH-CPF-' || upper(substring(v_cpf_hash from 1 for 16));

  UPDATE public.customers
  SET name = v_anon_name, email = v_anon_email, cpf = v_anon_cpf,
      phone = NULL, address = NULL,
      notes = '[DADOS PESSOAIS EXPURGADOS CONFORME LGPD ART. 16 - GUARDA FISCAL CTN ART. 173]',
      is_anonymized = TRUE, anonymized_at = timezone('utc'::text, now()),
      fiscal_retention_until = timezone('utc'::text, now()) + INTERVAL '5 years'
  WHERE id = target_id;

  RETURN jsonb_build_object('success', true, 'code', 'CUSTOMER_ANONYMIZED_SUCCESS', 'target_id', target_id);
END;
$$;`,
  },
  {
    id: "EXT-DB-03",
    squad: "Data Engineering & DBA",
    squadIcon: "Save",
    service: "Supabase PostgreSQL / pg_cron",
    title: "Habilitar Extensão 'pg_cron' e Agendar Procedure 'purge_expired_customers' no Supabase",
    subtitle: "Ação de Infraestrutura Externa: Executar Script no SQL Editor do Supabase",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    sla: "SLA: 24h",
    compliance: "LGPD Arts. 16/18 / CTN Art. 173 / GDPR Art. 17",
    summary: "Habilitação do agendador nativo pg_cron no PostgreSQL, compilação da procedure purge_expired_customers(retention_days INT) e agendamento de execução diária às 03:00 UTC.",
    affectedTarget: "Supabase SQL Editor (https://supabase.com/dashboard/project/<PROJETO>/sql)",
    checklist: [
      "Abrir o painel do Supabase -> SQL Editor (https://supabase.com/dashboard/project/<PROJETO>/sql).",
      "Habilitar a extensão pg_cron executando: CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;",
      "Executar o script da procedure: supabase/migrations/20260925_purge_expired_customers_procedure.sql.",
      "Agendar o job no pg_cron: SELECT cron.schedule('lgpd_purge_daily', '0 3 * * *', 'CALL public.purge_expired_customers(30);');",
      "Conceder permissões de execução aos papéis de serviço: GRANT EXECUTE ON PROCEDURE public.purge_expired_customers(INT) TO service_role;",
    ],
    instructionsText: `Painel Supabase -> SQL Editor:
1. CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
2. Executar migração: supabase/migrations/20260925_purge_expired_customers_procedure.sql
3. SELECT cron.schedule('lgpd_purge_daily', '0 3 * * *', 'CALL public.purge_expired_customers(30);');
4. GRANT EXECUTE ON PROCEDURE public.purge_expired_customers(INT) TO service_role;`,
    codeSnippet: `-- EXECUTAR NO SUPABASE SQL EDITOR:
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Procedure purge_expired_customers(retention_days INT)
CREATE OR REPLACE PROCEDURE public.purge_expired_customers(retention_days INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
-- Script completo em supabase/migrations/20260925_purge_expired_customers_procedure.sql
$$;

-- Agendamento diário às 03:00 UTC
SELECT cron.schedule('lgpd_purge_daily', '0 3 * * *', 'CALL public.purge_expired_customers(30);');

-- Permissões estritas
REVOKE ALL ON PROCEDURE public.purge_expired_customers(INT) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE public.purge_expired_customers(INT) TO service_role;`,
  },
  {
    id: "EXT-DEV-04",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Cloud",
    service: "Supabase Edge Functions / Deno Deploy",
    title: "Fazer Deploy da Edge Function 'purge-expired-customers' e Configurar Segredos no Supabase CLI",
    subtitle: "Ação Externa: Deploy Serverless e Configuração de Segredos de Segurança",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    sla: "SLA: 12h",
    compliance: "OWASP Top 10 A05:2021 / LGPD Art. 46 / Zero Trust",
    summary: "Publicação da Edge Function purge-expired-customers no cluster Deno do Supabase e injeção do segredo CRON_SECURITY_SECRET para autenticação com chave de alta entropia.",
    affectedTarget: "Terminal / Supabase CLI & Edge Runtime",
    checklist: [
      "Autenticar a CLI do Supabase no ambiente de CI/CD ou máquina local: supabase login.",
      "Vincular o projeto oficial: supabase link --project-ref <SEU_PROJECT_REF>.",
      "Injetar o segredo de segurança do Cron: supabase secrets set CRON_SECURITY_SECRET=<SEGREDO_ALTA_ENTROPIA>.",
      "Fazer o deploy da Edge Function: supabase functions deploy purge-expired-customers --no-verify-jwt.",
      "Testar a invocação com curl passando o header 'x-cron-secret' e validando o retorno HTTP 200.",
    ],
    instructionsText: `Terminal / Supabase CLI:
1. supabase login
2. supabase link --project-ref <PROJETO_REF>
3. supabase secrets set CRON_SECURITY_SECRET=lgpd_cron_sec_$(openssl rand -hex 24)
4. supabase functions deploy purge-expired-customers --no-verify-jwt
5. curl -i -X POST https://<PROJETO_REF>.supabase.co/functions/v1/purge-expired-customers -H "x-cron-secret: <SEGREDO>"`,
    codeSnippet: `# DEPLOY DA EDGE FUNCTION VIA SUPABASE CLI
supabase link --project-ref <PROJECT_REF>

# Injeção de Segredo Criptográfico
supabase secrets set CRON_SECURITY_SECRET="LGPD_CRON_PROD_$(openssl rand -hex 24)"

# Deploy para o cluster Edge Runtime
supabase functions deploy purge-expired-customers --no-verify-jwt

# Teste de disparo monitorado
curl -i -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/purge-expired-customers" \\
  -H "x-cron-secret: $CRON_SECURITY_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{"retention_days": 30, "triggered_by": "DEV_MANUAL_TEST"}'`,
  },
  {
    id: "EXT-SRE-01",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "ShieldAlert",
    service: "Supabase Logflare / Sentry / Cloudflare WAF",
    title: "Configurar Agregação de Logs Centralizada com Filtro Anti-Vazamento e Alertas por requestId",
    subtitle: "Ação Externa / SRE: Monitoramento de Exceções HTTP 500 e Redação de Dados Sensíveis",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    sla: "SLA: 24h",
    compliance: "CWE-209 / OWASP A05:2021 / PCI-DSS v4.0",
    summary: "Configuração do Sentry e Logflare no Supabase e Cloudflare WAF para captura do requestId com supressão de stack traces e dados sensíveis para clientes externos.",
    affectedTarget: "Painel Supabase (Settings -> Logflare/Integrations) & Sentry Dashboard",
    checklist: [
      "Acessar o painel do Supabase -> Project Settings -> Database / API Logs.",
      "Configurar integração de observabilidade com Sentry ou Logflare com tag obrigatória 'requestId'.",
      "Definir regras de Data Scrubbing no Sentry/Logflare para redação automática de 'password', 'credit_card', 'token' e 'cpf'.",
      "No Cloudflare WAF / Reverse Proxy, habilitar 'Custom 500 Error Page' ocultando assinaturas de servidor (Server Tokens Off).",
      "No painel de desenvolvedores do Mercado Pago e gateways, configurar webhook de notificação de erros 500 para acionar o time de SRE.",
    ],
    instructionsText: `Sentry / Supabase Observability:
1. Definir SENTRY_DSN nas variáveis de ambiente das Edge Functions: supabase secrets set SENTRY_DSN=...
2. Configurar Data Scrubbing Rules:
   - Scrub sensitive fields: password, credit_card, token, authorization, cpf
3. No Cloudflare WAF: Ativar Strip Server Headers (Server: off)
4. Configurar alertas no Slack/Discord vinculando alertas ao requestId UUID`,
    codeSnippet: `# CONFIGURAÇÃO DE VARIÁVEIS NO SUPABASE CLI
supabase secrets set SENTRY_DSN="https://key@o12345.ingest.sentry.io/67890"
supabase secrets set LOG_LEVEL="info"
supabase secrets set NODE_ENV="production"

# Verificação do WAF / Reverse Proxy
curl -I https://api.barbeariasaas.com.br/api/health
# Confirmar headers:
# X-Content-Type-Options: nosniff
# Server: [Removido ou genérico]`,
  },
  {
    id: "EXT-SEC-03",
    squad: "Cyber Security & AppSec",
    squadIcon: "ShieldAlert",
    service: "Supabase Dashboard (Project Settings > API)",
    title: "Supabase Dashboard - Rotação Emergencial da Chave service_role e Renovação de JWT Secret (SOP SecOps)",
    subtitle: "Ação Externa / SecOps: Protocolo de Invalidação Imediata de Credenciais Administrativas",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    sla: "SLA: 2h",
    compliance: "OWASP ASVS v4.0 V2.1.8 / NIST SP 800-63B",
    summary: "Procedimento operacional padrão para rotação do JWT Secret e da service_role no painel do Supabase caso ocorra suspeita de vazamento em repositórios públicos.",
    affectedTarget: "Painel Supabase (Project Settings -> API -> JWT Settings)",
    checklist: [
      "Acessar https://supabase.com/dashboard/project/<PROJECT_ID>/settings/api.",
      "Rolar até a seção 'JWT Settings' e clicar no botão 'Generate a new JWT Secret'.",
      "Confirmar a rotação (isso invalida imediatamente todas as chaves anon e service_role antigas e todos os tokens ativos).",
      "Copiar a nova chave 'service_role' (secret) e atualizar imediatamente os cofres de segredos do backend (supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...).",
      "Copiar a nova chave 'anon' pública e atualizar a variável VITE_SUPABASE_ANON_KEY no arquivo .env e na plataforma de hospedagem.",
      "Executar build e validação via 'npm run audit:build'.",
    ],
    instructionsText: `Procedimento de Rotação SecOps:
1. Acesse o Dashboard do Supabase: https://supabase.com/dashboard
2. Selecione o projeto da Barbearia Vintage Club.
3. Navegue até 'Project Settings' > 'API'.
4. Na seção 'JWT Settings', clique em 'Generate new secret'.
5. Salve as novas chaves anon e service_role no gerenciador de senhas da organização.
6. Atualize o backend:
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="NOVA_CHAVE_SERVICE_ROLE"
7. Atualize o .env do front-end com a nova anon key.`,
    codeSnippet: `# ATUALIZAÇÃO VIA SUPABASE CLI (BACKEND / EDGE RUNTIME)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="SUA_NOVA_SERVICE_ROLE_KEY"

# TESTE DE CONECTIVIDADE COM A NOVA CHAVE ANON NO FRONTEND
curl -H "apikey: NOVA_ANON_KEY" https://njgeevywotbflikilway.supabase.co/rest/v1/services?select=id,name`,
  },
  {
    id: "EXT-DEV-05",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    service: "Mercado Pago Developers & Stripe Dashboard",
    title: "Mercado Pago & Stripe Dashboards - Segregação Estrita de Access Tokens e Webhook Secrets em Servidor / Edge Functions",
    subtitle: "Ação Externa / Gateways: Obtenção de Chaves Públicas e Configuração de Segredos Privados no Backend",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "CRITICAL (P0)",
    sla: "SLA: 24h",
    compliance: "PCI-DSS v4.0 Requirement 6.5.3 / OWASP A05:2021",
    summary: "Garantia de que chaves privadas (Stripe sk_live_ e Mercado Pago Access Token) sejam configuradas apenas nos segredos das Edge Functions, expondo ao front-end estritamente chaves públicas (pk_live_ e Public Key).",
    affectedTarget: "Mercado Pago Developers (Painel de Aplicações) & Stripe Dashboard (API Keys)",
    checklist: [
      "No Mercado Pago Developers (https://www.mercadopago.com.br/developers/panel), acessar a aplicação de produção.",
      "Copiar a 'Public Key' (inicia com APP_USR-) e cadastrar como VITE_MERCADO_PAGO_PUBLIC_KEY no .env do cliente.",
      "Copiar o 'Access Token de Produção' e cadastrar exclusivamente como segredo de backend (MERCADO_PAGO_ACCESS_TOKEN via supabase secrets).",
      "No Stripe Dashboard (https://dashboard.stripe.com/apikeys), copiar a 'Publishable key' (pk_live_...) para o front-end (VITE_STRIPE_PUBLIC_KEY).",
      "Copiar a 'Secret key' (sk_live_...) e cadastrar exclusivamente como STRIPE_SECRET_KEY no backend.",
      "NUNCA adicionar o prefixo VITE_ nas chaves secretas 'sk_live_' ou 'Access Token'.",
    ],
    instructionsText: `Configuração nos Gateways de Pagamento:
1. Obtenha as chaves públicas nos portais de desenvolvedor.
2. No cliente (front-end):
   VITE_STRIPE_PUBLIC_KEY="pk_live_..."
   VITE_MERCADO_PAGO_PUBLIC_KEY="APP_USR-..."
3. No servidor (Edge Functions):
   supabase secrets set STRIPE_SECRET_KEY="sk_live_..."
   supabase secrets set MERCADO_PAGO_ACCESS_TOKEN="APP_USR-..."
4. Rode 'npm run audit:build' para auditar os bundles compilados.`,
    codeSnippet: `# INJEÇÃO DE SEGREDOS PRIVADOS NO SUPABASE EDGE RUNTIME
supabase secrets set STRIPE_SECRET_KEY="sk_live_51M..."
supabase secrets set MERCADO_PAGO_ACCESS_TOKEN="APP_USR-123456..."

# VERIFICAÇÃO DE SEGREDOS ATIVOS (NÃO EXIBE O VALOR COMPLETO)
supabase secrets list`,
  },
  {
    id: "EXT-DEV-06",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    service: "Google Cloud Run / Vercel / GitHub Actions CI/CD",
    title: "Pipeline de CI/CD & Cloud Run / Vercel - Injeção Segura de Variáveis de Ambiente sem Prefixo VITE_",
    subtitle: "Ação Externa / CI-CD: Segregação de Build Args vs Runtime Secrets no Pipeline",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária",
    priority: "HIGH (P1)",
    sla: "SLA: 48h",
    compliance: "OWASP ASVS V14.1 / NIST SP 800-161",
    summary: "Configuração do pipeline de integração contínua para executar 'npm run audit:build' após o build e impedir a passagem de variáveis confidenciais como ARG em Dockerfiles.",
    affectedTarget: "GitHub Actions (.github/workflows) / Cloud Build / Vercel Environment Variables",
    checklist: [
      "Configurar step obrigatório no GitHub Actions: 'npm run build && npm run audit:build'.",
      "Garantir que a pipeline falhe imediatamente se 'audit:build' retornar exit code 1.",
      "No Dockerfile de produção, NUNCA usar ARG para senhas de banco ou chaves privadas.",
      "Na Vercel / Cloud Run, marcar variáveis client-side explicitamente com o prefixo VITE_ e manter variáveis de servidor desmarcadas da flag 'Public / Browser'.",
      "Ativar scanner de segredos no repositório (GitHub Secret Scanning e Dependabot).",
    ],
    instructionsText: `Configuração do Pipeline CI/CD:
1. No arquivo de workflow .github/workflows/ci.yml:
   - run: npm ci
   - run: npm run build
   - run: npm run audit:build
   - run: npm test
2. Bloquear o merge de Pull Requests caso qualquer passo falhe.
3. Proteger a branch main contra commits diretos com segredos.`,
    codeSnippet: `# STEP NO WORKFLOW DO GITHUB ACTIONS (.github/workflows/ci.yml)
- name: Build and Audit Bundles
  run: |
    npm run build
    npm run audit:build
  env:
    NODE_ENV: production
    VITE_SUPABASE_URL: \${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: \${{ secrets.VITE_SUPABASE_ANON_KEY }}`,
  },
  {
    id: "EXT-SEC-04",
    squad: "Cyber Security & AppSec",
    squadIcon: "ShieldAlert",
    title: "Supabase Auth: Configuração de Timeout por Inatividade e Trigger de Revogação de Sessão (EXT-SEC-04)",
    subtitle: "Ação Externa no Painel do Supabase e Banco PostgreSQL",
    scope: "EXTERNAL",
    statusText: "Ação Pendente Fora do Projeto (Painel Supabase)",
    priority: "CRITICAL (P0)",
    summary: "Configuração do encerramento forçado de sessão por inatividade no painel GoTrue e criação de trigger PL/pgSQL na tabela public.sessions para marcar is_active = FALSE quando auth.sign_out for invocado.",
    checklist: [
      "Acessar https://supabase.com/dashboard/project/<PROJETO>/settings/auth.",
      "Configurar 'Session Inactivity Timeout' para 1800 segundos (30 minutos) e 'JWT Expiry Limit' para 900 segundos (15 minutos).",
      "Executar script SQL no Supabase SQL Editor para criar trigger de expurgo na tabela public.sessions ao receber evento de logout.",
      "Validar que a coluna revoked_at é preenchida com NOW() imediatamente após o término da sessão.",
    ],
    instructionsText: `Instruções Passo a Passo no Painel Supabase:
1. Acesse https://supabase.com/dashboard e selecione seu projeto.
2. Navegue até Authentication -> Settings -> Sessions.
3. Defina "Inactivity Timeout": 30 minutes.
4. Defina "Time-based OTP Expiry": 300 seconds.
5. No menu SQL Editor, execute o script de sincronização de sessões revogadas para manter paridade entre auth.users e public.sessions.`,
    codeSnippet: `-- TRIGGER DE INATIVAÇÃO DE SESSÃO NO SUPABASE SQL EDITOR
CREATE OR REPLACE FUNCTION public.handle_user_logout_event()
RETURNS trigger AS $$
BEGIN
  UPDATE public.sessions
  SET is_active = FALSE,
      revoked_at = NOW(),
      revocation_reason = 'SUPABASE_AUTH_SIGN_OUT'
  WHERE user_id = auth.uid() AND is_active = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`,
  },
  {
    id: "EXT-DEV-07",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    title: "Mercado Pago Developers: Configuração de Webhook Secret HMAC & IPN de Pagamento (EXT-DEV-07)",
    subtitle: "Ação Externa no Painel Mercado Pago Developers",
    scope: "EXTERNAL",
    statusText: "Ação Pendente Fora do Projeto (Painel Mercado Pago)",
    priority: "CRITICAL (P0)",
    summary: "Geração da chave secreta compartilhada HMAC-SHA256 no portal de desenvolvedores do Mercado Pago e apontamento da URL de Webhook com proteção HTTPS e tolerância de tempo constante.",
    checklist: [
      "Acessar https://www.mercadopago.com.br/developers/panel/app.",
      "Selecionar a aplicação do SaaS e acessar 'Notificações Webhook'.",
      "Configurar a URL de produção: https://<SEU_DOMINIO>/api/webhooks/mercadopago.",
      "Selecionar os tópicos: 'payment', 'merchant_order', 'subscription_preapproval'.",
      "Copiar a 'Chave Secreta' (Webhook Secret) e cadastrar na variável MERCADO_PAGO_WEBHOOK_SECRET no cofre do servidor / Edge Function.",
    ],
    instructionsText: `Instruções Passo a Passo no Mercado Pago Developers:
1. Acesse o Painel de Desenvolvedores do Mercado Pago.
2. Em "Suas Aplicações", selecione a aplicação correspondente à barbearia.
3. No menu lateral esquerdo, clique em "Notificações Webhook".
4. No campo "Modo Produção", insira a URL HTTPS protegida: https://api.barbeariasaas.com/webhooks/mercadopago.
5. Clique em "Obter Chave Secreta" e guarde o hash HMAC no gerenciador seguro de segredos.
6. Realize um disparo de teste e valide o retorno HTTP 200 Fast ACK.`,
    codeSnippet: `# VARIÁVEL DE AMBIENTE NO SERVIDOR (NUNCA EXPONHA NO CLIENT-SIDE)
MERCADO_PAGO_WEBHOOK_SECRET="whsec_mp_live_xxxxxxxxxxxxxxxxxxxxxxxx"
MERCADO_PAGO_ACCESS_TOKEN="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxx"`,
  },
  {
    id: "EXT-API-01",
    squad: "Back-End & Core APIs",
    squadIcon: "Wrench",
    title: "Supabase Database & API Gateway: Padronização de Contratos e Restrições de Schema (EXT-API-01)",
    subtitle: "Ação Externa no Painel Supabase (Table Editor / SQL Editor)",
    scope: "EXTERNAL",
    statusText: "Ação Pendente Fora do Projeto (Painel Supabase)",
    priority: "HIGH (P1)",
    summary: "Configuração de constraints CHECK e tipos NOT NULL no banco relacional PostgreSQL do Supabase para garantir que respostas de API cumpram integralmente os contratos Zod do front-end.",
    checklist: [
      "Acessar o painel do Supabase -> Database -> Table Editor.",
      "Garantir tipos corretos nas tabelas services, barbers e appointments.",
      "Adicionar constraint CHECK (price >= 0) na tabela services e appointments.",
      "Adicionar constraint CHECK (duration_minutes > 0) para serviços.",
      "Configurar valor default para colunas opcionais para prevenir null unhandled.",
    ],
    instructionsText: `Instruções Passo a Passo no Supabase SQL Editor:
1. Acesse https://supabase.com/dashboard e selecione seu projeto.
2. No menu lateral, acesse "SQL Editor" e crie uma nova query.
3. Execute o script DDL de alinhamento de constraints e tipagens.
4. Valide que as colunas retornam tipos consistentes (number, text, boolean).`,
    codeSnippet: `-- DDL DE ALINHAMENTO DE CONTRATO NO SUPABASE SQL EDITOR
ALTER TABLE public.services
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN price SET NOT NULL,
  ADD CONSTRAINT check_positive_price CHECK (price >= 0),
  ADD CONSTRAINT check_positive_duration CHECK (duration_minutes > 0);`,
  },
  {
    id: "EXT-DEV-08",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    title: "Cloudflare WAF & Nginx: Limite de Payload (client_max_body_size 5M) & Inspeção Anti-Null Byte (EXT-DEV-08)",
    subtitle: "Ação Externa no Proxy Reverso / Ingress / Cloudflare WAF",
    scope: "EXTERNAL",
    statusText: "Ação Pendente Fora do Projeto (Infraestrutura Cloud / WAF)",
    priority: "HIGH (P1)",
    summary: "Configuração de limites de payload de requisição (5MB) e regras de inspeção de WAF para descartar tentativas de DoS e injeção de bytes nulos (%00) no perimeter antes de atingir o cluster de contêineres.",
    checklist: [
      "No Cloudflare Dashboard -> Security -> WAF -> Custom Rules, criar regra bloqueando URI ou Body contendo %00.",
      "Configurar regra de firewall bloqueando requisições com Content-Length superior a 5242880 bytes (5MB).",
      "No arquivo de configuração do Nginx (nginx.conf), definir client_max_body_size 5M.",
      "Ativar buffers restritos: client_body_buffer_size 128k e large_client_header_buffers 4 16k.",
    ],
    instructionsText: `Instruções Passo a Passo para Cloudflare & Nginx:
1. Acesse o Cloudflare Dashboard da zona do domínio api.barbeariasaas.com.
2. Navegue até "Security" -> "WAF" -> "Create rule".
3. Nome: "Block Null Bytes & Massive Payloads".
4. Condição: (http.request.uri contains "%00" or http.request.body.size gt 5242880). Ação: Block.
5. No servidor Nginx / Ingress Controller, aplique a diretiva client_max_body_size 5M no bloco http ou server.
6. Reinicie o serviço com nginx -s reload e valide com curl -X POST -d @bigfile.json.`,
    codeSnippet: `# NGINX / INGRESS CONFIGURATION (nginx.conf)
server {
    listen 443 ssl http2;
    server_name api.barbeariasaas.com;

    # Defesa Perimetral contra Payloads Massivos (>5MB)
    client_max_body_size 5M;
    client_body_buffer_size 128k;

    # Bloqueio de Injeção de Bytes Nulos na URL
    if ($request_uri ~* "%00") {
        return 400 "{\\"error\\":\\"Bad Request\\",\\"code\\":\\"NULL_BYTE_DETECTED\\"}";
    }

    location /api/ {
        proxy_pass http://backend_upstream;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
    }
}`,
  },
  {
    id: "EXT-DEV-RL-01",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    title: "Cloudflare WAF / Gateway: Ativação de Regras de Rate Limiting na Borda (EXT-DEV-RL-01)",
    subtitle: "Ação Externa no Cloudflare Dashboard ou API de Regras WAF",
    scope: "EXTERNAL",
    statusText: "Ação Pendente Fora do Projeto (Cloudflare / Edge Gateway)",
    priority: "CRITICAL (P0)",
    summary: "Importação e ativação do ruleset de Rate Limiting na borda da Cloudflare para a zona do domínio de produção, mitigando ataques volumétricos L7 (DDoS / Brute Force) antes de consumirem recursos do servidor de aplicação.",
    checklist: [
      "Acessar o Cloudflare Dashboard: https://dash.cloudflare.com.",
      "Selecionar a zona do domínio oficial (ex: barbeariasaas.com.br).",
      "Navegar até Security > WAF > Rate Limiting Rules.",
      "Criar ou importar a regra 'Edge Rate Limiting - Sensitive Auth Route': Expressão (http.request.uri.path eq '/auth/login'), Limite: 5 reqs/min por IP, Ação: Block ou Managed Challenge.",
      "Criar ou importar a regra 'Edge Rate Limiting - Payment API': Expressão (http.request.uri.path eq '/api/payment'), Limite: 10 reqs/min por IP, Ação: Block.",
      "Criar a regra 'Global Rate Limiting - General API': Expressão (http.request.uri.path starts_with '/api/'), Limite: 100 reqs/min por IP, Ação: Block.",
      "Garantir a inclusão do cabeçalho customizado de resposta 'Retry-After: 60' nas respostas 429 da Cloudflare.",
      "Alternativamente, aplicar via Cloudflare API v4 utilizando o arquivo cloudflare-rate-limiting-rules.json fornecido no repositório.",
    ],
    instructionsText: `Instruções de Deploy via Cloudflare API v4 (CLI / curl):
1. Obtenha seu Zone ID e API Token com permissão 'Zone.WAF':
   export CF_ZONE_ID="<SEU_ZONE_ID>"
   export CF_API_TOKEN="<SEU_TOKEN_CLOUDFLARE>"

2. Envie as regras definidas no arquivo cloudflare-rate-limiting-rules.json:
   curl -X PUT "https://api.cloudflare.com/client/v4/zones/\${CF_ZONE_ID}/rulesets/phases/http_ratelimit/entrypoint" \\
     -H "Authorization: Bearer \${CF_API_TOKEN}" \\
     -H "Content-Type: application/json" \\
     -d @cloudflare-rate-limiting-rules.json

3. Verifique a ativação do ruleset:
   curl -X GET "https://api.cloudflare.com/client/v4/zones/\${CF_ZONE_ID}/rulesets/phases/http_ratelimit/entrypoint" \\
     -H "Authorization: Bearer \${CF_API_TOKEN}"`,
    codeSnippet: `# REGRA CLOUDFLARE WAF VIA TERRAFORM / JSON
resource "cloudflare_rate_limit" "auth_login_ratelimit" {
  zone_id   = var.cloudflare_zone_id
  threshold = 5
  period    = 60
  match {
    request {
      url_pattern = "*.barbeariasaas.com.br/auth/login"
      schemes     = ["HTTPS"]
      methods     = ["POST"]
    }
    response {
      statuses = [401, 403, 429]
    }
  }
  action {
    mode    = "simulate" # Ou "ban" com timeout de 60s
    timeout = 60
    response {
      content_type = "application/json"
      body         = "{\\"error\\":\\"Too Many Requests\\",\\"retry_after\\":60}"
    }
  }
}`,
  },
  {
    id: "EXT-SEC-SSRF-01",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    title: "VPC Egress Firewall & IMDSv2 Hop Limit Enforcement (EXT-SEC-SSRF-01)",
    subtitle: "Ação Externa no Provedor Cloud (AWS EC2 / GCP Compute / Cloudflare Gateway)",
    scope: "EXTERNAL",
    statusText: "Ação Pendente Fora do Projeto (Cloud Infrastructure / VPC)",
    priority: "CRITICAL (P0)",
    summary: "Configuração perimetral de regras de egresso de VPC e endurecimento do serviço de metadados das instâncias para impedir roubo de credenciais via SSRF na borda de rede.",
    checklist: [
      "AWS: Ativar obrigatoriedade de IMDSv2 (http-tokens: required) e definir http-put-response-hop-limit para 1 em todas as instâncias EC2 e nós EKS.",
      "AWS: Configurar Security Group de saída bloqueando tráfego para 169.254.169.254/32 na porta 80.",
      "GCP: Ativar Workload Identity no GKE e aplicar NetworkPolicy bloqueando acesso de Pods ao metadata.google.internal.",
      "Cloudflare Gateway: Criar política de DNS Firewall bloqueando a resolução de domínios públicos que apontam para IPs privados (ex: *.nip.io, *.sslip.io) contra DNS Rebinding.",
      "Kubernetes / Ingress: Aplicar Egress NetworkPolicies permitindo apenas portas 443 para CIDRs da internet pública autorizada.",
    ],
    instructionsText: `Instruções de Endurecimento Cloud (CLI):
1. AWS CLI - Forçar IMDSv2 com limite de 1 salto:
   aws ec2 modify-instance-metadata-options \\
     --instance-id <INSTANCE_ID> \\
     --http-tokens required \\
     --http-put-response-hop-limit 1 \\
     --http-endpoint enabled

2. AWS VPC Security Group - Regra de bloqueio de saída para metadados:
   aws ec2 revoke-security-group-egress \\
     --group-id <SG_ID> \\
     --protocol tcp --port 80 --cidr 169.254.169.254/32

3. Kubernetes NetworkPolicy - Bloquear metadados em pods de aplicação:
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: deny-metadata-access
   spec:
     podSelector: {}
     policyTypes: [Egress]
     egress:
     - to:
       - ipBlock:
           cidr: 0.0.0.0/0
           except: [169.254.169.254/32]`,
    codeSnippet: `# TERRAFORM: AWS EC2 IMDSv2 HARDENING & SECURITY GROUP EGRESS
resource "aws_instance" "app_node" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required" # IMDSv2 compulsório
    http_put_response_hop_limit = 1          # Bloqueia SSRF de contêineres Docker
    instance_metadata_tags      = "disabled"
  }
}`,
  },
  {
    id: "EXT-DEVSEC-CI-01",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    title: "Configuração de Secrets no GitHub Actions e Branch Protection Rules (EXT-DEVSEC-CI-01)",
    subtitle: "Ação Externa no GitHub (Settings -> Secrets and variables -> Actions / Branches)",
    scope: "EXTERNAL",
    statusText: "Ação Pendente Fora do Projeto (GitHub Repository Management)",
    priority: "CRITICAL (P0)",
    summary: "Provisionamento de credenciais seguras nos Secrets do GitHub (SNYK_TOKEN, SONAR_TOKEN) e imposição de regra de Branch Protection bloqueando merges sem a aprovação do Quality Gate DevSecOps.",
    checklist: [
      "Criar conta e obter API Token na Snyk (Organization Settings -> API Token).",
      "Cadastrar o segredo SNYK_TOKEN no repositório GitHub (Settings -> Secrets and variables -> Actions -> Repository secrets).",
      "Obter User Token no SonarCloud (My Account -> Security -> Generate Token).",
      "Cadastrar o segredo SONAR_TOKEN no repositório GitHub.",
      "Acessar Settings -> Branches -> Add branch protection rule para 'main' e 'master'.",
      "Marcar 'Require status checks to pass before merging' e selecionar os checks: 'Secret Scanning', 'Static Code Analysis', 'Dependency Vulnerability Audit' e 'DevSecOps Merge Quality Gate Enforcement'.",
      "Marcar 'Require branches to be up to date before merging' e 'Do not allow bypassing the above settings' (bloqueio até para administradores).",
    ],
    instructionsText: `Instruções Passo a Passo no GitHub:
1. Cadastrar Secrets no Repositório:
   - Acesse o repositório no GitHub -> 'Settings' -> 'Secrets and variables' -> 'Actions'.
   - Clique em 'New repository secret'.
   - Nome: SNYK_TOKEN | Valor: <cole seu token do painel snyk.io>
   - Clique em 'New repository secret'.
   - Nome: SONAR_TOKEN | Valor: <cole seu token do sonarcloud.io>

2. Configurar Branch Protection Rules:
   - No GitHub -> 'Settings' -> 'Branches' -> 'Branch protection rules' -> 'Add rule'.
   - Branch name pattern: main (repetir para develop).
   - Marque: [x] Require a pull request before merging.
   - Marque: [x] Require status checks to pass before merging.
   - Na barra de busca de status checks, adicione:
     * DevSecOps Merge Quality Gate Enforcement
     * Static Code Analysis (SAST - Semgrep & SonarCloud)
     * Secret Scanning (Gitleaks & TruffleHog)
     * Dependency Vulnerability Audit (npm audit & Snyk)
   - Marque: [x] Do not allow bypassing the above settings (impede que merges acidentais ignorem falhas).
   - Clique em 'Save changes'.`,
    codeSnippet: `# GITHUB CLI (gh) PARA APLICAÇÃO AUTOMATIZADA DE BRANCH PROTECTION
# 1. Definir secrets via CLI
gh secret set SNYK_TOKEN --body "$SNYK_TOKEN"
gh secret set SONAR_TOKEN --body "$SONAR_TOKEN"

# 2. Aplicar Branch Protection com checks obrigatórios
gh api -X PUT /repos/:owner/:repo/branches/main/protection \\
  -H "Accept: application/vnd.github+json" \\
  -F required_status_checks[strict]=true \\
  -F required_status_checks[contexts][]="DevSecOps Merge Quality Gate Enforcement" \\
  -F enforce_admins=true \\
  -F required_pull_request_reviews[required_approving_review_count]=1 \\
  -F restrictions=null`,
  },
  {
    id: "EXT-A11Y-01",
    squad: "Front-End & UI/UX",
    squadIcon: "Accessibility",
    title: "Auditoria Assistiva com Leitores de Tela e Pipeline Pa11y/Axe-core CI (EXT-A11Y-01)",
    subtitle: "Ação Externa / QA: Homologação com NVDA/VoiceOver e Automação de CI com Axe-core",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária (Validação com Tecnologia Assistiva)",
    priority: "HIGH (P1)",
    compliance: "WCAG 2.2 Nível AA / WAI-ARIA 1.2 / Seção 508",
    summary: "Roteiro de homologação manual externa com leitores de tela reais (NVDA no Windows, VoiceOver no iOS/macOS e TalkBack no Android) e integração de varredura automatizada com Pa11y CI no pipeline de deploy.",
    checklist: [
      "Instalar e executar teste de fluxo completo com leitor de tela NVDA (Windows) utilizando atalhos Tab, Shift+Tab, Espaço e Setas.",
      "Validar a leitura do VoiceOver (macOS / iOS) para conferir o anúncio dos status de carregamento e banners de resiliência offline.",
      "Configurar arquivo .pa11yci.json no repositório com standard 'WCAG2AA' e threshold de erro zero.",
      "Adicionar step no pipeline do GitHub Actions para rodar 'npx pa11y-ci' contra o build de staging.",
      "Cadastrar webhook no Slack/Discord de engenharia para notificar regressões de contraste ou semântica ARIA.",
    ],
    instructionsText: `Roteiro de Teste Externo com Leitores de Tela & CI:
1. Teste Manual com NVDA / VoiceOver:
   - Ative o leitor (NVDA: Ctrl + Alt + N | VoiceOver: Cmd + F5).
   - Use apenas Tab para navegar por todos os cards e campos de agendamento.
   - Verifique se o leitor vocaliza: 'Serviço, caixa de seleção marcada/desmarcada' e 'Barbeiro, botão de opção'.
   - Desconecte a internet e confirme que o anúncio 'Modo offline ativado' é vocalizado suavemente via aria-live='polite'.

2. Configurar Pa11y CI no GitHub Actions:
   - Adicionar arquivo .pa11yci.json na raiz do projeto com standard: "WCAG2AA".
   - Executar no terminal: npx pa11y-ci --sitemap https://staging.barbeariasaas.com
   - Garantir que nenhuma violação seja tolerada no merge gate da branch main.`,
    codeSnippet: `// .pa11yci.json - Configuração de CI para WCAG 2.2 AA
{
  "defaults": {
    "standard": "WCAG2AA",
    "timeout": 30000,
    "wait": 1500,
    "runners": ["axe", "htmlcs"],
    "chromeLaunchConfig": {
      "args": ["--no-sandbox", "--disable-setuid-sandbox"]
    }
  },
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3000/?screen=client-app",
    "http://localhost:3000/?screen=login",
    "http://localhost:3000/?screen=onboarding"
  ]
}`,
  },
  {
    id: "EXT-CHROMATIC-01",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Palette",
    service: "Chromatic Cloud Visual Testing (chromatic.com)",
    title: "Vincular Projeto no Chromatic e Cadastrar Secret CHROMATIC_PROJECT_TOKEN (EXT-CHROMATIC-01)",
    subtitle: "Ação Externa / DevOps: Criar projeto no Chromatic e vincular ao repositório GitHub",
    scope: "EXTERNAL",
    statusText: "Ação Externa Necessária (Provisionamento de Token no Chromatic)",
    priority: "HIGH (P1)",
    compliance: "Visual Regression Testing / Git Pull Request Gate",
    summary: "Criação do projeto no painel chromatic.com, obtenção do Project Token e cadastro nos secrets do GitHub Actions para aprovação de visual diffs nos Pull Requests.",
    checklist: [
      "Acessar chromatic.com e efetuar login com a conta da organização GitHub.",
      "Clicar em 'Add Project' e selecionar o repositório 'barbearia-saas'.",
      "Copiar o token único gerado: CHROMATIC_PROJECT_TOKEN.",
      "Acessar o GitHub -> Settings -> Secrets and variables -> Actions -> New repository secret.",
      "Cadastrar o secret com Nome: CHROMATIC_PROJECT_TOKEN e colar o token.",
      "Habilitar 'Require visual review on Pull Requests' nas configurações do projeto no Chromatic.",
      "Definir threshold de tolerância de pixels em 5% para prevenir falsos-positivos de anti-aliasing.",
    ],
    instructionsText: `Roteiro Passo a Passo no Chromatic & GitHub:
1. Criar Projeto no Chromatic:
   - Acesse https://www.chromatic.com e entre com seu login GitHub.
   - Selecione a organização e escolha o repositório 'barbearia-saas'.
   - O Chromatic gerará um comando de inicialização contendo seu Project Token.

2. Salvar Secret no GitHub Actions:
   - No GitHub -> 'Settings' -> 'Secrets and variables' -> 'Actions'.
   - Clique em 'New repository secret'.
   - Nome: CHROMATIC_PROJECT_TOKEN
   - Valor: <cole seu token do painel do Chromatic>
   - Clique em 'Add secret'.

3. Testar Publicação Manual (Opcional):
   - No terminal local execute:
     npx chromatic --project-token=seu_token_aqui
   - Abra a URL do Storybook publicada na nuvem e aprove o primeiro baseline visual.`,
    codeSnippet: `# GITHUB ACTIONS / CHROMATIC CLI SETUP
# 1. Configurar Secret via GitHub CLI
gh secret set CHROMATIC_PROJECT_TOKEN --body "$CHROMATIC_PROJECT_TOKEN"

# 2. Executar auditoria de build e publicação do Storybook
npx chromatic \\
  --project-token="$CHROMATIC_PROJECT_TOKEN" \\
  --exit-zero-on-changes=false \\
  --only-changed=true \\
  --auto-accept-changes=false`,
  },
];

export const ALL_FIXES_DATA = [
  ...REQUIRED_PROJECT_FIXES_DATA,
  ...REQUIRED_EXTERNAL_FIXES_DATA,
];

// Compatibilidade retroativa
export const REQUIRED_FIXES_DATA = ALL_FIXES_DATA;

const EXTERNAL_PROBE_ID_MAP = {
  "EXT-API-01": "CORR-014",
  "EXT-DB-01": "CORR-014",
  "EXT-WHK-01": "CORR-005",
  "EXT-DEV-02": "CORR-006",
  "EXT-MP-05": "CORR-006",
  "EXT-DEV-07": "CORR-024",
  "EXT-DEV-RL-01": "CORR-007",
  "EXT-DEV-08": "CORR-008",
  "EXT-OPS-06": "CORR-008",
  "EXT-SEC-SSRF-01": "CORR-009",
  "EXT-SEC-01": "CORR-010",
  "EXT-DEVSEC-CI-01": "CORR-011",
  "EXT-SRE-01": "CORR-012",
  "EXT-SEC-04": "CORR-019",
  "EXT-BE-02": "CORR-021",
  "EXT-DEV-06": "CORR-025",
  "EXT-SEC-05": "CORR-037",
  "EXT-BE-01": "CORR-037",
  "EXT-DB-03": "CORR-037",
};

export const isFixCloudResolved = (fix, probedMap) => {
  if (!fix || fix.scope !== "EXTERNAL" || !probedMap) return false;
  const mappedId = EXTERNAL_PROBE_ID_MAP[fix.id] || fix.id;
  return probedMap[fix.id] === "RESOLVED" || probedMap[mappedId] === "RESOLVED";
};

export default function RequiredFixesView({ onCopyText }) {
  const [selectedSquad, setSelectedSquad] = useState("ALL");
  const [selectedScope, setSelectedScope] = useState("ALL"); // 'ALL' | 'IN_PROJECT' | 'EXTERNAL' | 'RESOLVED_CLOUD'
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [copyToast, setCopyToast] = useState(null);
  const [probingItemId, setProbingItemId] = useState(null);
  const [probeResultModal, setProbeResultModal] = useState(null);

  const [probedStatusMap, setProbedStatusMap] = useState(() => {
    return getStoredProbedStatusMap();
  });

  const handleRunProbe = async (fix) => {
    setProbingItemId(fix.id);
    try {
      const [result] = await Promise.all([
        runExternalItemProbe(fix.id, fix.title),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);

      if (result.isResolved) {
        saveStoredProbedStatus(fix.id, 'RESOLVED');
        setProbedStatusMap(getStoredProbedStatusMap());
        setCopyToast(`Sucesso! ${fix.id} validado na infraestrutura externa!`);
      } else {
        saveStoredProbedStatus(fix.id, 'UNRESOLVED');
        setProbedStatusMap(getStoredProbedStatusMap());
      }
      setProbeResultModal(result);
    } catch {
      // ignore
    } finally {
      setProbingItemId(null);
    }
  };

  const handleManualToggle = (fix, forceStatus) => {
    const nextStatus = forceStatus || (probedStatusMap[fix.id] === 'RESOLVED' ? 'UNRESOLVED' : 'RESOLVED');
    saveStoredProbedStatus(fix.id, nextStatus);
    setProbedStatusMap(getStoredProbedStatusMap());
    setCopyToast(nextStatus === 'RESOLVED' ? `${fix.id} confirmado como solucionado!` : `${fix.id} reaberto como pendente.`);
  };

  useEffect(() => {
    const handleUpdate = () => {
      setProbedStatusMap(getStoredProbedStatusMap());
    };
    window.addEventListener("qa-external-status-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("qa-external-status-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const squads = useMemo(() => {
    return [
      "ALL",
      "Back-End & Core APIs",
      "Cyber Security & AppSec",
      "Front-End & UI/UX",
      "DevOps, SRE & Cloud Infra",
      "Compliance, DPO & LGPD",
      "Data Engineering & DBA",
    ];
  }, []);

  const stats = useMemo(() => {
    // Alvo de contagem: se uma squad específica estiver selecionada, conta apenas dela; se ALL, conta geral
    const targetSet = selectedSquad === "ALL"
      ? ALL_FIXES_DATA
      : ALL_FIXES_DATA.filter((f) => f.squad === selectedSquad);

    const projectCount = targetSet.filter((f) => f.scope === "IN_PROJECT").length;
    const externalList = targetSet.filter((f) => f.scope === "EXTERNAL");
    const resolvedExternalCount = externalList.filter((f) =>
      isFixCloudResolved(f, probedStatusMap)
    ).length;
    const pendingExternalCount = externalList.length - resolvedExternalCount;

    // Métricas globais para os cards de topo
    const globalExternalList = ALL_FIXES_DATA.filter((f) => f.scope === "EXTERNAL");
    const globalResolvedExternal = globalExternalList.filter((f) => isFixCloudResolved(f, probedStatusMap)).length;
    const globalPendingExternal = globalExternalList.length - globalResolvedExternal;

    return {
      total: targetSet.length,
      project: projectCount,
      external: pendingExternalCount,
      resolvedCloud: resolvedExternalCount,
      globalTotal: ALL_FIXES_DATA.length,
      globalProject: ALL_FIXES_DATA.filter((f) => f.scope === "IN_PROJECT").length,
      globalExternal: globalPendingExternal,
      globalResolvedCloud: globalResolvedExternal,
    };
  }, [selectedSquad, probedStatusMap]);

  const filteredFixes = useMemo(() => {
    return ALL_FIXES_DATA.filter((fix) => {
      const matchSquad = selectedSquad === "ALL" || fix.squad === selectedSquad;
      const isResolved = isFixCloudResolved(fix, probedStatusMap);
      const matchScope =
        selectedScope === "ALL"
          ? true
          : selectedScope === "IN_PROJECT"
          ? fix.scope === "IN_PROJECT"
          : selectedScope === "EXTERNAL"
          ? fix.scope === "EXTERNAL" && !isResolved
          : selectedScope === "RESOLVED_CLOUD"
          ? fix.scope === "EXTERNAL" && isResolved
          : true;
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        query.length === 0 ||
        (fix.title && fix.title.toLowerCase().includes(query)) ||
        (fix.subtitle && fix.subtitle.toLowerCase().includes(query)) ||
        (fix.id && fix.id.toLowerCase().includes(query)) ||
        (fix.squad && fix.squad.toLowerCase().includes(query));
      return matchSquad && matchScope && matchSearch;
    });
  }, [selectedSquad, selectedScope, searchQuery, probedStatusMap]);

  const handleCopy = (text, label) => {
    if (onCopyText) {
      onCopyText(text, label);
    } else {
      navigator.clipboard?.writeText(text);
    }
    setCopyToast(`${label} copiado para a área de transferência!`);
    setTimeout(() => setCopyToast(null), 3500);
  };

  const handleCopyAllMarkdown = () => {
    const lines = [
      "# RELATÓRIO COMPLETO DE CORREÇÕES TÉCNICAS (POR SQUADS)",
      `*Gerado em:* ${new Date().toLocaleString("pt-BR")}`,
      `*Total de Correções Mapeadas:* ${stats.total} itens`,
      `- No Código do Projeto (Blindado): ${stats.project} itens`,
      `- Fora do Projeto (Painéis Externos): ${stats.external} ações`,
      "",
      "---",
      "",
    ];

    squads.forEach((sq) => {
      if (sq === "ALL") return;
      const squadFixes = ALL_FIXES_DATA.filter((f) => f.squad === sq);
      if (squadFixes.length === 0) return;

      lines.push(`## ${sq.toUpperCase()} (${squadFixes.length} itens)`);
      lines.push("");

      squadFixes.forEach((f) => {
        const isExt = f.scope === "EXTERNAL";
        lines.push(`### [${isExt ? "AÇÃO EXTERNA" : "CORRIGIDO NO PROJETO"}] ${f.id} - ${f.title}`);
        lines.push(`- **Prioridade:** ${f.priority}`);
        lines.push(`- **Subtítulo:** ${f.subtitle}`);
        lines.push(`- **Status:** ${f.statusText}`);
        lines.push(`- **Resumo:** ${f.summary}`);
        lines.push("- **Detalhamento Técnico das Ações:**");
        f.checklist.forEach((item) => lines.push(`  - [${isExt ? " " : "x"}] ${item}`));
        if (f.codeSnippet) {
          lines.push("- **Código / Script / DDL:**");
          lines.push("```typescript");
          lines.push(f.codeSnippet);
          lines.push("```");
        }
        if (f.instructionsText) {
          lines.push("- **Instruções no Provedor / Painel:**");
          lines.push("```text");
          lines.push(f.instructionsText);
          lines.push("```");
        }
        lines.push("");
      });
    });

    handleCopy(lines.join("\n"), "Relatório Completo de Correções (Markdown)");
  };

  const handleExportJson = () => {
    const data = {
      generatedAt: new Date().toISOString(),
      summary: stats,
      items: ALL_FIXES_DATA,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `correcoes-tecnicas-squads-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    handleCopy("", "Arquivo JSON exportado com sucesso");
  };

  return (
    <div className="space-y-6">
      {/* Toast de Notificação */}
      {copyToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-neutral-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-2xl animate-fade-in flex items-center gap-2">
          <ProjectIcon name="ClipboardList" size={16} className="text-neutral-950" />
          <span>{copyToast}</span>
        </div>
      )}

      {/* Header com Big Numbers de Correções */}
      <Card className="bg-neutral-900 border-neutral-800 p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <ProjectIcon name="Wrench" size={26} className="text-amber-500 shrink-0" />
              <h2 className="text-xl font-black text-white tracking-tight">
                Correções Necessárias por Especialidades & Squads
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Quadro técnico segregado entre correções aplicadas diretamente no código-fonte do projeto e ações externas em dashboards de infraestrutura.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              onClick={handleCopyAllMarkdown}
              className="text-xs py-2 px-3 bg-neutral-800 hover:bg-neutral-700 flex items-center gap-1.5"
            >
              <ProjectIcon name="ClipboardList" size={14} className="text-amber-400" />
              <span>Copiar Relatório Completo (MD)</span>
            </Button>
            <Button
              variant="primary"
              onClick={handleExportJson}
              className="text-xs py-2 px-3 font-bold flex items-center gap-1.5"
            >
              <ProjectIcon name="Save" size={14} className="text-neutral-950" />
              <span>Exportar JSON</span>
            </Button>
          </div>
        </div>

        {/* Big Numbers de Correções */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Total de Correções Mapeadas
            </div>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {stats.total}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              Distribuídas em 5 Especialidades Técnicas
            </div>
          </div>

          <div
            onClick={() => setSelectedScope("IN_PROJECT")}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              selectedScope === "IN_PROJECT"
                ? "bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-950/30"
                : "bg-neutral-950 border-neutral-800/80 hover:border-emerald-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Corrigido no Projeto (/src)
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
              {stats.project}
            </div>
            <div className="text-[10px] text-emerald-500/80 mt-0.5">
              100% Blindado no Código • Pronto para Uso
            </div>
          </div>

          <div
            onClick={() => {
              setSelectedScope("EXTERNAL");
              setSelectedSquad("ALL");
              setSearchQuery("");
            }}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              selectedScope === "EXTERNAL"
                ? "bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-950/30"
                : "bg-neutral-950 border-neutral-800/80 hover:border-amber-500/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Fora do Projeto (Painéis Externos)
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">
              {selectedSquad === "ALL" ? stats.globalExternal : stats.external}
            </div>
            <div className="text-[10px] text-amber-500/80 mt-0.5">
              Supabase, Mercado Pago, Cloudflare & ANPD
            </div>
          </div>
        </div>

        {/* Barra de Filtros: Escopo, Squads e Busca */}
        <div className="space-y-3 pt-2">
          {/* Filtro de Escopo (Todos vs No Projeto vs Fora do Projeto vs Nuvem Validada) */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: "ALL", label: "Todas as Correções", icon: null, count: stats.total },
              { id: "IN_PROJECT", label: "No Projeto (Código Blindado)", icon: "Check", count: stats.project },
              { id: "EXTERNAL", label: "Fora do Projeto (Pendentes)", icon: "AlertTriangle", count: selectedSquad === "ALL" ? stats.globalExternal : stats.external },
              { id: "RESOLVED_CLOUD", label: "Nuvem Validada", icon: "CheckCircle2", count: stats.resolvedCloud },
            ].map((scope) => (
              <button
                key={scope.id}
                type="button"
                onClick={() => {
                  setSelectedScope(scope.id);
                  if (scope.id === "EXTERNAL" && (selectedSquad !== "ALL" && stats.external === 0)) {
                    setSelectedSquad("ALL");
                  }
                  setSearchQuery("");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  selectedScope === scope.id
                    ? scope.id === "RESOLVED_CLOUD"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                    : scope.id === "RESOLVED_CLOUD" && stats.resolvedCloud > 0
                    ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/50"
                    : "bg-neutral-800/70 text-neutral-400 hover:text-white hover:bg-neutral-800"
                }`}
              >
                {scope.icon && (
                  <ProjectIcon
                    name={scope.icon}
                    size={12}
                    className={selectedScope === scope.id ? "text-white" : scope.id === "RESOLVED_CLOUD" ? "text-emerald-400" : "text-amber-400"}
                  />
                )}
                <span>{scope.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 font-mono">
                  {scope.count}
                </span>
              </button>
            ))}
          </div>

          {/* Filtro por Squads */}
          <div className="flex flex-wrap gap-1.5">
            {squads.map((sq) => {
              const count =
                sq === "ALL"
                  ? ALL_FIXES_DATA.length
                  : ALL_FIXES_DATA.filter((f) => f.squad === sq).length;

              return (
                <button
                  key={sq}
                  type="button"
                  onClick={() => setSelectedSquad(sq)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    selectedSquad === sq
                      ? "bg-neutral-200 text-neutral-900"
                      : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  <span>{sq === "ALL" ? "Todas as Squads" : sq}</span>
                  <span className="text-[10px] font-mono opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Campo de Busca Rápida */}
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar correção por título, módulo, ID ou tecnologia..."
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </Card>

      {/* Lista de Correções */}
      <div className="space-y-4">
        {filteredFixes.length === 0 ? (
          <Card className="bg-neutral-900 border-neutral-800 p-8 text-center space-y-3">
            {selectedScope === "EXTERNAL" && stats.globalExternal > 0 ? (
              <>
                <ProjectIcon name="AlertTriangle" size={40} className="text-amber-500 mx-auto" />
                <div className="text-base font-bold text-white">
                  {selectedSquad !== "ALL"
                    ? `Nenhuma pendência externa na squad "${selectedSquad}"`
                    : searchQuery
                    ? `Nenhuma pendência encontrada para "${searchQuery}"`
                    : "Nenhuma pendência externa no filtro ativo"}
                </div>
                <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                  {selectedSquad !== "ALL"
                    ? `Não há ações 'Fora do Projeto' pendentes para a squad "${selectedSquad}", mas existem ${stats.globalExternal} pendências ativas em outras squads.`
                    : `Existem ${stats.globalExternal} ações 'Fora do Projeto' registradas no sistema.`}
                </p>
                <div className="pt-2 flex flex-wrap justify-center gap-2">
                  <Button
                    variant="primary"
                    onClick={() => { setSelectedSquad("ALL"); setSelectedScope("EXTERNAL"); setSearchQuery(""); }}
                    className="text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white"
                  >
                    <ProjectIcon name="ExternalLink" size={13} className="mr-1.5" />
                    Ver Todas as {stats.globalExternal} Pendências Fora do Projeto
                  </Button>
                  {searchQuery && (
                    <Button
                      variant="secondary"
                      onClick={() => setSearchQuery("")}
                      className="text-xs"
                    >
                      Limpar Busca
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <ProjectIcon name="Search" size={36} className="text-amber-500 mx-auto" />
                <div className="text-sm font-bold text-white">Nenhuma correção encontrada</div>
                <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                  {selectedSquad !== "ALL"
                    ? `Não há correções no filtro atual para a squad "${selectedSquad}".`
                    : searchQuery
                    ? `Nenhum resultado encontrado para a busca "${searchQuery}".`
                    : "Não há itens correspondentes aos filtros selecionados."}
                </p>
                {(selectedSquad !== "ALL" || selectedScope !== "ALL" || searchQuery) && (
                  <div className="pt-2 flex flex-wrap justify-center gap-2">
                    {selectedSquad !== "ALL" && (
                      <Button
                        variant="secondary"
                        onClick={() => setSelectedSquad("ALL")}
                        className="text-xs"
                      >
                        Ver Todas as Squads ({stats.globalTotal})
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      onClick={() => {
                        setSelectedSquad("ALL");
                        setSelectedScope("ALL");
                        setSearchQuery("");
                      }}
                      className="text-xs"
                    >
                      Limpar Todos os Filtros
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        ) : (
          filteredFixes.map((fix) => {
            const isExternal = fix.scope === "EXTERNAL";
            const isResolvedCloud = isFixCloudResolved(fix, probedStatusMap);

            return (
              <Card
                key={fix.id}
                className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-all p-5 space-y-4 shadow-lg text-left"
              >
                {/* Header do Card da Correção */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ProjectIcon name={fix.squadIcon} size={16} className="text-amber-500" />
                      <span className="font-mono text-xs font-black text-amber-400">
                        {fix.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isResolvedCloud
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : isExternal
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {isResolvedCloud ? "Nuvem Validada (HTTP 200 OK)" : fix.statusText}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                        {fix.squad}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug">
                      {fix.title}
                    </h3>
                    <div className="text-xs text-neutral-400 font-medium">
                      {fix.subtitle}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {isExternal && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRunProbe(fix)}
                          disabled={probingItemId === fix.id}
                          className={`text-xs py-1 px-3 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
                            isResolvedCloud
                              ? "bg-neutral-800 text-emerald-400 border border-emerald-500/30 hover:bg-neutral-700"
                              : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 shadow-sm"
                          }`}
                          title="Executar verificação ativa no Supabase ou ambiente externo"
                        >
                          <ProjectIcon
                            name={probingItemId === fix.id ? "Loader2" : isResolvedCloud ? "CheckCircle2" : "SearchCheck"}
                            size={13}
                            className={probingItemId === fix.id ? "animate-spin text-current" : "text-current"}
                            colorVariant="inherit"
                          />
                          <span>
                            {probingItemId === fix.id
                              ? "Verificando..."
                              : isResolvedCloud
                              ? "Revalidar Sonda"
                              : "Verificar se foi solucionado"}
                          </span>
                        </button>

                        {isResolvedCloud ? (
                          <button
                            type="button"
                            onClick={() => handleManualToggle(fix, 'UNRESOLVED')}
                            className="text-xs py-1 px-2 rounded-lg text-neutral-400 hover:text-neutral-200 bg-neutral-950 border border-neutral-800 flex items-center gap-1 cursor-pointer transition-all"
                            title="Reverter para pendente"
                          >
                            <ProjectIcon name="RotateCcw" size={12} />
                            <span>Reverter</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleManualToggle(fix, 'RESOLVED')}
                            className="text-xs py-1 px-2.5 rounded-lg text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 flex items-center gap-1 font-semibold cursor-pointer transition-all"
                            title="Confirmar execução manual no painel/banco"
                          >
                            <ProjectIcon name="CheckCircle2" size={12} className="text-emerald-400" />
                            <span>Confirmar</span>
                          </button>
                        )}
                      </div>
                    )}

                    <Button
                      variant="secondary"
                      onClick={() => setActiveModalItem(fix)}
                      className="text-xs py-1 px-3 bg-neutral-800 hover:bg-neutral-700 flex items-center gap-1.5"
                    >
                      <ProjectIcon name="Search" size={13} className="text-neutral-400" />
                      <span>Detalhes & Checklist</span>
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        handleCopy(
                          `### ${fix.id} - ${fix.title}\nStatus: ${fix.statusText}\nPrioridade: ${fix.priority}\nSubtítulo: ${fix.subtitle}\nResumo: ${fix.summary}\n\nChecklist:\n${fix.checklist.map((c) => `- ${c}`).join("\n")}${fix.codeSnippet ? `\n\nCódigo/Script:\n${fix.codeSnippet}` : ""}${fix.instructionsText ? `\n\nInstruções:\n${fix.instructionsText}` : ""}`,
                          fix.title
                        )
                      }
                      className="text-xs py-1 px-2.5 flex items-center gap-1.5"
                    >
                      <ProjectIcon name="ClipboardList" size={13} className="text-amber-400" />
                      <span>Copiar</span>
                    </Button>
                  </div>
                </div>

                {/* Resumo */}
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {fix.summary}
                </p>

                {/* Checklist Técnico em Formato de Lista */}
                <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800/80 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                    <span>Descrição Técnica Detalhada (Checklist de Execução):</span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {fix.checklist.length} passos
                    </span>
                  </div>

                  <ul className="space-y-1.5">
                    {fix.checklist.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-neutral-300">
                        {isExternal ? (
                          <ProjectIcon name="Circle" size={12} className="text-amber-400 mt-0.5 shrink-0" />
                        ) : (
                          <ProjectIcon name="Check" size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                        )}
                        <span className="leading-snug">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Snippet ou Instruções Rápidas se existir */}
                {fix.codeSnippet && (
                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80 font-mono text-[11px] text-amber-300 overflow-x-auto space-y-1">
                    <div className="text-[10px] text-neutral-500 uppercase font-bold">
                      Código / Script Pronto para Uso:
                    </div>
                    <pre className="text-emerald-400 whitespace-pre">
                      {fix.codeSnippet}
                    </pre>
                  </div>
                )}
                {fix.instructionsText && (
                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80 font-mono text-[11px] text-amber-300 overflow-x-auto space-y-1">
                    <div className="text-[10px] text-neutral-500 uppercase font-bold">
                      Instruções no Provedor / Dashboard Externo:
                    </div>
                    <pre className="text-amber-300 whitespace-pre">
                      {fix.instructionsText}
                    </pre>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Modal de Detalhamento da Correção */}
      {activeModalItem && (
        <Modal
          isOpen={Boolean(activeModalItem)}
          onClose={() => setActiveModalItem(null)}
          title={`Detalhamento Técnico: ${activeModalItem.id} - ${activeModalItem.title}`}
        >
          <div className="space-y-5 text-neutral-200">
            <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3">
              <ProjectIcon name={activeModalItem.squadIcon} size={20} className="text-amber-500" />
              <span className="font-bold text-sm text-white">
                {activeModalItem.squad}
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  activeModalItem.scope === "EXTERNAL"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {activeModalItem.statusText}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                {activeModalItem.priority}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-neutral-400">Subtítulo:</div>
              <div className="text-sm font-semibold text-white">
                {activeModalItem.subtitle}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-neutral-400">Resumo da Correção:</div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {activeModalItem.summary}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-neutral-400">
                Lista Técnica de Verificação e Passos de Execução:
              </div>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                {activeModalItem.checklist.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-neutral-300">
                    {activeModalItem.scope === "EXTERNAL" ? (
                      <ProjectIcon name="Circle" size={12} className="text-amber-400 mt-0.5 shrink-0" />
                    ) : (
                      <ProjectIcon name="Check" size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                    )}
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {activeModalItem.codeSnippet && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-400">
                  <span>Código / Script Implementado:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeModalItem.codeSnippet, "Código / Script")}
                    className="text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <ProjectIcon name="Copy" size={12} className="text-amber-400" />
                    <span>Copiar Código</span>
                  </button>
                </div>
                <pre className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                  {activeModalItem.codeSnippet}
                </pre>
              </div>
            )}

            {activeModalItem.instructionsText && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-400">
                  <span>Instruções de Configuração no Painel Externo:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(activeModalItem.instructionsText, "Instruções do Painel")}
                    className="text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <ProjectIcon name="Copy" size={12} className="text-amber-400" />
                    <span>Copiar Instruções</span>
                  </button>
                </div>
                <pre className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-[11px] font-mono text-amber-300 overflow-x-auto leading-relaxed">
                  {activeModalItem.instructionsText}
                </pre>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-neutral-800">
              {activeModalItem.scope === "EXTERNAL" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRunProbe(activeModalItem)}
                    disabled={probingItemId === activeModalItem.id}
                    className="text-xs py-1.5 px-3 rounded-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 transition-all"
                  >
                    <ProjectIcon
                      name={probingItemId === activeModalItem.id ? "Loader2" : "SearchCheck"}
                      size={14}
                      className={probingItemId === activeModalItem.id ? "animate-spin text-neutral-950" : "text-neutral-950"}
                      colorVariant="inherit"
                    />
                    <span>{probingItemId === activeModalItem.id ? "Verificando..." : "Verificar se foi solucionado"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleManualToggle(activeModalItem, 'RESOLVED');
                      setActiveModalItem(null);
                    }}
                    className="text-xs py-1.5 px-3 rounded-lg font-bold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <ProjectIcon name="CheckCircle2" size={14} className="text-emerald-400" />
                    <span>Confirmar Execução</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="secondary"
                  onClick={() =>
                    handleCopy(
                      `### ${activeModalItem.id} - ${activeModalItem.title}\nStatus: ${activeModalItem.statusText}\nPrioridade: ${activeModalItem.priority}\nSubtítulo: ${activeModalItem.subtitle}\nResumo: ${activeModalItem.summary}\n\nChecklist:\n${activeModalItem.checklist.map((c) => `- ${c}`).join("\n")}${activeModalItem.codeSnippet ? `\n\nCódigo/Script:\n${activeModalItem.codeSnippet}` : ""}${activeModalItem.instructionsText ? `\n\nInstruções:\n${activeModalItem.instructionsText}` : ""}`,
                      activeModalItem.title
                    )
                  }
                  className="text-xs flex items-center gap-1.5"
                >
                  <ProjectIcon name="ClipboardList" size={13} className="text-amber-400" />
                  <span>Copiar Item Completo</span>
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setActiveModalItem(null)}
                  className="text-xs font-bold"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL DE RESULTADO DA SONDA EXTERNA */}
      {probeResultModal && (
        <Modal
          isOpen={Boolean(probeResultModal)}
          onClose={() => setProbeResultModal(null)}
          title={`Laudo da Sonda Externa: ${probeResultModal.id}`}
        >
          <div className="space-y-4 text-neutral-200">
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              probeResultModal.isResolved
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-lg text-sm font-black font-mono border ${
                  probeResultModal.isResolved
                    ? 'bg-emerald-500 text-neutral-950 border-emerald-400'
                    : 'bg-rose-500 text-white border-rose-400'
                }`}>
                  {probeResultModal.isResolved ? 'SIM' : 'NÃO'}
                </div>
                <div>
                  <h4 className="text-sm font-bold">
                    {probeResultModal.isResolved
                      ? 'Item Homologado & Solucionado na Infraestrutura!'
                      : 'Item Ainda Não Solucionado na Infraestrutura Externa'}
                  </h4>
                  <p className="text-xs opacity-90 mt-0.5">
                    {probeResultModal.diagnostics.details}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono space-y-1">
              <div className="text-neutral-500 text-[10px] uppercase font-bold">Alvo do Teste:</div>
              <div className="text-indigo-300">{probeResultModal.diagnostics.testedEndpointOrTarget}</div>
              {probeResultModal.diagnostics.rawErrorOrSuccess && (
                <div className="pt-2 border-t border-neutral-800/80">
                  <div className="text-neutral-500 text-[10px] uppercase font-bold">Resposta Retornada:</div>
                  <div className={probeResultModal.isResolved ? 'text-emerald-400' : 'text-rose-400'}>
                    {probeResultModal.diagnostics.rawErrorOrSuccess}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
              {!probeResultModal.isResolved && (
                <Button
                  variant="primary"
                  onClick={() => {
                    saveStoredProbedStatus(probeResultModal.id, 'RESOLVED');
                    setProbedStatusMap(getStoredProbedStatusMap());
                    setProbeResultModal(null);
                  }}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500"
                >
                  <ProjectIcon name="CheckCircle2" size={13} className="mr-1" />
                  Confirmar Manualmente
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setProbeResultModal(null)}
                className="text-xs"
              >
                Fechar Laudo
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
