-- ==============================================================================
-- SCRIPT OFICIAL PARA EXECUTAR NO SUPABASE SQL EDITOR
-- Sistema SaaS Barbearia: Retenção de Clientes, Prontuários e Repasses
-- ==============================================================================
-- Instruções:
-- 1. Acesse o painel do Supabase (https://supabase.com/dashboard)
-- 2. Selecione seu projeto
-- 3. No menu lateral esquerdo, clique em "SQL Editor"
-- 4. Clique em "+ New query"
-- 5. Cole todo este código abaixo e clique no botão verde "Run" (Executar)
-- ==============================================================================

-- ==============================================================================
-- PARTE 1: TABELA public.clients (CLIENTES, PRONTUÁRIOS E RETENÇÃO APÓS F5)
-- ==============================================================================

-- 1.1 Criação da tabela public.clients se não existir
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

-- 1.2 Garante de forma idempotente que TODAS as 21 colunas existam (sem erro caso já existam)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'barbershop_id') THEN
    ALTER TABLE public.clients ADD COLUMN barbershop_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'name') THEN
    ALTER TABLE public.clients ADD COLUMN name TEXT NOT NULL DEFAULT 'Cliente';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'phone') THEN
    ALTER TABLE public.clients ADD COLUMN phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'email') THEN
    ALTER TABLE public.clients ADD COLUMN email TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'cpf') THEN
    ALTER TABLE public.clients ADD COLUMN cpf TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'birth_date') THEN
    ALTER TABLE public.clients ADD COLUMN birth_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'notes') THEN
    ALTER TABLE public.clients ADD COLUMN notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'technical_notes') THEN
    ALTER TABLE public.clients ADD COLUMN technical_notes JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'frequency_days') THEN
    ALTER TABLE public.clients ADD COLUMN frequency_days INTEGER DEFAULT 18;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'is_vip') THEN
    ALTER TABLE public.clients ADD COLUMN is_vip BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'total_visits') THEN
    ALTER TABLE public.clients ADD COLUMN total_visits INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'total_spent') THEN
    ALTER TABLE public.clients ADD COLUMN total_spent NUMERIC(10,2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'average_ticket') THEN
    ALTER TABLE public.clients ADD COLUMN average_ticket NUMERIC(10,2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'preferred_barber') THEN
    ALTER TABLE public.clients ADD COLUMN preferred_barber TEXT DEFAULT 'Barbeiro Geral';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'status') THEN
    ALTER TABLE public.clients ADD COLUMN status TEXT DEFAULT 'active';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'last_visit') THEN
    ALTER TABLE public.clients ADD COLUMN last_visit DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'loyalty_stamps') THEN
    ALTER TABLE public.clients ADD COLUMN loyalty_stamps INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'subscription') THEN
    ALTER TABLE public.clients ADD COLUMN subscription JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'updated_at') THEN
    ALTER TABLE public.clients ADD COLUMN updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
  END IF;
END $$;

-- 1.3 Remove constraint restritiva antiga de FK para evitar bloqueio caso o barbershop_id seja customizado
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_barbershop_id_fkey;

-- 1.4 Índices de busca de clientes
CREATE INDEX IF NOT EXISTS idx_clients_barbershop_id ON public.clients (barbershop_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients (phone);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients (name);
CREATE INDEX IF NOT EXISTS idx_clients_cpf ON public.clients (cpf);

-- 1.5 Row Level Security (RLS) permissivo para SELECT, INSERT, UPDATE, DELETE
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


-- ==============================================================================
-- PARTE 2: CHAVES PIX, REPASSES E QUITAÇÕES DA EQUIPE
-- ==============================================================================

-- 2.1 Colunas pix_type e pix_key na tabela public.barbers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'barbers' AND column_name = 'pix_type') THEN
    ALTER TABLE public.barbers ADD COLUMN pix_type TEXT DEFAULT 'cpf';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'barbers' AND column_name = 'pix_key') THEN
    ALTER TABLE public.barbers ADD COLUMN pix_key TEXT;
  END IF;
END $$;

-- 2.2 Coluna settlement_id na tabela appointments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'settlement_id') THEN
    ALTER TABLE public.appointments ADD COLUMN settlement_id TEXT;
  END IF;
END $$;

-- 2.3 Coluna settlement_id na tabela comandas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comandas' AND column_name = 'settlement_id') THEN
    ALTER TABLE public.comandas ADD COLUMN settlement_id TEXT;
  END IF;
END $$;

-- 2.4 Tabela public.barber_settlements (Lotes de Quitação)
CREATE TABLE IF NOT EXISTS public.barber_settlements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  barbershop_id TEXT NOT NULL,
  barber_id TEXT NOT NULL,
  barber_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  services_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  products_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  services_count INTEGER NOT NULL DEFAULT 0,
  products_count INTEGER NOT NULL DEFAULT 0,
  pix_key_used TEXT,
  paid_by TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_barber_settlements_barbershop ON public.barber_settlements(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barber_settlements_barber ON public.barber_settlements(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_settlements_period ON public.barber_settlements(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_appointments_settlement ON public.appointments(settlement_id);
CREATE INDEX IF NOT EXISTS idx_comandas_settlement ON public.comandas(settlement_id);
CREATE INDEX IF NOT EXISTS idx_barbers_pix_key ON public.barbers(pix_key);

ALTER TABLE public.barber_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "barber_settlements_all_access" ON public.barber_settlements;
CREATE POLICY "barber_settlements_all_access"
  ON public.barber_settlements
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- QUERY DE VALIDAÇÃO: Confirma se todas as colunas de clients foram criadas
-- ==============================================================================
SELECT 
  'clients' AS tabela, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'clients'
ORDER BY ordinal_position;
