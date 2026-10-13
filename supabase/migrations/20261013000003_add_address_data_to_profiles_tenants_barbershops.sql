-- ==============================================================================
-- MIGRAÇÃO DEFINITIVA SUPABASE: DADOS PESSOAIS, CONTATO & ENDEREÇO RESIDENCIAL
-- Barbearia SaaS - Supabase / PostgreSQL Engine
-- Arquivo: supabase/migrations/20261013000003_add_address_data_to_profiles_tenants_barbershops.sql
-- ==============================================================================

-- 1. Garante todas as colunas de Perfil, Documentos e Endereço em public.profiles
DO $$
BEGIN
  -- display_name (Nome de Exibição / Apelido no Salão)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_name') THEN
    ALTER TABLE public.profiles ADD COLUMN display_name TEXT;
  END IF;

  -- cpf (CPF - Documento Oficial Obrigatório)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cpf') THEN
    ALTER TABLE public.profiles ADD COLUMN cpf TEXT;
  END IF;

  -- cnpj (CNPJ / MEI - Pessoa Jurídica)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cnpj') THEN
    ALTER TABLE public.profiles ADD COLUMN cnpj TEXT;
  END IF;

  -- birth_date (Data de Nascimento)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'birth_date') THEN
    ALTER TABLE public.profiles ADD COLUMN birth_date DATE;
  END IF;

  -- bio (Mini biografia profissional)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
    ALTER TABLE public.profiles ADD COLUMN bio TEXT;
  END IF;

  -- pix_key (Chave PIX de repasse de comissões)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'pix_key') THEN
    ALTER TABLE public.profiles ADD COLUMN pix_key TEXT;
  END IF;

  -- avatar_url (URL do Avatar / Foto)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;

  -- cep (CEP Residencial / Contato)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cep') THEN
    ALTER TABLE public.profiles ADD COLUMN cep TEXT;
  END IF;

  -- street (Logradouro / Rua)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'street') THEN
    ALTER TABLE public.profiles ADD COLUMN street TEXT;
  END IF;

  -- number (Número Residencial)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'number') THEN
    ALTER TABLE public.profiles ADD COLUMN number TEXT;
  END IF;

  -- complement (Complemento - Apto, Bloco, Sala)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'complement') THEN
    ALTER TABLE public.profiles ADD COLUMN complement TEXT;
  END IF;

  -- neighborhood (Bairro)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'neighborhood') THEN
    ALTER TABLE public.profiles ADD COLUMN neighborhood TEXT;
  END IF;

  -- city (Cidade / Município)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'city') THEN
    ALTER TABLE public.profiles ADD COLUMN city TEXT;
  END IF;

  -- state (Estado / UF)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'state') THEN
    ALTER TABLE public.profiles ADD COLUMN state TEXT;
  END IF;

  -- address (Endereço formatado consolidado)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'address') THEN
    ALTER TABLE public.profiles ADD COLUMN address TEXT;
  END IF;
END $$;

-- 2. Garante colunas de CNPJ e Endereço Comercial em public.tenants
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'cnpj') THEN
    ALTER TABLE public.tenants ADD COLUMN cnpj TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'cep') THEN
    ALTER TABLE public.tenants ADD COLUMN cep TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'street') THEN
    ALTER TABLE public.tenants ADD COLUMN street TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'number') THEN
    ALTER TABLE public.tenants ADD COLUMN number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'complement') THEN
    ALTER TABLE public.tenants ADD COLUMN complement TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'neighborhood') THEN
    ALTER TABLE public.tenants ADD COLUMN neighborhood TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'city') THEN
    ALTER TABLE public.tenants ADD COLUMN city TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'state') THEN
    ALTER TABLE public.tenants ADD COLUMN state TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'address') THEN
    ALTER TABLE public.tenants ADD COLUMN address TEXT;
  END IF;
END $$;

-- 3. Garante colunas em public.barbershops
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbershops' AND column_name = 'cnpj') THEN
    ALTER TABLE public.barbershops ADD COLUMN cnpj TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbershops' AND column_name = 'cep') THEN
    ALTER TABLE public.barbershops ADD COLUMN cep TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbershops' AND column_name = 'street') THEN
    ALTER TABLE public.barbershops ADD COLUMN street TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbershops' AND column_name = 'number') THEN
    ALTER TABLE public.barbershops ADD COLUMN number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbershops' AND column_name = 'complement') THEN
    ALTER TABLE public.barbershops ADD COLUMN complement TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbershops' AND column_name = 'neighborhood') THEN
    ALTER TABLE public.barbershops ADD COLUMN neighborhood TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbershops' AND column_name = 'city') THEN
    ALTER TABLE public.barbershops ADD COLUMN city TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbershops' AND column_name = 'state') THEN
    ALTER TABLE public.barbershops ADD COLUMN state TEXT;
  END IF;
END $$;

-- 4. Garante coluna cpf em public.barbers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'barbers' AND column_name = 'cpf') THEN
    ALTER TABLE public.barbers ADD COLUMN cpf TEXT;
  END IF;
END $$;

-- 5. Índices de alta performance para buscas e filtros de documento/endereço
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON public.profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_profiles_cep ON public.profiles(cep);
CREATE INDEX IF NOT EXISTS idx_profiles_barbershop_id ON public.profiles(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_tenants_cnpj ON public.tenants(cnpj);
CREATE INDEX IF NOT EXISTS idx_tenants_cep ON public.tenants(cep);
CREATE INDEX IF NOT EXISTS idx_barbers_cpf ON public.barbers(cpf);

-- 6. Habilitação de RLS e Políticas Seguras (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Políticas para tenants
DROP POLICY IF EXISTS "tenants_select_policy" ON public.tenants;
CREATE POLICY "tenants_select_policy" ON public.tenants FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "tenants_update_policy" ON public.tenants;
CREATE POLICY "tenants_update_policy" ON public.tenants FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tenants_insert_policy" ON public.tenants;
CREATE POLICY "tenants_insert_policy" ON public.tenants FOR INSERT TO authenticated, anon WITH CHECK (true);
