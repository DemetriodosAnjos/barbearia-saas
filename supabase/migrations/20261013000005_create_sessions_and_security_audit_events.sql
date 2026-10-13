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

-- 2. Remoção dinâmica de TODAS as políticas antigas para evitar erro 0A000 ao alterar tipos
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'sessions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sessions', pol.policyname);
  END LOOP;
END $$;

-- 3. Remover restrição foreign key se existir
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sessions_user_id_fkey' AND table_name = 'sessions'
  ) THEN
    ALTER TABLE public.sessions DROP CONSTRAINT sessions_user_id_fkey;
  END IF;
END $$;

-- 4. Alterar tipo da coluna user_id para TEXT de forma segura
ALTER TABLE public.sessions ALTER COLUMN user_id TYPE TEXT;

-- 5. Adicionar colunas complementares se a tabela for de versão anterior
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS device_name TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '30 days');
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS revocation_reason TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 6. Índices para consultas de alta performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_active 
  ON public.sessions(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_sessions_email_active 
  ON public.sessions(user_email, is_active);

CREATE INDEX IF NOT EXISTS idx_sessions_user_last_activity 
  ON public.sessions(user_id, last_activity_at DESC);

-- 7. Habilitação de RLS e Recriação das Políticas
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de sessões" 
  ON public.sessions 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Permitir inserção de sessões" 
  ON public.sessions 
  FOR INSERT 
  TO public 
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de sessões" 
  ON public.sessions 
  FOR UPDATE 
  TO public 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Permitir exclusão de sessões" 
  ON public.sessions 
  FOR DELETE 
  TO public 
  USING (true);

-- 8. Habilitar Supabase Realtime para sincronização instantânea
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  END IF;
END $$;

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
