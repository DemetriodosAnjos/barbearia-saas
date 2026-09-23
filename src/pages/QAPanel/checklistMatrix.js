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
    title: "Testes de Invasão & RBAC (Role-Based Access Control)",
    category: "Segurança / Pentest",
    priority: "ALTA",
    priorityColor: "emerald",
    necessity: "Essencial",
    status: "IMPLEMENTADO",
    whyNecessary:
      "Impede que um barbeiro acesse dados de faturamento global do estabelecimento ou que um cliente altere preços de serviços.",
    strategy:
      "Validador de limites de privilégio cliente vs barbeiro vs admin no painel.",
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
];
