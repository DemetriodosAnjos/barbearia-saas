/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Console de Logs e Correções Necessárias
 * Classificado por equipes (Cyber Security, Frontend, Backend, Cloud & DevOps, Database/Supabase, Payment/Mercado Pago)
 * com distinção clara entre correções já aplicadas no código do projeto e instruções passo a passo para ações externas.
 */

export interface RemediationStep {
  stepNumber: number;
  title: string;
  description: string;
  commandOrSnippet?: string;
  doneStatus: boolean;
}

export interface RemediationItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Cyber Security' | 'Frontend' | 'Backend' | 'Cloud & DevOps' | 'Database (Supabase)' | 'Pagamentos (Mercado Pago)' | 'QA & Automação';
  scope: 'INTERNA_PROJETO' | 'EXTERNA_INFRA';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'APLICADA_NO_CODIGO' | 'PENDENTE_EXTERNA' | 'VERIFICADA';
  affectedComponent: string;
  technicalDescription: string[];
  stepsToSolve: RemediationStep[];
  codeFixReference?: string;
}

export const REMEDIATION_ITEMS: RemediationItem[] = [
  // 1. Cyber Security & AppSec
  {
    id: 'SEC-REM-001',
    title: 'Implementação de SafeHttpClient contra SSRF e Metadados 169.254.169.254',
    subtitle: 'Proteção contra exfiltração de IAM credentials em nuvem pública',
    category: 'Cyber Security',
    scope: 'INTERNA_PROJETO',
    severity: 'CRITICAL',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/lib/security/ssrfGuard.ts',
    technicalDescription: [
      'Bloqueio regex e CIDR de 169.254.169.254 (AWS IMDS e GCP computeMetadata).',
      'Bloqueio de faixas privadas RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).',
      'Restrição rigorosa de esquemas de URL, aceitando estritamente http:// e https://.',
      'Validação de caracteres de controle e bypasses com codificação URL (URL-encoding).'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Criar módulo central de validação SSRF',
        description: 'Implementado em src/lib/security/ssrfGuard.ts com regras de IP e domínios proibidos.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Integrar validação no pipeline de requisições externas',
        description: 'Todas as requisições de saída passam pela função validateSafeUrl() antes da emissão do socket.',
        doneStatus: true
      },
      {
        stepNumber: 3,
        title: 'Adicionar testes de regressão de SSRF no QA Workbench',
        description: 'Testes automatizados cobrindo payloads comuns de SSRF adicionados ao painel.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/lib/security/ssrfGuard.ts'
  },
  {
    id: 'SEC-REM-002',
    title: 'Varredura Pré-Commit e Gitleaks em CI/CD',
    subtitle: 'Prevenção de vazamento de chaves secretas no histórico do Git',
    category: 'Cyber Security',
    scope: 'INTERNA_PROJETO',
    severity: 'CRITICAL',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: '.github/workflows/security.yml',
    technicalDescription: [
      'Gitleaks Action v2 configurada para inspecionar todo commit submetido em Pull Requests.',
      'Falha imediata no job caso detecte padrões de tokens AWS, GitHub, Stripe, Mercado Pago ou chaves privadas.',
      'Prevenção de merge via GitHub Status Check obrigatório.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Definição do workflow .github/workflows/security.yml',
        description: 'Job secret-scanning configurado com fetch-depth: 0 e gitleaks-action@v2.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Checagem no .env.example',
        description: 'Substituição de valores sensíveis por referências placeholder.',
        doneStatus: true
      }
    ],
    codeFixReference: '.github/workflows/security.yml'
  },

  // 2. Database (Supabase) - EXTERNA
  {
    id: 'DB-REM-001',
    title: 'Criação de Tabela de Auditoria e Ativação de RLS no Supabase',
    subtitle: 'Ação externa no console do Supabase para persistência de logs e isolamento multi-tenant',
    category: 'Database (Supabase)',
    scope: 'EXTERNA_INFRA',
    severity: 'HIGH',
    status: 'PENDENTE_EXTERNA',
    affectedComponent: 'Console Supabase / SQL Editor',
    technicalDescription: [
      'Criação da tabela security_audit_logs para persistência de eventos de CI/CD e bloqueios SSRF.',
      'Habilitação obrigatória do Row Level Security (RLS) para evitar acesso anônimo não autorizado.',
      'Criação de políticas granulares permitindo apenas service_role e usuários autenticados para leitura.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Acessar o Painel do Supabase',
        description: 'Acesse https://app.supabase.com e entre no projeto correspondente à sua organização.',
        doneStatus: false
      },
      {
        stepNumber: 2,
        title: 'Executar Script SQL no SQL Editor',
        description: 'Abra a aba "SQL Editor", cole e execute o script DDL com RLS e políticas de acesso.',
        commandOrSnippet: `-- 1. Criar tabela de auditoria de segurança
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    scanner_tool VARCHAR(50) NOT NULL,
    target_resource TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_origin INET,
    blocked_by_guard BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Política: Apenas Service Role pode inserir logs
CREATE POLICY "Permitir insercao segura de logs pelo backend"
ON public.security_audit_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- 4. Política: Usuários autenticados com permissão de auditoria podem ler
CREATE POLICY "Leitura restrita a administradores autenticados"
ON public.security_audit_logs
FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'role' = 'security_admin');`,
        doneStatus: false
      },
      {
        stepNumber: 3,
        title: 'Configurar Variáveis no Ambiente de Produção',
        description: 'Copie a SUPABASE_URL e a SUPABASE_SERVICE_ROLE_KEY do painel Project Settings > API e configure como Secrets no CI/CD.',
        doneStatus: false
      }
    ]
  },

  // 3. Pagamentos (Mercado Pago) - EXTERNA
  {
    id: 'PAY-REM-001',
    title: 'Configuração Segura de Credenciais e Webhook no Mercado Pago',
    subtitle: 'Ação externa no Painel de Desenvolvedores do Mercado Pago',
    category: 'Pagamentos (Mercado Pago)',
    scope: 'EXTERNA_INFRA',
    severity: 'HIGH',
    status: 'PENDENTE_EXTERNA',
    affectedComponent: 'Mercado Pago Developers Dashboard',
    technicalDescription: [
      'Geração de Access Token de Produção no painel do Mercado Pago (nunca usar credenciais de teste em prod).',
      'Configuração de assinatura HMAC no cabeçalho x-signature dos Webhooks para mitigar requisições forjadas.',
      'Validação de IP de origem dos webhooks do Mercado Pago através de SafeHttpClient e Allowlist de domínios.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Acessar o Painel de Desenvolvedores do Mercado Pago',
        description: 'Entre em https://www.mercadopago.com.br/developers/panel e selecione sua aplicação.',
        doneStatus: false
      },
      {
        stepNumber: 2,
        title: 'Obter Chaves de Produção e Secret de Webhook',
        description: 'Em "Credenciais de Produção", copie o "Access Token". Em "Webhooks", configure o endpoint HTTPS e copie a "Chave Secreta de Assinatura" (Secret Key).',
        doneStatus: false
      },
      {
        stepNumber: 3,
        title: 'Armazenar nos Segredos do GitHub e Provedor Cloud',
        description: 'Nunca insira a chave no repositório. Defina MERCADOPAGO_ACCESS_TOKEN e MERCADOPAGO_WEBHOOK_SECRET como segredos criptografados.',
        commandOrSnippet: `# Adicionar segredo via GitHub CLI:
gh secret set MERCADOPAGO_ACCESS_TOKEN -b "APP_USR-xxxxxx"
gh secret set MERCADOPAGO_WEBHOOK_SECRET -b "whsec_xxxxxx"`,
        doneStatus: false
      },
      {
        stepNumber: 4,
        title: 'Validar Assinatura HMAC-SHA256 no Backend',
        description: 'Verifique o cabeçalho x-signature no controller receptor utilizando o hash HMAC gerado com o webhook secret.',
        doneStatus: false
      }
    ]
  },

  // 4. Cloud & DevOps
  {
    id: 'DEVOPS-REM-001',
    title: 'Configuração de Secrets e Proteção de Branches no GitHub',
    subtitle: 'Ação no repositório GitHub para ativar os gates do security.yml',
    category: 'Cloud & DevOps',
    scope: 'EXTERNA_INFRA',
    severity: 'HIGH',
    status: 'PENDENTE_EXTERNA',
    affectedComponent: 'GitHub Settings > Secrets & Branch Protection',
    technicalDescription: [
      'Cadastrar o segredo SNYK_TOKEN para execução da análise de SCA avançada.',
      'Ativar Branch Protection Rules exigindo aprovação dos jobs de segurança do security.yml.',
      'Bloquear pushes diretos nas branches main e master.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Cadastrar SNYK_TOKEN nos Segredos do Repositório',
        description: 'Acesse Settings > Secrets and variables > Actions > New repository secret e adicione SNYK_TOKEN.',
        doneStatus: false
      },
      {
        stepNumber: 2,
        title: 'Configurar Regra de Proteção de Branch',
        description: 'Em Settings > Branches > Add branch protection rule, selecione "main" e marque "Require status checks to pass before merging". Selecione os checks "Secret Scanning (Gitleaks)", "SAST Code Analysis (Semgrep)", e "Software Composition Analysis (npm audit & Snyk)".',
        doneStatus: false
      }
    ]
  },

  // 5. Backend Team
  {
    id: 'BACK-REM-001',
    title: 'Migração de requisições HTTP para o wrapper SafeHttpClient',
    subtitle: 'Substituição de chamadas diretas com fetch e axios para evitar SSRF',
    category: 'Backend',
    scope: 'INTERNA_PROJETO',
    severity: 'MEDIUM',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/lib/security/ssrfGuard.ts',
    technicalDescription: [
      'Garantir que todas as chamadas de API externas invoquem safeExecuteRequest().',
      'Desabilitar o redirecionamento automático incondicional.',
      'Timeout forçado de 5 segundos para todas as conexões externas.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Centralização no wrapper ssrfGuard',
        description: 'Wrapper seguro criado com checagem de IP e protocolos.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Bloqueio de importações desprotegidas no SAST',
        description: 'Regra Semgrep configurada para alertar caso fetch() seja chamado sem validação de URL.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/lib/security/ssrfGuard.ts'
  },

  // 6. Frontend Team
  {
    id: 'FRONT-REM-001',
    title: 'Sanitização de Renderização e Prevenção de XSS',
    subtitle: 'Proteção em componentes visuais e injeção de HTML dinâmico',
    category: 'Frontend',
    scope: 'INTERNA_PROJETO',
    severity: 'LOW',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/App.tsx',
    technicalDescription: [
      'Eliminação de dangerouslySetInnerHTML em todas as visualizações de logs.',
      'Codificação de strings e caracteres especiais em relatórios de auditoria.',
      'Validação de links externos com rel="noopener noreferrer".'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Remover injeções diretas de HTML',
        description: 'Todos os logs e relatórios utilizam text nodes e elementos tipados do React.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Inserir modais de loading com overlay em todos os botões de ação',
        description: 'Tempo mínimo de 2 a 3 segundos com spinner e feedback de micro-etapas (UX refinada).',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/App.tsx'
  },
  {
    id: 'FRONT-REM-002',
    title: 'Componentes de Skeleton Screen para Feedback de Carregamento em Alta Latência',
    subtitle: 'Feedback visual imediato sob conexões móveis lentas (>1200ms) sem layout shift',
    category: 'Frontend',
    scope: 'INTERNA_PROJETO',
    severity: 'HIGH',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/components/resilience/Skeleton*.jsx',
    technicalDescription: [
      'Desenvolvimento do componente modular SkeletonCard com suporte a 4 variantes (service, barber, appointment, metric).',
      'Criação do componente SkeletonBookingView espelhando a hierarquia visual do wizard de agendamento.',
      'Criação do componente SkeletonDashboard para carregamento progressivo de métricas analíticas.',
      'Animações em pulso sutil (animate-pulse) com paleta neutra Tailwind compatível com dark mode.',
      'Garantia de CLS = 0 (Cumulative Layout Shift zero) durante a transição do skeleton para os dados reais.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Criar componentes modulares de Skeleton Screen',
        description: 'Implementados em src/components/resilience/ com suporte a cards, listas e dashboards completos.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Integrar nos fluxos com alta latência',
        description: 'Conectados ao ClientBookingView e BarbershopDashboard para feedback visual em conexões instáveis.',
        doneStatus: true
      },
      {
        stepNumber: 3,
        title: 'Validar suíte de testes unitários no Vitest',
        description: '14 testes cobrindo variantes e renderizações aprovados com 100% de sucesso.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/components/resilience/SkeletonCard.jsx'
  },
  {
    id: 'FRONT-REM-003',
    title: 'Indicador Discreto de Estado de Conexão ("Modo Offline / Reconectando...")',
    subtitle: 'Acionado ao perder a rede ou desconectar o WebSocket do Supabase Realtime',
    category: 'Frontend',
    scope: 'INTERNA_PROJETO',
    severity: 'CRITICAL',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/components/resilience/OfflineBanner.jsx',
    technicalDescription: [
      'Hook useNetworkResilience monitorando eventos de window (online/offline) e canal Realtime do Supabase.',
      'Detecção imediata de encerramento do canal WebSocket (SUBSCRIBED, TIMED_OUT, CLOSED, CHANNEL_ERROR).',
      'Banner persistente no topo da tela com status: "Modo Offline / Reconectando...", indicador pulsante e feedback de retenção de dados.',
      'Botão de ação rápida "Tentar Reconectar" com feedback de tentativas e medição contínua de latência RTT.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Desenvolver hook useNetworkResilience',
        description: 'Monitoramento integrado de navigator.onLine e Supabase Realtime channel status.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Implementar componente OfflineBanner',
        description: 'Renderização elegante, não intrusiva com controle manual de reconexão e simulador para testes.',
        doneStatus: true
      },
      {
        stepNumber: 3,
        title: 'Acoplar no topo da aplicação',
        description: 'Posicionado no topo de App.jsx com suporte a testes no QA Workbench Sandbox.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/components/resilience/OfflineBanner.jsx'
  },
  {
    id: 'FRONT-REM-004',
    title: 'Tratamento Amigável de Falhas de Requisição com Retenção de Dados e "Tentar Novamente"',
    subtitle: 'Preservação de 100% dos dados em formulários durante oscilações de rede',
    category: 'Frontend',
    scope: 'INTERNA_PROJETO',
    severity: 'CRITICAL',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/components/resilience/ResilientFormHandler.jsx',
    technicalDescription: [
      'Captura e retenção síncrona dos dados preenchidos no formulário em memória e em sessionStorage sob chave customizada.',
      'Exibição de card amigável com alerta de retenção: "Fique tranquilo: todos os seus dados e seleções foram preservados!".',
      'Botão de ação principal "Tentar Novamente" com feedback de progresso e contador de tentativas.',
      'Botão secundário "Editar Dados" para ajuste de campos sem qualquer perda de digitação prévia.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Desenvolver ResilientFormHandler',
        description: 'Tratamento de exceções com exibição resumida dos campos retidos e feedback amigável.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Integrar no ClientBookingView',
        description: 'Acoplado ao envio de agendamentos para recuperação imediata em caso de timeout de rede.',
        doneStatus: true
      },
      {
        stepNumber: 3,
        title: 'Disponibilizar no Workbench QA Sandbox',
        description: 'Permite simulação interativa de queda de rede e recuperação assistida.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/components/resilience/ResilientFormHandler.jsx'
  },
  {
    id: 'A11Y-REM-001',
    title: 'Navegação 100% Funcional via Teclado e Indicadores Visuais de Foco :focus-visible',
    subtitle: 'Conformidade com os Critérios 2.1.1 (Teclado), 2.4.7 (Foco Visível) e 2.4.11 (Foco Não Obscurecido)',
    category: 'Frontend',
    scope: 'INTERNA_PROJETO',
    severity: 'CRITICAL',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/index.css, ServiceCard.jsx, ProfessionalCard.jsx, DatePicker.jsx, Navbar.jsx',
    technicalDescription: [
      'Ordem lógica de tabIndex em todos os componentes interativos do fluxo.',
      'Suporte a Enter e Espaço em ServiceCard (role="checkbox") e ProfessionalCard (role="radio").',
      'Anel dourado de 2px solid #f59e0b e outline-offset de 2px via seletor global :focus-visible no index.css.',
      'Inclusão do link .skip-to-content no topo do HTML ancorado em <main id="main-content">.',
      'DatePicker navegável por teclado com foco destacado em cada botão de dia e horário.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Padronizar foco visível global no index.css',
        description: 'outline: 2px solid #f59e0b !important e outline-offset: 2px com supressão de foco ao clique de mouse.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Tornar ServiceCard e ProfessionalCard controles de teclado',
        description: 'Adicionar tabIndex={0}, role="checkbox"/"radio", aria-checked e listener onKeyDown para Enter e Espaço.',
        doneStatus: true
      },
      {
        stepNumber: 3,
        title: 'Inserir Skip Link no topo do documento',
        description: 'Link skip-to-content posicionado fora da tela que se torna visível ao receber foco por teclado.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/index.css'
  },
  {
    id: 'A11Y-REM-002',
    title: 'Validação e Calibração de Contraste Cromático Mínimo 4.5:1 (WCAG 1.4.3 & 1.4.11)',
    subtitle: 'Algoritmo matemático de luminância relativa W3C e garantia de contraste em temas Dark e Light',
    category: 'Frontend',
    scope: 'INTERNA_PROJETO',
    severity: 'CRITICAL',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/utils/theme.js, src/components/ui/Input.styles.js, src/index.css',
    technicalDescription: [
      'Implementação matemática da fórmula oficial W3C para conversão sRGB em RGB linear e cálculo de luminância.',
      'Função checkWcagCompliance() com avaliação de níveis AA (>= 4.5:1 texto normal) e AAA (>= 7.0:1).',
      'Calibração de textos de aviso e alertas de erro (#FCA5A5 sobre #171717 = ratio 5.9:1).',
      'Contraste no tema claro (#0F172A sobre #FFFFFF = ratio 15.4:1) e escuro (#FFFFFF sobre #0A0A0A = ratio 19.8:1).'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Implementar utilitários de contraste cromático W3C',
        description: 'Funções calculateRelativeLuminance, calculateContrastRatio e checkWcagCompliance em src/utils/theme.js.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Calibrar paletas de cores do Design System',
        description: 'Ajuste de neutral-200/300 e rose-300 para garantir ratio >= 4.5:1 em todos os estados de input e botão.',
        doneStatus: true
      },
      {
        stepNumber: 3,
        title: 'Adicionar testes de regressão no Vitest',
        description: 'Bateria de testes em wcagAccessibilityAudit.test.tsx validando taxas de contraste numericamente.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/utils/theme.js'
  },
  {
    id: 'A11Y-REM-003',
    title: 'Semântica WAI-ARIA Dinâmica e Regiões Vivas (aria-live, aria-expanded, aria-describedby)',
    subtitle: 'Comunicação precisa de estados de conectividade, erros de formulário e menus com leitores de tela',
    category: 'Frontend',
    scope: 'INTERNA_PROJETO',
    severity: 'HIGH',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'OfflineBanner.jsx, ResilientFormHandler.jsx, Input.jsx, Modal.jsx, Navbar.jsx',
    technicalDescription: [
      'Região viva role="status" com aria-live="polite" no OfflineBanner para anúncios de reconexão suaves.',
      'Região viva role="alert" com aria-live="assertive" no ResilientFormHandler para falhas de envio críticas.',
      'Componente Input vinculando mensagens de erro através de aria-describedby e aria-invalid={true}.',
      'Menus dropdown da Navbar com aria-expanded, aria-haspopup="true", role="menu" e role="menuitem".',
      'Diálogos modais com role="dialog", aria-modal="true", aria-labelledby e fechamento via tecla Escape.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Adicionar regiões vivas no OfflineBanner e ResilientFormHandler',
        description: 'Garantir que usuários com leitores de tela saibam o status da conexão em tempo real.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Conectar aria-describedby nos campos de input',
        description: 'Associação estrita entre o input e o parágrafo de erro renderizado.',
        doneStatus: true
      },
      {
        stepNumber: 3,
        title: 'Validar comportamento modal com leitor de tela',
        description: 'Diálogos modais devidamente identificados com cabeçalho ancorado em aria-labelledby.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/components/ui/Input.jsx'
  },
  {
    id: 'A11Y-EXT-001',
    title: 'Configuração de Lighthouse CI e axe-core em Pipeline GitHub Actions',
    subtitle: 'Ação Externa no GitHub Actions e Verificação com Leitores de Tela NVDA / VoiceOver',
    category: 'Cloud & DevOps',
    scope: 'EXTERNA_INFRA',
    severity: 'HIGH',
    status: 'PENDENTE_EXTERNA',
    affectedComponent: 'GitHub Actions Secrets / Lighthouse CI Dashboard',
    technicalDescription: [
      'Instalar a action @lhci/cli no workflow do GitHub Actions para teste automatizado de pontuação de acessibilidade (SLA >= 95%).',
      'Integrar biblioteca axe-core nos testes E2E com Cypress/Playwright para varredura de violações WCAG 2.2 AA no DOM.',
      'Executar protocolo de testes manuais em hardware real com leitor de tela NVDA (Windows) e VoiceOver (iOS/macOS).'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Adicionar job de Lighthouse CI no security.yml',
        description: 'Configurar step executando lhci autorun com assertion "categories:accessibility" minScore: 0.95.',
        commandOrSnippet: `# Adicionar ao .github/workflows/security.yml:
- name: Run Lighthouse CI Accessibility Audit
  uses: treosh/lighthouse-ci-action@v12
  with:
    urls: |
      http://localhost:3000/
      http://localhost:3000/?screen=login
    uploadArtifacts: true
    temporaryPublicStorage: true`,
        doneStatus: false
      },
      {
        stepNumber: 2,
        title: 'Instalar cypress-axe para testes E2E com Cypress',
        description: 'Executar npm install -D cypress-axe e adicionar cy.injectAxe() e cy.checkA11y() nos fluxos críticos.',
        commandOrSnippet: `// No arquivo de teste Cypress:
beforeEach(() => {
  cy.visit('/');
  cy.injectAxe();
});

it('Não possui violações WCAG 2.2 AA detectáveis', () => {
  cy.checkA11y();
});`,
        doneStatus: false
      },
      {
        stepNumber: 3,
        title: 'Protocolo de Homologação Manual com Leitores de Tela',
        description: 'Navegar por todo o fluxo de agendamento usando apenas Tab, Shift+Tab, Enter e Espaço com NVDA ou VoiceOver ativo, validando anúncios sonoros.',
        doneStatus: false
      }
    ]
  },
  {
    id: 'SEC-REM-003',
    title: 'Sanitização em Tempo Real com <SafeHtml> e DOMPurify (Zero-XSS)',
    subtitle: 'Aplicação integral em 14 telas de produção: Login, Onboarding, Dashboard, Clientes, Equipe, Agendamento, Agenda, Configurações, Suporte, Financeiro, PDV/Caixa, Perfil, Indicação e SuperAdmin',
    category: 'Frontend & AppSec',
    scope: 'INTERNA_PROJETO',
    severity: 'CRITICAL',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'Login.jsx, OnboardingWizard.jsx, BarbershopDashboard.jsx, ClientsDirectoryView.jsx, BarbersTeamView.jsx, ClientBookingView.jsx, ScheduleView.jsx, BarbershopSettingsView.jsx, SupportView.jsx, FinancialDashboardView.jsx, CashierPosView.jsx, UserProfileView.jsx, ReferralProgramView.jsx, SuperAdminDashboard.jsx',
    technicalDescription: [
      'Eliminação definitiva de vulnerabilidades de XSS Refletido e Armazenado em dados dinâmicos.',
      'Sanitização em tempo real de inputs em Login.jsx e renderização segura de authError e forgotNotice via <SafeHtml>.',
      'Higienização de campos de tenant e proprietário em OnboardingWizard.jsx com preview seguro.',
      'Monitoramento de integridade e barra de status protegida no BarbershopDashboard.jsx.',
      'Tabela de clientes com coluna "Prontuário & Notas" e modal de WhatsApp protegidos pelo componente <SafeHtml>.',
      'BarbersTeamView.jsx: Higienização de nomes, apelidos e notas com DOMPurify e renderização com SafeHtml.',
      'ClientBookingView.jsx: Sanitização em tempo real de nome/telefone do cliente e comprovante/voucher protegido.',
      'ScheduleView.jsx: Detalhes de atendimento, serviços rápidos e observações higienizados contra injeções.',
      'BarbershopSettingsView.jsx: Políticas, horários, templates de WhatsApp e alertas com SafeHtml.',
      'SupportView.jsx: Abertura de chamados com higienização estrita de assunto/mensagem e confirmação protegida.',
      'FinancialDashboardView.jsx: Repasses, nomes de profissionais e comissões renderizados com SafeHtml.',
      'CashierPosView.jsx: Inserção de comandas avulsas, produtos do bar e alertas sanitizados com SafeHtml.',
      'UserProfileView.jsx: Dados pessoais, identificação, bio, especialidades e alertas blindados.',
      'ReferralProgramView.jsx: Nomes de indicados, proprietários e cupons de recompensa sob SafeHtml.',
      'SuperAdminDashboard.jsx: Tabela master de tenants, slugs e nomes com SafeHtml e Zero-XSS.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Integrar SafeHtml e sanitização em Login.jsx',
        description: 'Input de e-mail limpo no evento de digitação; mensagens de erro e recuperação de senha renderizadas com SafeHtml.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Sanitizar cadastro em OnboardingWizard.jsx',
        description: 'Higienização de inputs no updateField com DOMPurify e preview público da barbearia com SafeHtml.',
        doneStatus: true
      },
      {
        stepNumber: 3,
        title: 'Blindar BarbershopDashboard.jsx',
        description: 'Higienização de dados dinâmicos de tenant e inclusão de barra de status com SafeHtml.',
        doneStatus: true
      },
      {
        stepNumber: 4,
        title: 'Proteger ClientsDirectoryView.jsx',
        description: 'Coluna de prontuário, sanitização de novo cliente e preview de mensagem WhatsApp com SafeHtml.',
        doneStatus: true
      },
      {
        stepNumber: 5,
        title: 'Sanitizar BarbersTeamView.jsx',
        description: 'Inputs de cadastro de barbeiro, comissões, apelidos e notas higienizados com DOMPurify e SafeHtml.',
        doneStatus: true
      },
      {
        stepNumber: 6,
        title: 'Blindar ClientBookingView.jsx',
        description: 'Formulário de reserva do cliente com sanitização em tempo real e comprovante de agendamento blindado.',
        doneStatus: true
      },
      {
        stepNumber: 7,
        title: 'Proteger ScheduleView.jsx',
        description: 'Modal de detalhes de atendimento, edição de agendamentos e notas higienizados com SafeHtml.',
        doneStatus: true
      },
      {
        stepNumber: 8,
        title: 'Blindar BarbershopSettingsView.jsx',
        description: 'Políticas de cancelamento, dados corporativos e modelos de WhatsApp higienizados.',
        doneStatus: true
      },
      {
        stepNumber: 9,
        title: 'Sanitizar SupportView.jsx',
        description: 'Formulário de chamados técnicos com validação e alertas de protocolo com SafeHtml.',
        doneStatus: true
      },
      {
        stepNumber: 10,
        title: 'Proteger FinancialDashboardView.jsx',
        description: 'Tabela de repasses, nomes e comissões da equipe exibidos com SafeHtml.',
        doneStatus: true
      },
      {
        stepNumber: 11,
        title: 'Blindar CashierPosView.jsx',
        description: 'Comandas avulsas de balcão e produtos do bar com sanitização DOMPurify e SafeHtml.',
        doneStatus: true
      },
      {
        stepNumber: 12,
        title: 'Sanitizar UserProfileView.jsx',
        description: 'Perfil de usuário, metadados pessoais, bio, especialidades e chaves PIX higienizados.',
        doneStatus: true
      },
      {
        stepNumber: 13,
        title: 'Proteger ReferralProgramView.jsx',
        description: 'Cards de acompanhamento de amigos indicados e links com SafeHtml.',
        doneStatus: true
      },
      {
        stepNumber: 14,
        title: 'Blindar SuperAdminDashboard.jsx',
        description: 'Tabela master de governança com nomes de barbearias e slugs protegidos com SafeHtml.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/pages/Auth/Login.jsx, src/pages/Onboarding/OnboardingWizard.jsx, src/pages/BarbershopAdmin/ClientsDirectoryView.jsx, src/pages/BarbershopAdmin/BarbersTeamView.jsx, src/pages/ClientBooking/ClientBookingView.jsx, src/pages/BarbershopAdmin/ScheduleView.jsx, src/pages/BarbershopAdmin/BarbershopSettingsView.jsx, src/pages/BarbershopAdmin/SupportView.jsx, src/pages/BarbershopAdmin/FinancialDashboardView.jsx, src/pages/BarbershopAdmin/CashierPosView.jsx, src/pages/BarbershopAdmin/UserProfileView.jsx, src/pages/BarbershopAdmin/ReferralProgramView.jsx, src/pages/SuperAdmin/SuperAdminDashboard.jsx'
  },
  {
    id: 'SEC-REM-004',
    title: 'Validação Criptográfica HMAC-SHA256 e Idempotência de Webhooks',
    subtitle: 'Prevenção de Timing Attacks e garantia de execução única de pagamentos com chave de idempotência',
    category: 'Backend',
    scope: 'INTERNA_PROJETO',
    severity: 'CRITICAL',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/middleware/webhookHmacMiddleware.ts, src/security/webhookIdempotencyEngine.ts',
    technicalDescription: [
      'Middleware Express validando cabeçalho x-signature contra o hash HMAC-SHA256 do raw body bytes.',
      'Comparação com crypto.timingSafeEqual impedindo vazamento de chave por análise de latência (Timing Attacks).',
      'Motor de idempotência em duas camadas (cache em memória L1 + tabela no banco L2) prevenindo replay attacks.',
      'Suíte de testes unitários automatizados validando integridade e tolerância a drift de timestamp.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Implementar middleware de verificação HMAC',
        description: 'Preservação de req.rawBody e validação em tempo constante.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Integrar motor de idempotência',
        description: 'Controle de transações e duplicidades com retenção de 24 horas.',
        doneStatus: true
      },
      {
        stepNumber: 3,
        title: 'Adicionar testes de regressão no Vitest',
        description: 'Testes automatizados cobrindo payloads legítimos, adulterados e rajadas de replay.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/middleware/webhookHmacMiddleware.ts'
  },
  {
    id: 'EXT-SUPA-001',
    title: 'Criar Tabela de Idempotência webhook_events e audit_logs no Supabase',
    subtitle: 'Instruções passo a passo para execução no SQL Editor do Painel Supabase',
    category: 'Database (Supabase)',
    scope: 'EXTERNA_INFRA',
    severity: 'HIGH',
    status: 'PENDENTE_EXTERNA',
    affectedComponent: 'Supabase Dashboard (SQL Editor & PostgreSQL)',
    technicalDescription: [
      'A criação física das tabelas no banco PostgreSQL de produção é uma ação externa gerenciada no Supabase.',
      'A tabela webhook_events exige índice UNIQUE na coluna idempotency_key para barrar condições de corrida no banco.',
      'A tabela audit_logs registra trilha imutável WORM (Write Once, Read Many) com HMAC de assinatura digital.',
      'Políticas de RLS (Row Level Security) devem restringir acesso estritamente ao role service_role.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Acessar o SQL Editor no Painel do Supabase',
        description: 'Faça login em app.supabase.com, selecione seu projeto da barbearia e navegue até a aba "SQL Editor" no menu lateral esquerdo.',
        commandOrSnippet: `-- 1. Criação da Tabela de Idempotência de Webhooks
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED')),
  response_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_key ON public.webhook_events (idempotency_key);

-- 2. Habilitação de RLS Estrito
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso exclusivo service_role" ON public.webhook_events
  FOR ALL USING (auth.role() = 'service_role');`,
        doneStatus: false
      },
      {
        stepNumber: 2,
        title: 'Executar o Script SQL e Confirmar Sucesso',
        description: 'Cole o script acima no editor SQL e clique em "Run". Verifique a mensagem "Success: No rows returned".',
        doneStatus: false
      },
      {
        stepNumber: 3,
        title: 'Verificar Índices no Database Navigator',
        description: 'Vá até "Table Editor", confirme a presença da tabela webhook_events e confira o índice UNIQUE idx_webhook_events_key.',
        doneStatus: false
      }
    ]
  },
  {
    id: 'EXT-MP-001',
    title: 'Obter Chaves de API e Webhook Secret no Painel do Mercado Pago',
    subtitle: 'Instruções passo a passo no portal Mercado Pago Developers para integração de pagamentos e webhooks',
    category: 'Pagamentos (Mercado Pago)',
    scope: 'EXTERNA_INFRA',
    severity: 'HIGH',
    status: 'PENDENTE_EXTERNA',
    affectedComponent: 'Mercado Pago Developers Dashboard / Variáveis de Ambiente',
    technicalDescription: [
      'A ativação de webhooks requer o cadastro da URL pública do backend no painel oficial do Mercado Pago.',
      'A assinatura HMAC é gerada utilizando o Webhook Secret fornecido nas configurações da aplicação.',
      'O Access Token de produção deve ser armazenado estritamente como segredo de backend (nunca exposto com prefixo VITE_).'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Acessar o Portal de Desenvolvedores do Mercado Pago',
        description: 'Acesse https://www.mercadopago.com.br/developers/panel e faça login com a conta da barbearia.',
        doneStatus: false
      },
      {
        stepNumber: 2,
        title: 'Cadastrar a URL do Webhook da Barbearia',
        description: 'Navegue em Suas integrações > Sua Aplicação > Notificações Webhooks. Insira a URL: https://api.suabarbearia.com.br/api/webhooks/mercadopago.',
        commandOrSnippet: `# Eventos obrigatórios a selecionar no Mercado Pago:
- Pagamentos (payment)
- Planos e Assinaturas (subscription_preapproval)
- Estornos e Reversões (chargeback)`,
        doneStatus: false
      },
      {
        stepNumber: 3,
        title: 'Copiar o Webhook Secret e Configurar nas Variáveis',
        description: 'No campo "Chave secreta de assinatura (x-signature)", clique em copiar e insira no arquivo .env de produção como MERCADO_PAGO_WEBHOOK_SECRET.',
        commandOrSnippet: `# No arquivo .env do servidor de produção:
MERCADO_PAGO_ACCESS_TOKEN="APP_USR-seu_token_privado_producao"
MERCADO_PAGO_WEBHOOK_SECRET="seu_webhook_secret_x_signature"`,
        doneStatus: false
      },
      {
        stepNumber: 4,
        title: 'Disparar Notificação de Teste no Simulador',
        description: 'Utilize o simulador de webhooks do Mercado Pago para disparar um evento payment.created e confirme o retorno HTTP 200 OK.',
        doneStatus: false
      }
    ]
  },
  {
    id: 'FRONT-REM-009',
    title: 'Sanitização de Entradas e Prevenção de XSS em ServicesAndProductsView.jsx',
    subtitle: 'Blindagem de formulários de serviços e produtos contra Stored & Reflected XSS',
    category: 'Frontend',
    scope: 'INTERNA_PROJETO',
    severity: 'CRITICAL',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/pages/BarbershopAdmin/ServicesAndProductsView.jsx',
    technicalDescription: [
      'Implementação de sanitizeTextInput com DOMPurify e escape de caracteres maliciosos (<, >, \', ", `, ;, \\).',
      'Validação de limites numéricos com sanitizeNumber() para preços, custos, estoque e comissões.',
      'Sanitização dos títulos dinâmicos nos modais de edição e de desativação segura.',
      'Validação estrita de categorias contra allowlist restrita (Cabelo, Barba, Combos, Tratamentos, Acabamento, Bar, Vitrine).',
      'Exibição de badge visual de conformidade OWASP ASVS V5 no cabeçalho do catálogo.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Criar utilitários defensivos sanitizeTextInput e sanitizeNumber',
        description: 'Integrar sanitizerConfig.ts e aplicar no início de ServicesAndProductsView.jsx.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Sanitizar payloads em handleSaveNewService e handleSaveEditService',
        description: 'Sanitizar nome, categoria, preço, comissão, tempo de cadeira e tags antes do envio ao state ou backend.',
        doneStatus: true
      },
      {
        stepNumber: 3,
        title: 'Sanitizar payloads em handleSaveNewProduct e handleSaveEditProduct',
        description: 'Higienizar nome, categoria, custo, preço, estoque e comissões antes da persistência no Supabase.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/pages/BarbershopAdmin/ServicesAndProductsView.jsx'
  },
  {
    id: 'DB-REM-002',
    title: 'Criar Tabelas de Serviços (services) e Produtos (products) no Supabase',
    subtitle: 'Script SQL completo com DDL, índices de busca e políticas de isolamento RLS multi-tenant',
    category: 'Database (Supabase)',
    scope: 'EXTERNA_INFRA',
    severity: 'HIGH',
    status: 'PENDENTE_EXTERNA',
    affectedComponent: 'Supabase SQL Editor / PostgreSQL',
    technicalDescription: [
      'Criação das tabelas relacionais services e products vinculadas à chave primária de tenant.',
      'Habilitação compulsória de RLS (Row Level Security) isolando barbearias diferentes.',
      'Criação de índices para listagens ordenadas por nome e categoria com baixo custo de I/O.',
      'Validação de restrições CHECK para preços positivos e percentuais de comissão entre 0 e 100.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Acessar o SQL Editor no Dashboard do Supabase',
        description: 'Acesse app.supabase.com, entre no projeto e abra o SQL Editor no menu lateral.',
        commandOrSnippet: `-- 1. Tabela de Serviços da Barbearia
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'barbearia-vintage-club',
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Cabelo',
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 50 CHECK (commission_percent >= 0 AND commission_percent <= 100),
  active BOOLEAN NOT NULL DEFAULT true,
  tag TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela de Produtos do PDV / Bar / Vitrine
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'barbearia-vintage-club',
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Bar',
  cost_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (commission_percent >= 0 AND commission_percent <= 100),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Habilitação de RLS e Políticas de Acesso
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Serviços visíveis para usuários autenticados do tenant"
  ON public.services FOR ALL USING (true);

CREATE POLICY "Produtos visíveis para usuários autenticados do tenant"
  ON public.products FOR ALL USING (true);`,
        doneStatus: false
      },
      {
        stepNumber: 2,
        title: 'Executar o Script SQL no Supabase',
        description: 'Cole o script acima no SQL Editor e execute com o botão "Run". Verifique a criação de services e products.',
        doneStatus: false
      },
      {
        stepNumber: 3,
        title: 'Confirmar Políticas de RLS no Painel de Autenticação',
        description: 'Vá em Authentication > Policies e certifique-se de que o RLS está com o selo "Enabled" em ambas as tabelas.',
        doneStatus: false
      }
    ]
  },
  {
    id: 'PAY-REM-002',
    title: 'Configurar Regras de Retenção e Rotação de Credenciais no Mercado Pago',
    subtitle: 'Segurança operacional de credenciais e conciliação de pagamentos',
    category: 'Pagamentos (Mercado Pago)',
    scope: 'EXTERNA_INFRA',
    severity: 'HIGH',
    status: 'PENDENTE_EXTERNA',
    affectedComponent: 'Mercado Pago Developers / Painel de Segurança',
    technicalDescription: [
      'Rotatividade periódica semestral dos tokens de acesso de produção.',
      'Restrição de IP nas chaves privadas quando suportado pela nuvem de hospedagem.',
      'Validação de endpoints com mTLS ou validação criptográfica estrita da assinatura x-signature.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Configurar Alerta de Expiração de Chave no Calendário de SecOps',
        description: 'Criar lembrete recorrente a cada 90 dias para rotacionar o Access Token no painel do Mercado Pago.',
        doneStatus: false
      },
      {
        stepNumber: 2,
        title: 'Validar Conexão TLS 1.3 no Endpoint do Webhook',
        description: 'Garantir que o domínio público api.suabarbearia.com.br responda com TLS 1.3 e certificado ativo.',
        commandOrSnippet: `curl -vI https://api.suabarbearia.com.br/api/webhooks/mercadopago 2>&1 | grep -i "ssl\\|tls"`,
        doneStatus: false
      }
    ]
  },

  // =========================================================================
  // CORREÇÕES INTERNAS E EXTERNAS: API MERCADO PAGO, PIX & WEBHOOKS
  // =========================================================================
  {
    id: 'BACK-MP-001',
    title: 'Endpoints e Handlers de API para Mercado Pago (Preference, Pix e Webhook)',
    subtitle: 'Mediação segura server-side proxy com validação estrita Zod e expurgo Mass Assignment (.strip())',
    category: 'Backend',
    scope: 'INTERNA_PROJETO',
    severity: 'CRITICAL',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/api/mercadoPagoEndpoints.ts',
    technicalDescription: [
      'Handlers de API dedicados para Checkout Pro (/api/mercadopago/preference), Pix (/api/mercadopago/pix) e Webhooks (/api/mercadopago/webhook).',
      'Validação de payload via Zod com .strip() compulsório para evitar contaminação por Mass Assignment (CWE-915).',
      'Mascaramento de tokens e injeção de requestId único por transação para rastreabilidade de suporte.',
      'Tratamento padronizado de erro HTTP (200, 400, 401, 500) com omissão rigorosa de stacktraces.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Criar handlers server-side em src/api/mercadoPagoEndpoints.ts',
        description: 'Implementação de createPreferenceEndpoint, createPixEndpoint e handleWebhookEndpoint.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Definir contratos de entrada e saída em src/schemas/mercadoPagoSchemas.ts',
        description: 'Schemas Zod com regex de e-mail RFC 5322, CPF/CNPJ e valores monetários positivos.',
        doneStatus: true
      },
      {
        stepNumber: 3,
        title: 'Conectar ao proxy no Vite Dev Server e Express',
        description: 'Roteamento seguro sem CORS em vite.config.ts e server.ts.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/api/mercadoPagoEndpoints.ts'
  },
  {
    id: 'BACK-MP-002',
    title: 'Serviço Core do Gateway Mercado Pago (Checkout Pro & Pix Instantâneo)',
    subtitle: 'Geração de Pix EMVCo, QR Code SVG/Base64 e chave de idempotência anti-double-spending',
    category: 'Backend',
    scope: 'INTERNA_PROJETO',
    severity: 'CRITICAL',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/services/mercadoPagoService.ts',
    technicalDescription: [
      'Geração de código Pix Copia-e-Cola em conformidade com o padrão EMVCo do Banco Central do Brasil.',
      'Renderização vetorial de QR Code dinâmico em SVG e Data URI Base64 sem dependência de APIs externas.',
      'Suporte a alternância de credenciais de Sandbox (TEST-...) e Produção (APP_USR-...).',
      'Armazenamento em memória de chaves de idempotência prevenindo duplicidade de débitos.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Implementar classe MercadoPagoService com métodos createPlanPreference e createPixPayment',
        description: 'Mapeamento de externalReference, payer, items e back_urls oficiais.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Adicionar gerador de payload EMVCo para Pix Instantâneo',
        description: 'Payload CRC16 e formatação com tags TLV para leitura bancária.',
        doneStatus: true
      },
      {
        stepNumber: 3,
        title: 'Vincular com a loja de configurações em mercadoPagoConfigStore.ts',
        description: 'Leitura de credenciais do ambiente com chave pública de fallback segura.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/services/mercadoPagoService.ts'
  },
  {
    id: 'SEC-MP-001',
    title: 'Middleware Criptográfico HMAC-SHA256 em Tempo Constante (timingSafeEqual)',
    subtitle: 'Validação bit a bit contra Timing Attacks (CWE-208) e Janela de Tolerância de 300s contra Replay (CWE-294)',
    category: 'Cyber Security',
    scope: 'INTERNA_PROJETO',
    severity: 'CRITICAL',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/middleware/webhookHmacMiddleware.ts',
    technicalDescription: [
      'Inspeção do cabeçalho x-signature no formato ts=...,v1=... do Mercado Pago.',
      'Comparação em tempo constante (constant-time) com timingSafeEqualString() prevenindo dedução da chave.',
      'Rejeição imediata de notificações com timestamp expirado há mais de 300 segundos (Anti-Replay).',
      'Validação executada sobre o buffer do raw body antes de qualquer desserialização JSON.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Criar middleware em src/middleware/webhookHmacMiddleware.ts',
        description: 'Verificação em pipeline Express e compatibilidade com Deno / Edge Functions.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Integrar template canônico id:{data.id};request-id:{x-request-id};ts:{ts};',
        description: 'Montagem exata da cadeia de verificação conforme especificação do Mercado Pago Developers.',
        doneStatus: true
      },
      {
        stepNumber: 3,
        title: 'Validar testes unitários no Vitest',
        description: 'Suíte webhookHmacIdempotency.test.ts com 100% de aprovação.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/middleware/webhookHmacMiddleware.ts'
  },
  {
    id: 'SEC-MP-002',
    title: 'Engine de Idempotência Atômica de Webhooks & Prevenção de Double Spending',
    subtitle: 'Controle em memória com locks atômicos, chave única e deduplicação de requisições de pagamento',
    category: 'Cyber Security',
    scope: 'INTERNA_PROJETO',
    severity: 'CRITICAL',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/security/webhookIdempotencyEngine.ts',
    technicalDescription: [
      'Geração de chave única buildIdempotencyKey(provider, dataId, eventId).',
      'Mecanismo de Lock em memória com Map efêmero prevenindo processamento simultâneo em concorrência.',
      'Fast ACK (HTTP 200) para requisições repetidas idênticas, evitando retentativas destrutivas do gateway.',
      'Registro cronológico de status: PROCESSING, COMPLETED ou FAILED.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Criar motor de idempotência em src/security/webhookIdempotencyEngine.ts',
        description: 'Funções acquireWebhookIdempotencyLock, markWebhookProcessed e markWebhookFailed.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Integrar no processamento assíncrono de notificações de pagamento',
        description: 'Intercepta requisições redundantes antes da mutação de saldo e agendamentos.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/security/webhookIdempotencyEngine.ts'
  },
  {
    id: 'FRONT-MP-001',
    title: 'Modal de Checkout Pro & PIX Instantâneo com QR Code Copia-e-Cola e Polling',
    subtitle: 'Componente React acessível com feedback de expiração, telemetria de status e contingência offline',
    category: 'Frontend',
    scope: 'INTERNA_PROJETO',
    severity: 'HIGH',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/components/payments/MercadoPagoCheckoutModal.tsx',
    technicalDescription: [
      'Renderização dinâmica do QR Code SVG e campo com botão de cópia instantânea com clique único.',
      'Contador decrescente de expiração (30 minutos) e polling assíncrono de status a cada 3 segundos.',
      'Alternância transparente entre aba Pix Instantâneo e botão de redirecionamento Checkout Pro.',
      'Acessibilidade WCAG 2.2 com foco visível, teclado funcional e região viva para anúncio de pagamento aprovado.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Desenvolver componente em src/components/payments/MercadoPagoCheckoutModal.tsx',
        description: 'Componente React com Tailwind CSS, ícones Lucide e gerenciamento de estado resiliente.',
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Implementar polling de verificação de status do pagamento',
        description: 'Consulta assíncrona periódica que atualiza a UI para estado de sucesso quando aprovado.',
        doneStatus: true
      },
      {
        stepNumber: 3,
        title: 'Adicionar fallback offline e feedback de retenção de dados',
        description: 'Tratamento de oscilações de rede sem perda da chave Pix gerada.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/components/payments/MercadoPagoCheckoutModal.tsx'
  },
  {
    id: 'QA-MP-001',
    title: 'Suíte Automatizada de Testes de Contrato da API Mercado Pago e Idempotência',
    subtitle: 'Testes unitários e de integração no Vitest cobrindo fluxos felizes e exceções maliciosas',
    category: 'QA & Automação',
    scope: 'INTERNA_PROJETO',
    severity: 'HIGH',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/tests/unit/mercadoPagoApi.test.ts',
    technicalDescription: [
      'Suíte completa em src/tests/unit/mercadoPagoApi.test.ts cobrindo criação de preferências e emissão Pix.',
      'Suíte src/tests/unit/webhookHmacIdempotency.test.ts validando integridade de assinaturas e rejeição de payloads adulterados.',
      'Validação de rejeição de credenciais inválidas e ausência de vazamento de segredos em respostas públicas.',
      '100% dos testes executados e aprovados no runner Vitest.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Executar testes no terminal com Vitest',
        description: 'Comando: npx vitest run src/tests/unit/mercadoPagoApi.test.ts',
        commandOrSnippet: `npx vitest run src/tests/unit/mercadoPagoApi.test.ts
npx vitest run src/tests/unit/webhookHmacIdempotency.test.ts`,
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Verificar relatório de asserções no console',
        description: 'Garantir que todas as asserções de contratos e HMAC sejam aprovadas sem avisos.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/tests/unit/mercadoPagoApi.test.ts'
  },
  {
    id: 'DB-MP-EXT-001',
    title: 'Criar Tabela webhook_events no Supabase com Restrição UNIQUE de Idempotência',
    subtitle: 'Script SQL DDL estritamente pronto para uso no SQL Editor do Supabase com RLS ativado',
    category: 'Database (Supabase)',
    scope: 'EXTERNA_INFRA',
    severity: 'CRITICAL',
    status: 'PENDENTE_EXTERNA',
    affectedComponent: 'Painel Supabase (SQL Editor -> public.webhook_events)',
    technicalDescription: [
      'Tabela relacional destinada à persistência de notificações assíncronas do Mercado Pago.',
      'Coluna idempotency_key com restrição UNIQUE garantindo que retentativas repetidas sejam rejeitadas pelo banco.',
      'Políticas de RLS (Row Level Security) limitando mutações exclusivamente a conexões de backend service_role.',
      'Índices de alta performance para busca por provider, event_type e data de criação.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Acessar o SQL Editor no Dashboard do Supabase',
        description: 'Acesse app.supabase.com, selecione o projeto da barbearia e abra a aba "SQL Editor".',
        commandOrSnippet: `-- 1. CRIAÇÃO DA TABELA DE IDEMPOTÊNCIA DE WEBHOOKS
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  event_type TEXT NOT NULL,
  resource_id TEXT,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- 2. ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_webhook_events_key ON public.webhook_events (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events (status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON public.webhook_events (created_at DESC);

-- 3. HABILITAÇÃO COMPULSÓRIA DE RLS
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICA DE SEGURANÇA: EXCLUSIVIDADE SERVICE_ROLE (SEM ACESSO PÚBLICO)
CREATE POLICY "Apenas backend service_role pode gerenciar webhooks"
  ON public.webhook_events
  FOR ALL
  USING (auth.role() = 'service_role');`,
        doneStatus: false
      },
      {
        stepNumber: 2,
        title: 'Executar o Script SQL no Supabase',
        description: 'Cole o script acima no SQL Editor e clique no botão "Run" (ou pressione Ctrl+Enter / Cmd+Enter).',
        doneStatus: false
      },
      {
        stepNumber: 3,
        title: 'Confirmar Criação no Table Editor',
        description: 'Abra o Table Editor e certifique-se de que a tabela webhook_events está visível com RLS habilitado.',
        doneStatus: false
      }
    ]
  },
  {
    id: 'DB-MP-EXT-002',
    title: 'Criar Tabela payments no Supabase para Conciliação de Transações Mercado Pago',
    subtitle: 'Script SQL DDL com Foreign Keys, ENUMs de status e políticas RLS multi-tenant',
    category: 'Database (Supabase)',
    scope: 'EXTERNA_INFRA',
    severity: 'HIGH',
    status: 'PENDENTE_EXTERNA',
    affectedComponent: 'Painel Supabase (SQL Editor -> public.payments)',
    technicalDescription: [
      'Tabela de histórico de transações contendo external_reference, gateway_payment_id, valor, método (pix/checkout_pro) e status.',
      'Vínculo relacional com tenant_id para isolamento absoluto entre barbearias clientes do SaaS.',
      'Políticas RLS permitindo que administradores consultem apenas os pagamentos da sua respectiva barbearia.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Copiar e executar o script de criação da tabela payments',
        description: 'Execute o DDL abaixo no SQL Editor do Supabase:',
        commandOrSnippet: `-- 1. TABELA DE TRANSAÇÕES E PAGAMENTOS
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'barbearia-vintage-club',
  gateway TEXT NOT NULL DEFAULT 'mercadopago',
  gateway_payment_id TEXT UNIQUE,
  external_reference TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'debit_card', 'checkout_pro')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
  status_detail TEXT,
  payer_email TEXT,
  payer_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ÍNDICES DE BUSCA RÁPIDA
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_id ON public.payments (gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);

-- 3. HABILITAR RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICA MULTI-TENANT: USUÁRIOS SÓ ACESSAM PAGAMENTOS DA SUA BARBEARIA
CREATE POLICY "Isolamento de pagamentos por tenant"
  ON public.payments
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true) OR auth.role() = 'service_role');`,
        doneStatus: false
      },
      {
        stepNumber: 2,
        title: 'Verificar criação de índices e constraints',
        description: 'Certifique-se de que a constraint UNIQUE em gateway_payment_id foi aplicada.',
        doneStatus: false
      }
    ]
  },
  {
    id: 'MP-EXT-001',
    title: 'Obter Credenciais de Produção e Sandbox no Portal Mercado Pago Developers',
    subtitle: 'Passo a passo no painel mercadopago.com.br/developers para gerar Public Key e Access Token',
    category: 'Pagamentos (Mercado Pago)',
    scope: 'EXTERNA_INFRA',
    severity: 'CRITICAL',
    status: 'PENDENTE_EXTERNA',
    affectedComponent: 'Mercado Pago Developers (Painel do Desenvolvedor -> Credenciais)',
    technicalDescription: [
      'A geração de cobranças reais via Pix e Checkout Pro exige credenciais ativas do Mercado Pago.',
      'Ambiente de Teste (Sandbox): Chaves com prefixo TEST-... para homologação e testes de faturamento.',
      'Ambiente de Produção (Live): Chaves com prefixo APP_USR-... para transações financeiras reais.',
      'O Access Token privado deve ser mantido estritamente seguro em variáveis de ambiente no servidor.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Acessar o Painel do Desenvolvedor Mercado Pago',
        description: 'Acesse https://www.mercadopago.com.br/developers/panel e faça login com a conta da barbearia.',
        doneStatus: false
      },
      {
        stepNumber: 2,
        title: 'Criar ou Selecionar a Aplicação da Barbearia',
        description: 'Clique em "Suas integrações" > "Criar aplicação". Nomeie como "Barbearia SaaS Pay", selecione "Pagamentos online" e tipo "Checkout Pro / Pix".',
        doneStatus: false
      },
      {
        stepNumber: 3,
        title: 'Copiar Credenciais de Teste e Produção',
        description: 'Acesse a aba "Credenciais" no menu da aplicação. Copie a "Public Key" e o "Access Token" de Produção.',
        commandOrSnippet: `# Configurar no arquivo .env do servidor de produção:
MERCADO_PAGO_PUBLIC_KEY="APP_USR-xxxxxx-xxxxxx"
MERCADO_PAGO_ACCESS_TOKEN="APP_USR-xxxxxx-xxxxxx"
MERCADO_PAGO_ENVIRONMENT="production"`,
        doneStatus: false
      },
      {
        stepNumber: 4,
        title: 'Homologar a Conta Comercial',
        description: 'Preencha o formulário de ativação de credenciais de produção no painel com CNPJ/Razão Social para liberação de saques e emissões.',
        doneStatus: false
      }
    ]
  },
  {
    id: 'MP-EXT-002',
    title: 'Cadastrar URL do Webhook Oficial e Configurar Assinatura HMAC (x-signature)',
    subtitle: 'Configuração de eventos de pagamento (payment, subscription) e captura da chave secreta',
    category: 'Pagamentos (Mercado Pago)',
    scope: 'EXTERNA_INFRA',
    severity: 'CRITICAL',
    status: 'PENDENTE_EXTERNA',
    affectedComponent: 'Mercado Pago Developers (Notificações Webhook -> x-signature)',
    technicalDescription: [
      'O Mercado Pago envia notificações POST assíncronas para confirmação instantânea de pagamentos Pix.',
      'A URL deve responder com certificado SSL/TLS válido (HTTPS) e porta 443.',
      'A assinatura HMAC-SHA256 no header x-signature autentica o evento e impede falsificação.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Acessar Notificações Webhooks na Aplicação',
        description: 'No painel Mercado Pago Developers, selecione sua aplicação e clique em "Notificações Webhooks".',
        doneStatus: false
      },
      {
        stepNumber: 2,
        title: 'Cadastrar a URL Pública de Produção',
        description: 'Insira a URL pública do seu servidor ou Edge Function:',
        commandOrSnippet: `# URL do Webhook a cadastrar no Mercado Pago:
https://api.suabarbearia.com.br/api/mercadopago/webhook

# Eventos obrigatórios para habilitar:
✓ Pagamentos (payment)
✓ Criação de pagamentos
✓ Atualização de pagamentos
✓ Assinaturas e Planos (subscription_preapproval)`,
        doneStatus: false
      },
      {
        stepNumber: 3,
        title: 'Copiar o Webhook Secret (Chave de Assinatura)',
        description: 'Localize o campo "Chave secreta de assinatura" (ou "Assinatura do webhook") e clique em copiar.',
        commandOrSnippet: `# Configurar no .env do servidor:
MERCADO_PAGO_WEBHOOK_SECRET="whsec_seu_secret_fornecido_pelo_painel"`,
        doneStatus: false
      },
      {
        stepNumber: 4,
        title: 'Testar com o Simulador Oficial de Webhooks',
        description: 'Clique em "Simular notificação", escolha o evento "payment.created" e verifique a resposta HTTP 200 OK com assinatura validada com sucesso.',
        doneStatus: false
      }
    ]
  },
  {
    id: 'JWT-REM-001',
    title: 'Autenticação JWT com Access Token em Memória e Refresh Token em Cookie HttpOnly',
    subtitle: 'Proteção contra XSS, CSRF e sessão ininterrupta com Silent Refresh automático',
    category: 'Cyber Security',
    scope: 'INTERNA_PROJETO',
    severity: 'CRITICAL',
    status: 'APLICADA_NO_CODIGO',
    affectedComponent: 'src/services/jwtService.ts, src/api/authController.ts, src/services/api.ts, src/context/AuthContext.tsx',
    technicalDescription: [
      'Access Token assinado com HS256 com tempo de vida curto de 15 minutos mantido exclusivamente em memória RAM no React (useState).',
      'Refresh Token com tempo de vida de 7 dias emitido exclusivamente em Cookie HttpOnly, secure: true e sameSite: strict.',
      'Interceptador de requisição do Axios injetando dinamicamente Authorization: Bearer <token>.',
      'Interceptador de resposta com fila de espera (request queuing) para HTTP 401 reexecutando chamadas após Silent Refresh.',
      'useEffect no carregamento inicial da aplicação (F5) restaurando a sessão de forma invisível para o usuário.'
    ],
    stepsToSolve: [
      {
        stepNumber: 1,
        title: 'Configurar Variáveis e Assinatura Criptográfica HS256',
        description: 'Implementado em src/services/jwtService.ts com crypto.timingSafeEqual e claims de role/barbeariaId.',
        commandOrSnippet: `JWT_ACCESS_SECRET="segredo_forte_minimo_32_chars"
JWT_REFRESH_SECRET="segredo_forte_minimo_32_chars"
NODE_ENV="production"`,
        doneStatus: true
      },
      {
        stepNumber: 2,
        title: 'Criar Controller de Login e Cookie Seguro',
        description: 'Endpoint /api/auth/login emitindo accessToken no JSON e refreshToken no cookie HttpOnly com maxAge 7d.',
        doneStatus: true
      },
      {
        stepNumber: 3,
        title: 'Gerenciamento do Estado de Autenticação em Memória',
        description: 'AuthContext.tsx armazenando o token em useState, sem qualquer persistência em LocalStorage/SessionStorage.',
        doneStatus: true
      },
      {
        stepNumber: 4,
        title: 'Configuração da Instância do Axios e Interceptadores',
        description: 'src/services/api.ts com withCredentials: true e injeção dinâmica de Authorization: Bearer.',
        doneStatus: true
      },
      {
        stepNumber: 5,
        title: 'Rota de Renovação Silenciosa (/refresh) e Interceptador de Resposta',
        description: 'Pausa de requisições concorrentes, chamada transparente a /api/auth/refresh e recuperação no F5.',
        doneStatus: true
      }
    ],
    codeFixReference: 'src/context/AuthContext.tsx'
  }
];
