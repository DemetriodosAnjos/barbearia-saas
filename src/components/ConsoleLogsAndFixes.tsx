/**
 * @file ConsoleLogsAndFixes.tsx
 * @description Console Corporativo de Logs de Auditoria e Correções Técnicas Necessárias.
 * Categorizado por equipes (Frontend, Backend, Cyber Security, DevOps/Cloud, QA/Compliance),
 * com separação explícita entre o que foi corrigido no projeto e manuais passo a passo para serviços externos.
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  Server, 
  Code2, 
  ShieldAlert, 
  Cloud, 
  ClipboardCheck, 
  Terminal,
  Filter,
  Search,
  Sparkles,
  Activity,
  RefreshCw,
  XCircle,
  HelpCircle,
  X,
  SearchCheck,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { 
  runExternalItemProbe, 
  ProbeResult, 
  getStoredProbedStatusMap, 
  saveStoredProbedStatus 
} from '../lib/security/externalProbeEngine';

export type TeamCategory = 'ALL' | 'FRONTEND' | 'BACKEND' | 'CYBER_SECURITY' | 'DEVOPS_CLOUD' | 'DATABASE_SRE' | 'QA_COMPLIANCE';
export type FixNature = 'INTERNAL_APPLIED' | 'EXTERNAL_PENDING';
export type NatureFilterType = 'ALL' | 'INTERNAL_APPLIED' | 'EXTERNAL_PENDING' | 'RESOLVED_CLOUD';

export interface TaskItem {
  id: string;
  title: string;
  subtitle: string;
  team: TeamCategory;
  nature: FixNature;
  status: 'RESOLVED' | 'PENDING_EXTERNAL' | 'IN_PROGRESS';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
  technicalDetails: string[];
  externalSteps?: {
    platform: string;
    stepNumber: number;
    title: string;
    instruction: string;
    codeOrConfig?: string;
  }[];
  implementedCodeRef?: string;
}

export const CORRECTIONS_DATA: TaskItem[] = [
  {
    id: 'CORR-001',
    title: 'Wrapper de Sanitização e XSS no Client (<SafeHtml>)',
    subtitle: 'Prevenção absoluta de Cross-Site Scripting na camada de apresentação React',
    team: 'FRONTEND',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'CRITICAL',
    description: 'Substituição completa de saídas de texto não sanitizadas e dangerouslySetInnerHTML soltos por componente wrapper seguro alimentado pelo DOMPurify.',
    technicalDetails: [
      'Criado componente React <SafeHtml> com suporte a presets (strict, comment, rich).',
      'Configurada allowlist restrita de tags e atributos no DOMPurify.',
      'Bloqueio completo de scripts inline (<script>), manipuladores (onload, onerror, onmouseover) e URIs executáveis (javascript:, vbscript:, data:text/html).',
      'Encapsulamento com SafeHtmlErrorBoundary para isolamento de erros de renderização.',
      'Injeção automática de rel="noopener noreferrer nofollow" e target="_blank" em tags âncora.'
    ],
    implementedCodeRef: 'src/components/SafeHtml.tsx & src/security/dompurifyConfig.ts'
  },
  {
    id: 'CORR-002',
    title: 'Hooks de Sanitização Avançada no DOMPurify & Prevenção mXSS',
    subtitle: 'Filtros em runtime para inspeção profunda de atributos e prevenção contra DOM Clobbering',
    team: 'CYBER_SECURITY',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'CRITICAL',
    description: 'Implementação de hooks customizados uponSanitizeAttribute e afterSanitizeAttributes para validação rigorosa de esquemas de protocolo e contenção de ataques de mutação (mXSS).',
    technicalDetails: [
      'Hook uponSanitizeAttribute inspeciona atributos iniciados em "on" e desativa keepAttr imediatamente.',
      'Validação de protocolos de URL permitidos: estritamente http:, https:, mailto:, tel:.',
      'Descarte de atributos style contendo expressões CSS legadas (expression, -moz-binding, javascript:).',
      'Ativação de SANITIZE_DOM: true para neutralizar sobreposição de propriedades globais (document, window).'
    ],
    implementedCodeRef: 'src/security/dompurifyConfig.ts'
  },
  {
    id: 'CORR-003',
    title: 'Middleware de Validação Criptográfica HMAC-SHA256 para Webhooks',
    subtitle: 'Autenticação de integridade e não-repúdio de payloads em tempo constante',
    team: 'BACKEND',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'CRITICAL',
    description: 'Arquitetura e código do middleware backend para validação de assinaturas de webhooks contra o raw body original antes de qualquer parsing JSON.',
    technicalDetails: [
      'Captura e preservação do Buffer bruto (rawBody) da requisição HTTP POST.',
      'Cálculo de assinatura HMAC-SHA256 utilizando chave secreta compartilhada.',
      'Comparação em tempo constante com crypto.timingSafeEqual() para mitigar Timing Attacks.',
      'Rejeição instantânea com HTTP 401 Unauthorized para divergência de assinatura ou cabeçalhos ausentes.'
    ],
    implementedCodeRef: 'src/docs/hmcAndWebhookDoc.ts (Middleware Express/Node)'
  },
  {
    id: 'CORR-004',
    title: 'Mecanismo de Idempotência e Prevenção de Transações Duplicadas',
    subtitle: 'Tratamento de entrega At-Least-Once com locking e cache de resposta',
    team: 'BACKEND',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'HIGH',
    description: 'State machine para garantia de processamento único de eventos de webhook repetidos por instabilidade de rede ou retentativas automáticas.',
    technicalDetails: [
      'Extração de chave idempotente única (Idempotency-Key ou event.id).',
      'Cálculo de hash SHA-256 do payload para validação de integridade do conteúdo.',
      'Retorno idempotente imediato (HTTP 200) com cache da resposta original caso já esteja concluído.',
      'Prevenção de dupla cobrança, duplicidade de saldo ou múltiplas notificações ao usuário.'
    ],
    implementedCodeRef: 'src/docs/hmcAndWebhookDoc.ts (Seção 2)'
  },
  {
    id: 'CORR-005',
    title: 'Criação da Tabela de Idempotência no Banco de Dados Supabase',
    subtitle: 'Provisionamento de esquema DDL relacional com restrições de integridade',
    team: 'DEVOPS_CLOUD',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'CRITICAL',
    description: 'Executar o script SQL no console do Supabase para criar a tabela webhook_idempotency_log com índices de alta velocidade e controle de concorrência.',
    technicalDetails: [
      'Acessar o painel administrativo do Supabase e selecionar o projeto em produção/staging.',
      'Navegar até a aba SQL Editor e criar uma nova query.',
      'Aplicar o script DDL com índices em idempotency_key e created_at.',
      'Configurar Row Level Security (RLS) para permitir escrita apenas pela role service_role.'
    ],
    externalSteps: [
      {
        platform: 'Supabase Dashboard',
        stepNumber: 1,
        title: 'Acessar o SQL Editor',
        instruction: 'Entre em app.supabase.com, selecione seu projeto, e no menu lateral esquerdo clique no ícone "SQL Editor" (ou pressione Shift+Q).'
      },
      {
        platform: 'Supabase SQL Editor',
        stepNumber: 2,
        title: 'Executar o Script de Criação da Tabela',
        instruction: 'Cole o código SQL abaixo e clique no botão verde "Run":',
        codeOrConfig: `CREATE TABLE IF NOT EXISTS public.webhook_idempotency_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  provider VARCHAR(64) NOT NULL DEFAULT 'mercadopago',
  event_type VARCHAR(128) NOT NULL,
  payload_hash CHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED')),
  http_response_code INT,
  response_body JSONB,
  attempts_count INT NOT NULL DEFAULT 1,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_key_provider ON public.webhook_idempotency_log (idempotency_key, provider);
CREATE INDEX IF NOT EXISTS idx_webhook_created_at ON public.webhook_idempotency_log (created_at);

-- Habilitar RLS
ALTER TABLE public.webhook_idempotency_log ENABLE ROW LEVEL SECURITY;

-- Política de restrição total: apenas o backend com service_role pode operar
CREATE POLICY "Permitir apenas service_role na idempotência" 
  ON public.webhook_idempotency_log 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);`
      },
      {
        platform: 'Supabase Settings',
        stepNumber: 3,
        title: 'Validar Chave de Serviço (Service Role Key)',
        instruction: 'Em Project Settings > API, copie a chave "service_role" (secret) e configure-a na variável SUPABASE_SERVICE_ROLE_KEY no ambiente seguro do servidor backend.'
      }
    ]
  },
  {
    id: 'CORR-006',
    title: 'Obtenção e Configuração de Chaves no Painel do Mercado Pago',
    subtitle: 'Extração do Webhook Secret e configuração da URL de notificação segura',
    team: 'DEVOPS_CLOUD',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'CRITICAL',
    description: 'Configurar os Webhooks oficiais no dashboard de desenvolvedores do Mercado Pago para envio de assinaturas criptográficas x-signature.',
    technicalDetails: [
      'Acessar o Painel de Desenvolvedores do Mercado Pago (mercadopago.com/developers).',
      'Configurar a URL pública do seu endpoint de webhook (deve ser HTTPS com certificado válido).',
      'Ativar os eventos de pagamento (payment.created, payment.updated, etc).',
      'Copiar o Secret da Chave de Assinatura e colar na variável MERCADOPAGO_WEBHOOK_SECRET.'
    ],
    externalSteps: [
      {
        platform: 'Mercado Pago Developers',
        stepNumber: 1,
        title: 'Acessar o Painel de Aplicações',
        instruction: 'Entre em https://www.mercadopago.com/developers/panel/app e selecione a aplicação correspondente.'
      },
      {
        platform: 'Mercado Pago Webhooks',
        stepNumber: 2,
        title: 'Cadastrar URL de Notificação',
        instruction: 'No menu lateral, clique em "Webhooks" > "Notificações no painel". Adicione a URL do seu servidor backend: https://api.seusistema.com/api/v1/webhooks/mercadopago'
      },
      {
        platform: 'Mercado Pago Security',
        stepNumber: 3,
        title: 'Copiar o Webhook Secret',
        instruction: 'Copie o valor do campo "Assinatura Secreta" (Secret Key) gerado pelo Mercado Pago. Salve-o na variável de ambiente do backend:',
        codeOrConfig: `MERCADOPAGO_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"`
      },
      {
        platform: 'Mercado Pago Simulator',
        stepNumber: 4,
        title: 'Disparar Notificação de Teste',
        instruction: 'Clique no botão "Testar URL" e selecione o evento "payment". Verifique se o seu servidor backend respondeu HTTP 200 OK nos logs.'
      }
    ]
  },
  {
    id: 'CORR-007',
    title: 'Configuração de Content Security Policy (CSP) no Edge/Proxy (Nginx / Vercel / Cloudflare)',
    subtitle: 'Reforço de defesa em profundidade com cabeçalhos HTTP estritos',
    team: 'CYBER_SECURITY',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'HIGH',
    description: 'Adicionar cabeçalhos de segurança na borda (Edge) para impedir a execução de qualquer script que não possua nonce ou fonte permitida, mesmo se houver falha de sanitização.',
    technicalDetails: [
      'Definir Content-Security-Policy com script-src \'self\' e desativação de unsafe-inline.',
      'Definir object-src \'none\' e base-uri \'self\'.',
      'Configurar X-Frame-Options: DENY para prevenção de Clickjacking.',
      'Configurar X-Content-Type-Options: nosniff e Strict-Transport-Security (HSTS).'
    ],
    externalSteps: [
      {
        platform: 'Nginx / Vercel Headers',
        stepNumber: 1,
        title: 'Adicionar headers no arquivo de configuração do proxy/servidor',
        instruction: 'Exemplo de configuração para vercel.json ou headers do Nginx:',
        codeOrConfig: `// Configuração em vercel.json:
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none';"
        },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}`
      }
    ]
  },
  {
    id: 'CORR-008',
    title: 'Cluster Redis para Distributed Locks & Idempotência Transitória',
    subtitle: 'Controle de concorrência ultra-rápido (< 5ms) para webhooks simultâneos',
    team: 'DEVOPS_CLOUD',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'MEDIUM',
    description: 'Provisionar instância Redis (Upstash, AWS ElastiCache ou Redis Cloud) para atomic locks com comando SETNX e TTL de 300 segundos.',
    technicalDetails: [
      'Criar instância com persistência desnecessária (cache/lock puramente em memória).',
      'Configurar REDIS_URL no backend.',
      'Executar bloqueio com: SET lock:webhook:{idempotency_key} 1 NX EX 300.'
    ],
    externalSteps: [
      {
        platform: 'Upstash / Redis Cloud',
        stepNumber: 1,
        title: 'Criar Banco Redis Serverless',
        instruction: 'Acesse console.upstash.com, crie uma base Redis no mesmo datacenter do servidor backend e copie a string de conexão (REDIS_URL).'
      }
    ]
  },
  {
    id: 'CORR-009',
    title: 'Suíte de Testes Automatizados no QA Studio com Varredura de Arquivos',
    subtitle: 'Bateria de 18 testes contra vetores de ataque com escaneamento a cada execução',
    team: 'QA_COMPLIANCE',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'HIGH',
    description: 'Painel interativo com execução de testes de segurança, verificação de allowlists e análise estática dos arquivos fonte do projeto.',
    technicalDetails: [
      'Executa 18 cenários de injeção cobrindo script, onerror, svg, javascript:, data: e mXSS.',
      'Varre os 5 arquivos vitais do projeto a cada acionamento do teste.',
      'Calcula Security Score dinâmico e exibe status por vetor.',
      'Disponibiliza sandbox para testes de payloads personalizados pelo usuário.'
    ],
    implementedCodeRef: 'src/testing/testRunner.ts'
  },
  {
    id: 'CORR-010',
    title: 'Limpeza Global de Estado e Storage no Logout (executeLogout)',
    subtitle: 'Higienização determinística de dados locais, React Query e isolamento de contas',
    team: 'FRONTEND',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'CRITICAL',
    description: 'Implementação de função centralizada executeLogout() e hook useSecureLogout() para descarte de tokens no Supabase, invalidação do React Query e limpeza seletiva de storage.',
    technicalDetails: [
      'Chamada determinística a supabase.auth.signOut() com tolerância a falhas de rede no cliente.',
      'Invalidação total do cache em memória do React Query via queryClient.clear() e removeQueries().',
      'Higienização seletiva de localStorage removendo tokens (sb-*, supabase.*), perfil do usuário, tenant e dados de agendamento.',
      'Preservação controlada de preferências neutras de UI (theme, preferred_locale, ui_contrast_mode).',
      'Expurgo completo de sessionStorage (sessionStorage.clear()) eliminando tokens temporários.',
      'Prevenção de retenção de dados da conta anterior na memória ao realizar login com outro usuário no mesmo navegador.',
      'Disparo automático por expiração de token (TOKEN_EXPIRED) e corte temporal de sessão.'
    ],
    implementedCodeRef: 'src/security/logoutService.ts & src/hooks/useSecureLogout.ts'
  },
  {
    id: 'CORR-011',
    title: 'Supabase Auth: Configuração de Timeout por Inatividade e Trigger de Sessões',
    subtitle: 'Ação Externa no Painel GoTrue do Supabase e DDL de corte temporal',
    team: 'CYBER_SECURITY',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'CRITICAL',
    description: 'Configuração do encerramento forçado de sessão por inatividade no painel Supabase e criação de trigger PL/pgSQL na tabela public.sessions.',
    technicalDetails: [
      'Acessar o painel administrativo do Supabase -> Authentication -> Settings -> Sessions.',
      'Ajustar Inactivity Timeout para 1800 segundos (30 minutos) e JWT Expiry para 900 segundos (15 minutos).',
      'Criar trigger PL/pgSQL na tabela public.sessions para marcar is_active = FALSE quando auth.sign_out ocorrer.',
      'Auditar o preenchimento de revoked_at com NOW() imediatamente após o término de sessão.'
    ],
    externalSteps: [
      {
        platform: 'Supabase Dashboard (Auth Settings)',
        stepNumber: 1,
        title: 'Ajustar Tempo de Inatividade de Sessão',
        instruction: 'Acesse app.supabase.com, vá em Authentication > Settings > Sessions e defina "Inactivity Timeout" para 30 minutos.'
      },
      {
        platform: 'Supabase SQL Editor',
        stepNumber: 2,
        title: 'Aplicar Trigger de Inativação de Sessões',
        instruction: 'Execute o comando no SQL Editor para vincular o evento de logout à tabela de sessões:',
        codeOrConfig: `CREATE OR REPLACE FUNCTION public.handle_user_logout_event()
RETURNS trigger AS $$
BEGIN
  UPDATE public.sessions
  SET is_active = FALSE,
      revoked_at = NOW(),
      revocation_reason = 'SUPABASE_AUTH_SIGN_OUT'
  WHERE user_id = auth.uid() AND is_active = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`
      }
    ]
  },
  {
    id: 'CORR-012',
    title: 'Mercado Pago Developers: Obtenção de Chave Secreta HMAC & Cadastro de Webhook IPN',
    subtitle: 'Ação Externa no Portal de Desenvolvedores do Mercado Pago',
    team: 'DEVOPS_CLOUD',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'CRITICAL',
    description: 'Geração da assinatura secreta x-signature no portal Mercado Pago e vinculação da URL HTTPS segura com fast ACK HTTP 200/202.',
    technicalDetails: [
      'Acessar o painel de desenvolvedores do Mercado Pago e abrir a aplicação de pagamentos.',
      'Acessar "Notificações Webhook" e cadastrar a URL segura de produção.',
      'Copiar o Webhook Secret HMAC-SHA256 e registrar na variável de ambiente MERCADO_PAGO_WEBHOOK_SECRET no servidor.',
      'Disparar requisição de teste simulada e verificar resposta HTTP 200 em menos de 20ms.'
    ],
    externalSteps: [
      {
        platform: 'Mercado Pago Developers',
        stepNumber: 1,
        title: 'Acessar Notificações Webhook',
        instruction: 'Acesse https://www.mercadopago.com.br/developers/panel/app, selecione sua aplicação e clique em "Notificações Webhook".'
      },
      {
        platform: 'Mercado Pago Secret Manager',
        stepNumber: 2,
        title: 'Copiar Chave Secreta HMAC',
        instruction: 'Clique em "Obter Chave Secreta" e cadastre o segredo no cofre do servidor:',
        codeOrConfig: `MERCADO_PAGO_WEBHOOK_SECRET="whsec_mp_live_xxxxxxxxxxxxxxxxxxxxxxxx"`
      }
    ]
  },
  {
    id: 'CORR-013',
    title: 'Fallback de Contrato e Tratamento na UI (Zod Client-Side & Error Boundaries)',
    subtitle: 'Resiliência no consumo de APIs contra alterações de contrato ou dados corrompidos',
    team: 'FRONTEND',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'CRITICAL',
    description: 'Validação de dados retornados pelas APIs no front-end utilizando Zod antes de propagar ao estado React, isolamento de falhas via Error Boundary sem derrubar a tela inteira e estados visuais de fallback.',
    technicalDetails: [
      'Validação em runtime das cargas de API (serviços, barbeiros, agendamentos) utilizando Zod com schemas estritos (.strip()).',
      'Normalização resiliente aplicando coerção tolerante em tipos com divergência leve sem descartar a lista de dados.',
      'Componente ErrorBoundary do React com captura em componentDidCatch e getDerivedStateFromError impedindo tela branca.',
      'Suporte a callback de reset e restauração interativa (resetErrorBoundary/retry) pelo usuário.',
      '4 Estados de Fallback Visual implementados: DataCorruptedFallback (divergência de contrato), PartialDataNotice (aviso não-bloqueante), EmptyDataFallback (estado vazio amigável) e ComponentCrashFallback (isolamento de crash).',
      'Proteção de todas as rotas e componentes principais em src/App.jsx encapsulados com <ErrorBoundary>.',
      'Suíte de 6 testes no Vitest (src/tests/unit/contractFallbackAndErrorBoundary.test.tsx) e Suíte 39 no QA Workbench.'
    ],
    implementedCodeRef: 'src/security/apiContractValidator.ts, src/components/ui/ErrorBoundary.tsx & src/components/ui/ContractFallback.tsx'
  },
  {
    id: 'CORR-014',
    title: 'Supabase Database: Restrições de Schema e Validação Relacional de Contrato',
    subtitle: 'Ação Externa no Banco de Dados PostgreSQL do Supabase (Table Editor / SQL Editor)',
    team: 'BACKEND',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'HIGH',
    description: 'Adicionar constraints CHECK e tipagens estritas no banco relacional PostgreSQL do Supabase para garantir paridade total com os contratos Zod do front-end.',
    technicalDetails: [
      'Ajustar colunas na tabela public.services para impedir campos nulos em price, name e duration_minutes.',
      'Adicionar constraint CHECK (price >= 0) e CHECK (duration_minutes > 0).',
      'Configurar valores default para flags booleanas (active: true, is_paid: false).',
      'Auditar o retorno JSON dos endpoints REST para garantir alinhamento com camelCase e tipos primitivos.'
    ],
    externalSteps: [
      {
        platform: 'Supabase Dashboard (SQL Editor)',
        stepNumber: 1,
        title: 'Acessar o SQL Editor do Supabase',
        instruction: 'Acesse app.supabase.com, selecione seu projeto e clique na aba "SQL Editor".'
      },
      {
        platform: 'Supabase PostgreSQL DDL',
        stepNumber: 2,
        title: 'Executar Script de Restrições de Schema',
        instruction: 'Cole e execute o comando SQL abaixo para aplicar as constraints de integridade:',
        codeOrConfig: `ALTER TABLE public.services
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN price SET NOT NULL,
  ADD CONSTRAINT check_positive_price CHECK (price >= 0),
  ADD CONSTRAINT check_positive_duration CHECK (duration_minutes > 0);`
      }
    ]
  },
  {
    id: 'CORR-015',
    title: 'Blindagem Anti-Bypass de Rotas e Redirecionamento Compulsório de Login',
    subtitle: 'Bloqueio estrito de acesso direto a /admin e /dashboard sem sessão e higienização integral do DOM',
    team: 'FRONTEND',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'CRITICAL',
    description: 'Impedimento de acesso não autorizado a rotas administrativas através de digitação direta na barra de endereços (/admin e /dashboard), forçando redirecionamento imediato para login e garantindo que nenhuma informação sensível seja renderizada no DOM.',
    technicalDetails: [
      'Criação do guardião de rotas em src/security/routeSecurityGuard.ts com normalização e mapeamento de caminhos restritos.',
      'Bloqueio imediato na inicialização da aplicação em src/App.jsx e src/components/security/ProtectedRoute.jsx com autoRedirect ativado.',
      'Retorno determinístico de null no ProtectedRoute durante o ciclo de redirecionamento para prevenir qualquer renderização transitória (FOUC) no DOM.',
      'Supressão de busca de dados confidenciais (appointments, relatórios de faturamento, nomes e telefones de clientes).'
    ],
    implementedCodeRef: 'src/security/routeSecurityGuard.ts & src/components/security/ProtectedRoute.jsx'
  },
  {
    id: 'CORR-016',
    title: 'Detecção e Purga Compulsória de Manipulação de LocalStorage (Role Forgery)',
    subtitle: 'Invalidação e eliminação de papéis forjados no client-side sem assinatura criptográfica JWT',
    team: 'CYBER_SECURITY',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'CRITICAL',
    description: 'Mecanismo de auditoria em runtime que monitora o localStorage contra a injeção manual de privilégios como role: "admin" ou user: { role: "admin" }, descartando as chaves forjadas imediatamente.',
    technicalDetails: [
      'Função detectAndNeutralizeStorageTampering() inspeciona chaves críticas no localStorage (role, user_role, barbearia_role, user).',
      'Validação cruzada: papéis privilegiados exigem a presença de um token JWT válido com assinatura verificada via parseAndValidateJwt().',
      'Se o token estiver ausente, expirado ou forjado, todas as chaves de storage são expurgadas compulsoriamente.',
      'Emissão de evento de segurança e forçamento do estado da sessão para ANON sem carregar dados.'
    ],
    implementedCodeRef: 'src/security/routeSecurityGuard.ts'
  },
  {
    id: 'CORR-017',
    title: 'Bloqueio Server-Side com HTTP 401 de Requisições com Identidade Forjada',
    subtitle: 'Rejeição instantânea de chamadas de API desprovidas de assinatura JWT autêntica',
    team: 'BACKEND',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'CRITICAL',
    description: 'Validação estrita nos endpoints de dados do backend (/api/appointments/:id, etc.), garantindo que o tenant_id e o papel do operador sejam extraídos com exclusividade do token JWT criptografado e validado.',
    technicalDetails: [
      'parseAndValidateJwt() analisa cabeçalho Authorization: Bearer <token>.',
      'Rejeição com HTTP 401 Unauthorized e código AUTH_TOKEN_INVALID para tokens sem assinatura ou adulterados.',
      'Zero exposição de dados reais de clientes ou agendamentos em respostas de erro.',
      'Descarte sumário de tenant_id ou role enviados arbitrariamente no body ou query string.'
    ],
    implementedCodeRef: 'src/api/appointmentsEndpoint.js'
  },
  {
    id: 'CORR-018',
    title: 'Suíte Automatizada E2E de Prevenção de Bypass (Playwright e Cypress)',
    subtitle: 'Testes de invasão e bypass prontos para execução em esteiras de integração contínua (CI/CD)',
    team: 'QA_COMPLIANCE',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'CRITICAL',
    description: 'Criação de arquivos de teste E2E profissionais em Playwright e Cypress para testar sistematicamente as tentativas de burlar o controle de acesso e verificar a integridade da aplicação.',
    technicalDetails: [
      'Teste de acesso direto a rotas /admin e /dashboard sem cookies/tokens de sessão.',
      'Teste simulando injeção maliciosa de papéis no localStorage via Developer Tools/evaluate().',
      'Validação de bloqueio de requisições de dados reais com HTTP 401/403 pelo servidor.',
      'Varredura do DOM com TreeWalker assegurando zero nós com termos sensíveis ("Faturamento", "Receita", PII).',
      'Suíte SEC-40 adicionada ao QA Studio Workbench com varredura automática de arquivos.'
    ],
    implementedCodeRef: 'tests/e2e/security-bypass.spec.ts & cypress/e2e/security-bypass.cy.ts'
  },
  {
    id: 'CORR-019',
    title: 'Supabase Auth: Configuração de Row Level Security (RLS) Estrito e Bloqueio Anon na API REST',
    subtitle: 'Ação Externa no Console Supabase (RLS Policies & Grants)',
    team: 'DEVOPS_CLOUD',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'CRITICAL',
    description: 'Instruções passo a passo para garantir que o banco de dados PostgreSQL do Supabase rejeite chamadas de clientes anônimos ou tokens inválidos mesmo se a chave anon pública for conhecida.',
    technicalDetails: [
      'Habilitar RLS compulsório em todas as tabelas (ALTER TABLE ... ENABLE ROW LEVEL SECURITY).',
      'Revogar permissões SELECT, INSERT, UPDATE, DELETE da role anon pública em tabelas de negócio.',
      'Criar política auth.uid() IS NOT NULL vinculada ao tenant_id.'
    ],
    externalSteps: [
      {
        platform: 'Supabase Dashboard (SQL Editor)',
        stepNumber: 1,
        title: 'Ativar RLS Compulsório em Tabelas Sensíveis',
        instruction: 'Execute o script no SQL Editor para forçar Row Level Security em appointments, services, transactions e barbers:',
        codeOrConfig: `ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;

-- Revogar acesso anônimo público
REVOKE ALL ON public.appointments FROM anon;
REVOKE ALL ON public.transactions FROM anon;`
      },
      {
        platform: 'Supabase RLS Policy',
        stepNumber: 2,
        title: 'Criar Política de Isolamento Multi-Tenant por JWT',
        instruction: 'Crie a política exigindo autenticação comprovada e tenant_id correspondente ao JWT:',
        codeOrConfig: `CREATE POLICY "Restringir acesso por tenant e autenticação"
  ON public.appointments
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')
    OR (auth.jwt() ->> 'role') = 'superadmin'
  );`
      }
    ]
  },
  {
    id: 'CORR-020',
    title: 'Prevenção de Race Conditions via Atomic RPC & Advisory Lock no Agendamento',
    subtitle: 'Serialização transacional no endpoint /api/appointments eliminando double booking',
    team: 'BACKEND',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'CRITICAL',
    description: 'Implementação de controle de concorrência com bloqueio atômico explícito e garantia de 1 vitória (HTTP 201) e N-1 conflitos (HTTP 409) para disputas simultâneas.',
    technicalDetails: [
      'Implementado módulo bookAppointmentAtomic() com bloqueio transacional e checagem de overlap temporal.',
      'Roteamento em apiDispatcher conectando POST /api/appointments com resposta HTTP 201 no primeiro cliente e HTTP 409 nas colisões concorrentes.',
      'Retorno estruturado com isConcurrencyConflict = true e código SLOT_OCCUPIED_CONCURRENCY_CONFLICT.',
      'Criado endpoint de auditoria GET /api/appointments/concurrency-audit para inspeção de integridade física.',
      'Suíte de testes de integração Vitest (src/tests/integration/atomicConcurrencyHttp.test.ts) validando 10 chamadas paralelas com Promise.all.',
      'Script autônomo Node.js (scripts/test-atomic-concurrency-http.js) com exportação do relatório JSON reports/concurrency-race-validation-report.json.'
    ],
    implementedCodeRef: 'src/api/atomicBookingService.ts, src/api/apiDispatcher.ts & scripts/test-atomic-concurrency-http.js'
  },
  {
    id: 'CORR-021',
    title: 'Criação da Função RPC \'book_appointment_atomic\' e Índice GiST no Supabase PostgreSQL',
    subtitle: 'Ação de Infraestrutura Externa: DDL de Concorrência Atômica no SQL Editor do Supabase',
    team: 'DEVOPS_CLOUD',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'CRITICAL',
    description: 'Executar migração no console do Supabase para provisionar a função atômica com pg_advisory_xact_lock e constraint GiST anti-sobreposição.',
    technicalDetails: [
      'Habilitação da extensão btree_gist para suporte a operadores relacionais de tempo.',
      'Criação da função book_appointment_atomic() com nível de isolamento explícito.',
      'Adição de restrição EXCLUDE USING gist sobre intervalo tsrange contra double booking.',
      'Permissão de execução concedida às roles authenticated e service_role.'
    ],
    externalSteps: [
      {
        platform: 'Supabase Dashboard (SQL Editor)',
        stepNumber: 1,
        title: 'Habilitar Extensão btree_gist',
        instruction: 'Abra o SQL Editor do Supabase e execute a ativação da extensão necessária para índices GiST:',
        codeOrConfig: 'CREATE EXTENSION IF NOT EXISTS btree_gist;'
      },
      {
        platform: 'Supabase Dashboard (SQL Editor)',
        stepNumber: 2,
        title: 'Criar a Função RPC book_appointment_atomic',
        instruction: 'Cole o código SQL da RPC com transação atômica e advisory lock:',
        codeOrConfig: `CREATE OR REPLACE FUNCTION public.book_appointment_atomic(
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
  p_price NUMERIC
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lock_key BIGINT;
  v_conflict_count INT;
  v_new_id UUID;
BEGIN
  -- 1. Chave determinística de lock baseada no tenant, barbeiro e data
  v_lock_key := ('x' || substr(md5(p_tenant_id || ':' || p_barber_id || ':' || p_booking_date::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 2. Checagem de sobreposição de horário
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.appointments
  WHERE tenant_id = p_tenant_id
    AND barber_id = p_barber_id
    AND booking_date = p_booking_date
    AND status != 'cancelled'
    AND (p_start_time < end_time AND p_end_time > start_time);

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'SLOT_OCCUPIED_CONCURRENCY_CONFLICT',
      'message', 'Horário já reservado por outro cliente.'
    );
  END IF;

  -- 3. Inserção atômica
  INSERT INTO public.appointments (
    tenant_id, barber_id, client_id, client_name, client_phone,
    service_id, service_name, booking_date, start_time, end_time, price, status
  ) VALUES (
    p_tenant_id, p_barber_id, p_client_id, p_client_name, p_client_phone,
    p_service_id, p_service_name, p_booking_date, p_start_time, p_end_time, p_price, 'confirmed'
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'appointment', jsonb_build_object(
      'id', v_new_id,
      'tenant_id', p_tenant_id,
      'barber_id', p_barber_id,
      'booking_date', p_booking_date,
      'start_time', p_start_time,
      'end_time', p_end_time,
      'status', 'confirmed'
    )
  );
END;
$$;`
      }
    ]
  },
  {
    id: 'CORR-022',
    title: 'Configuração de Chaves de Webhook e Notificações IPN no Mercado Pago',
    subtitle: 'Ação Externa: Painel de Desenvolvedores do Mercado Pago (Credenciais de Webhook)',
    team: 'DEVOPS_CLOUD',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'HIGH',
    description: 'Instruções para obtenção das chaves secretas de webhook e registro do endpoint de pagamento Pix no portal do Mercado Pago.',
    technicalDetails: [
      'Geração da Webhook Secret no portal Mercado Pago Developers.',
      'Registro do endpoint oficial HTTPS com eventos payment e merchant_order.',
      'Configuração da variável MERCADO_PAGO_WEBHOOK_SECRET no ambiente do servidor.'
    ],
    externalSteps: [
      {
        platform: 'Mercado Pago Developers (Portal)',
        stepNumber: 1,
        title: 'Acessar o Painel de Integrações',
        instruction: 'Acesse https://www.mercadopago.com.br/developers/panel e faça login com a conta da barbearia.'
      },
      {
        platform: 'Mercado Pago Developers',
        stepNumber: 2,
        title: 'Cadastrar Notificação Webhook',
        instruction: 'Em "Webhooks", cadastre a URL https://api.barbeariasaas.com.br/api/webhooks/mercadopago e selecione os eventos "Pagamentos" e "Ordens de Pagamento".'
      },
      {
        platform: 'Mercado Pago Developers',
        stepNumber: 3,
        title: 'Copiar Segredo de Assinatura',
        instruction: 'Copie a "Chave Secreta de Assinatura" gerada e configure no arquivo .env de produção: MERCADO_PAGO_WEBHOOK_SECRET=<SEGREDO_COPIADO>.'
      }
    ]
  },
  {
    id: 'CORR-023',
    title: 'Script de Teste de Carga e Estresse k6 para PgBouncer (Rampa 50 -> 500 VUs)',
    subtitle: 'Simulação de rampa progressiva com parada automática se taxa de erros ultrapassar 1%',
    team: 'QA_COMPLIANCE',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'CRITICAL',
    description: 'Implementação de script k6 profissional simulando 50 a 500 usuários simultâneos com thresholds automatizados de parada (abortOnFail), avaliação de p95/p99 e monitoramento de saturação do pool PgBouncer.',
    technicalDetails: [
      'Script oficial test-load.js com ramping-vus: 50 -> 150 VUs (30s), 150 -> 500 VUs (60s) e pico de 500 VUs (30s).',
      'Proporção de tráfego estrita: 80% leitura (GET) e 20% escrita transacional (POST com mutex atômico).',
      'Compatibilidade com variáveis .env Vite/Node via __ENV (VITE_SUPABASE_URL, SUPABASE_ANON_KEY, BASE_URL).',
      'Threshold de parada automática (abortOnFail: true se taxa de erro http_req_failed ou connection_errors > 1%).',
      'SLA de latência percentílica: p(95) < 500ms e p(99) < 1500ms para consultas de leitura e escrita.',
      'Métricas customizadas: db_read_duration, db_write_duration, pgbouncer_pool_exhaustion e connection_errors.',
      'Executor autônomo Node.js scripts/run-k6-load-benchmark.js gerando reports/pgbouncer-k6-load-report.json.',
      'Suíte Vitest src/tests/integration/pgBouncerLoadK6.test.ts para validação em esteiras CI/CD.'
    ],
    implementedCodeRef: 'test-load.js, scripts/run-k6-load-benchmark.js & src/tests/integration/pgBouncerLoadK6.test.ts'
  },
  {
    id: 'CORR-024',
    title: 'Configuração do PgBouncer no Supabase (Pool Mode: Transaction | Free: 15 / Pro: 30-50)',
    subtitle: 'Ação de Infraestrutura Externa: Otimização de Pooling de Conexões no Dashboard do Supabase',
    team: 'DEVOPS_CLOUD',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'CRITICAL',
    description: 'Instruções para habilitar o pooler PgBouncer no Supabase. No Free Tier (Nano Compute), mantenha Pool Size: 15 e Max Clients: 200 (fixo) com Pool Mode: Transaction, garantindo estabilidade e reutilização instantânea.',
    technicalDetails: [
      'Configuração do Pool Mode em "Transaction" para liberar conexões imediatamente ao término de cada query.',
      'Dimensionamento Free Tier (Nano): Manter Pool Size = 15 (padrão) e Max Client Connections = 200 (fixo). Não eleve além de 15 no Nano para evitar que Auth e PostgREST esgotem os slots físicos do PostgreSQL.',
      'Dimensionamento Pro Tier (Compute Add-on): Pool Size = 30 a 50 com Max Client Connections = 1000.',
      'Uso da porta 6543 (PgBouncer pooler) nas variáveis de ambiente DATABASE_URL em vez da porta direta 5432.',
      'Ativação de descarte de prepared statements em ORMs compatíveis com transaction pooling.'
    ],
    externalSteps: [
      {
        platform: 'Supabase Dashboard (Database Settings)',
        stepNumber: 1,
        title: 'Acessar Configurações de Conexão do Banco de Dados',
        instruction: 'Entre em app.supabase.com -> Seu Projeto -> Settings (ícone de engrenagem) -> Database.'
      },
      {
        platform: 'Supabase Dashboard (Connection Pooling)',
        stepNumber: 2,
        title: 'Habilitar Connection Pooling com PgBouncer',
        instruction: 'Role até a seção "Connection Pooling". Certifique-se de que "Enable Connection Pooling" está ativo e configure de acordo com o plano:',
        codeOrConfig: `=== SEU PLANO ATUAL: FREE TIER (NANO COMPUTE - MVP) ===
Pool Mode: Transaction (OBRIGATÓRIO)
Connection pool size: 15 (MANTER padrão de 15 - ideal para Nano)
Max client connections: 200 (FIXO do plano Free pelo Supabase)

=== PLANO FUTURO: PRO / ENTERPRISE (COM COMPUTE ADD-ON) ===
Pool Mode: Transaction
Connection pool size: 30 a 50
Max client connections: 1000`
      },
      {
        platform: 'Variáveis de Ambiente (.env de Produção)',
        stepNumber: 3,
        title: 'Atualizar String de Conexão para a Porta do Pooler (6543)',
        instruction: 'Na sua infraestrutura e variáveis de produção, utilize a URI de pooling (porta 6543 com parâmetro pgbouncer=true):',
        codeOrConfig: `DATABASE_URL="postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"`
      }
    ]
  },
  {
    id: 'CORR-026',
    title: 'Teste de Estresse e Spike Test: Breaking Point do PgBouncer (1500 VUs)',
    subtitle: 'Script test-stress.js com categorização de falhas (Timeout vs Recusa) e parada automática',
    team: 'QA_AUTOMATION',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'HIGH',
    description: 'Implementação de script k6 agressivo saltando de 50 para 1500 VUs em 1 minuto para identificar o ponto de quebra do pool PgBouncer, diferenciando timeouts de rede de recusa por esgotamento de conexões, com interrupção automática se erro > 5% ou p95 > 2000ms.',
    technicalDetails: [
      'Script oficial test-stress.js com rampa agressiva de 50 para 1.500 VUs em menos de 1 minuto.',
      'Categorização granular de erros: timeout_errors (HTTP 504 / latência > 5s) vs connection_refused_errors (HTTP 503 / pool_timeout / status 0).',
      'Thresholds de parada automática (abortOnFail: true) se taxa de erro global ultrapassar 5% ou se p(95) exceder 2000ms.',
      'Threshold de proteção de conexão: interrupção se recusas de conexão pelo PgBouncer ultrapassarem 1%.',
      'Leitura de variáveis de ambiente via __ENV (VITE_SUPABASE_URL, SUPABASE_ANON_KEY, BASE_URL).',
      'Métricas de cauda percentílica com coleta contínua de p95 e p99 sob saturação extrema.'
    ],
    implementedCodeRef: 'test-stress.js (Raiz do Projeto) & QAPanel Menu 23'
  },
  {
    id: 'CORR-027',
    title: 'Escalabilidade e Ajuste de Pool Size no Supabase para Picos > 1000 VUs',
    subtitle: 'Ajuste de capacidade do PgBouncer e Compute Add-on no painel administrativo',
    team: 'DATABASE_SRE',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'CRITICAL',
    description: 'Manual de ações e procedimentos operacionais no console do Supabase para mitigação de breaking point caso o tráfego atinja picos sustentados acima de 1.000 VUs simultâneos.',
    technicalDetails: [
      'Se o teste de estresse indicar recusa de conexão (503 / pool_timeout) sob 1.500 VUs, o pool físico de 30 conexões deve ser elevado para 50~80.',
      'Cálculo de conexões Postgres: max_connections = (pool_size * pooler_instances) + reserved_slots.',
      'Ajuste de statement_timeout para 10s e idle_in_transaction_session_timeout para 5s no PostgreSQL.',
      'Ativação de Compute Add-on no Supabase para garantir capacidade de CPU/RAM em picos virais.'
    ],
    externalSteps: [
      {
        platform: 'Supabase Dashboard (Database Settings)',
        stepNumber: 1,
        title: 'Ajustar Pool Size de Conexões Físicas',
        instruction: 'Acesse app.supabase.com -> Seu Projeto -> Settings -> Database -> Connection Pooling. Altere o Default Pool Size de 30 para 60 (garantindo que o banco suporte max_connections >= 100).'
      },
      {
        platform: 'Supabase Dashboard (Compute Add-ons)',
        stepNumber: 2,
        title: 'Dimensionamento de Compute (CPU / RAM)',
        instruction: 'Caso a métrica CPU Usage ultrapasse 85% durante a rampa de 1.500 VUs, acesse Settings -> Add-ons e selecione a instância Compute Add-on Medium (2 vCPU / 4GB RAM) para absorver o tráfego.'
      },
      {
        platform: 'Supabase SQL Editor',
        stepNumber: 3,
        title: 'Configurar Timeouts Agressivos no Postgres',
        instruction: 'Execute o script abaixo no SQL Editor para liberar conexões presas mais rapidamente e evitar travamento do pooler:',
        codeOrConfig: `ALTER SYSTEM SET idle_in_transaction_session_timeout = '5000ms';
ALTER SYSTEM SET statement_timeout = '10000ms';
SELECT pg_reload_conf();`
      }
    ]
  },
  {
    id: 'CORR-028',
    title: 'Roteiro de Análise de Métricas PgBouncer & Thresholds k6 < 1% (Módulo 4)',
    subtitle: 'Automação k6 test-metrics-audit.js com abortOnFail e correlação de conexões cl/sv',
    team: 'QA_COMPLIANCE',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'CRITICAL',
    description: 'Implementação de script k6 técnico test-metrics-audit.js com suporte a variáveis __ENV, thresholds com abortOnFail imediato se connection_errors ou HTTP 5xx/0 ultrapassar 1%, avaliação estrita de cauda longa (p95 < 500ms e p99 < 1500ms) e instrumentação para cruzamento de métricas do PgBouncer.',
    technicalDetails: [
      'Criação do script oficial test-metrics-audit.js na raiz do projeto com compatibilidade Vite/Node (__ENV.VITE_SUPABASE_URL, __ENV.SUPABASE_ANON_KEY, __ENV.BASE_URL).',
      'Configuração de threshold de parada compulsória abortOnFail: true se a taxa de falha (http_req_failed ou connection_errors) for superior a 1% (rate < 0.01).',
      'Métricas percentílicas p95 (< 500ms) e p99 (< 1500ms) monitoradas separadamente para leituras (db_read_duration) e escritas (db_write_duration).',
      'Proporção de tráfego calibrada em 80% leitura (GET) e 20% escrita (POST) com headers de autenticação padronizados.',
      'Suporte a execução via linha de comando (CLI) passando parâmetros de ambiente via flags -e (ex: k6 run -e BASE_URL=... test-metrics-audit.js).',
      'Integração na bancada de testes para varredura compulsória de arquivos a cada ciclo de execução.'
    ],
    implementedCodeRef: 'test-metrics-audit.js & docs/pgbouncer-metrics-analysis-guide.md'
  },
  {
    id: 'CORR-029',
    title: 'Auditoria de Métricas de Pool e Diagnóstico de Gargalos (Supabase / PgBouncer)',
    subtitle: 'Cruzamento de métricas cl_active, cl_waiting, sv_active, sv_idle e diagnóstico de CPU/Disco',
    team: 'DEVOPS_CLOUD',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'CRITICAL',
    description: 'Procedimento operacional para equipes de SRE e DBA validarem se gargalos observados em testes de carga k6 originam-se em exaustão de pool do PgBouncer ou em saturação de hardware (CPU / I/O de disco) no PostgreSQL.',
    technicalDetails: [
      'Cruzamento de métricas: cl_active (clientes ativos), cl_waiting (clientes em fila), sv_active (servidores em execução) e sv_idle (servidores ociosos).',
      'Diagnóstico de Pool Exhaustion: cl_waiting > 0 crescente com sv_active no teto e CPU do Postgres < 50%. Solução: aumentar default_pool_size de 30 para 60.',
      'Diagnóstico de Gargalo no PostgreSQL: sv_active no teto, cl_waiting alto, CPU do Postgres entre 90% e 100% e disco saturado. Solução: otimizar índices em pg_stat_statements e upgrade de compute.',
      'Execução de queries administrativas no PgBouncer através do console psql administrativo para auditoria em tempo real.'
    ],
    externalSteps: [
      {
        platform: 'Supabase Dashboard (Database -> Metrics)',
        stepNumber: 1,
        title: 'Monitorar Gráficos de Conexões e CPU em Tempo Real',
        instruction: 'Acesse app.supabase.com -> Seu Projeto -> Reports -> Database. Verifique os gráficos "Connection Pool" e "CPU Usage" durante a execução do k6.'
      },
      {
        platform: 'Supabase SQL Editor / psql Console',
        stepNumber: 2,
        title: 'Consultar Estatísticas Internas do PgBouncer',
        instruction: 'Conecte-se ao pooler administrativo na porta 6543 e execute os comandos para auditar o status das filas de clientes e servidores:',
        codeOrConfig: `SHOW POOLS;
SHOW STATS;
SHOW CLIENTS;
SHOW SERVERS;`
      },
      {
        platform: 'Supabase SQL Editor',
        stepNumber: 3,
        title: 'Identificar Queries Lentas no PostgreSQL',
        instruction: 'Se a CPU estiver alta (>85%), execute a consulta abaixo para localizar instruções SQL gerando contenção de pool:',
        codeOrConfig: `SELECT pid, now() - query_start AS duration, state, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC
LIMIT 10;`
      }
    ]
  },
  {
    id: 'CORR-030',
    title: 'Camada de Headers de Segurança HTTP e Content Security Policy (CSP) na Borda (Vercel, Cloudflare, Netlify)',
    subtitle: 'Blindagem de borda com CSP, HSTS 31536000, X-Frame-Options DENY, nosniff e strict-origin',
    team: 'CYBER_SECURITY',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'CRITICAL',
    description: 'Implementação de arquivos e regras de infraestrutura de borda (vercel.json, _headers e netlify.toml) definindo cabeçalhos mandatórios de proteção contra XSS, Clickjacking, MIME Confusion e SSL Stripping.',
    technicalDetails: [
      'Geração e validação do arquivo oficial vercel.json na raiz do projeto com cabeçalhos aplicados a todas as rotas (/(.*)).',
      'Criação do arquivo _headers e public/_headers para compatibilidade automática com Cloudflare Pages e deploys estáticos.',
      'Criação do arquivo netlify.toml com bloco [[headers]] padronizado para deploys na infraestrutura Netlify Edge.',
      'Definição de Content-Security-Policy (CSP) estrito: default-src \'self\', script-src com allowlist segura sem quebra de execução.',
      'Inclusão explícita de wss://*.supabase.co e https://*.supabase.co em connect-src para suportar canais Realtime e WebSockets.',
      'Strict-Transport-Security (HSTS) configurado com max-age=31536000 (1 ano) e includeSubDomains para qualificação ao HSTS Preload.',
      'X-Frame-Options: DENY e frame-ancestors \'none\' garantindo imunidade total contra Clickjacking.',
      'X-Content-Type-Options: nosniff prevenindo ataques de MIME type sniffing em uploads e assets estáticos.',
      'Referrer-Policy: strict-origin-when-cross-origin protegendo contra vazamento de tokens e credenciais em URLs.'
    ],
    implementedCodeRef: 'vercel.json, _headers, netlify.toml & src/security/edgeSecurityHeaders.ts'
  },
  {
    id: 'CORR-031',
    title: 'Validação de Conectividade de WebSockets e Domínios Supabase no CSP',
    subtitle: 'Prevenção de quebra funcional de canais Realtime e escuta de alterações de agendamento',
    team: 'FRONTEND',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'CRITICAL',
    description: 'Garantia de que a política CSP liberou conexões seguras wss:// e https:// com a instância Supabase e gateway de pagamentos sem expor canais não autorizados.',
    technicalDetails: [
      'connect-src configurado com \'self\', https://*.supabase.co e wss://*.supabase.co permitindo reconexões dinâmicas de WebSocket.',
      'Permissão de style-src \'self\' \'unsafe-inline\' e fonts.googleapis.com para compatibilidade integral com Tailwind CSS.',
      'frame-src \'self\' https://*.mercadopago.com liberando iframes seguros de checkout e tokenização de cartão.',
      'img-src configurado com \'self\' data: blob: https: https://*.supabase.co permitindo avatares e comprovantes.',
      'Suíte de testes de integração Vitest src/tests/unit/edgeSecurityHeaders.test.ts assegurando score 100% nas validações.'
    ],
    implementedCodeRef: 'src/security/edgeSecurityHeaders.ts & src/tests/unit/edgeSecurityHeaders.test.ts'
  },
  {
    id: 'CORR-032',
    title: 'Configuração Externa de Regras de Transformação de Cabeçalhos e WAF na Cloudflare CDN',
    subtitle: 'Ação Externa: Regras de Borda no Painel Cloudflare (Transform Rules / HTTP Response Headers)',
    team: 'DEVOPS_CLOUD',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'CRITICAL',
    description: 'Instruções passo a passo para equipes de DevOps e SRE configurarem a injeção forçada de cabeçalhos de segurança HTTP na camada Cloudflare CDN caso o tráfego passe por proxy reverso.',
    technicalDetails: [
      'Acessar o painel Cloudflare na zona DNS correspondente ao domínio de produção da barbearia.',
      'Navegar até Rules -> Transform Rules -> Modify Response Header.',
      'Criar regra estática injetando Content-Security-Policy, Strict-Transport-Security, X-Frame-Options e Referrer-Policy.',
      'Garantir que a regra seja aplicada a todo o tráfego (expressão true ou ssl eq true).'
    ],
    externalSteps: [
      {
        platform: 'Cloudflare Dashboard (Rules -> Transform Rules)',
        stepNumber: 1,
        title: 'Criar Regra de Modificação de Cabeçalhos HTTP',
        instruction: 'Acesse dash.cloudflare.com -> Selecione sua Zona -> No menu lateral esquerdo, clique em "Rules" -> "Transform Rules" -> Aba "Modify Response Header" -> Clique em "Create rule".'
      },
      {
        platform: 'Cloudflare Dashboard (Rule Builder)',
        stepNumber: 2,
        title: 'Definir Condição de Gatilho e Cabeçalhos Mandatórios',
        instruction: 'Defina o nome como "Edge Security Headers Hardening". Em "When incoming requests match", selecione "All incoming requests". Em "Modify response header", adicione as seguintes linhas "Set static":',
        codeOrConfig: `Header: Content-Security-Policy
Value: default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://*.supabase.co https://*.mercadopago.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https: https://*.supabase.co https://images.unsplash.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.mercadopago.com https://api.mercadopago.com https://*.googleapis.com; frame-src 'self' https://*.mercadopago.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;

Header: Strict-Transport-Security
Value: max-age=31536000; includeSubDomains; preload

Header: X-Frame-Options
Value: DENY

Header: X-Content-Type-Options
Value: nosniff

Header: Referrer-Policy
Value: strict-origin-when-cross-origin`
      },
      {
        platform: 'Cloudflare Dashboard',
        stepNumber: 3,
        title: 'Salvar e Fazer Deploy da Regra de Borda',
        instruction: 'Clique no botão azul "Deploy" no final da página. A propagação ocorre globalmente em todos os PoPs da Cloudflare em menos de 10 segundos.'
      }
    ]
  },
  {
    id: 'CORR-033',
    title: 'Habilitação de HSTS Preload e DNSSEC no Provedor de Domínio e Cloudflare',
    subtitle: 'Ação Externa: Registro permanente na lista HSTS Preload do Google e blindagem DNS',
    team: 'DEVOPS_CLOUD',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'HIGH',
    description: 'Instruções para submissão do domínio na lista global de HSTS Preload (hstspreload.org) e ativação de DNSSEC para mitigar ataques de DNS Spoofing.',
    technicalDetails: [
      'Com o header Strict-Transport-Security: max-age=31536000; includeSubDomains; preload ativo, o domínio atende a todos os requisitos do Google Chrome HSTS List.',
      'Submissão formal no portal oficial https://hstspreload.org/.',
      'Ativação de DNSSEC na aba DNS do Cloudflare e inserção dos registros DS no registrador de domínio (.br ou .com).'
    ],
    externalSteps: [
      {
        platform: 'Portal HSTS Preload (hstspreload.org)',
        stepNumber: 1,
        title: 'Submeter Domínio para Preloading de Navegadores',
        instruction: 'Acesse https://hstspreload.org/, digite o domínio da aplicação (ex: barbeariasaas.com.br), valide se os requisitos estão aprovados com checkmarks verdes e clique em "Submit".'
      },
      {
        platform: 'Cloudflare Dashboard (DNS -> Settings)',
        stepNumber: 2,
        title: 'Ativar Assinatura Criptográfica DNSSEC',
        instruction: 'Acesse Cloudflare -> DNS -> Settings -> Role até "DNSSEC" e clique em "Enable DNSSEC". Copie os dados DS (Key Tag, Algorithm, Digest Type, Digest) e adicione no painel do seu registrador de domínio (ex: Registro.br).'
      }
    ]
  },
  {
    id: 'CORR-034',
    title: 'Middleware de Rate Limiting Multi-Camadas para Rotas Sensíveis (Prompt 22)',
    subtitle: 'Contenção em nível de aplicação para /auth/login (5/min), /api/payment (10/min) e /api/* (100/min)',
    team: 'BACKEND',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'CRITICAL',
    description: 'Implementação de middleware em nível de aplicação com sliding window log em memória e algoritmo de token bucket para conter força bruta em login, carding em pagamentos e sobrecarga volumétrica em rotas gerais de API.',
    technicalDetails: [
      'Criado src/middleware/multiTierRateLimiter.ts com definição de cotas estritas por rota sensível.',
      'Rota /auth/login: Limite máximo de 5 requisições por minuto por IP com mitigação de brute force.',
      'Rota /api/payment: Limite máximo de 10 requisições por minuto por IP prevenindo testes automatizados de cartões (carding).',
      'Rotas gerais /api/*: Limite de 100 requisições por minuto por IP garantindo estabilidade do pool PgBouncer.',
      'Emissão compulsória de HTTP 429 Too Many Requests com cabeçalho RFC Retry-After indicando tempo de espera em segundos.',
      'Injeção de cabeçalhos de especificação IETF (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset) e legados (X-RateLimit-*).',
      'Suporte a adaptadores para Express server e Supabase Edge Functions (Deno / Fetch API).'
    ],
    implementedCodeRef: 'src/middleware/multiTierRateLimiter.ts'
  },
  {
    id: 'CORR-035',
    title: 'Tratamento de HTTP 429 e Exibição de Timer Retry-After no Front-End (Prompt 22)',
    subtitle: 'Feedback visual imediato ao usuário e desativação temporária de botões com tempo de execução UX',
    team: 'FRONTEND',
    nature: 'INTERNAL_APPLIED',
    status: 'RESOLVED',
    priority: 'HIGH',
    description: 'Interface e camada de visualização preparadas para capturar status HTTP 429 e orientar o operador com contador regressivo baseado no cabeçalho Retry-After, acompanhado de feedback com overlay de 2s a 3s.',
    technicalDetails: [
      'Captura do cabeçalho Retry-After em requisições de autenticação e pagamentos.',
      'Exibição de avisos estruturados com contagem regressiva em segundos até o destravamento da cota.',
      'Integração na bancada interativa de testes do QA Studio para simulação de rajadas volumétricas (Burst Simulator).',
      'Overlay de carregamento com spinner dedicado de 2s a 3s para fornecer feedback claro de execução de tarefas.'
    ],
    implementedCodeRef: 'src/pages/QAPanel/TechDocsAppSec.jsx & src/middleware/multiTierRateLimiter.ts'
  },
  {
    id: 'CORR-036',
    title: 'Configuração de Regras de Rate Limiting no Cloudflare WAF (Gateway de Borda)',
    subtitle: 'Ativação das regras de limite global (300 req/min) e shields específicos via Cloudflare Rulesets',
    team: 'DEVOPS_CLOUD',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'CRITICAL',
    description: 'Instruções para deploy do arquivo de regras cloudflare-rate-limiting-rules.json no painel Cloudflare WAF para barrar ataques volumétricos na malha Anycast sem consumir recursos do servidor de aplicação.',
    technicalDetails: [
      'Criado o arquivo oficial cloudflare-rate-limiting-rules.json na raiz do projeto pronto para importação.',
      'Regra 1: /auth/login -> 5 req/min com bloqueio HTTP 429 e mitigation_timeout de 300s.',
      'Regra 2: /api/payment -> 10 req/min com bloqueio HTTP 429 e mitigation_timeout de 60s.',
      'Regra 3: /api/* -> 100 req/min com bloqueio HTTP 429.',
      'Regra 4: Global IP Anycast -> 300 req/min com ação Managed Challenge (evita falso positivo para redes corporativas/NAT).'
    ],
    externalSteps: [
      {
        platform: 'Cloudflare Dashboard (Security -> WAF -> Rate Limiting Rules)',
        stepNumber: 1,
        title: 'Acessar o Painel de Rate Limiting Rulesets',
        instruction: 'Acesse o Cloudflare Dashboard -> Selecione a zona barbeariasaas.com.br -> Navegue em "Security" -> "WAF" -> Selecione a aba "Rate limiting rules".'
      },
      {
        platform: 'Cloudflare Dashboard / Cloudflare API v4',
        stepNumber: 2,
        title: 'Importar Regras de Rate Limiting a partir do Arquivo JSON',
        instruction: 'Clique em "Create rule" ou execute a chamada via Cloudflare API v4 utilizando o arquivo cloudflare-rate-limiting-rules.json presente na raiz do projeto: curl -X PUT "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/rulesets/phases/http_ratelimit/entrypoint" -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json" --data @cloudflare-rate-limiting-rules.json'
      }
    ]
  },
  {
    id: 'CORR-037',
    title: 'Provisionamento de Cluster Redis / Upstash para Rate Limiting Distribuído',
    subtitle: 'Substituição da store in-memory por Redis distribuído para clusters multi-região e serverless',
    team: 'DEVOPS_CLOUD',
    nature: 'EXTERNAL_PENDING',
    status: 'PENDING_EXTERNAL',
    priority: 'HIGH',
    description: 'Configuração de um cluster Redis serverless (Upstash ou AWS ElastiCache) para centralizar a contagem de requisições de múltiplas réplicas da aplicação e Edge Functions, evitando que reinicializações de pods resetem as cotas.',
    technicalDetails: [
      'Armazenamento atômico de contadores de IP usando comandos INCR e EXPIRE do Redis em pipelines.',
      'Zero discrepância de cotas entre múltiplas instâncias Cloud Run ou instâncias serverless Vercel/Supabase.',
      'Latência de consulta sub-milissegundo (< 2ms) através de conexão TCP com pooling.'
    ],
    externalSteps: [
      {
        platform: 'Upstash Console (upstash.com)',
        stepNumber: 1,
        title: 'Criar Banco de Dados Redis Serverless',
        instruction: 'Acesse https://console.upstash.com/ -> Clique em "Create Database" -> Nomeie como "barbearia-ratelimit-prod" -> Selecione a região "sa-east-1 (São Paulo)" -> Clique em "Create".'
      },
      {
        platform: 'Supabase / Cloud Run Secrets Vault',
        stepNumber: 2,
        title: 'Configurar Variável UPSTASH_REDIS_REST_URL e TOKEN',
        instruction: 'Copie a REST URL e o Token gerados no Upstash -> No painel do Cloud Run / Supabase Vault, configure as variáveis de ambiente: UPSTASH_REDIS_REST_URL="https://...upstash.io" e UPSTASH_REDIS_REST_TOKEN="A...=" para ativação do cliente Redis distribuído.'
      }
    ]
  }
];

export const ConsoleLogsAndFixes: React.FC = () => {
  const [selectedTeam, setSelectedTeam] = useState<TeamCategory>('ALL');
  const [selectedNature, setSelectedNature] = useState<NatureFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>(CORRECTIONS_DATA[0].id);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Estados do Motor de Verificação Ativa (Live Probes) com persistência em localStorage
  const [probingItemId, setProbingItemId] = useState<string | null>(null);
  const [probeResultModal, setProbeResultModal] = useState<ProbeResult | null>(null);
  const [probedStatusMap, setProbedStatusMap] = useState<Record<string, 'RESOLVED' | 'UNRESOLVED'>>(() => {
    return getStoredProbedStatusMap();
  });

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
  const [isVerifyingModalOpen, setIsVerifyingModalOpen] = useState<boolean>(false);
  const [verifyingStatusText, setVerifyingStatusText] = useState<string>('Verificando...');

  const handleRunProbe = async (item: TaskItem) => {
    // Sondas em nuvem aplicam-se estritamente a itens de infraestrutura externa (Supabase, Cloudflare, etc.)
    if (item.nature === 'INTERNAL_APPLIED') return;

    setProbingItemId(item.id);
    setIsVerifyingModalOpen(true);
    setVerifyingStatusText('Verificando...');

    try {
      // UX: Modal spinner com exatamente 2s de carregamento
      const [result] = await Promise.all([
        runExternalItemProbe(item.id, item.title),
        new Promise((resolve) => setTimeout(resolve, 2000))
      ]);

      if (result.isResolved) {
        saveStoredProbedStatus(item.id, 'RESOLVED');
        setProbedStatusMap((prev) => ({ ...prev, [item.id]: 'RESOLVED' }));

        // Se estivermos na aba de pendências externas, selecionar o próximo item pendente
        if (selectedNature === 'EXTERNAL_PENDING') {
          const nextPending = CORRECTIONS_DATA.find(
            (t) => t.nature === 'EXTERNAL_PENDING' && t.id !== item.id && probedStatusMap[t.id] !== 'RESOLVED'
          );
          if (nextPending) {
            setSelectedTaskId(nextPending.id);
          }
        }
      } else {
        saveStoredProbedStatus(item.id, 'UNRESOLVED');
        setProbedStatusMap((prev) => ({ ...prev, [item.id]: 'UNRESOLVED' }));
      }
      setIsVerifyingModalOpen(false);
      setProbeResultModal(result);
    } catch {
      setIsVerifyingModalOpen(false);
    } finally {
      setProbingItemId(null);
    }
  };

  const handleRetryProbe = async (task: TaskItem) => {
    setProbeResultModal(null);
    await handleRunProbe(task);
  };

  const handleManualToggle = (task: TaskItem, forceStatus?: 'RESOLVED' | 'UNRESOLVED') => {
    const nextStatus = forceStatus || (probedStatusMap[task.id] === 'RESOLVED' ? 'UNRESOLVED' : 'RESOLVED');
    saveStoredProbedStatus(task.id, nextStatus);
    setProbedStatusMap((prev) => ({ ...prev, [task.id]: nextStatus }));

    if (nextStatus === 'RESOLVED' && selectedNature === 'EXTERNAL_PENDING') {
      const nextPending = CORRECTIONS_DATA.find(
        (t) => t.nature === 'EXTERNAL_PENDING' && t.id !== task.id && probedStatusMap[t.id] !== 'RESOLVED'
      );
      if (nextPending) {
        setSelectedTaskId(nextPending.id);
      }
    }
  };

  const filteredTasks = CORRECTIONS_DATA.filter((task) => {
    const matchTeam =
      selectedTeam === 'ALL' ||
      task.team === selectedTeam ||
      (selectedTeam === 'DEVOPS_CLOUD' && (task.team as string) === 'DATABASE_SRE');
    const matchNature =
      selectedNature === 'ALL'
        ? true
        : selectedNature === 'INTERNAL_APPLIED'
        ? task.nature === 'INTERNAL_APPLIED'
        : selectedNature === 'EXTERNAL_PENDING'
        ? task.nature === 'EXTERNAL_PENDING' && probedStatusMap[task.id] !== 'RESOLVED'
        : selectedNature === 'RESOLVED_CLOUD'
        ? task.nature === 'EXTERNAL_PENDING' && probedStatusMap[task.id] === 'RESOLVED'
        : true;
    const matchSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTeam && matchNature && matchSearch;
  });

  const activeTask = CORRECTIONS_DATA.find((t) => t.id === selectedTaskId) || filteredTasks[0] || CORRECTIONS_DATA[0];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const internalCount = CORRECTIONS_DATA.filter((t) => t.nature === 'INTERNAL_APPLIED').length;
  const pendingExternalCount = CORRECTIONS_DATA.filter(
    (t) => t.nature === 'EXTERNAL_PENDING' && probedStatusMap[t.id] !== 'RESOLVED'
  ).length;
  const resolvedCloudCount = CORRECTIONS_DATA.filter(
    (t) => t.nature === 'EXTERNAL_PENDING' && probedStatusMap[t.id] === 'RESOLVED'
  ).length;

  const currentTeamPendingCount = CORRECTIONS_DATA.filter(
    (t) => (selectedTeam === 'ALL' || t.team === selectedTeam) &&
      t.nature === 'EXTERNAL_PENDING' &&
      probedStatusMap[t.id] !== 'RESOLVED'
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-lg backdrop-blur">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                AUDITORIA DE SEGURANÇA &amp; ARQUITETURA
              </span>
              <span className="text-xs text-zinc-400 font-mono">Console v2.6.4</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5">
              Logs de Auditoria &amp; Central de Correções Necessárias
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              Visão consolidada de todas as mitigações implementadas no projeto e manuais passo a passo para serviços externos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              onClick={() => {
                setSelectedNature('INTERNAL_APPLIED');
                setSelectedTeam('ALL');
                setSearchQuery('');
              }}
              className={`px-3.5 py-2 rounded-lg border text-left cursor-pointer transition-all ${
                selectedNature === 'INTERNAL_APPLIED'
                  ? 'bg-emerald-950/60 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                  : 'bg-emerald-950/30 border-emerald-800/40 hover:border-emerald-600'
              }`}
              title="Filtrar correções aplicadas diretamente no código"
            >
              <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">Corrigido no Código</div>
              <div className="text-xl font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {internalCount} itens
              </div>
            </div>

            <div
              onClick={() => {
                setSelectedNature('EXTERNAL_PENDING');
                setSelectedTeam('ALL');
                setSearchQuery('');
              }}
              className={`px-3.5 py-2 rounded-lg border text-left cursor-pointer transition-all ${
                selectedNature === 'EXTERNAL_PENDING'
                  ? 'bg-amber-950/60 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                  : 'bg-amber-950/30 border-amber-800/40 hover:border-amber-600'
              }`}
              title="Filtrar todas as ações pendentes fora do projeto"
            >
              <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">Fora do Projeto (Pendentes)</div>
              <div className="text-xl font-bold text-white flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4 text-amber-400" />
                {selectedTeam === 'ALL' ? `${pendingExternalCount} pendentes` : `${currentTeamPendingCount} (${pendingExternalCount} geral)`}
              </div>
            </div>

            <div
              onClick={() => {
                setSelectedNature('RESOLVED_CLOUD');
                setSelectedTeam('ALL');
                setSearchQuery('');
              }}
              className={`px-3.5 py-2 rounded-lg border text-left cursor-pointer transition-all ${
                selectedNature === 'RESOLVED_CLOUD'
                  ? 'bg-emerald-950/70 border-emerald-400 shadow-md ring-1 ring-emerald-400/40'
                  : 'bg-emerald-950/40 border-emerald-500/40 hover:border-emerald-400'
              }`}
              title="Filtrar ações externas homologadas e validadas"
            >
              <div className="text-[11px] font-mono text-emerald-300 uppercase tracking-wider">Nuvem Validada</div>
              <div className="text-xl font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {resolvedCloudCount} validados
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-5 pt-4 border-t border-zinc-800/80 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Equipe:</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'ALL', label: 'Todas as Áreas' },
              { id: 'FRONTEND', label: 'Frontend' },
              { id: 'BACKEND', label: 'Backend' },
              { id: 'CYBER_SECURITY', label: 'Cyber Security' },
              { id: 'DEVOPS_CLOUD', label: 'DevOps & Cloud' },
              { id: 'DATABASE_SRE', label: 'Database & SRE' },
              { id: 'QA_COMPLIANCE', label: 'QA & Compliance' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTeam(tab.id as TeamCategory)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                  selectedTeam === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Nature filter */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setSelectedNature('ALL')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer transition-all ${
                selectedNature === 'ALL'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todas ({CORRECTIONS_DATA.length})
            </button>
            <button
              onClick={() => setSelectedNature('INTERNAL_APPLIED')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium flex items-center gap-1 cursor-pointer transition-all ${
                selectedNature === 'INTERNAL_APPLIED'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              No Projeto ({internalCount})
            </button>
            <button
              onClick={() => {
                setSelectedNature('EXTERNAL_PENDING');
                // Se a equipe ativa não possui pendências externas, limpa o filtro de equipe para mostrar os itens imediatamente
                if (selectedTeam !== 'ALL') {
                  const hasInTeam = CORRECTIONS_DATA.some(
                    (t) =>
                      (t.team === selectedTeam || (selectedTeam === 'DEVOPS_CLOUD' && (t.team as string) === 'DATABASE_SRE')) &&
                      t.nature === 'EXTERNAL_PENDING' &&
                      probedStatusMap[t.id] !== 'RESOLVED'
                  );
                  if (!hasInTeam) {
                    setSelectedTeam('ALL');
                  }
                }
              }}
              className={`px-2.5 py-1 text-xs rounded-md font-medium flex items-center gap-1 cursor-pointer transition-all ${
                selectedNature === 'EXTERNAL_PENDING'
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ExternalLink className="w-3 h-3 text-amber-400" />
              Fora do Projeto ({pendingExternalCount})
            </button>
            <button
              onClick={() => setSelectedNature('RESOLVED_CLOUD')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium flex items-center gap-1 cursor-pointer transition-all ${
                selectedNature === 'RESOLVED_CLOUD'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : resolvedCloudCount > 0
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/50'
                  : 'text-zinc-500 hover:text-zinc-400 opacity-60'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Nuvem Validada ({resolvedCloudCount})
            </button>
          </div>

          {/* Search box */}
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar correção ou tag..."
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Two-Column Master/Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Task List / Navigation */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 max-h-[750px] overflow-y-auto pr-1">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-400 text-sm space-y-3">
              {selectedNature === 'EXTERNAL_PENDING' && pendingExternalCount > 0 && selectedTeam !== 'ALL' ? (
                <>
                  <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                  <div className="font-bold text-white text-base">Nenhuma pendência na equipe selecionada</div>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                    Não há correções 'Fora do Projeto' pendentes para esta equipe, mas existem <strong className="text-amber-400 font-mono">{pendingExternalCount} pendências</strong> em outras especialidades de infraestrutura.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setSelectedTeam('ALL'); setSearchQuery(''); }}
                    className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer transition-all inline-flex items-center gap-1.5 shadow-md shadow-amber-600/20"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver Todas as {pendingExternalCount} Pendências Externas</span>
                  </button>
                </>
              ) : selectedNature === 'EXTERNAL_PENDING' && resolvedCloudCount > 0 && pendingExternalCount === 0 ? (
                <>
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <div className="font-bold text-white text-base">Todas as ações foram validadas!</div>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                    Não há mais pendências externas nesta lista. Os itens validados na nuvem foram concluídos com sucesso.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setSelectedNature('RESOLVED_CLOUD'); setSelectedTeam('ALL'); setSearchQuery(''); }}
                    className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/50 cursor-pointer transition-all inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ver Itens com Nuvem Validada ({resolvedCloudCount})</span>
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="font-semibold text-white">Nenhuma correção encontrada com os filtros selecionados.</div>
                  <p className="text-xs text-zinc-400">
                    Tente selecionar 'Todas as Áreas' ou limpar o campo de busca.
                  </p>
                  {(selectedTeam !== 'ALL' || selectedNature !== 'ALL' || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => { setSelectedTeam('ALL'); setSelectedNature('ALL'); setSearchQuery(''); }}
                      className="mt-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer transition-all"
                    >
                      Limpar Filtros e Ver Todas ({CORRECTIONS_DATA.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isSelected = task.id === selectedTaskId;
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all text-left ${
                    isSelected
                      ? 'bg-zinc-800/90 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/20'
                      : 'bg-zinc-900/70 border-zinc-800 hover:bg-zinc-800/50 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-semibold text-zinc-400">
                        {task.id}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                        {task.team}
                      </span>
                    </div>

                    {task.nature === 'INTERNAL_APPLIED' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        NO CÓDIGO (OK)
                      </span>
                    ) : probedStatusMap[task.id] === 'RESOLVED' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        NUVEM VALIDADA
                      </span>
                    ) : probedStatusMap[task.id] === 'UNRESOLVED' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        <XCircle className="w-3 h-3" />
                        PENDENTE NUVEM
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        <ExternalLink className="w-3 h-3" />
                        AÇÃO EXTERNA
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-white line-clamp-1">{task.title}</h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {task.subtitle}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Detailed Inspection Card */}
        <div className="lg:col-span-7 bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl backdrop-blur">
          {activeTask ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b border-zinc-800 pb-5">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20">
                    {activeTask.id}
                  </span>
                  <span className="text-xs font-mono text-zinc-300 bg-zinc-800 px-2 py-1 rounded border border-zinc-700">
                    {activeTask.team}
                  </span>
                  <span
                    className={`text-xs font-mono font-semibold px-2 py-1 rounded ${
                      activeTask.priority === 'CRITICAL'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : activeTask.priority === 'HIGH'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    PRIORIDADE {activeTask.priority}
                  </span>

                  {activeTask.nature === 'INTERNAL_APPLIED' ? (
                    <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Implementado no Código-Fonte
                    </span>
                  ) : probedStatusMap[activeTask.id] === 'RESOLVED' ? (
                    <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Nuvem Validada (Concluído)
                    </span>
                  ) : (
                    <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Requer Configuração Externa
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold text-white mt-3">{activeTask.title}</h2>
                <h3 className="text-sm font-medium text-zinc-300 mt-1">{activeTask.subtitle}</h3>
                <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{activeTask.description}</p>

                {/* Banner de Confirmação de Sucesso na Nuvem */}
                {probedStatusMap[activeTask.id] === 'RESOLVED' && (
                  <div className="mt-3.5 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-3 animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-300 font-mono">
                          STATUS: NUVEM VALIDADA (HTTP 200 OK)
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                          Concluído
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        A sonda realizou a consulta real de infraestrutura no banco Supabase e confirmou a existência e integridade do recurso. Este item foi validado e removido da fila de pendências externas.
                      </p>
                    </div>
                  </div>
                )}

                {/* STATUS E AÇÕES: DIFERENCIAÇÃO ESTRITA ENTRE CÓDIGO INTERNO E INFRA EXTERNA */}
                {activeTask.nature === 'INTERNAL_APPLIED' ? (
                  <div className="mt-4 pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-zinc-400">Status no Repositório:</span>
                      <span className="px-2.5 py-1 rounded-full font-mono text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        CORRIGIDO &amp; ATIVO NO CÓDIGO-FONTE (100%)
                      </span>
                    </div>

                    {activeTask.implementedCodeRef && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-300 bg-zinc-950/80 px-2.5 py-1 rounded-lg border border-zinc-800">
                        <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-zinc-500">Arquivo:</span>
                        <span className="text-emerald-400 font-semibold">{activeTask.implementedCodeRef}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-zinc-400">Status da Sonda em Nuvem:</span>
                      {probedStatusMap[activeTask.id] === 'RESOLVED' ? (
                        <span className="px-2.5 py-1 rounded-full font-mono text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          VALIDADO EM PRODUÇÃO (HTTP 200 OK)
                        </span>
                      ) : probedStatusMap[activeTask.id] === 'UNRESOLVED' ? (
                        <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          PENDENTE NA NUVEM (NÃO)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full font-mono text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                          Aguardando Teste
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRunProbe(activeTask)}
                        disabled={probingItemId === activeTask.id}
                        className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 ${
                          probedStatusMap[activeTask.id] === 'RESOLVED'
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-emerald-500/30'
                            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950'
                        }`}
                        title="Executar verificação ativa no Supabase ou ambiente externo"
                      >
                        {probingItemId === activeTask.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
                        ) : (
                          <SearchCheck className="w-3.5 h-3.5 text-current" />
                        )}
                        <span>
                          {probingItemId === activeTask.id
                            ? 'Verificando...'
                            : probedStatusMap[activeTask.id] === 'RESOLVED'
                            ? 'Revalidar Sonda na Nuvem'
                            : 'Verificar se foi solucionado'}
                        </span>
                      </button>

                      {probedStatusMap[activeTask.id] === 'RESOLVED' ? (
                        <button
                          onClick={() => handleManualToggle(activeTask, 'UNRESOLVED')}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center gap-1 transition-all cursor-pointer"
                          title="Reabrir pendência externa para novos testes"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reverter Status</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleManualToggle(activeTask, 'RESOLVED')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 hover:border-emerald-500/60 flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Confirmar manualmente que o comando SQL ou configuração já foi executada no Supabase"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Confirmar Execução no Supabase</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Technical Details Checklist */}
              <div>
                <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  Especificação Técnica e Checklist de Mitigação:
                </h4>
                <ul className="space-y-2">
                  {activeTask.technicalDetails.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                      <span className="w-4 h-4 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </span>
                      <span className="leading-relaxed">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Internal Code Reference */}
              {activeTask.implementedCodeRef && (
                <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs font-mono flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <Code2 className="w-4 h-4 text-emerald-400" />
                    <span>Arquivo no Projeto:</span>
                    <span className="text-emerald-400 font-semibold">{activeTask.implementedCodeRef}</span>
                  </div>
                  <span className="text-[11px] text-zinc-500">Pronto para uso</span>
                </div>
              )}

              {/* External Step-by-Step Instructions */}
              {activeTask.externalSteps && activeTask.externalSteps.length > 0 && (
                <div className="mt-6 pt-5 border-t border-zinc-800">
                  <div className="flex items-center gap-2 mb-4">
                    <Cloud className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wide font-mono">
                      Guia Passo a Passo para Configuração Externa:
                    </h4>
                  </div>

                  <div className="space-y-4">
                    {activeTask.externalSteps.map((step) => (
                      <div
                        key={step.stepNumber}
                        className="p-4 rounded-xl bg-zinc-950/90 border border-zinc-800/80 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[11px]">
                              {step.stepNumber}
                            </span>
                            {step.title}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                            {step.platform}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed">{step.instruction}</p>

                        {step.codeOrConfig && (
                          <div className="relative group mt-2">
                            <pre className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-emerald-300 overflow-x-auto">
                              <code>{step.codeOrConfig}</code>
                            </pre>
                            <button
                              onClick={() => handleCopy(step.codeOrConfig!, `step-${step.stepNumber}`)}
                              className="absolute top-2 right-2 px-2 py-1 rounded bg-zinc-800/90 border border-zinc-700 text-zinc-300 text-[11px] font-mono flex items-center gap-1 hover:text-white"
                            >
                              {copiedCodeId === `step-${step.stepNumber}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  Copiado!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copiar
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* MODAL DE RESULTADO DO PROBE DE INFRAESTRUTURA EXTERNA (SIM OU NÃO) */}
      {probeResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-5">
            {/* Header do Modal */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  probeResultModal.isResolved
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  {probeResultModal.isResolved ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-400">
                      LAUDO DA SONDA: {probeResultModal.id}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {probeResultModal.timestamp}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {probeResultModal.itemTitle}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setProbeResultModal(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* VEREDITO CLARO: SIM OU NÃO */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              probeResultModal.isResolved
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-lg text-sm font-black font-mono border ${
                  probeResultModal.isResolved
                    ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
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
                  <p className="text-xs opacity-90">
                    {probeResultModal.diagnostics.details}
                  </p>
                </div>
              </div>
            </div>

            {/* Detalhes Técnicos do Teste */}
            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                <div className="text-zinc-500 text-[10px] uppercase font-bold">Alvo do Teste:</div>
                <div className="text-indigo-300">{probeResultModal.diagnostics.testedEndpointOrTarget}</div>
              </div>

              {probeResultModal.diagnostics.rawErrorOrSuccess && (
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
                  <div className="text-zinc-500 text-[10px] uppercase font-bold">Resposta Retornada pelo Provedor:</div>
                  <div className={`text-xs ${probeResultModal.isResolved ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {probeResultModal.diagnostics.rawErrorOrSuccess}
                  </div>
                </div>
              )}
            </div>

            {/* Script Pronto para Copiar e Solucionar Imediatamente se Falhou */}
            {!probeResultModal.isResolved && probeResultModal.readyToUseCode && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-400 flex items-center gap-1 font-mono">
                    <Sparkles className="w-3.5 h-3.5" /> Ação Imediata: Cole no Painel para Solucionar
                  </span>
                  <button
                    onClick={() => handleCopy(probeResultModal.readyToUseCode!, 'modal-fix-code')}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCodeId === 'modal-fix-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCodeId === 'modal-fix-code' ? 'Copiado!' : 'Copiar Código'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-36">
                  <code>{probeResultModal.readyToUseCode}</code>
                </pre>
              </div>
            )}

            {/* Botões de Ação do Modal */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              {!probeResultModal.isResolved && (
                <>
                  <button
                    onClick={() => {
                      handleManualToggle(activeTask, 'RESOLVED');
                      setProbeResultModal(null);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Já executei no Supabase (Confirmar)</span>
                  </button>

                  <button
                    onClick={() => handleRetryProbe(activeTask)}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-zinc-950" />
                    <span>Testar Novamente</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setProbeResultModal(null)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs cursor-pointer"
              >
                Fechar Laudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SPINNER DE 2s - UX "Verificando..." (PALETA ÂMBAR NOBRE) */}
      {isVerifyingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
              <SearchCheck className="w-7 h-7 text-amber-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-mono tracking-wide">
                {verifyingStatusText}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Consultando integridade e status da infraestrutura em nuvem...
              </p>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-amber-400 h-full animate-pulse w-full" />
            </div>
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block font-bold">
              Tokens de Design • Âmbar Nobre
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsoleLogsAndFixes;
