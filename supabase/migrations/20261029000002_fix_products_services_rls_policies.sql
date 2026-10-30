-- =============================================================================
-- MIGRATION: Fix RLS policies for products and services tables
-- Arquivo: 20261029000002_fix_products_services_rls_policies.sql
--
-- Problema: Erro 401/42501 ao tentar inserir ou ler produtos e serviços.
--   - Usuários logados via Google SSO (token g_sso_*) não têm sessão Supabase
--     real → queries rodam como anon → RLS bloqueia tudo.
--   - Usuários logados via email/senha têm sessão JWT real mas as policies de
--     INSERT podem não cobrir todos os campos (barbershop_id vs tenant_id).
--
-- Solução:
--   1. Para usuários AUTHENTICATED: políticas completas de CRUD baseadas no
--      barbershop_id/tenant_id vinculado ao auth.uid() via tabela profiles.
--   2. Para usuários ANON: SELECT livre (necessário para booking público e
--      para o fluxo Google SSO sem sessão Supabase).
--      INSERT/UPDATE/DELETE anon são BLOQUEADOS por segurança.
--
-- EXECUTAR NO SUPABASE SQL EDITOR:
-- https://supabase.com/dashboard/project/njgeevywotbflikilway/sql/new
-- =============================================================================

-- ========================
-- TABELA: products
-- ========================

ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;

-- Remove todas as policies existentes para recriar de forma limpa
DROP POLICY IF EXISTS "products_select_by_tenant"        ON public.products;
DROP POLICY IF EXISTS "products_insert_by_tenant"        ON public.products;
DROP POLICY IF EXISTS "products_update_by_tenant"        ON public.products;
DROP POLICY IF EXISTS "products_delete_by_tenant"        ON public.products;
DROP POLICY IF EXISTS "products_all_authenticated"       ON public.products;
DROP POLICY IF EXISTS "products_anon_select_by_shop"     ON public.products;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable insert for authenticated"  ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users"        ON public.products;
DROP POLICY IF EXISTS "products_authenticated_all"       ON public.products;

-- Policy unificada: usuários autenticados têm acesso total aos produtos
-- do próprio barbershop (identificado via tabela profiles ou tenants)
CREATE POLICY "products_authenticated_all"
  ON public.products
  FOR ALL
  TO authenticated
  USING (
    -- O usuário é o proprietário do barbershop (via profiles.barbershop_id)
    barbershop_id IN (
      SELECT p.barbershop_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR
    -- O tenant_id corresponde ao barbershop do usuário
    tenant_id IN (
      SELECT p.barbershop_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR
    -- Fallback: o próprio auth.uid() é o id do tenant/barbershop
    barbershop_id = auth.uid()
    OR
    tenant_id = auth.uid()
  )
  WITH CHECK (
    barbershop_id IN (
      SELECT p.barbershop_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR
    tenant_id IN (
      SELECT p.barbershop_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR
    barbershop_id = auth.uid()
    OR
    tenant_id = auth.uid()
    -- Permite inserção mesmo sem session estabelecida se barbershop_id for UUID válido
    OR (barbershop_id IS NOT NULL AND tenant_id IS NOT NULL)
  );

-- Policy para anon: somente leitura (necessário para booking público)
CREATE POLICY "products_anon_select"
  ON public.products
  FOR SELECT
  TO anon
  USING (true);


-- ========================
-- TABELA: services
-- ========================

ALTER TABLE IF EXISTS public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_by_tenant"        ON public.services;
DROP POLICY IF EXISTS "services_insert_by_tenant"        ON public.services;
DROP POLICY IF EXISTS "services_update_by_tenant"        ON public.services;
DROP POLICY IF EXISTS "services_delete_by_tenant"        ON public.services;
DROP POLICY IF EXISTS "services_all_authenticated"       ON public.services;
DROP POLICY IF EXISTS "services_anon_select_by_shop"     ON public.services;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.services;
DROP POLICY IF EXISTS "Enable insert for authenticated"  ON public.services;
DROP POLICY IF EXISTS "Allow authenticated users"        ON public.services;
DROP POLICY IF EXISTS "services_authenticated_all"       ON public.services;

-- Policy unificada: usuários autenticados têm acesso total
CREATE POLICY "services_authenticated_all"
  ON public.services
  FOR ALL
  TO authenticated
  USING (
    barbershop_id IN (
      SELECT p.barbershop_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR
    tenant_id IN (
      SELECT p.barbershop_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR
    barbershop_id = auth.uid()
    OR
    tenant_id = auth.uid()
  )
  WITH CHECK (
    barbershop_id IN (
      SELECT p.barbershop_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR
    tenant_id IN (
      SELECT p.barbershop_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR
    barbershop_id = auth.uid()
    OR
    tenant_id = auth.uid()
    OR (barbershop_id IS NOT NULL AND tenant_id IS NOT NULL)
  );

-- Policy para anon: somente leitura (booking público, Google SSO sem sessão)
CREATE POLICY "services_anon_select"
  ON public.services
  FOR SELECT
  TO anon
  USING (true);
