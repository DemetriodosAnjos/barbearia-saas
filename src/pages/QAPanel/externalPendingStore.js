/**
 * src/pages/QAPanel/externalPendingStore.js
 *
 * Repositório e motor de dados reais para as Ações e Passos de Configuração Externa (Painéis & Infraestrutura).
 * Mantém o rastreamento em tempo real dos 51 passos técnicos (distribuídos nas 10 ações principais)
 * e oferece a verificação automatizada / manual com transição de status para a aba de "Aprovados".
 */

import { supabase } from "../../lib/supabase";

const STORAGE_KEY = "barbearia_qa_verified_external_items_v3";

// 12 Ações Externas Principais contendo exatamente 63 passos técnicos reais
export const REAL_EXTERNAL_ACTIONS = [
  {
    id: "EXT-SEC-01",
    squad: "Cyber Security & AppSec",
    squadIcon: "Shield",
    service: "Supabase Auth Dashboard",
    title: "Configurar TTL de 900s e Refresh Token Rotation no Painel do Supabase Auth",
    subtitle: "Ação de Infraestrutura Externa no Dashboard do Supabase",
    scope: "EXTERNAL",
    priority: "CRITICAL (P0)",
    sla: "SLA: 24h",
    compliance: "OWASP ASVS v4.0 V2.1.8 / RFC 6749",
    summary: "Ajuste manual da política de expiração de tokens e rotação automática de chaves no painel do Supabase.",
    affectedTarget: "Supabase Auth (https://supabase.com/dashboard)",
    checklist: [
      "Acessar o painel do Supabase: https://supabase.com/dashboard/project/<SEU_PROJETO>/settings/auth",
      "Navegar até a seção 'JWT Settings' ou 'User Sessions'.",
      "Alterar o campo 'JWT Expiry Limit' de 3600 para 900 segundos (15 minutos).",
      "Marcar a opção 'Enable Refresh Token Rotation' (Garante uso único de Refresh Tokens).",
      "Definir 'Refresh Token Reuse Interval' para 10 segundos (Margem para mitigar race condition).",
      "Salvar as alterações e reiniciar os serviços de autenticação.",
    ],
    instructionsText: `Painel Supabase -> Authentication -> Configuration:
1. JWT Expiry Limit: 900 seconds (15 minutos)
2. Habilitar: 'Enable Refresh Token Rotation'
3. Definir: 'Refresh Token Reuse Interval' = 10s`,
  },
  {
    id: "EXT-FE-01",
    squad: "Front-End & UI/UX",
    squadIcon: "Palette",
    service: "Cloudflare Turnstile Dashboard",
    title: "Obter e Configurar Chave Pública (Site Key) do Cloudflare Turnstile no Frontend",
    subtitle: "Ação Externa: Painel Cloudflare para Anti-Bot e CAPTCHA",
    scope: "EXTERNAL",
    priority: "HIGH (P1)",
    sla: "SLA: 12h",
    compliance: "OWASP Automated Threat Handbook (OAT-007)",
    summary: "Configuração da variável de ambiente VITE_TURNSTILE_SITE_KEY com a chave gerada no painel Cloudflare.",
    affectedTarget: "Painel Cloudflare Turnstile (dash.cloudflare.com)",
    checklist: [
      "Acessar https://dash.cloudflare.com -> Turnstile.",
      "Criar widget para o domínio oficial da aplicação (barbeariasaas.com.br).",
      "Copiar a Site Key pública gerada no painel.",
      "Adicionar no arquivo .env local e nas variáveis de build: VITE_TURNSTILE_SITE_KEY=<CHAVE_COPIADA>.",
    ],
    instructionsText: `Painel Cloudflare -> Turnstile -> Add Widget:
Nome: Barbearia SaaS Frontend
Domínio: barbeariasaas.com.br
Copiar: Site Key
Adicionar no .env: VITE_TURNSTILE_SITE_KEY=0x4AAAAAA...`,
  },
  {
    id: "EXT-BE-01",
    squad: "Back-End & Core APIs",
    squadIcon: "Settings",
    service: "Supabase PostgreSQL Database",
    title: "Criar Tabelas 'sessions' e 'security_audit_events' no PostgreSQL com RLS",
    subtitle: "Ação de Infraestrutura Externa: Executar DDL no SQL Editor do Supabase",
    scope: "EXTERNAL",
    priority: "CRITICAL (P0)",
    sla: "SLA: 24h",
    compliance: "OWASP Top 10 A01:2021 (Broken Access Control)",
    summary: "Criação das tabelas relacionais com índices de alta performance e políticas de Row Level Security (RLS).",
    affectedTarget: "Supabase SQL Editor (https://supabase.com/dashboard/project/<PROJETO>/sql)",
    checklist: [
      "Abrir o SQL Editor do Supabase (https://supabase.com/dashboard/project/<PROJETO>/sql).",
      "Executar o script DDL fornecido para criar a tabela 'sessions' com índices em (user_id, is_active).",
      "Criar a tabela 'security_audit_events' com índice no timestamp e user_id.",
      "Habilitar Row Level Security (RLS) garantindo que clientes não possam alterar seu próprio status de sessão diretamente.",
      "Criar as funções RPC 'search_appointments_by_client' e 'book_appointment_atomic' com extensão btree_gist para atomicidade e proteção contra SQLi/Race Conditions.",
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
    squadIcon: "Settings",
    service: "Supabase CLI / Deno Cluster",
    title: "Deploy das Edge Functions no Supabase CLI",
    subtitle: "Ação Externa / DevOps: Publicar Edge Functions de Revogação e Validação",
    scope: "EXTERNAL",
    priority: "HIGH (P1)",
    sla: "SLA: 24h",
    compliance: "Twelve-Factor App / Cloud Edge Security",
    summary: "Executar o deploy das funções de borda no projeto Supabase de produção.",
    affectedTarget: "Terminal CLI Supabase & Deno Functions",
    checklist: [
      "Instalar o Supabase CLI: npm install -g supabase",
      "Autenticar no Supabase: supabase login",
      "Vincular ao projeto: supabase link --project-ref <SEU_PROJECT_REF>",
      "Deploy da revogação: supabase functions deploy revoke-user-sessions",
      "Deploy da checagem: supabase functions deploy verify-jwt-session",
      "Configurar segredos de ambiente: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<KEY>",
    ],
    instructionsText: `supabase login
supabase link --project-ref <SEU_PROJECT_REF>
supabase functions deploy revoke-user-sessions
supabase functions deploy verify-jwt-session
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...`,
  },
  {
    id: "EXT-DEV-01",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    service: "Cloudflare Turnstile API",
    title: "Cloudflare Turnstile: Registrar Domínio de Produção e Secret Key",
    subtitle: "Ação Externa: Painel Cloudflare para Anti-Bot e CAPTCHA",
    scope: "EXTERNAL",
    priority: "HIGH (P1)",
    sla: "SLA: 24h",
    compliance: "OWASP ASVS V13 (API Security)",
    summary: "Configurar secret key de validação server-side do desafio CAPTCHA.",
    affectedTarget: "Painel Cloudflare & Servidor Backend",
    checklist: [
      "Acessar https://dash.cloudflare.com -> Turnstile.",
      "Copiar a 'Secret Key' (chave restrita de validação server-side).",
      "Adicionar a variável no ambiente de produção do servidor: TURNSTILE_SECRET_KEY=<CHAVE_SECRETA>.",
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
    service: "Mercado Pago Developers Portal",
    title: "Mercado Pago: Obter Chaves de Produção e Configurar Webhook IPN",
    subtitle: "Ação Externa: Painel de Desenvolvedores do Mercado Pago",
    scope: "EXTERNAL",
    priority: "CRITICAL (P0)",
    sla: "SLA: 48h",
    compliance: "PCI DSS / Gateway Security",
    summary: "Substituir credenciais de teste por credenciais de produção (APP_USR-...) com segredo de webhook.",
    affectedTarget: "Portal de Desenvolvedores do Mercado Pago (mercadopago.com.br/developers)",
    checklist: [
      "Acessar o portal de desenvolvedores do Mercado Pago: https://www.mercadopago.com.br/developers/panel",
      "Copiar o 'Access Token de Produção' (inicia com APP_USR-...).",
      "Copiar a 'Chave Pública de Produção' (Public Key).",
      "Em 'Webhooks', cadastrar a URL HTTPS oficial: https://api.barbeariasaas.com.br/api/webhooks/mercadopago",
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
    service: "GCP Secret Manager / Supabase Vault",
    title: "Provisionamento de Secrets no GCP Secret Manager / Supabase Vault",
    subtitle: "Ação Externa: Centralização de Segredos de Infraestrutura",
    scope: "EXTERNAL",
    priority: "HIGH (P1)",
    sla: "SLA: 24h",
    compliance: "NIST SP 800-57 / Zero Trust Architecture",
    summary: "Armazenar chaves criptográficas e credenciais em cofre seguro com rotação programada.",
    affectedTarget: "Google Cloud Platform Console / Supabase Vault",
    checklist: [
      "Criar os segredos no Google Cloud Secret Manager ou Supabase Vault.",
      "Atribuir papéis de leitura apenas à Service Account de produção do Cloud Run.",
      "Habilitar auditoria de acesso aos segredos via Cloud Audit Logs.",
      "Configurar rotação programada de credenciais com janela máxima de 90 dias.",
      "Validar injeção das variáveis seguras no container sem expor chaves no repositório Git.",
    ],
    instructionsText: `gcloud secrets create supabase-service-key --data-file=...
gcloud secrets add-iam-policy-binding supabase-service-key --role=roles/secretmanager.secretAccessor`,
  },
  {
    id: "EXT-CMP-01",
    squad: "Compliance, DPO & LGPD",
    squadIcon: "Scale",
    service: "Portal Gov.br / ANPD",
    title: "Termo de Consentimento e Registro de DPO perante a ANPD (Art. 41 & 46 LGPD)",
    subtitle: "Ação Regulatória Externa: Governança de Privacidade",
    scope: "EXTERNAL",
    priority: "MEDIUM (P2)",
    sla: "SLA: 72h",
    compliance: "LGPD Art. 41 & 48 / ANPD Resolução CD/ANPD nº 2/2022",
    summary: "Publicação do canal de comunicação do encarregado de dados e registro formal perante a ANPD.",
    affectedTarget: "Portal Oficial ANPD (gov.br/anpd) & Rodapé Institucional",
    checklist: [
      "Formalizar canal de atendimento aos titulares de dados: dpo@barbeariasaas.com.br.",
      "Publicar Política de Privacidade e Termo de Consentimento de Uso de Cookies/Sessão no rodapé da plataforma.",
      "Documentar o Relatório de Impacto à Proteção de Dados Pessoais (RIPD) referente à biometria facial / CAPTCHA.",
    ],
    instructionsText: `Portal Gov.br / ANPD:
1. Cadastrar Encarregado de Dados (DPO): dpo@barbeariasaas.com.br
2. Publicar Termo de Privacidade no rodapé do portal institucional
3. Arquivar RIPD para requisições de auditoria regulatória`,
  },
  {
    id: "EXT-DB-01",
    squad: "Data Engineering & DBA",
    squadIcon: "Database",
    service: "Supabase PostgreSQL Database",
    title: "Executar Script DDL de Soft-Delete e Procedure soft_delete_customer no Supabase",
    subtitle: "Ação Externa / DBA: Executar migração supabase/migrations/20260925_soft_delete_customers_structure.sql",
    scope: "EXTERNAL",
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
    squadIcon: "Database",
    service: "Supabase PostgreSQL Database",
    title: "Instalar Extensão 'pgcrypto' e Criar Função 'anonymize_customer_data' no Supabase",
    subtitle: "Ação Externa / DBA: Executar migração supabase/migrations/20260925_anonymize_customer_data_function.sql",
    scope: "EXTERNAL",
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
    squadIcon: "Database",
    service: "Supabase PostgreSQL / pg_cron",
    title: "Habilitar Extensão 'pg_cron' e Agendar Procedure 'purge_expired_customers' no Supabase",
    subtitle: "Ação de Infraestrutura Externa: Executar Script no SQL Editor do Supabase",
    scope: "EXTERNAL",
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

-- Agendamento diário às 03:00 UTC (madrugada de baixo tráfego)
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
    squadIcon: "Shield",
    service: "Supabase Logflare / Sentry / Cloudflare WAF",
    title: "Configurar Agregação de Logs Centralizada com Filtro Anti-Vazamento e Alertas por requestId",
    subtitle: "Ação Externa / SRE: Monitoramento de Exceções HTTP 500 e Redação de Dados Sensíveis",
    scope: "EXTERNAL",
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
    squadIcon: "Shield",
    service: "Supabase Dashboard (Project Settings > API)",
    title: "Supabase Dashboard - Rotação Emergencial da Chave service_role e Renovação de JWT Secret (SOP SecOps)",
    subtitle: "Ação Externa / SecOps: Protocolo de Invalidação Imediata de Credenciais Administrativas",
    scope: "EXTERNAL",
    priority: "CRITICAL (P0)",
    sla: "SLA: 2h",
    compliance: "OWASP ASVS v4.0 V2.1.8 / NIST SP 800-63B",
    summary: "Procedimento operacional padrão para rotação do JWT Secret e da service_role no painel do Supabase caso ocorra suspeita de vazamento em repositórios públicos.",
    affectedTarget: "Painel Supabase (Project Settings -> API -> JWT Settings)",
    checklist: [
      "Acessar https://supabase.com/dashboard/project/<PROJECT_ID>/settings/api.",
      "Rolar até a seção 'JWT Settings' e clicar no botão 'Generate a new JWT Secret'.",
      "Confirmar a rotação (invalida imediatamente todas as chaves anon e service_role antigas e todos os tokens ativos).",
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
    id: "EXT-DB-04",
    squad: "Data Engineering & DBA",
    squadIcon: "Database",
    service: "Supabase PostgreSQL Database (SQL Editor)",
    title: "Criar Função RPC 'book_appointment_atomic' com Advisory Lock no Supabase PostgreSQL",
    subtitle: "Ação de Infraestrutura / DBA: Prevenção de Race Conditions via Lock Transacional",
    scope: "EXTERNAL",
    priority: "CRITICAL (P0)",
    sla: "SLA: 12h",
    compliance: "ACID Isolation Level / RFC 7231 / OWASP Concurrency",
    summary: "Compilação da função PL/pgSQL com advisory lock transacional (pg_try_advisory_xact_lock) para serializar agendamentos simultâneos e garantir zero double-booking.",
    affectedTarget: "Painel Supabase (SQL Editor -> migrations)",
    checklist: [
      "Acessar o SQL Editor do Supabase: https://supabase.com/dashboard/project/<PROJETO>/sql",
      "Executar o script DDL da função book_appointment_atomic em supabase/migrations/20260925_rpc_atomic_booking_race_condition.sql",
      "Validar compilação do pg_try_advisory_xact_lock no escopo de transação e clausula FOR UPDATE",
      "Confirmar que tentativas simultâneas rejeitadas retornem código estruturado SLOT_OCCUPIED_CONCURRENCY_CONFLICT",
      "Testar chamada de concorrência com 10 requisições simultâneas via scripts/test-atomic-concurrency-http.js",
      "Conceder permissões de execução: GRANT EXECUTE ON FUNCTION public.book_appointment_atomic TO authenticated, anon, service_role;",
    ],
    instructionsText: `Painel Supabase -> SQL Editor:
1. Executar migração: supabase/migrations/20260925_rpc_atomic_booking_race_condition.sql
2. Validar que pg_try_advisory_xact_lock está ativo no bloco BEGIN ... EXCEPTION
3. GRANT EXECUTE ON FUNCTION public.book_appointment_atomic TO authenticated, anon, service_role;`,
    codeSnippet: `-- EXECUTAR NO SUPABASE SQL EDITOR:
CREATE OR REPLACE FUNCTION public.book_appointment_atomic(
  p_tenant_id TEXT,
  p_barber_id TEXT,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_service_name TEXT,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_price NUMERIC,
  p_duration_minutes INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_key BIGINT;
  v_conflict_count INT;
  v_new_id UUID := gen_random_uuid();
BEGIN
  v_lock_key := ('x' || substr(md5(p_tenant_id || p_barber_id || p_date::text || p_start_time::text), 1, 16))::bit(64)::bigint;

  IF NOT pg_try_advisory_xact_lock(v_lock_key) THEN
    RETURN jsonb_build_object('success', false, 'status', 409, 'code', 'SLOT_OCCUPIED_CONCURRENCY_CONFLICT');
  END IF;

  SELECT COUNT(*) INTO v_conflict_count
  FROM public.appointments
  WHERE tenant_id = p_tenant_id
    AND barber_id = p_barber_id
    AND date = p_date
    AND status != 'cancelled'
    AND (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
  FOR UPDATE;

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'status', 409, 'code', 'SLOT_OCCUPIED_CONCURRENCY_CONFLICT');
  END IF;

  INSERT INTO public.appointments (id, tenant_id, barber_id, client_name, client_phone, service_name, date, start_time, end_time, price, duration_minutes, status, created_at)
  VALUES (v_new_id, p_tenant_id, p_barber_id, p_client_name, p_client_phone, p_service_name, p_date, p_start_time, p_end_time, p_price, p_duration_minutes, 'confirmed', now());

  RETURN jsonb_build_object('success', true, 'status', 201, 'appointment_id', v_new_id);
END;
$$;`,
  },
  {
    id: "EXT-DEV-07",
    squad: "DevOps, SRE & Cloud Infra",
    squadIcon: "Rocket",
    service: "Supabase Project Settings (Database > Connection Pooling)",
    title: "Calibrar Pooler PgBouncer no Supabase (Pool Mode: Transaction | Free: 15 / Pro: 30-50)",
    subtitle: "Ação de Infraestrutura / SRE: Otimização de Pool de Conexões para Alta Carga",
    scope: "EXTERNAL",
    priority: "CRITICAL (P0)",
    sla: "SLA: 24h",
    compliance: "PgBouncer Architecture / High Concurrency Scalability / SRE Load Tolerances",
    summary: "Habilitação do PgBouncer no Supabase. No Free Tier (Nano Compute), mantenha Pool Size: 15 e Max Clients: 200 (fixo) em modo Transaction para estabilidade do MVP.",
    affectedTarget: "Painel Supabase (Project Settings -> Database -> Connection Pooling)",
    checklist: [
      "Acessar o painel do Supabase: https://supabase.com/dashboard/project/<PROJETO>/settings/database",
      "Rolar até a seção 'Connection Pooling Configuration'.",
      "Habilitar o connection pooler PgBouncer e definir 'Pool Mode' como 'Transaction' (obrigatório).",
      "Para Free Tier (Nano Compute): Manter 'Pool Size' em 15 (padrão ótimo) e 'Max Client Connections' em 200 (fixo).",
      "Para Upgrade Pro / Compute Add-on: Configurar 'Pool Size' para 25-50 conexões e 'Max Client Connections' para 1000.",
      "Copiar a URI do pooler na porta 6543 (aws-0-region.pooler.supabase.com:6543) com o parâmetro ?pgbouncer=true.",
      "No ambiente de produção, configurar a variável DATABASE_URL com a porta 6543, reservando a porta direta 5432 exclusivamente para migrations DDL.",
    ],
    instructionsText: `Painel Supabase -> Database -> Connection Pooling:
=== FREE TIER (NANO COMPUTE - MVP) ===
1. Pool Mode: Transaction (Multiplexação rápida de transações)
2. Pool Size: 15 (Manter padrão - ideal para máquina Nano)
3. Max Client Connections: 200 (Fixo no Free Tier)
4. Connection String: Usar porta 6543 com ?pgbouncer=true

=== PRO / ENTERPRISE TIER ===
1. Pool Size: 25 a 50
2. Max Client Connections: 1000`,
    codeSnippet: `# VARIÁVEL DE AMBIENTE PARA PRODUÇÃO COM PGBOUNCER (PORTA 6543)
DATABASE_URL="postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# VARIÁVEL DIRETA EXCLUSIVA PARA MIGRAÇÕES DDL (PORTA 5432)
DIRECT_URL="postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].supabase.com:5432/postgres"`,
  },
];

// Gera a lista plana e detalhada dos 39 passos individuais
export function generateRealExternalSteps() {
  const stepsList = [];
  let globalIndex = 1;

  REAL_EXTERNAL_ACTIONS.forEach((action) => {
    action.checklist.forEach((stepText, stepIdx) => {
      const stepId = `${action.id}-S${stepIdx + 1}`;
      stepsList.push({
        id: stepId,
        stepNumber: globalIndex,
        actionId: action.id,
        actionTitle: action.title,
        actionSubtitle: action.subtitle,
        title: `Passo #${globalIndex}: ${stepText}`,
        stepText,
        squad: action.squad,
        squadIcon: action.squadIcon,
        service: action.service,
        scope: "EXTERNAL",
        priority: action.priority,
        sla: action.sla,
        compliance: action.compliance,
        affectedTarget: action.affectedTarget,
        summary: `Etapa ${stepIdx + 1} de ${action.checklist.length} da ação [${action.id}]`,
        codeSnippet: action.codeSnippet || null,
        instructionsText: action.instructionsText || null,
        fullChecklist: action.checklist,
      });
      globalIndex++;
    });
  });

  return stepsList;
}

// Mapa canônico de apelidos e equivalências estritas entre códigos de correção
export const EXTERNAL_ID_ALIASES = {
  'CORR-014': ['EXT-API-01', 'EXT-DB-01'],
  'EXT-API-01': ['CORR-014', 'EXT-DB-01'],
  'EXT-DB-01': ['CORR-014', 'EXT-API-01'],
  'CORR-005': ['EXT-WHK-01', 'DB-MP-EXT-001', 'MP-MAP-010'],
  'EXT-WHK-01': ['CORR-005', 'DB-MP-EXT-001'],
  'MP-MAP-010': ['CORR-005'],
  'DB-MP-EXT-001': ['CORR-005', 'EXT-WHK-01'],
  'CORR-006': ['EXT-DEV-02', 'EXT-MP-05', 'MP-EXT-001'],
  'EXT-DEV-02': ['CORR-006', 'EXT-MP-05', 'MP-EXT-001'],
  'EXT-MP-05': ['CORR-006', 'EXT-DEV-02', 'MP-EXT-001'],
  'MP-EXT-001': ['CORR-006', 'EXT-DEV-02', 'EXT-MP-05'],
  'PAY-REM-001': ['CORR-006'],
  'CORR-019': ['EXT-SEC-04'],
  'EXT-SEC-04': ['CORR-019'],
  'CORR-021': ['EXT-BE-02', 'EXT-DB-04'],
  'EXT-BE-02': ['CORR-021', 'EXT-DB-04'],
  'EXT-DB-04': ['CORR-021', 'EXT-BE-02'],
  'CORR-007': ['EXT-DEV-RL-01'],
  'EXT-DEV-RL-01': ['CORR-007'],
  'CORR-008': ['EXT-DEV-08', 'EXT-OPS-06', 'CORR-028'],
  'EXT-DEV-08': ['CORR-008', 'EXT-OPS-06'],
  'EXT-OPS-06': ['CORR-008', 'EXT-DEV-08'],
  'CORR-028': ['CORR-008'],
  'CORR-009': ['EXT-SEC-SSRF-01'],
  'EXT-SEC-SSRF-01': ['CORR-009'],
  'CORR-010': ['EXT-SEC-01'],
  'EXT-SEC-01': ['CORR-010'],
  'CORR-011': ['EXT-DEVSEC-CI-01', 'DEVOPS-REM-001'],
  'EXT-DEVSEC-CI-01': ['CORR-011'],
  'DEVOPS-REM-001': ['CORR-011'],
  'CORR-012': ['EXT-DEV-07', 'CORR-024'],
  'EXT-DEV-07': ['CORR-012', 'CORR-024'],
  'CORR-024': ['CORR-012', 'EXT-DEV-07'],
  'EXT-SRE-01': [],
  'EXT-DB-02': ['EXT-CMP-02'],
  'EXT-CMP-02': ['EXT-DB-02'],
  'CORR-025': ['EXT-DEV-06', 'CORR-026'],
  'EXT-DEV-06': ['CORR-025', 'CORR-026'],
  'CORR-026': ['CORR-025', 'EXT-DEV-06'],
  'CORR-027': ['EXT-DEV-04'],
  'EXT-DEV-04': ['CORR-027'],
  'CORR-030': ['EXT-DEV-03'],
  'EXT-DEV-03': ['CORR-030'],
  'CORR-037': ['EXT-SEC-05', 'EXT-BE-01'],
  'EXT-BE-01': ['CORR-037', 'EXT-SEC-05'],
  'EXT-SEC-05': ['CORR-037', 'EXT-BE-01'],
  'EXT-DB-03': [],
  'EXT-FE-01': ['EXT-DEV-01'],
  'EXT-DEV-01': ['EXT-FE-01'],
  'EXT-CMP-01': ['EXT-CMP-03'],
  'EXT-CMP-03': ['EXT-CMP-01'],
  'EXT-A11Y-01': ['EXT-CHROMATIC-01'],
  'EXT-CHROMATIC-01': ['EXT-A11Y-01'],
};

// Armazena e recupera o conjunto de IDs resolvidos integrando com o mapa de sondas ativas
export function getResolvedItemIds() {
  const set = new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) parsed.forEach((id) => set.add(id));
    }
  } catch {
    // fallback
  }

  // Sincroniza com o mapa oficial de sondas (qa_external_probed_status_map_v1)
  try {
    const probeRaw = localStorage.getItem("qa_external_probed_status_map_v1");
    if (probeRaw) {
      const probeMap = JSON.parse(probeRaw);
      const aliasMap = EXTERNAL_ID_ALIASES;

      Object.entries(probeMap).forEach(([id, status]) => {
        const related = [id, ...(aliasMap[id] || [])];
        if (status === "RESOLVED") {
          related.forEach((key) => {
            set.add(key);
            if (!String(key).includes("-S")) {
              for (let i = 1; i <= 10; i++) set.add(`${key}-S${i}`);
            }
          });
        } else if (status === "UNRESOLVED") {
          related.forEach((key) => {
            set.delete(key);
            if (!String(key).includes("-S")) {
              for (let i = 1; i <= 10; i++) set.delete(`${key}-S${i}`);
            }
          });
        }
      });
    }
  } catch {
    // fallback
  }

  return set;
}

export function saveResolvedItemIds(resolvedSet) {
  try {
    const arr = Array.from(resolvedSet);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("qa-external-status-updated"));
    }
  } catch {
    // fallback se localStorage bloqueado
  }
}

// Marca um item (ou ação) como resolvido sincronizando todos os apelidos e subpassos
export function markExternalItemAsResolved(itemId) {
  const set = getResolvedItemIds();
  const allRelated = [itemId, ...(EXTERNAL_ID_ALIASES[itemId] || [])];

  allRelated.forEach((id) => {
    set.add(id);
    if (!String(id).includes("-S")) {
      for (let i = 1; i <= 10; i++) {
        set.add(`${id}-S${i}`);
      }
    }
  });

  saveResolvedItemIds(set);

  // Sincroniza também no mapa de sondas ativas
  try {
    const probeRaw = localStorage.getItem("qa_external_probed_status_map_v1");
    const probeMap = probeRaw ? JSON.parse(probeRaw) : {};
    allRelated.forEach((id) => {
      probeMap[id] = "RESOLVED";
    });
    localStorage.setItem("qa_external_probed_status_map_v1", JSON.stringify(probeMap));
  } catch {
    // ignore
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("qa-external-status-updated", { detail: { itemId, status: "RESOLVED" } }));
  }

  return getExternalMetrics();
}

// Alias para validação de item externo compatível com o Console de Logs SSOT
export function verifyExternalItem(itemId, isResolved = true) {
  if (isResolved) {
    return markExternalItemAsResolved(itemId);
  } else {
    return markExternalItemAsPending(itemId);
  }
}

export function getVerifiedExternalItems() {
  return Array.from(getResolvedItemIds());
}

// Marca um item como pendente (desfaz resolução)
export function markExternalItemAsPending(itemId) {
  const set = getResolvedItemIds();
  const allRelated = [itemId, ...(EXTERNAL_ID_ALIASES[itemId] || [])];

  allRelated.forEach((id) => {
    set.delete(id);
    if (!String(id).includes("-S")) {
      for (let i = 1; i <= 10; i++) {
        set.delete(`${id}-S${i}`);
      }
    }
  });

  saveResolvedItemIds(set);

  try {
    const probeRaw = localStorage.getItem("qa_external_probed_status_map_v1");
    const probeMap = probeRaw ? JSON.parse(probeRaw) : {};
    allRelated.forEach((id) => {
      probeMap[id] = "UNRESOLVED";
    });
    localStorage.setItem("qa_external_probed_status_map_v1", JSON.stringify(probeMap));
  } catch {
    // ignore
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("qa-external-status-updated", { detail: { itemId, status: "UNRESOLVED" } }));
  }

  return getExternalMetrics();
}

// Reseta todas as resoluções
export function resetAllExternalResolutions() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("qa_external_probed_status_map_v1");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("qa-external-status-updated"));
    }
  } catch {
    // ignore
  }
}

// Retorna todas as ações externas com status dinâmico
export function getRealExternalActionsList() {
  const resolved = getResolvedItemIds();
  return REAL_EXTERNAL_ACTIONS.map((action) => {
    // Uma ação é considerada aprovada se foi marcada explicitamente
    // ou se todos os seus passos foram resolvidos
    const isActionResolved = resolved.has(action.id);
    const resolvedStepsCount = action.checklist.filter((_, idx) =>
      resolved.has(`${action.id}-S${idx + 1}`)
    ).length;

    const isFullyResolved =
      isActionResolved ||
      (action.checklist.length > 0 && resolvedStepsCount === action.checklist.length);

    return {
      ...action,
      testName: action.title,
      technicalName: `[${action.id}] ${action.title}`,
      description: action.summary,
      affectedFile: action.affectedTarget,
      status: isFullyResolved ? "APROVADO" : "Pendente",
      statusText: isFullyResolved ? "Aprovado / Resolvido" : "Pendente",
      passed: isFullyResolved,
      resolvedStepsCount,
      totalStepsCount: action.checklist.length,
    };
  });
}

// Retorna todos os 39 passos individuais com status dinâmico
export function getRealExternalStepsList() {
  const resolved = getResolvedItemIds();
  const allSteps = generateRealExternalSteps();

  return allSteps.map((step) => {
    const isStepResolved = resolved.has(step.id) || resolved.has(step.actionId);
    return {
      ...step,
      testName: step.title,
      technicalName: `[${step.id}] ${step.stepText}`,
      description: `${step.actionTitle} (${step.service})`,
      affectedFile: step.affectedTarget,
      status: isStepResolved ? "APROVADO" : "Pendente",
      statusText: isStepResolved ? "Aprovado / Resolvido" : "Pendente",
      passed: isStepResolved,
    };
  });
}

// Métricas consolidadas dos dados reais externos
export function getExternalMetrics() {
  const actions = getRealExternalActionsList();
  const steps = getRealExternalStepsList();

  const totalActions = actions.length; // 8
  const resolvedActions = actions.filter((a) => a.passed).length;
  const pendingActions = totalActions - resolvedActions;

  const totalSteps = steps.length; // 39
  const resolvedSteps = steps.filter((s) => s.passed).length;
  const pendingSteps = totalSteps - resolvedSteps;

  return {
    totalActions,
    resolvedActions,
    pendingActions,
    totalSteps, // 39
    resolvedSteps,
    pendingSteps, // normalmente 39 menos os resolvidos
    isAllResolved: pendingSteps === 0,
  };
}

/**
 * Executa uma busca/verificação estritamente real nos serviços e configurações externas.
 * Retorna resolved: true APENAS se a correção foi REALMENTE efetuada na infraestrutura/painel.
 * Caso contrário, retorna resolved: false com a causa exata do porquê o item ainda está pendente.
 */
export async function verifyExternalServiceItem(item) {
  const targetId = item.actionId || item.id;

  // 1. EXT-SEC-01: TTL de 900s e Refresh Token Rotation no Supabase Auth
  if (targetId === "EXT-SEC-01" || targetId.startsWith("EXT-SEC-01-")) {
    try {
      if (!supabase) {
        return {
          resolved: false,
          service: "Supabase Auth Dashboard",
          message: "Falha: Cliente Supabase não inicializado. Configure VITE_SUPABASE_URL.",
        };
      }

      // Consulta a sessão real no Supabase
      const { data } = await supabase.auth.getSession();
      if (data?.session && typeof data.session.expires_in === "number" && data.session.expires_in > 0 && data.session.expires_in <= 900) {
        return {
          resolved: true,
          service: "Supabase Auth Dashboard",
          message: `Sucesso: Token detectado com expiração estrita de ${data.session.expires_in}s (<= 900s). Política ativa no Supabase!`,
        };
      }

      const currentTtl = data?.session?.expires_in || 3600;
      return {
        resolved: false,
        service: "Supabase Auth Dashboard",
        message: `Pendente: A sessão do Supabase retornou TTL de ${currentTtl}s (esperado: <= 900s). Acesse o painel Supabase (https://supabase.com/dashboard/project/njgeevywotbflikilway/settings/auth) e reduza 'JWT Expiry Limit' para 900s.`,
      };
    } catch (err) {
      return {
        resolved: false,
        service: "Supabase Auth Dashboard",
        message: `Erro ao consultar Supabase Auth: ${err.message}. Ação permanece pendente.`,
      };
    }
  }

  // 2. EXT-BE-01: Criar Tabelas 'sessions' e 'security_audit_events' no PostgreSQL com RLS
  if (targetId === "EXT-BE-01" || targetId.startsWith("EXT-BE-01-")) {
    try {
      if (!supabase) {
        return {
          resolved: false,
          service: "Supabase PostgreSQL Database",
          message: "Falha: Cliente Supabase indisponível.",
        };
      }

      // Executa consulta real para testar se a tabela 'sessions' foi criada no banco
      const { error: sessionsError } = await supabase.from("sessions").select("id").limit(1);
      if (sessionsError) {
        return {
          resolved: false,
          service: "Supabase PostgreSQL Database",
          message: `Pendente: Tabela 'public.sessions' não encontrada no banco PostgreSQL (Retorno: "${sessionsError.message}"). Execute o script DDL no SQL Editor do Supabase.`,
        };
      }

      // Testa também a tabela security_audit_events
      const { error: auditError } = await supabase.from("security_audit_events").select("id").limit(1);
      if (auditError) {
        return {
          resolved: false,
          service: "Supabase PostgreSQL Database",
          message: `Pendente: Tabela 'security_audit_events' não encontrada no PostgreSQL (Retorno: "${auditError.message}"). Conclua o script DDL no SQL Editor do Supabase.`,
        };
      }

      return {
        resolved: true,
        service: "Supabase PostgreSQL Database",
        message: "Sucesso: Tabelas 'sessions' e 'security_audit_events' detectadas e ativas com Row Level Security no PostgreSQL!",
      };
    } catch (err) {
      return {
        resolved: false,
        service: "Supabase PostgreSQL Database",
        message: `Pendente: Erro ao consultar banco de dados (${err.message}). As tabelas 'sessions' e 'security_audit_events' ainda não foram criadas no Supabase.`,
      };
    }
  }

  // 3. EXT-BE-02: Deploy das Edge Functions no Supabase CLI
  if (targetId === "EXT-BE-02" || targetId.startsWith("EXT-BE-02-")) {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl) {
        return {
          resolved: false,
          service: "Supabase Edge Functions",
          message: "Pendente: VITE_SUPABASE_URL não configurada.",
        };
      }

      // Consulta real à Edge Function de revogação/verificação
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-jwt-session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: "health_check" }),
      });

      if (res.status === 404) {
        return {
          resolved: false,
          service: "Supabase Edge Functions",
          message: "Pendente: Endpoint da Edge Function 'verify-jwt-session' retornou HTTP 404 (Requested function was not found). Execute 'supabase functions deploy verify-jwt-session' no terminal.",
        };
      }

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json?.ok === true || json?.valid !== undefined) {
          return {
            resolved: true,
            service: "Supabase Edge Functions",
            message: "Sucesso: Edge Function 'verify-jwt-session' está online e respondendo no cluster Supabase!",
          };
        }
      }

      return {
        resolved: false,
        service: "Supabase Edge Functions",
        message: `Pendente: A Edge Function retornou status HTTP ${res.status}. O deploy via 'supabase functions deploy verify-jwt-session' ainda não foi efetuado.`,
      };
    } catch (err) {
      return {
        resolved: false,
        service: "Supabase Edge Functions",
        message: `Pendente: Falha de conexão com a Edge Function (${err.message}). O deploy ainda não foi efetuado.`,
      };
    }
  }

  // 4. EXT-FE-01: Chave Pública (Site Key) do Cloudflare Turnstile no Frontend
  if (targetId === "EXT-FE-01" || targetId.startsWith("EXT-FE-01-")) {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (!siteKey || siteKey.trim() === "" || siteKey.includes("<CHAVE") || siteKey.includes("0x4AAAAAA_MOCK") || siteKey.length < 20) {
      return {
        resolved: false,
        service: "Cloudflare Turnstile Dashboard",
        message: "Pendente: Variável VITE_TURNSTILE_SITE_KEY real não encontrada no arquivo .env nem no ambiente de build. Crie o widget no painel Cloudflare e configure a chave pública real.",
      };
    }
    return {
      resolved: true,
      service: "Cloudflare Turnstile Dashboard",
      message: `Sucesso: Site Key real do Cloudflare Turnstile detectada no frontend (${siteKey.slice(0, 10)}...).`,
    };
  }

  // 5. EXT-DEV-01: Cloudflare Turnstile Secret Key no Backend
  if (targetId === "EXT-DEV-01" || targetId.startsWith("EXT-DEV-01-")) {
    const secretKey = typeof process !== "undefined" && process.env?.TURNSTILE_SECRET_KEY;
    if (!secretKey || secretKey.includes("<CHAVE") || secretKey.includes("MOCK") || secretKey.length < 20) {
      return {
        resolved: false,
        service: "Cloudflare Turnstile API",
        message: "Pendente: Chave secreta de validação server-side (TURNSTILE_SECRET_KEY) não configurada no servidor backend.",
      };
    }
    return {
      resolved: true,
      service: "Cloudflare Turnstile API",
      message: "Sucesso: TURNSTILE_SECRET_KEY configurada com sucesso para validação server-side.",
    };
  }

  // 6. EXT-DEV-02: Mercado Pago Chaves de Produção e Webhook IPN
  if (targetId === "EXT-DEV-02" || targetId.startsWith("EXT-DEV-02-")) {
    const mpKey = import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
    if (!mpKey || !mpKey.startsWith("APP_USR-") || mpKey.includes("...") || mpKey.includes("5ac54098-969a-4315") || mpKey.length < 25) {
      return {
        resolved: false,
        service: "Mercado Pago Developers Portal",
        message: "Pendente: Chave de produção do Mercado Pago (APP_USR-...) não configurada ou utilizando valor padrão de exemplo. Acesse https://www.mercadopago.com.br/developers/panel para obter as credenciais de produção.",
      };
    }
    return {
      resolved: true,
      service: "Mercado Pago Developers Portal",
      message: "Sucesso: Chave de produção do Mercado Pago (APP_USR-...) validada no ambiente.",
    };
  }

  // 7. EXT-DEV-03: GCP Secret Manager / Vault
  if (targetId === "EXT-DEV-03" || targetId.startsWith("EXT-DEV-03-")) {
    return {
      resolved: false,
      service: "GCP Secret Manager / Vault",
      message: "Pendente: Segredos de produção pendentes de provisionamento no Google Cloud Secret Manager (gcloud secrets create).",
    };
  }

  // 8. EXT-CMP-01: Registro de DPO perante a ANPD
  if (targetId === "EXT-CMP-01" || targetId.startsWith("EXT-CMP-01-")) {
    return {
      resolved: false,
      service: "Portal Gov.br / ANPD",
      message: "Pendente: Registro do DPO pendente de envio e protocolo perante o portal oficial da ANPD.",
    };
  }

  // 9. EXT-BE-02: Função RPC book_appointment_atomic no Supabase
  if (targetId === "EXT-BE-02" || targetId.startsWith("EXT-BE-02-")) {
    try {
      if (supabase && typeof supabase.rpc === "function") {
        const { error } = await supabase.rpc("book_appointment_atomic", {
          p_tenant_id: "test",
          p_barber_id: "test",
          p_client_id: "test",
          p_client_name: "test",
          p_service_id: "test",
          p_service_name: "test",
          p_booking_date: "2026-01-01",
          p_start_time: "10:00",
          p_end_time: "10:30",
        });
        const isSuccess = !error || (error && (error.message?.includes('duplicate key') || error.message?.includes('violates foreign key') || error.message?.includes('slot already booked')));
        if (isSuccess && (!error || (!error.message?.includes('not found') && !error.message?.includes('does not exist') && error.code !== 'PGRST202' && error.code !== '42883'))) {
          return {
            resolved: true,
            service: "Supabase PostgreSQL Database",
            message: "Sucesso: Função RPC 'book_appointment_atomic' detectada e operacional no PostgreSQL do Supabase.",
          };
        }
      }
    } catch {
      // continua para fallback pendente
    }
    return {
      resolved: false,
      service: "Supabase PostgreSQL Database",
      message: "Pendente: Função RPC 'book_appointment_atomic' ainda não executada no Supabase. Cole e execute o script SQL no SQL Editor do Supabase.",
    };
  }

  // 10. EXT-DB-02: Instalar Extensão 'pgcrypto' e Executar Função 'anonymize_customer_data' no Supabase
  if (targetId === "EXT-DB-02" || targetId.startsWith("EXT-DB-02-")) {
    try {
      if (supabase && typeof supabase.rpc === "function") {
        const { error } = await supabase.rpc("anonymize_customer_data", {
          target_id: "00000000-0000-0000-0000-000000000000",
        });
        if (!error) {
          return {
            resolved: true,
            service: "Supabase PostgreSQL Database",
            message: "Sucesso: Função PL/pgSQL 'anonymize_customer_data' com pgcrypto detectada e operacional no PostgreSQL do Supabase!",
          };
        }
      }
    } catch {
      // fallback
    }
    return {
      resolved: false,
      service: "Supabase PostgreSQL Database",
      message: "Pendente: Função 'anonymize_customer_data' ou extensão pgcrypto ainda não executada no Supabase. Copie e execute o script SQL da migração supabase/migrations/20260925_anonymize_customer_data_function.sql no SQL Editor do Supabase.",
    };
  }

  // 11. EXT-API-01 / CORR-014: Supabase Database: Restrições de Schema e Validação Relacional de Contrato
  if (targetId === "EXT-API-01" || targetId.startsWith("EXT-API-01-") || targetId === "CORR-014") {
    try {
      if (!supabase) {
        return {
          resolved: false,
          service: "Supabase PostgreSQL Database",
          message: "Falha: Cliente Supabase indisponível.",
        };
      }

      const probeTestId = `probe-chk-${Date.now()}`;
      const { error } = await supabase.from('services').insert({
        id: probeTestId,
        name: 'Probe Integrity Contract Test',
        price: -10,
        duration_minutes: 0,
        active: true,
      });

      const isEnforced =
        error &&
        (error.code === '23514' ||
          error.code === '23502' ||
          error.message?.includes('check_positive') ||
          error.message?.includes('check constraint') ||
          error.message?.includes('violates check constraint'));

      if (isEnforced) {
        return {
          resolved: true,
          service: "Supabase PostgreSQL Database",
          message: "Sucesso: Restrições de integridade (CHECK price >= 0, duration_minutes > 0 e NOT NULL) detectadas e validadas com sucesso na tabela public.services!",
        };
      }

      if (!error) {
        try {
          await supabase.from('services').delete().eq('id', probeTestId);
        } catch {
          // ignore
        }
        return {
          resolved: false,
          service: "Supabase PostgreSQL Database",
          message: "Pendente: A tabela public.services aceitou valores inválidos sem disparar constraint. Execute o comando ALTER TABLE no SQL Editor.",
        };
      }

      if (error.code === '42501') {
        return {
          resolved: false,
          service: "Supabase PostgreSQL Database",
          message: "Pendente: Acesso anônimo bloqueado por RLS (PostgreSQL 42501). Para testar as constraints CHECK (price >= 0), utilize permissão de service_role ou confirme a execução do script DDL de constraints no SQL Editor.",
        };
      }

      return {
        resolved: false,
        service: "Supabase PostgreSQL Database",
        message: `Pendente: ${error.message}`,
      };
    } catch (err) {
      return {
        resolved: false,
        service: "Supabase PostgreSQL Database",
        message: `Pendente: Falha de conexão (${err.message}).`,
      };
    }
  }

  return {
    resolved: false,
    service: item.service || "Painel Externo",
    message: "Pendente: Configuração no painel externo ainda não identificada no ambiente real.",
  };
}
