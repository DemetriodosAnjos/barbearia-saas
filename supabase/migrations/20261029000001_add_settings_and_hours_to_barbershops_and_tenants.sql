-- ==============================================================================
-- MIGRAÇÃO DE SUPORTE: Configurações de Unidade e Horários
-- Adiciona colunas de horários e políticas em public.barbershops e public.tenants
-- ==============================================================================

DO $$
BEGIN
  -- 1. public.barbershops
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'barbershops' AND column_name = 'store_hours'
  ) THEN
    ALTER TABLE public.barbershops ADD COLUMN store_hours JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'barbershops' AND column_name = 'holiday_settings'
  ) THEN
    ALTER TABLE public.barbershops ADD COLUMN holiday_settings JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'barbershops' AND column_name = 'booking_rules'
  ) THEN
    ALTER TABLE public.barbershops ADD COLUMN booking_rules JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'barbershops' AND column_name = 'whatsapp_settings'
  ) THEN
    ALTER TABLE public.barbershops ADD COLUMN whatsapp_settings JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'barbershops' AND column_name = 'financial_policies'
  ) THEN
    ALTER TABLE public.barbershops ADD COLUMN financial_policies JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- 2. public.tenants
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'store_hours'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN store_hours JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'holiday_settings'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN holiday_settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;
