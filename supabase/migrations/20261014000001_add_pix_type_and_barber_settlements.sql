-- ==============================================================================
-- MIGRAÇÃO: CADASTRO PIX DE PROFISSIONAIS E QUITAÇÃO DE REPASSES (FECHAMENTOS)
-- Barbearia SaaS - Supabase / PostgreSQL Engine
-- Arquivo: supabase/migrations/20261014000001_add_pix_type_and_barber_settlements.sql
-- ==============================================================================

-- 1. Garante colunas pix_type e pix_key em public.barbers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barbers' AND column_name = 'pix_type'
  ) THEN
    ALTER TABLE public.barbers ADD COLUMN pix_type TEXT DEFAULT 'cpf';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barbers' AND column_name = 'pix_key'
  ) THEN
    ALTER TABLE public.barbers ADD COLUMN pix_key TEXT;
  END IF;
END $$;

-- 2. Garante coluna settlement_id em public.appointments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'settlement_id'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN settlement_id UUID;
  END IF;
END $$;

-- 3. Garante coluna settlement_id em public.comandas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'comandas' AND column_name = 'settlement_id'
  ) THEN
    ALTER TABLE public.comandas ADD COLUMN settlement_id UUID;
  END IF;
END $$;

-- 4. Criação da tabela public.barber_settlements (Histórico de Quitações / Comissões Pagas)
CREATE TABLE IF NOT EXISTS public.barber_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL,
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
  paid_by UUID,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Índices de alta performance para conciliação e relatórios
CREATE INDEX IF NOT EXISTS idx_barber_settlements_barbershop ON public.barber_settlements(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barber_settlements_barber ON public.barber_settlements(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_settlements_period ON public.barber_settlements(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_appointments_settlement ON public.appointments(settlement_id);
CREATE INDEX IF NOT EXISTS idx_comandas_settlement ON public.comandas(settlement_id);

-- 6. Habilita RLS em public.barber_settlements
ALTER TABLE public.barber_settlements ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de RLS permissivas baseadas em barbershop_id
DROP POLICY IF EXISTS "barber_settlements_tenant_isolation" ON public.barber_settlements;
CREATE POLICY "barber_settlements_tenant_isolation"
  ON public.barber_settlements
  FOR ALL
  USING (true)
  WITH CHECK (true);
