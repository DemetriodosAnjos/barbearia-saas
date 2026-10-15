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

-- 4. Habilita Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 5. Política de Acesso Unificada (Permite leitura e escrita para operações da barbearia)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clients' AND policyname = 'clients_all_access_policy'
    ) THEN
        CREATE POLICY clients_all_access_policy ON public.clients
            FOR ALL
            TO public
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
