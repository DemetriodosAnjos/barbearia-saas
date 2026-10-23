-- ==============================================================================
-- MIGRAÇÃO: ADIÇÃO DA COLUNA pix_type EM public.profiles E public.tenants
-- Barbearia SaaS - Supabase / PostgreSQL Engine
-- Arquivo: supabase/migrations/20261016000001_add_pix_type_to_profiles_and_tenants.sql
-- ==============================================================================

-- 1. Garante coluna pix_type na tabela public.profiles (Meu Perfil)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'pix_type'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN pix_type TEXT DEFAULT 'CPF';
  END IF;
END $$;

-- 2. Garante coluna pix_type na tabela public.tenants (Estabelecimentos / Barbearia)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'tenants' 
      AND column_name = 'pix_type'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN pix_type TEXT DEFAULT 'CPF';
  END IF;
END $$;

-- 3. Garante coluna pix_type na tabela public.barbers (Equipe / Barbeiros)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'barbers' 
      AND column_name = 'pix_type'
  ) THEN
    ALTER TABLE public.barbers ADD COLUMN pix_type TEXT DEFAULT 'CPF';
  END IF;
END $$;

-- 4. Índice de performance para consultas por tipo de chave
CREATE INDEX IF NOT EXISTS idx_profiles_pix_type ON public.profiles(pix_type);
CREATE INDEX IF NOT EXISTS idx_barbers_pix_type ON public.barbers(pix_type);
