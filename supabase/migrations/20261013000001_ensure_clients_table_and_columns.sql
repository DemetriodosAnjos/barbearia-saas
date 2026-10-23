-- ==============================================================================
-- MIGRAÇÃO DE CONFORMIDADE: TABELA PUBLIC.CLIENTES & POLÍTICAS RLS NO SUPABASE
-- Barbearia SaaS - Supabase / PostgreSQL Engine
-- Arquivo: supabase/migrations/20261013000001_ensure_clients_table_and_columns.sql
-- ==============================================================================

-- 1. Criação resiliente e idempotente da tabela public.clients
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY DEFAULT ('cli-'::text || (gen_random_uuid())::text),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  is_vip BOOLEAN DEFAULT false,
  total_visits INTEGER DEFAULT 0,
  average_ticket NUMERIC DEFAULT 0,
  technical_notes JSONB DEFAULT '{}'::jsonb,
  loyalty_stamps INTEGER DEFAULT 0,
  subscription JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Garantia de colunas adicionais para compatibilidade direta e retrocompatibilidade
DO $$
BEGIN
  -- Coluna barbershop_id se criada sem ela
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'barbershop_id'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN barbershop_id UUID;
  END IF;

  -- Coluna technical_notes (JSONB para prontuários, notas, CPF, birth_date e preferências)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'technical_notes'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN technical_notes JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Coluna average_ticket
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'average_ticket'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN average_ticket NUMERIC DEFAULT 0;
  END IF;

  -- Coluna total_visits
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'total_visits'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN total_visits INTEGER DEFAULT 0;
  END IF;

  -- Coluna is_vip
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'is_vip'
  ) THEN
    ALTER TABLE public.clients ADD COLUMN is_vip BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 3. Índices de Performance para busca rápida e isolamento multi-tenant
CREATE INDEX IF NOT EXISTS idx_clients_barbershop_id 
  ON public.clients (barbershop_id);

CREATE INDEX IF NOT EXISTS idx_clients_lookup 
  ON public.clients (barbershop_id, phone, name);

-- 4. Habilitação de RLS e Políticas Permissivas para Operação no Painel
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Política de leitura: Permite leitura para usuários autenticados e anônimos (ou restringe por tenant)
DROP POLICY IF EXISTS "clients_read_policy" ON public.clients;
CREATE POLICY "clients_read_policy" ON public.clients
FOR SELECT TO authenticated, anon
USING (true);

-- Política de inserção: Permite cadastro de novos clientes
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
CREATE POLICY "clients_insert_policy" ON public.clients
FOR INSERT TO authenticated, anon
WITH CHECK (true);

-- Política de atualização: Permite modificação de dados e frequência
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
CREATE POLICY "clients_update_policy" ON public.clients
FOR UPDATE TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Política de exclusão: Permite exclusão de registros
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;
CREATE POLICY "clients_delete_policy" ON public.clients
FOR DELETE TO authenticated, anon
USING (true);
