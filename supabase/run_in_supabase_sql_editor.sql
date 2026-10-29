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

-- 1.2.1 Garante coluna tenant_id na tabela clients
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.clients ADD COLUMN tenant_id UUID DEFAULT auth.uid();
  END IF;
END $$;

-- 1.2.2 Sincroniza tenant_id e barbershop_id se um deles estiver nulo (ambos são UUID)
UPDATE public.clients 
SET tenant_id = barbershop_id 
WHERE tenant_id IS NULL AND barbershop_id IS NOT NULL;

UPDATE public.clients 
SET barbershop_id = tenant_id 
WHERE barbershop_id IS NULL AND tenant_id IS NOT NULL;

-- 1.2.3 Garante separação estrita dos clientes entre ddoanjos e fullstackanjo01/fullstackanjos01
UPDATE public.clients
SET tenant_id = 'a9e5dc8e-5648-4ed0-9a8f-c5d660899ae9'::uuid,
    barbershop_id = 'a9e5dc8e-5648-4ed0-9a8f-c5d660899ae9'::uuid
WHERE phone = '(47) 99999-9999' OR name ILIKE '%Alex Teza%';

UPDATE public.clients
SET tenant_id = '788299e3-a26c-4a0b-bc71-c7ae81ed40d3'::uuid,
    barbershop_id = '788299e3-a26c-4a0b-bc71-c7ae81ed40d3'::uuid
WHERE tenant_id IS NULL OR barbershop_id IS NULL;

-- 1.3 Remove constraint restritiva antiga de FK para evitar bloqueio caso o barbershop_id seja customizado
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_barbershop_id_fkey;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_tenant_id_fkey;

-- 1.4 Índices de busca e isolamento de clientes
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON public.clients (tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_barbershop_id ON public.clients (barbershop_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients (phone);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients (name);
CREATE INDEX IF NOT EXISTS idx_clients_cpf ON public.clients (cpf);

-- 1.5 BLINDAGEM ROW LEVEL SECURITY (RLS): Elimina política permissiva e impõe isolamento estrito
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;

-- Remove qualquer política permissiva antiga que expunha todos os clientes
DROP POLICY IF EXISTS "clients_all_access_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_read_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_tenant_isolation_select" ON public.clients;
DROP POLICY IF EXISTS "clients_tenant_isolation_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_tenant_isolation_update" ON public.clients;
DROP POLICY IF EXISTS "clients_tenant_isolation_delete" ON public.clients;
DROP POLICY IF EXISTS "Clientes visíveis apenas pelo proprietário" ON public.clients;
DROP POLICY IF EXISTS "Inserir clientes apenas no próprio tenant" ON public.clients;

-- SELECT: Usuário autenticado só visualiza clientes do seu tenant
CREATE POLICY "clients_tenant_isolation_select" ON public.clients 
FOR SELECT TO authenticated
USING (
  tenant_id = auth.uid() 
  OR barbershop_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.tenants t 
    WHERE (t.id = public.clients.tenant_id OR t.id = public.clients.barbershop_id)
      AND (
        t.id = auth.uid() 
        OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email')
        OR (LOWER(auth.jwt() ->> 'email') IN ('fullstackanjo01@gmail.com', 'fullstackanjos01@gmail.com') 
            AND LOWER(t.owner_email) IN ('fullstackanjo01@gmail.com', 'fullstackanjos01@gmail.com'))
      )
  )
);

-- INSERT: Inserção permitida apenas com o tenant_id do próprio usuário autenticado
CREATE POLICY "clients_tenant_isolation_insert" ON public.clients 
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = auth.uid() 
  OR barbershop_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.tenants t 
    WHERE (t.id = public.clients.tenant_id OR t.id = public.clients.barbershop_id)
      AND (
        t.id = auth.uid() 
        OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email')
        OR (LOWER(auth.jwt() ->> 'email') IN ('fullstackanjo01@gmail.com', 'fullstackanjos01@gmail.com') 
            AND LOWER(t.owner_email) IN ('fullstackanjo01@gmail.com', 'fullstackanjos01@gmail.com'))
      )
  )
);

-- UPDATE: Modificações restritas aos clientes do próprio tenant
CREATE POLICY "clients_tenant_isolation_update" ON public.clients 
FOR UPDATE TO authenticated
USING (
  tenant_id = auth.uid() 
  OR barbershop_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.tenants t 
    WHERE (t.id = public.clients.tenant_id OR t.id = public.clients.barbershop_id)
      AND (
        t.id = auth.uid() 
        OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email')
        OR (LOWER(auth.jwt() ->> 'email') IN ('fullstackanjo01@gmail.com', 'fullstackanjos01@gmail.com') 
            AND LOWER(t.owner_email) IN ('fullstackanjo01@gmail.com', 'fullstackanjos01@gmail.com'))
      )
  )
)
WITH CHECK (
  tenant_id = auth.uid() 
  OR barbershop_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.tenants t 
    WHERE (t.id = public.clients.tenant_id OR t.id = public.clients.barbershop_id)
      AND (
        t.id = auth.uid() 
        OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email')
        OR (LOWER(auth.jwt() ->> 'email') IN ('fullstackanjo01@gmail.com', 'fullstackanjos01@gmail.com') 
            AND LOWER(t.owner_email) IN ('fullstackanjo01@gmail.com', 'fullstackanjos01@gmail.com'))
      )
  )
);

-- DELETE: Exclusão permitida apenas aos clientes do próprio tenant
CREATE POLICY "clients_tenant_isolation_delete" ON public.clients 
FOR DELETE TO authenticated
USING (
  tenant_id = auth.uid() 
  OR barbershop_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.tenants t 
    WHERE (t.id = public.clients.tenant_id OR t.id = public.clients.barbershop_id)
      AND (
        t.id = auth.uid() 
        OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email')
        OR (LOWER(auth.jwt() ->> 'email') IN ('fullstackanjo01@gmail.com', 'fullstackanjos01@gmail.com') 
            AND LOWER(t.owner_email) IN ('fullstackanjo01@gmail.com', 'fullstackanjos01@gmail.com'))
      )
  )
);


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


-- ==============================================================================
-- PARTE 3: TABELA public.appointments (LINK DO CLIENTE, REALTIME E IDEMPOTÊNCIA)
-- ==============================================================================

-- 3.1 Habilita extensões necessárias para blindagem de concorrência
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 3.2 Criação da tabela public.appointments se não existir
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.3 Garante idempotentemente todas as colunas para receber agendamentos via link público
DO $$
BEGIN
  -- Identificadores de Barbearia / Multi-Tenant
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.appointments ADD COLUMN tenant_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'barbershop_id') THEN
    ALTER TABLE public.appointments ADD COLUMN barbershop_id TEXT;
  END IF;

  -- Datas (garante compatibilidade total entre date, booking_date e appointment_date)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'date') THEN
    ALTER TABLE public.appointments ADD COLUMN date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'booking_date') THEN
    ALTER TABLE public.appointments ADD COLUMN booking_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'appointment_date') THEN
    ALTER TABLE public.appointments ADD COLUMN appointment_date DATE;
  END IF;

  -- Horários
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'start_time') THEN
    ALTER TABLE public.appointments ADD COLUMN start_time TIME;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'end_time') THEN
    ALTER TABLE public.appointments ADD COLUMN end_time TIME;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'appointment_time') THEN
    ALTER TABLE public.appointments ADD COLUMN appointment_time TIME;
  END IF;

  -- Dados do Cliente (permitindo clientes anônimos pelo link)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'client_id') THEN
    ALTER TABLE public.appointments ADD COLUMN client_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'client_name') THEN
    ALTER TABLE public.appointments ADD COLUMN client_name TEXT NOT NULL DEFAULT 'Cliente';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'client_phone') THEN
    ALTER TABLE public.appointments ADD COLUMN client_phone TEXT;
  END IF;

  -- Dados do Profissional
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'barber_id') THEN
    ALTER TABLE public.appointments ADD COLUMN barber_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'barber_name') THEN
    ALTER TABLE public.appointments ADD COLUMN barber_name TEXT DEFAULT 'Barbeiro';
  END IF;

  -- Dados do Serviço e Duração
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'service_id') THEN
    ALTER TABLE public.appointments ADD COLUMN service_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'service_name') THEN
    ALTER TABLE public.appointments ADD COLUMN service_name TEXT NOT NULL DEFAULT 'Corte';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'duration_minutes') THEN
    ALTER TABLE public.appointments ADD COLUMN duration_minutes INTEGER DEFAULT 30;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'duration') THEN
    ALTER TABLE public.appointments ADD COLUMN duration INTEGER DEFAULT 30;
  END IF;

  -- Financeiro e Pagamentos
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'price') THEN
    ALTER TABLE public.appointments ADD COLUMN price NUMERIC(10,2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'total_price') THEN
    ALTER TABLE public.appointments ADD COLUMN total_price NUMERIC(10,2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'payment_method') THEN
    ALTER TABLE public.appointments ADD COLUMN payment_method TEXT DEFAULT 'no_local';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'is_paid') THEN
    ALTER TABLE public.appointments ADD COLUMN is_paid BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'pix_payload') THEN
    ALTER TABLE public.appointments ADD COLUMN pix_payload TEXT;
  END IF;

  -- Protocolo, Origem e Idempotência
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'protocol') THEN
    ALTER TABLE public.appointments ADD COLUMN protocol TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'source') THEN
    ALTER TABLE public.appointments ADD COLUMN source TEXT DEFAULT 'client_link';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'idempotency_key') THEN
    ALTER TABLE public.appointments ADD COLUMN idempotency_key TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'status') THEN
    ALTER TABLE public.appointments ADD COLUMN status TEXT DEFAULT 'confirmed';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'notes') THEN
    ALTER TABLE public.appointments ADD COLUMN notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'settlement_id') THEN
    ALTER TABLE public.appointments ADD COLUMN settlement_id TEXT;
  END IF;
END $$;

-- 3.4 Flexibiliza restrições legadas que bloqueavam clientes públicos sem login no Supabase
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'user_id') THEN
    ALTER TABLE public.appointments ALTER COLUMN user_id DROP NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'client_id') THEN
    ALTER TABLE public.appointments ALTER COLUMN client_id DROP NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'service_id') THEN
    ALTER TABLE public.appointments ALTER COLUMN service_id DROP NOT NULL;
  END IF;

  ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_user_id_fkey;
  ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;
  ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_service_id_fkey;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3.5 Trigger de Sincronização Automática de Colunas em appointments
CREATE OR REPLACE FUNCTION public.sync_appointments_columns_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.barbershop_id IS NOT NULL THEN
    NEW.tenant_id := NEW.barbershop_id;
  ELSIF NEW.barbershop_id IS NULL AND NEW.tenant_id IS NOT NULL THEN
    NEW.barbershop_id := NEW.tenant_id;
  END IF;

  IF NEW.date IS NULL THEN
    NEW.date := COALESCE(NEW.booking_date, NEW.appointment_date, CURRENT_DATE);
  END IF;
  IF NEW.booking_date IS NULL THEN
    NEW.booking_date := NEW.date;
  END IF;
  IF NEW.appointment_date IS NULL THEN
    NEW.appointment_date := NEW.date;
  END IF;

  IF NEW.start_time IS NULL AND NEW.appointment_time IS NOT NULL THEN
    NEW.start_time := NEW.appointment_time;
  ELSIF NEW.appointment_time IS NULL AND NEW.start_time IS NOT NULL THEN
    NEW.appointment_time := NEW.start_time;
  END IF;

  IF NEW.end_time IS NULL AND NEW.start_time IS NOT NULL THEN
    NEW.end_time := (NEW.start_time + (COALESCE(NEW.duration_minutes, NEW.duration, 30) || ' minutes')::interval)::time;
  END IF;

  IF NEW.price IS NULL AND NEW.total_price IS NOT NULL THEN
    NEW.price := NEW.total_price;
  ELSIF NEW.total_price IS NULL AND NEW.price IS NOT NULL THEN
    NEW.total_price := NEW.price;
  END IF;

  IF NEW.duration_minutes IS NULL AND NEW.duration IS NOT NULL THEN
    NEW.duration_minutes := NEW.duration;
  ELSIF NEW.duration IS NULL AND NEW.duration_minutes IS NOT NULL THEN
    NEW.duration := NEW.duration_minutes;
  END IF;

  IF NEW.idempotency_key IS NULL AND NEW.barber_id IS NOT NULL AND NEW.date IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.idempotency_key := COALESCE(NEW.tenant_id, 'def') || '_' || NEW.barber_id || '_' || NEW.date::text || '_' || NEW.start_time::text;
  END IF;

  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_appointments_columns ON public.appointments;
CREATE TRIGGER trg_sync_appointments_columns
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.sync_appointments_columns_fn();

-- 3.6 Índices de Performance e Prevenção de Duplicidades
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON public.appointments(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_date ON public.appointments(barbershop_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON public.appointments(barber_id, date, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_idempotency_key ON public.appointments(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Índice Único Condicional de Idempotência
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_idempotency_active
ON public.appointments (idempotency_key)
WHERE (idempotency_key IS NOT NULL AND status NOT IN ('cancelled', 'rejected'));

-- 3.7 RPC Transacional book_appointment_atomic com Advisory Lock (Anti Race Conditions)
-- Remove versões/sobrecargas anteriores para evitar o erro 42725 (function name is not unique)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE pg_namespace.nspname = 'public' 
          AND pg_proc.proname = 'book_appointment_atomic'
    ) LOOP
        EXECUTE 'DROP FUNCTION public.' || quote_ident(r.proname) || '(' || r.argtypes || ') CASCADE;';
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.book_appointment_atomic(
  p_tenant_id TEXT,
  p_barber_id TEXT,
  p_client_id TEXT,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_service_id TEXT,
  p_service_name TEXT,
  p_booking_date DATE,
  p_start_time TEXT,
  p_end_time TEXT,
  p_price NUMERIC DEFAULT 0.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT;
  v_conflict_count INTEGER;
  v_new_appointment RECORD;
  v_idempotency_key TEXT;
  v_tenant_uuid UUID;
BEGIN
  IF p_tenant_id IS NULL OR p_tenant_id = '' THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: tenant_id é obrigatório.' USING ERRCODE = 'P0002';
  END IF;

  IF p_barber_id IS NULL OR p_barber_id = '' THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: barber_id é obrigatório.' USING ERRCODE = 'P0002';
  END IF;

  IF p_booking_date IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: booking_date é obrigatório.' USING ERRCODE = 'P0002';
  END IF;

  -- Advisory Lock determinístico contra colisão no mesmo milissegundo
  v_lock_key := ('x' || substr(md5(p_tenant_id || ':' || p_barber_id || ':' || p_booking_date::text), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Bloqueio FOR UPDATE de linhas conflitantes
  SELECT COUNT(*)
  INTO v_conflict_count
  FROM public.appointments
  WHERE (tenant_id::text = p_tenant_id OR barbershop_id::text = p_tenant_id)
    AND barber_id = p_barber_id
    AND date = p_booking_date
    AND status NOT IN ('cancelled', 'rejected')
    AND (start_time::text < p_end_time AND end_time::text > p_start_time)
  FOR UPDATE;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'SLOT_OCCUPIED_CONCURRENCY_CONFLICT: O barbeiro selecionado já possui um agendamento conflitante neste intervalo.'
      USING ERRCODE = 'P0001',
            HINT = 'Selecione outro horário ou alterne para outro barbeiro disponível.';
  END IF;

  v_idempotency_key := p_tenant_id || '_' || p_barber_id || '_' || p_booking_date::text || '_' || p_start_time;

  BEGIN
    v_tenant_uuid := p_tenant_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_tenant_uuid := NULL;
  END;

  INSERT INTO public.appointments (
    tenant_id,
    barbershop_id,
    barber_id,
    client_name,
    client_phone,
    service_name,
    date,
    start_time,
    end_time,
    price,
    status,
    source,
    idempotency_key
  ) VALUES (
    v_tenant_uuid,
    v_tenant_uuid,
    p_barber_id,
    trim(p_client_name),
    trim(p_client_phone),
    trim(p_service_name),
    p_booking_date,
    p_start_time,
    p_end_time,
    p_price,
    'confirmed',
    'client_link',
    v_idempotency_key
  )
  RETURNING * INTO v_new_appointment;

  RETURN jsonb_build_object(
    'success', true,
    'atomicTransaction', 'COMMITTED',
    'appointment', jsonb_build_object(
      'id', v_new_appointment.id,
      'tenant_id', v_new_appointment.tenant_id,
      'barber_id', v_new_appointment.barber_id,
      'client_name', v_new_appointment.client_name,
      'client_phone', v_new_appointment.client_phone,
      'service_name', v_new_appointment.service_name,
      'date', v_new_appointment.date,
      'start_time', v_new_appointment.start_time,
      'end_time', v_new_appointment.end_time,
      'price', v_new_appointment.price,
      'status', v_new_appointment.status,
      'created_at', v_new_appointment.created_at
    )
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'SLOT_OCCUPIED_CONCURRENCY_CONFLICT: Agendamento duplicado detectado (idempotência).'
      USING ERRCODE = 'P0001';
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Permissão explícita com assinatura para evitar ambiguidade
GRANT EXECUTE ON FUNCTION public.book_appointment_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, NUMERIC) TO anon, authenticated;

-- 3.8 Políticas de Row Level Security (RLS) para Agendamentos Públicos
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_public_select_slots" ON public.appointments;
DROP POLICY IF EXISTS "appointments_public_insert" ON public.appointments;
DROP POLICY IF EXISTS "appointments_staff_manage" ON public.appointments;

CREATE POLICY "appointments_public_select_slots"
ON public.appointments
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "appointments_public_insert"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (tenant_id IS NOT NULL OR barbershop_id IS NOT NULL)
  AND (client_name IS NOT NULL AND client_name <> '')
);

CREATE POLICY "appointments_staff_manage"
ON public.appointments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3.9 Ativação de Realtime no Supabase para appointments
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Validação das colunas de appointments
SELECT 
  'appointments' AS tabela, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'appointments'
ORDER BY ordinal_position;

-- ==============================================================================
-- PARTE 4: CONFIGURAÇÕES E HORÁRIOS DA BARBEARIA (barbershops & tenants)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'barbershops' AND column_name = 'store_hours') THEN
    ALTER TABLE public.barbershops ADD COLUMN store_hours JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'barbershops' AND column_name = 'holiday_settings') THEN
    ALTER TABLE public.barbershops ADD COLUMN holiday_settings JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'barbershops' AND column_name = 'booking_rules') THEN
    ALTER TABLE public.barbershops ADD COLUMN booking_rules JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'barbershops' AND column_name = 'whatsapp_settings') THEN
    ALTER TABLE public.barbershops ADD COLUMN whatsapp_settings JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'barbershops' AND column_name = 'financial_policies') THEN
    ALTER TABLE public.barbershops ADD COLUMN financial_policies JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'store_hours') THEN
    ALTER TABLE public.tenants ADD COLUMN store_hours JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'holiday_settings') THEN
    ALTER TABLE public.tenants ADD COLUMN holiday_settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;


