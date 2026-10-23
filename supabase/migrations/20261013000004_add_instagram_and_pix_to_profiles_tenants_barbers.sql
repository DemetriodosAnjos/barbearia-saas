-- ==============================================================================
-- MIGRAÇÃO DE CONFORMIDADE: INSTAGRAM, CHAVE PIX E BIO (MÓDULO PROFISSIONAL)
-- Barbearia SaaS - Supabase / PostgreSQL Engine
-- Arquivo: supabase/migrations/20261013000004_add_instagram_and_pix_to_profiles_tenants_barbers.sql
-- ==============================================================================

-- 1. Garante colunas instagram e specialties em public.profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'instagram'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN instagram TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'specialties'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN specialties TEXT[] DEFAULT '{}'::text[];
  END IF;
END $$;

-- 2. Garante colunas pix_key e instagram em public.tenants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'pix_key'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN pix_key TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'instagram'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN instagram TEXT;
  END IF;
END $$;

-- 3. Garante colunas instagram e bio em public.barbers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barbers' AND column_name = 'instagram'
  ) THEN
    ALTER TABLE public.barbers ADD COLUMN instagram TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barbers' AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.barbers ADD COLUMN bio TEXT;
  END IF;
END $$;

-- 4. Garante colunas pix_key e instagram em public.barbershops
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barbershops' AND column_name = 'pix_key'
  ) THEN
    ALTER TABLE public.barbershops ADD COLUMN pix_key TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barbershops' AND column_name = 'instagram'
  ) THEN
    ALTER TABLE public.barbershops ADD COLUMN instagram TEXT;
  END IF;
END $$;

-- 5. Índices de busca e filtros otimizados
CREATE INDEX IF NOT EXISTS idx_profiles_pix_key ON public.profiles(pix_key);
CREATE INDEX IF NOT EXISTS idx_tenants_pix_key ON public.tenants(pix_key);
CREATE INDEX IF NOT EXISTS idx_barbers_pix_key ON public.barbers(pix_key);
