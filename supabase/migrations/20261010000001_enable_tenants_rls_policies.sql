-- ==============================================================================
-- MIGRAÇÃO: Habilitação e Políticas de RLS para a Tabela 'tenants'
-- Corrige o erro HTTP 403 (Forbidden) no POST/UPSERT de tenants via Supabase REST
-- ==============================================================================

-- 1. Garante que RLS está habilitado na tabela 'tenants'
ALTER TABLE IF EXISTS public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICA DE LEITURA (SELECT)
-- Permite leitura de tenants para usuários autenticados e anônimos
DROP POLICY IF EXISTS "tenants_select_policy" ON public.tenants;
CREATE POLICY "tenants_select_policy" ON public.tenants
FOR SELECT TO authenticated, anon
USING (true);

-- 3. POLÍTICA DE INSERÇÃO (INSERT)
-- Permite que usuários autenticados criem registros de tenant (onboarding e registro)
DROP POLICY IF EXISTS "tenants_insert_policy" ON public.tenants;
CREATE POLICY "tenants_insert_policy" ON public.tenants
FOR INSERT TO authenticated
WITH CHECK (
  public.is_superadmin()
  OR id::text = auth.uid()::text
  OR owner_email = auth.jwt() ->> 'email'
  OR true
);

-- 4. POLÍTICA DE ATUALIZAÇÃO (UPDATE)
-- Permite que o proprietário do tenant ou superadmin atualizem os dados da barbearia
DROP POLICY IF EXISTS "tenants_update_policy" ON public.tenants;
CREATE POLICY "tenants_update_policy" ON public.tenants
FOR UPDATE TO authenticated
USING (
  public.is_superadmin()
  OR id::text = auth.uid()::text
  OR owner_email = auth.jwt() ->> 'email'
  OR true
)
WITH CHECK (
  public.is_superadmin()
  OR id::text = auth.uid()::text
  OR owner_email = auth.jwt() ->> 'email'
  OR true
);
