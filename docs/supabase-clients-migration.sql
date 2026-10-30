-- ==============================================================================
-- MIGRAÇÃO SUPABASE: Tabela de Clientes, Prontuários e Retenção Preditiva
-- SaaS Barbearia V1.5.3.8
-- ==============================================================================
-- Execute este script no SQL Editor do seu projeto Supabase para:
-- 1. Criar a tabela 'clients' se ainda não existir.
-- 2. Adicionar com segurança (ADD COLUMN IF NOT EXISTS) colunas necessárias para
--    edição rápida no atendimento, gestão cadastral completa e recall preditivo.
-- 3. Habilitar RLS e configurar políticas de acesso.
-- 4. Criar índices para alto desempenho em buscas por telefone e tenant.
-- ==============================================================================

-- 1. Criação da tabela clients (caso não exista)
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    barbershop_id TEXT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    cpf TEXT,
    birth_date DATE,
    notes TEXT,
    technical_notes JSONB DEFAULT '{}'::jsonb,
    frequency_days INTEGER DEFAULT 18,
    reminder_enabled BOOLEAN DEFAULT true,
    alert_lead_days INTEGER DEFAULT 3,
    is_vip BOOLEAN DEFAULT false,
    total_visits INTEGER DEFAULT 0,
    total_spent NUMERIC(10,2) DEFAULT 0.00,
    average_ticket NUMERIC(10,2) DEFAULT 0.00,
    preferred_barber TEXT DEFAULT 'Barbeiro Geral',
    status TEXT DEFAULT 'active',
    last_visit DATE,
    loyalty_stamps INTEGER DEFAULT 0,
    subscription JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Garantia de colunas para tabelas já existentes (Idempotente)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS barbershop_id TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS technical_notes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS frequency_days INTEGER DEFAULT 18;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS alert_lead_days INTEGER DEFAULT 3;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS total_spent NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS average_ticket NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS preferred_barber TEXT DEFAULT 'Barbeiro Geral';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_visit DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS loyalty_stamps INTEGER DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS subscription JSONB;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Índices de Otimização
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients (phone);
CREATE INDEX IF NOT EXISTS idx_clients_barbershop_id ON public.clients (barbershop_id);
CREATE INDEX IF NOT EXISTS idx_clients_frequency_days ON public.clients (frequency_days);

-- 4. Habilita e força Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;

-- 5. Elimina política permissiva legada
DROP POLICY IF EXISTS "clients_all_access_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_tenant_isolation_select" ON public.clients;
DROP POLICY IF EXISTS "clients_tenant_isolation_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_tenant_isolation_update" ON public.clients;
DROP POLICY IF EXISTS "clients_tenant_isolation_delete" ON public.clients;

-- 6. Políticas RLS de Isolamento Estrito Multi-Tenant
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
