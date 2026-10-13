-- ==============================================================================
-- MIGRAÇÃO DE CONFORMIDADE: SESSÕES ATIVAS E TRILHA DE AUDITORIA DE SEGURANÇA
-- Barbearia SaaS - Supabase / PostgreSQL Engine
-- Arquivo: supabase/migrations/20261013000005_create_sessions_and_security_audit_events.sql
-- ==============================================================================

-- 1. Criação da tabela public.sessions (Dispositivos Conectados e Sessões Ativas)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT,
  device_name TEXT,
  browser TEXT,
  os TEXT,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '30 days'),
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices para consultas de alta performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_active 
  ON public.sessions(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_sessions_user_last_activity 
  ON public.sessions(user_id, last_activity_at DESC);

-- 3. Habilitação de Row Level Security (RLS)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para gerenciamento seguro de sessões pelo próprio usuário
DROP POLICY IF EXISTS "Usuários leem suas próprias sessões" ON public.sessions;
CREATE POLICY "Usuários leem suas próprias sessões" 
  ON public.sessions 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários inserem suas próprias sessões" ON public.sessions;
CREATE POLICY "Usuários inserem suas próprias sessões" 
  ON public.sessions 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários atualizam ou revogam suas próprias sessões" ON public.sessions;
CREATE POLICY "Usuários atualizam ou revogam suas próprias sessões" 
  ON public.sessions 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Tabela complementar de Auditoria de Segurança
CREATE TABLE IF NOT EXISTS public.security_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_id TEXT,
  reason TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_created 
  ON public.security_audit_events(created_at DESC);

ALTER TABLE public.security_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários leem seus próprios logs de auditoria" ON public.security_audit_events;
CREATE POLICY "Usuários leem seus próprios logs de auditoria" 
  ON public.security_audit_events 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);
