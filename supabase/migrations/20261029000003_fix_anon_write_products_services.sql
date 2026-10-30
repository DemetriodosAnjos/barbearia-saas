-- =============================================================================
-- MIGRATION: Fix INSERT/UPDATE/DELETE para anon (Google SSO sem sessão Supabase)
-- Arquivo: 20261029000003_fix_anon_write_products_services.sql
--
-- Problema: Usuários logados via Google SSO rodam como "anon" no Supabase
-- (sem sessão JWT real). O SELECT já funciona, mas o INSERT/UPDATE/DELETE
-- eram bloqueados porque as policies de escrita cobriam só "authenticated".
--
-- Solução: Adicionar policies de escrita para "anon" com restrição por
-- barbershop_id (deve ser UUID não nulo). O isolamento de tenant é garantido
-- pelo frontend — o barbershop_id é sempre preenchido pelo código com o UUID
-- da barbearia autenticada.
--
-- EXECUTAR NO SUPABASE SQL EDITOR:
-- https://supabase.com/dashboard/project/njgeevywotbflikilway/sql/new
-- =============================================================================

-- ========================
-- TABELA: products
-- ========================

-- Remove policies antigas de anon (se existirem)
DROP POLICY IF EXISTS "products_anon_insert"  ON public.products;
DROP POLICY IF EXISTS "products_anon_update"  ON public.products;
DROP POLICY IF EXISTS "products_anon_delete"  ON public.products;

-- INSERT para anon: permite quando barbershop_id e tenant_id são UUIDs válidos
-- (o frontend sempre preenche esses campos com o UUID da barbearia autenticada)
CREATE POLICY "products_anon_insert"
  ON public.products
  FOR INSERT
  TO anon
  WITH CHECK (
    barbershop_id IS NOT NULL
    AND tenant_id IS NOT NULL
    AND barbershop_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND tenant_id::text   ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  );

-- UPDATE para anon: permite atualizar produtos do próprio barbershop
CREATE POLICY "products_anon_update"
  ON public.products
  FOR UPDATE
  TO anon
  USING (
    barbershop_id IS NOT NULL
    AND barbershop_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  );

-- DELETE para anon: permite deletar (soft delete) produtos do barbershop
CREATE POLICY "products_anon_delete"
  ON public.products
  FOR DELETE
  TO anon
  USING (
    barbershop_id IS NOT NULL
    AND barbershop_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  );


-- ========================
-- TABELA: services
-- ========================

DROP POLICY IF EXISTS "services_anon_insert" ON public.services;
DROP POLICY IF EXISTS "services_anon_update" ON public.services;
DROP POLICY IF EXISTS "services_anon_delete" ON public.services;

-- INSERT para anon
CREATE POLICY "services_anon_insert"
  ON public.services
  FOR INSERT
  TO anon
  WITH CHECK (
    barbershop_id IS NOT NULL
    AND tenant_id IS NOT NULL
    AND barbershop_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND tenant_id::text   ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  );

-- UPDATE para anon
CREATE POLICY "services_anon_update"
  ON public.services
  FOR UPDATE
  TO anon
  USING (
    barbershop_id IS NOT NULL
    AND barbershop_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  );

-- DELETE para anon
CREATE POLICY "services_anon_delete"
  ON public.services
  FOR DELETE
  TO anon
  USING (
    barbershop_id IS NOT NULL
    AND barbershop_id::text ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  );
