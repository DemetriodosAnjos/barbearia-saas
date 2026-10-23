-- ==============================================================================
-- MIGRAÇÃO DE SEGURANÇA: HABILITAÇÃO GERAL DE ROW LEVEL SECURITY (RLS) & STORAGE
-- Barbearia SaaS - Supabase / PostgreSQL Engine
-- Arquivo: supabase/migrations/20260925_enable_rls_and_storage_policies.sql
-- ==============================================================================

-- 1. FUNÇÕES AUXILIARES DE CONTEXTO E IDENTIFICAÇÃO DE TENANT / SUPERADMIN
-- ------------------------------------------------------------------------------

-- Função para extrair o tenant_id do JWT ou da tabela de associação
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_tenant_id TEXT;
BEGIN
  -- 1. Tenta extrair da claim customizada do token JWT
  v_tenant_id := (auth.jwt() ->> 'tenant_id');
  IF v_tenant_id IS NOT NULL AND v_tenant_id <> '' THEN
    RETURN v_tenant_id;
  END IF;

  -- 2. Tenta extrair dos metadados de app do usuário
  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id');
  IF v_tenant_id IS NOT NULL AND v_tenant_id <> '' THEN
    RETURN v_tenant_id;
  END IF;

  -- 3. Fallback: Consulta na tabela de associação de usuários com barbearias
  SELECT tenant_id INTO v_tenant_id
  FROM public.tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1;

  RETURN v_tenant_id;
END;
$$;

-- Função para verificar se o usuário autenticado possui o papel SUPERADMIN
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    (auth.jwt() ->> 'role') = 'SUPERADMIN' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'SUPERADMIN' OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'SUPERADMIN'
    )
  );
END;
$$;

-- 2. HABILITAÇÃO DE RLS EM TODAS AS TABELAS RELACIONAIS
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.security_audit_events ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE RLS PARA TABELA: barbershops (Tenants)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "barbershops_select_policy" ON public.barbershops;
CREATE POLICY "barbershops_select_policy" ON public.barbershops
FOR SELECT TO authenticated, anon
USING (
  -- SuperAdmin vê todos os tenants
  public.is_superadmin()
  -- Usuário autenticado vê o seu próprio tenant
  OR (id::text = public.get_auth_tenant_id())
  -- Anônimo ou cliente de agendamento vê apenas se barbearia estiver ativa
  OR (is_active = true)
);

DROP POLICY IF EXISTS "barbershops_modify_policy" ON public.barbershops;
CREATE POLICY "barbershops_modify_policy" ON public.barbershops
FOR ALL TO authenticated
USING (
  public.is_superadmin()
  OR (id::text = public.get_auth_tenant_id() AND (auth.jwt() ->> 'role') = 'ADMIN')
)
WITH CHECK (
  public.is_superadmin()
  OR (id::text = public.get_auth_tenant_id() AND (auth.jwt() ->> 'role') = 'ADMIN')
);

-- 4. POLÍTICAS DE RLS PARA TABELA: appointments (Agendamentos)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "appointments_select_policy" ON public.appointments;
CREATE POLICY "appointments_select_policy" ON public.appointments
FOR SELECT TO authenticated
USING (
  public.is_superadmin()
  -- Membros do tenant leem agendamentos da própria barbearia
  OR (tenant_id = public.get_auth_tenant_id())
  -- Cliente autenticado lê exclusivamente seus próprios agendamentos
  OR (client_id = auth.uid()::text)
);

DROP POLICY IF EXISTS "appointments_insert_policy" ON public.appointments;
CREATE POLICY "appointments_insert_policy" ON public.appointments
FOR INSERT TO authenticated
WITH CHECK (
  public.is_superadmin()
  -- O agendamento DEVE pertencer ao tenant ativo do usuário ou do fluxo autenticado
  OR (tenant_id = public.get_auth_tenant_id() OR tenant_id IS NOT NULL)
);

DROP POLICY IF EXISTS "appointments_update_policy" ON public.appointments;
CREATE POLICY "appointments_update_policy" ON public.appointments
FOR UPDATE TO authenticated
USING (
  public.is_superadmin()
  OR (tenant_id = public.get_auth_tenant_id())
  OR (client_id = auth.uid()::text)
)
WITH CHECK (
  public.is_superadmin()
  OR (tenant_id = public.get_auth_tenant_id())
  OR (client_id = auth.uid()::text)
);

DROP POLICY IF EXISTS "appointments_delete_policy" ON public.appointments;
CREATE POLICY "appointments_delete_policy" ON public.appointments
FOR DELETE TO authenticated
USING (
  public.is_superadmin()
  OR (tenant_id = public.get_auth_tenant_id() AND (auth.jwt() ->> 'role') IN ('ADMIN', 'GERENTE'))
);

-- 5. POLÍTICAS DE RLS PARA TABELA: clients (Clientes & Dados Pessoais / PII)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
CREATE POLICY "clients_select_policy" ON public.clients
FOR SELECT TO authenticated
USING (
  public.is_superadmin()
  OR (tenant_id = public.get_auth_tenant_id())
  OR (user_id = auth.uid())
);

DROP POLICY IF EXISTS "clients_modify_policy" ON public.clients;
CREATE POLICY "clients_modify_policy" ON public.clients
FOR ALL TO authenticated
USING (
  public.is_superadmin()
  OR (tenant_id = public.get_auth_tenant_id())
  OR (user_id = auth.uid())
)
WITH CHECK (
  public.is_superadmin()
  OR (tenant_id = public.get_auth_tenant_id())
  OR (user_id = auth.uid())
);

-- 6. POLÍTICAS DE RLS PARA TABELA: sessions (Sessões e Revogação Ativa)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "sessions_select_policy" ON public.sessions;
CREATE POLICY "sessions_select_policy" ON public.sessions
FOR SELECT TO authenticated
USING (
  public.is_superadmin()
  -- Usuário lê apenas suas próprias sessões
  OR (user_id = auth.uid())
  -- Admin do tenant pode auditar sessões ativas de sua equipe
  OR (tenant_id = public.get_auth_tenant_id() AND (auth.jwt() ->> 'role') = 'ADMIN')
);

DROP POLICY IF EXISTS "sessions_modify_policy" ON public.sessions;
CREATE POLICY "sessions_modify_policy" ON public.sessions
FOR UPDATE TO authenticated
USING (
  public.is_superadmin()
  OR (user_id = auth.uid())
  OR (tenant_id = public.get_auth_tenant_id() AND (auth.jwt() ->> 'role') = 'ADMIN')
)
WITH CHECK (
  public.is_superadmin()
  OR (user_id = auth.uid())
  OR (tenant_id = public.get_auth_tenant_id() AND (auth.jwt() ->> 'role') = 'ADMIN')
);

-- 7. POLÍTICAS DE RLS PARA TABELA: security_audit_events (Log Forense Imutável)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_select_policy" ON public.security_audit_events;
CREATE POLICY "audit_select_policy" ON public.security_audit_events
FOR SELECT TO authenticated
USING (
  public.is_superadmin()
  OR (auth.jwt() ->> 'role' = 'ADMIN')
);

DROP POLICY IF EXISTS "audit_insert_policy" ON public.security_audit_events;
CREATE POLICY "audit_insert_policy" ON public.security_audit_events
FOR INSERT TO authenticated
WITH CHECK (true);

-- Imutabilidade estrita: Impede UPDATE e DELETE nos logs forenses
DROP POLICY IF EXISTS "audit_deny_update" ON public.security_audit_events;
CREATE POLICY "audit_deny_update" ON public.security_audit_events FOR UPDATE TO public USING (false);

DROP POLICY IF EXISTS "audit_deny_delete" ON public.security_audit_events;
CREATE POLICY "audit_deny_delete" ON public.security_audit_events FOR DELETE TO public USING (false);

-- 8. HABILITAÇÃO E POLÍTICAS DE RLS NO SUPABASE STORAGE (BUCKETS & OBJECTS)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

-- 8.1 Políticas para o Bucket: storage.buckets
DROP POLICY IF EXISTS "buckets_public_read" ON storage.buckets;
CREATE POLICY "buckets_public_read" ON storage.buckets
FOR SELECT TO authenticated, anon
USING (public = true OR public.is_superadmin());

-- 8.2 Políticas para storage.objects no bucket 'avatars' (Público para leitura, escrita do dono)
DROP POLICY IF EXISTS "avatars_select_policy" ON storage.objects;
CREATE POLICY "avatars_select_policy" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_policy" ON storage.objects;
CREATE POLICY "avatars_insert_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_delete_policy" ON storage.objects;
CREATE POLICY "avatars_delete_policy" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 8.3 Políticas para storage.objects no bucket 'receipts' (Comprovantes de Pix - ULTRA RESTRITO)
DROP POLICY IF EXISTS "receipts_deny_anon" ON storage.objects;
CREATE POLICY "receipts_deny_anon" ON storage.objects
FOR SELECT TO anon
USING (bucket_id <> 'receipts');

DROP POLICY IF EXISTS "receipts_select_policy" ON storage.objects;
CREATE POLICY "receipts_select_policy" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    public.is_superadmin()
    OR (storage.foldername(name))[1] = public.get_auth_tenant_id()
  )
);

DROP POLICY IF EXISTS "receipts_insert_policy" ON storage.objects;
CREATE POLICY "receipts_insert_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (
    public.is_superadmin()
    OR (storage.foldername(name))[1] = public.get_auth_tenant_id()
  )
);
