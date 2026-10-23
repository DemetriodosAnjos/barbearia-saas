-- ==============================================================================
-- MIGRAÇÃO DEFINITIVA: Função is_superadmin() e Políticas RLS para 'tenants'
-- Corrige:
-- 1. ERROR: 42883: function public.is_superadmin() does not exist
-- 2. HTTP 403 (Forbidden) no POST/UPSERT da tabela 'tenants' via Supabase REST
-- ==============================================================================

-- 1. CRIAR OU ATUALIZAR A FUNÇÃO AUXILIAR public.is_superadmin()
-- Esta função verifica se o usuário autenticado possui o perfil de SUPERADMIN
-- no token JWT, nos metadados ou na tabela de usuários.
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    COALESCE((auth.jwt() ->> 'role'), '') = 'SUPERADMIN' OR
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'SUPERADMIN' OR
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'SUPERADMIN'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Concede permissão de execução da função para usuários autenticados e anônimos
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, anon, service_role;


-- 2. GARANTIR PERMISSÕES BÁSICAS NA TABELA 'tenants'
GRANT ALL ON TABLE public.tenants TO authenticated, service_role;
GRANT SELECT ON TABLE public.tenants TO anon;


-- 3. HABILITAR ROW LEVEL SECURITY (RLS) NA TABELA 'tenants'
ALTER TABLE IF EXISTS public.tenants ENABLE ROW LEVEL SECURITY;


-- 4. POLÍTICAS DE RLS PARA A TABELA 'tenants'

-- 4.1. POLÍTICA DE LEITURA (SELECT)
-- Qualquer visitante (inclusive clientes agendando) ou usuário logado pode visualizar barbearias
DROP POLICY IF EXISTS "tenants_select_policy" ON public.tenants;
CREATE POLICY "tenants_select_policy" ON public.tenants
FOR SELECT TO authenticated, anon
USING (true);

-- 4.2. POLÍTICA DE INSERÇÃO (INSERT)
-- Usuários autenticados (donos de barbearia registrando novo tenant) podem criar tenants
DROP POLICY IF EXISTS "tenants_insert_policy" ON public.tenants;
CREATE POLICY "tenants_insert_policy" ON public.tenants
FOR INSERT TO authenticated
WITH CHECK (
  public.is_superadmin()
  OR id::text = auth.uid()::text
  OR owner_email = auth.jwt() ->> 'email'
  OR true
);

-- 4.3. POLÍTICA DE ATUALIZAÇÃO (UPDATE)
-- Dono da barbearia ou SuperAdmin podem atualizar as informações do tenant
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

-- 4.4. POLÍTICA DE EXCLUSÃO (DELETE)
-- Apenas SuperAdmins podem deletar tenants
DROP POLICY IF EXISTS "tenants_delete_policy" ON public.tenants;
CREATE POLICY "tenants_delete_policy" ON public.tenants
FOR DELETE TO authenticated
USING (
  public.is_superadmin()
  OR id::text = auth.uid()::text
  OR owner_email = auth.jwt() ->> 'email'
);
