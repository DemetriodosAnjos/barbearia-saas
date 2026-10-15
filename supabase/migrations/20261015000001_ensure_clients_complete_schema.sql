-- ==============================================================================
-- MIGRAÇÃO DE RETENÇÃO DEFINITIVA DE CLIENTES NO SUPABASE POSTGRESQL
-- Barbearia SaaS - Módulo Clientes & Prontuários Técnicos
-- Arquivo: supabase/migrations/20261015000001_ensure_clients_complete_schema.sql
-- ==============================================================================

-- 1. Criação resiliente da tabela public.clients
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY DEFAULT ('cli-'::text || (gen_random_uuid())::text),
  barbershop_id TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  cpf TEXT,
  birth_date DATE,
  notes TEXT,
  technical_notes JSONB DEFAULT '{}'::jsonb,
  frequency_days INTEGER DEFAULT 18,
  is_vip BOOLEAN DEFAULT false,
  total_visits INTEGER DEFAULT 0,
  total_spent NUMERIC(10,2) DEFAULT 0.00,
  average_ticket NUMERIC(10,2) DEFAULT 0.00,
  preferred_barber TEXT DEFAULT 'Barbeiro Geral',
  status TEXT DEFAULT 'active',
  last_visit DATE,
  loyalty_stamps INTEGER DEFAULT 0,
  subscription JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Garantia de colunas adicionais para compatibilidade idempotente (caso a tabela já exista)
DO $$
BEGIN
  -- barbershop_id (compatível com texto e UUID)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'barbershop_id') THEN
    ALTER TABLE public.clients ADD COLUMN barbershop_id TEXT;
  END IF;

  -- name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'name') THEN
    ALTER TABLE public.clients ADD COLUMN name TEXT NOT NULL DEFAULT 'Cliente';
  END IF;

  -- phone
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'phone') THEN
    ALTER TABLE public.clients ADD COLUMN phone TEXT;
  END IF;

  -- email
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'email') THEN
    ALTER TABLE public.clients ADD COLUMN email TEXT;
  END IF;

  -- cpf
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'cpf') THEN
    ALTER TABLE public.clients ADD COLUMN cpf TEXT;
  END IF;

  -- birth_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'birth_date') THEN
    ALTER TABLE public.clients ADD COLUMN birth_date DATE;
  END IF;

  -- notes (prontuário e anotações do profissional)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'notes') THEN
    ALTER TABLE public.clients ADD COLUMN notes TEXT;
  END IF;

  -- technical_notes (JSONB de ficha técnica detalhada)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'technical_notes') THEN
    ALTER TABLE public.clients ADD COLUMN technical_notes JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- frequency_days (intervalo habitual de retorno em dias)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'frequency_days') THEN
    ALTER TABLE public.clients ADD COLUMN frequency_days INTEGER DEFAULT 18;
  END IF;

  -- is_vip
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'is_vip') THEN
    ALTER TABLE public.clients ADD COLUMN is_vip BOOLEAN DEFAULT false;
  END IF;

  -- total_visits
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'total_visits') THEN
    ALTER TABLE public.clients ADD COLUMN total_visits INTEGER DEFAULT 0;
  END IF;

  -- total_spent (LTV)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'total_spent') THEN
    ALTER TABLE public.clients ADD COLUMN total_spent NUMERIC(10,2) DEFAULT 0.00;
  END IF;

  -- average_ticket
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'average_ticket') THEN
    ALTER TABLE public.clients ADD COLUMN average_ticket NUMERIC(10,2) DEFAULT 0.00;
  END IF;

  -- preferred_barber
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'preferred_barber') THEN
    ALTER TABLE public.clients ADD COLUMN preferred_barber TEXT DEFAULT 'Barbeiro Geral';
  END IF;

  -- status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'status') THEN
    ALTER TABLE public.clients ADD COLUMN status TEXT DEFAULT 'active';
  END IF;

  -- last_visit
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'last_visit') THEN
    ALTER TABLE public.clients ADD COLUMN last_visit DATE;
  END IF;

  -- loyalty_stamps
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'loyalty_stamps') THEN
    ALTER TABLE public.clients ADD COLUMN loyalty_stamps INTEGER DEFAULT 0;
  END IF;

  -- subscription
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'subscription') THEN
    ALTER TABLE public.clients ADD COLUMN subscription JSONB;
  END IF;

  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'updated_at') THEN
    ALTER TABLE public.clients ADD COLUMN updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
  END IF;
END $$;

-- 3. Remove restrições de chave estrangeira que bloqueavam novos clientes caso o barbershop_id não existisse na tabela barbershops
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_barbershop_id_fkey;

-- 4. Criação de índices para consultas ultra-rápidas e busca por nome, telefone e CPF
CREATE INDEX IF NOT EXISTS idx_clients_barbershop_id ON public.clients (barbershop_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients (phone);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients (name);
CREATE INDEX IF NOT EXISTS idx_clients_cpf ON public.clients (cpf);

-- 5. Habilitação de Row Level Security (RLS) e Políticas Permissivas para leitura e escrita
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_all_access_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_read_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;

CREATE POLICY "clients_all_access_policy"
  ON public.clients
  FOR ALL
  TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);
