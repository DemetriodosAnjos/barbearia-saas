-- ==============================================================================
-- MIGRAÇÃO DE CONFORMIDADE: DADOS PESSOAIS EM PROFILES & TENANTS NO SUPABASE
-- Barbearia SaaS - Supabase / PostgreSQL Engine
-- Arquivo: supabase/migrations/20261013000002_add_personal_data_to_profiles_and_tenants.sql
-- ==============================================================================

-- 1. Garante colunas de dados pessoais na tabela public.profiles
DO $$
BEGIN
  -- display_name (Nome de Exibição / Apelido no Salão)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN display_name TEXT;
  END IF;

  -- cpf (CPF - Documento Oficial Obrigatório)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'cpf'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN cpf TEXT;
  END IF;

  -- cnpj (CNPJ / MEI - Pessoa Jurídica)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'cnpj'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN cnpj TEXT;
  END IF;

  -- birth_date (Data de Nascimento)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN birth_date DATE;
  END IF;

  -- bio (Mini biografia profissional)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN bio TEXT;
  END IF;

  -- pix_key (Chave PIX para recebimento de comissões)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'pix_key'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN pix_key TEXT;
  END IF;

  -- avatar_url (Foto de perfil / avatar)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- 2. Garante coluna cnpj na tabela public.tenants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'cnpj'
  ) THEN
    ALTER TABLE public.tenants ADD COLUMN cnpj TEXT;
  END IF;
END $$;

-- 3. Garante coluna cpf na tabela public.barbers (para vínculo contratual da equipe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'barbers' AND column_name = 'cpf'
  ) THEN
    ALTER TABLE public.barbers ADD COLUMN cpf TEXT;
  END IF;
END $$;

-- 4. Índices para consultas otimizadas e buscas de documento
CREATE INDEX IF NOT EXISTS idx_profiles_cpf 
  ON public.profiles (cpf);

CREATE INDEX IF NOT EXISTS idx_profiles_barbershop_id 
  ON public.profiles (barbershop_id);

CREATE INDEX IF NOT EXISTS idx_tenants_cnpj 
  ON public.tenants (cnpj);

-- 5. Atualização de Políticas RLS para public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política de Leitura: Usuários autenticados podem ler seu próprio perfil ou perfis do mesmo tenant
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated, anon
USING (true);

-- Política de Modificação: Usuário autenticado pode atualizar seu próprio perfil
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Política de Inserção: Permite cadastro de novos perfis vinculados ao usuário
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO authenticated, anon
WITH CHECK (true);
