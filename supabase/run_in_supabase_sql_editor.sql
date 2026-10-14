-- ==============================================================================
-- SCRIPT OFICIAL PARA EXECUTAR NO SUPABASE SQL EDITOR
-- Sistema SaaS Barbearia: Gestão de Chaves Pix, Repasses e Fechamento de Lotes
-- ==============================================================================
-- Instruções:
-- 1. Acesse o painel do Supabase (https://supabase.com/dashboard)
-- 2. Selecione seu projeto
-- 3. No menu lateral esquerdo, clique em "SQL Editor"
-- 4. Clique em "+ New query"
-- 5. Cole todo este código abaixo e clique no botão verde "Run" (Executar)
-- ==============================================================================

-- 1. GARANTE AS COLUNAS pix_type E pix_key NA TABELA public.barbers
DO $$
BEGIN
  -- Coluna pix_type: tipo da chave ('cpf', 'phone', 'email', 'random')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barbers' AND column_name = 'pix_type'
  ) THEN
    ALTER TABLE public.barbers ADD COLUMN pix_type TEXT DEFAULT 'cpf';
  END IF;

  -- Coluna pix_key: valor da chave informada pelo profissional
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barbers' AND column_name = 'pix_key'
  ) THEN
    ALTER TABLE public.barbers ADD COLUMN pix_key TEXT;
  END IF;
END $$;

-- 2. GARANTE A COLUNA settlement_id NA TABELA public.appointments
-- (Vincula o atendimento ao lote de quitação para zerar o saldo pendente do barbeiro)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'settlement_id'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN settlement_id TEXT;
  END IF;
END $$;

-- 3. GARANTE A COLUNA settlement_id NA TABELA public.comandas
-- (Vincula os produtos/serviços de comanda ao lote de quitação)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'comandas' AND column_name = 'settlement_id'
  ) THEN
    ALTER TABLE public.comandas ADD COLUMN settlement_id TEXT;
  END IF;
END $$;

-- 4. CRIAÇÃO DA TABELA public.barber_settlements (Histórico de Quitações da Equipe)
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

-- 5. CRIAÇÃO DE ÍNDICES PARA CONSULTAS RÁPIDAS E CONCILIAÇÃO
CREATE INDEX IF NOT EXISTS idx_barber_settlements_barbershop ON public.barber_settlements(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barber_settlements_barber ON public.barber_settlements(barber_id);
CREATE INDEX IF NOT EXISTS idx_barber_settlements_period ON public.barber_settlements(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_appointments_settlement ON public.appointments(settlement_id);
CREATE INDEX IF NOT EXISTS idx_comandas_settlement ON public.comandas(settlement_id);
CREATE INDEX IF NOT EXISTS idx_barbers_pix_key ON public.barbers(pix_key);

-- 6. HABILITAÇÃO DO ROW LEVEL SECURITY (RLS)
ALTER TABLE public.barber_settlements ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICA DE SEGURANÇA (RLS) PARA ACESSO À TABELA
DROP POLICY IF EXISTS "barber_settlements_all_access" ON public.barber_settlements;
CREATE POLICY "barber_settlements_all_access"
  ON public.barber_settlements
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 8. QUERY DE VALIDAÇÃO (Confirma se tudo foi criado com sucesso)
SELECT 
  'barbers' AS tabela, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'barbers' AND column_name IN ('pix_type', 'pix_key')

UNION ALL

SELECT 
  'appointments' AS tabela, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'appointments' AND column_name = 'settlement_id'

UNION ALL

SELECT 
  'comandas' AS tabela, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'comandas' AND column_name = 'settlement_id'

UNION ALL

SELECT 
  'barber_settlements' AS tabela, 
  'tabela_criada' AS column_name, 
  'sucesso' AS data_type 
FROM information_schema.tables 
WHERE table_name = 'barber_settlements';
