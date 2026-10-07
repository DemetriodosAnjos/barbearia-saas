// Análise Crítica do QA Engineer para os 18 Itens do Checklist

export const CHECKLIST_ANALYSIS = [
  {
    id: 1,
    title: "Testes de Integração de API (Supabase)",
    category: "Automação / Backend",
    priority: "CRÍTICA",
    priorityColor: "emerald",
    necessity: "Imprescindível",
    status: "IMPLEMENTADO",
    whyNecessary:
      "A barbearia depende de queries assíncronas em tempo real. Se o contrato entre Supabase e Front falhar, o cliente não consegue agendar e o barbeiro não vê a fila.",
    strategy:
      "Testes com mocks rápidos de API e validação de schema tolerante (snake_case/camelCase).",
  },
  {
    id: 2,
    title: "Automação E2E (Playwright/Cypress)",
    category: "Automação / E2E",
    priority: "MÉDIA",
    priorityColor: "amber",
    necessity: "Importante (Fase 2)",
    status: "PLANEJADO",
    whyNecessary:
      "E2E é pesado para rodar no browser/preview. O fluxo crítico pode ser testado por simuladores de jornada interativa no painel de QA sem onerar a CPU.",
    strategy:
      "Automatizar apenas os 2 fluxos de receita: Agendamento pelo Cliente e Fechamento de Comanda/Caixa.",
  },
  {
    id: 3,
    title: "Testes Unitários de Componentes",
    category: "Front-End / UI",
    priority: "CRÍTICA",
    priorityColor: "emerald",
    necessity: "Imprescindível",
    status: "IMPLEMENTADO",
    whyNecessary:
      "Garante que botões, modais, inputs e cards não quebrem com dados inesperados (null, strings longas, estados de loading).",
    strategy:
      "Vitest + React Testing Library (já integrado com 30 asserções passando).",
  },
  {
    id: 4,
    title: "Validação de Design System & Contratos de Dados",
    category: "Front-End / Design System",
    priority: "ALTA",
    priorityColor: "emerald",
    necessity: "Muito Necessário",
    status: "IMPLEMENTADO",
    whyNecessary:
      "Evita discrepância entre as 4 paletas de cores, garante coerência de tokens CSS (--brand-50 a 950) e formatação de máscaras.",
    strategy:
      "Sandbox interativo de componentes no próprio QA Studio + testes de máscaras.",
  },
  {
    id: 5,
    title: "Regras de Acesso no Banco (RLS) & Triggers",
    category: "Segurança / Backend",
    priority: "CRÍTICA",
    priorityColor: "emerald",
    necessity: "Imprescindível (Blindagem Multi-Tenant)",
    status: "IMPLEMENTADO (SIMULADO)",
    whyNecessary:
      "SaaS Multi-tenant sem RLS expõe dados de uma barbearia para outra. O risco jurídico e financeiro (LGPD) é inaceitável.",
    strategy:
      "Políticas RLS `tenant_id = auth.jwt()->>'barbershop_id'` e testes simulando tokens forjados.",
  },
  {
    id: 6,
    title: "Avaliação Heurística & Auditoria A11y",
    category: "UX/UI & Acessibilidade",
    priority: "MÉDIA",
    priorityColor: "amber",
    necessity: "Relevante",
    status: "IMPLEMENTADO",
    whyNecessary:
      "Barbeiros usam celulares sob luz forte ou com as mãos ocupadas. Contraste e touch targets confortáveis (>44px) são requisitos ergonômicos.",
    strategy:
      "Algoritmo de contraste WCAG YIQ dinâmico integrado no QA Studio.",
  },
  {
    id: 7,
    title: "Testes de Invasão, RBAC & Negação por Padrão (Default Deny)",
    category: "Segurança / Pentest & AppSec",
    priority: "CRÍTICA",
    priorityColor: "emerald",
    necessity: "Imprescindível (Prompt 01 AppSec)",
    status: "IMPLEMENTADO & AUDITADO",
    whyNecessary:
      "Garante a estratégia Default Deny: qualquer rota não explicitamente pública exige JWT válido (HTTP 401) e perfis 'client' e 'employee' são bloqueados de rotas 'admin' (HTTP 403).",
    strategy:
      "Matriz de autorização formal, middleware RBAC com HTTP 401/403 e suite de 18 testes automatizados no Vitest.",
  },
  {
    id: 8,
    title: "Segurança da Informação: Políticas de RLS Supabase",
    category: "Segurança / Database",
    priority: "CRÍTICA",
    priorityColor: "emerald",
    necessity: "Imprescindível",
    status: "IMPLEMENTADO",
    whyNecessary:
      "O cliente do Supabase conecta direto com chave anônima. A ÚNICA barreira entre o front e o banco são as regras de RLS.",
    strategy:
      "Checklists e testes de acesso direto à tabela `appointments` e `finance`.",
  },
  {
    id: 9,
    title: "Script SQL / Multi-tenant Segregation Probe",
    category: "Segurança / Multi-Tenant",
    priority: "CRÍTICA",
    priorityColor: "emerald",
    necessity: "Imprescindível",
    status: "IMPLEMENTADO NO QA",
    whyNecessary:
      "Provar matematicamente que mesmo enviando requisições manuais para a API REST do Supabase, o tenant A recebe 0 linhas do tenant B.",
    strategy:
      "Simulador de bypass de Tenant ID no QA Studio com alerta sonoro/visual.",
  },
  {
    id: 10,
    title: "Exposição de Credenciais no Client (service_role)",
    category: "Segurança / AppSec",
    priority: "CRÍTICA MÁXIMA",
    priorityColor: "emerald",
    necessity: "Imprescindível (Vulnerabilidade #1 de Supabase)",
    status: "IMPLEMENTADO & AUDITADO",
    whyNecessary:
      "Se `service_role` vazar no client, qualquer usuário ganha controle total do PostgreSQL com bypass total de RLS.",
    strategy:
      "Scanner automático de bundle no QA Studio com verificação de JWT role='anon'.",
  },
  {
    id: 11,
    title: "Autenticação e Escalada de Privilégios (RBAC)",
    category: "Segurança / Auth",
    priority: "ALTA",
    priorityColor: "emerald",
    necessity: "Muito Necessário",
    status: "IMPLEMENTADO NO QA",
    whyNecessary:
      "Evita que parâmetros adulterados em requisições promovam um usuário comum para SuperAdmin.",
    strategy:
      "Mapeamento de rotas e verificação de JWT claims no frontend e gateway.",
  },
  {
    id: 12,
    title: "Sanitização de Input e Injeção (XSS / SQLi)",
    category: "Segurança / Pentest",
    priority: "ALTA",
    priorityColor: "emerald",
    necessity: "Muito Necessário",
    status: "IMPLEMENTADO NO QA",
    whyNecessary:
      "Nomes de clientes e observações de agendamento são exibidos na tela da recepção. Um script injetado roubaria sessões de administradores.",
    strategy:
      "Fuzzer de injeção XSS integrado no QA Studio testando strings perigosas.",
  },
  {
    id: 13,
    title: "Rate Limiting & Abuse Prevention",
    category: "Segurança / Infra",
    priority: "MÉDIA",
    priorityColor: "amber",
    necessity: "Necessário em Produção",
    status: "SIMULADO",
    whyNecessary:
      "Evita bots esgotando créditos de disparo de WhatsApp ou sobrecarregando agendamentos falsos.",
    strategy:
      "Configuração no gateway do Supabase / Cloudflare e throttling no cliente.",
  },
  {
    id: 14,
    title: "Resiliência da UI (Handling de Latência e Erro)",
    category: "UX / Resiliência",
    priority: "CRÍTICA",
    priorityColor: "emerald",
    necessity: "Imprescindível",
    status: "IMPLEMENTADO & SIMULADOR ATIVO",
    whyNecessary:
      "Em barbearias, redes Wi-Fi e 4G oscilam com frequência. O app não pode travar ou perder o formulário preenchido.",
    strategy:
      "Simulador de Caos com injeção de latência (0 a 5000ms), offline forçado e erro 500.",
  },
  {
    id: 15,
    title: "Regressão Visual (Design System) & A11y",
    category: "Front-End / QA",
    priority: "MÉDIA",
    priorityColor: "amber",
    necessity: "Importante",
    status: "IMPLEMENTADO",
    whyNecessary:
      "Garante que melhorias de layout na tela de agendamento não causem quebras colaterais no painel financeiro ou SuperAdmin.",
    strategy:
      "Component Sandbox no QA Studio com inspeção de estados extremos.",
  },
  {
    id: 16,
    title: "Core Web Vitals & Performance",
    category: "Performance",
    priority: "MÉDIA",
    priorityColor: "amber",
    necessity: "Relevante",
    status: "MONITORADO",
    whyNecessary:
      "Carregamento lento faz o cliente desistir de agendar o corte. LCP abaixo de 2.5s é meta de conversão.",
    strategy:
      "Profiling de tempo de resposta e peso do bundle do Vite.",
  },
  {
    id: 17,
    title: "Comportamento Real-Time (Supabase Subscriptions)",
    category: "Arquitetura / Real-Time",
    priority: "ALTA",
    priorityColor: "emerald",
    necessity: "Muito Necessário",
    status: "SIMULADOR ATIVO",
    whyNecessary:
      "Quando o cliente agenda pelo celular, a fila da recepção e a comanda do barbeiro devem atualizar sem dar F5.",
    strategy:
      "Verificação de estado dos canais WebSocket e reconexão automática.",
  },
  {
    id: 18,
    title: "Testes de Carga em Picos de Acesso (PgBouncer)",
    category: "Infraestrutura / Carga",
    priority: "BAIXA (Fase Atual)",
    priorityColor: "neutral",
    necessity: "Opcional no Protótipo / Crucial no Lançamento",
    status: "PLANEJADO",
    whyNecessary:
      "Crítico na véspera de Natal e sextas-feiras às 18h, mas desnecessário durante a prototipação e validação inicial.",
    strategy:
      "Testes de stress com k6 ou Artillery antes do go-live comercial.",
  },
  {
    id: 19,
    title: "Estrutura de Soft-Delete no Banco de Dados (Task 1.1 & 1.2)",
    category: "Data Engineering / LGPD",
    priority: "CRÍTICA",
    priorityColor: "emerald",
    necessity: "Imprescindível (LGPD)",
    status: "IMPLEMENTADO & VALIDADO",
    whyNecessary:
      "Garante a retenção temporária e direito de recuperação de dados, abstração de filtros com a VIEW active_customers, índices parciais de performance e revogação imediata de sessões via procedure soft_delete_customer.",
    strategy:
      "DDL com coluna deleted_at TIMESTAMPTZ, índices parciais WHERE deleted_at IS NULL/NOT NULL, VIEW active_customers e stored procedure PL/pgSQL com revogação de acessos e sessões ativas.",
  },
  {
    id: 20,
    title: "Anonimização e Mascaramento Fiscal (Task 2.1 - pgcrypto sha256)",
    category: "Data Privacy / LGPD & CTN",
    priority: "CRÍTICA",
    priorityColor: "emerald",
    necessity: "Imprescindível (LGPD & CTN)",
    status: "IMPLEMENTADO & VALIDADO",
    whyNecessary:
      "Cumpre o Art. 16, I da LGPD c/c Art. 173 do CTN (guarda compulsória de dados fiscais por 5 anos). Anonimiza irreversivelmente PII (nome, email, CPF) com hashes sha256 e zera dados secundários (telefone, endereço) mantendo o registro para integridade de notas e pedidos.",
    strategy:
      "Função PL/pgSQL anonymize_customer_data(UUID) com pgcrypto digest(..., 'sha256'), zeramento de telefone e endereço para NULL, e preservação estrita de chaves primárias e transações fiscais.",
  },
  {
    id: 21,
    title: "Motor de Hard-Delete e Agendamento Automatizado (Task 3.1 & 3.2)",
    category: "SecOps / Backend & LGPD",
    priority: "CRÍTICA",
    priorityColor: "emerald",
    necessity: "Imprescindível (LGPD & CTN)",
    status: "IMPLEMENTADO & VALIDADO",
    whyNecessary:
      "Expurgo definitivo de clientes que excederam a janela de retenção (30 dias), anonimização fiscal compulsória (CTN Art. 173) e exclusão física das foreign keys sem obrigatoriedade legal via Edge Function cron disparada com segredo seguro.",
    strategy:
      "Procedure PL/pgSQL purge_expired_customers(retention_days INT) com expurgo definitivo em lotes e Edge Function em TypeScript disparada com verificação de secret via pg_cron.",
  },
  {
    id: 22,
    title: "Tratamento Global de Exceções, requestId e Omissão de Stacks (Prompt 10 - CWE-209 / OWASP A05:2021)",
    category: "Back-End / Cyber Security",
    priority: "CRÍTICA",
    priorityColor: "emerald",
    necessity: "Imprescindível (CWE-209 / OWASP A05)",
    status: "IMPLEMENTADO & VALIDADO",
    whyNecessary:
      "Impede que respostas HTTP 500 vazem stack traces, nomes de tabelas PostgreSQL, variáveis de ambiente ou credenciais sigilosas para clientes externos. Garante rastreabilidade através de requestId UUID v4 e redação de campos como password, credit_card e token.",
    strategy:
      "Middleware global centralizado errorHandlerMiddleware para Express e wrapEdgeFunctionHandler para Deno/Edge Functions, integrados ao configurador secureLogger com redação recursiva de segredos.",
  },
];
