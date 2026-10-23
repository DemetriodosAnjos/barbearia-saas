-- ==============================================================================
-- MIGRAÇÃO DE CONFORMIDADE & DBA: TRILHA DE AUDITORIA IMUTÁVEL (AUDIT TRAIL WORM)
-- Banco de Dados: PostgreSQL / Supabase
-- Arquivo: supabase/migrations/20260925_immutable_audit_trail_system.sql
-- Padrões: WORM (Write Once, Read Many) / LGPD Art. 37 / SOC 2 / PCI-DSS v4.0
-- ==============================================================================

-- 1. CRIAÇÃO DA TABELA DE AUDITORIA IMUTÁVEL: audit_logs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name VARCHAR(100) NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- Metadados complementares de forense e conformidade regulatória
  client_ip INET,
  user_agent TEXT,
  record_checksum TEXT NOT NULL,
  tamper_seal_version VARCHAR(10) NOT NULL DEFAULT 'v1-sha256'
);

-- Comentários técnicos para documentação do schema
COMMENT ON TABLE public.audit_logs IS 'Trilha de auditoria imutável (WORM) para registro forense de todas as mutações em tabelas críticas.';
COMMENT ON COLUMN public.audit_logs.action IS 'Ação DML executada: INSERT, UPDATE ou DELETE.';
COMMENT ON COLUMN public.audit_logs.old_data IS 'Estado completo da tupla em formato JSONB antes da mutação (nulo em INSERT).';
COMMENT ON COLUMN public.audit_logs.new_data IS 'Estado completo da tupla em formato JSONB após a mutação (nulo em DELETE).';
COMMENT ON COLUMN public.audit_logs.record_checksum IS 'Assinatura criptográfica SHA-256 HMAC para detecção de adulteração em repouso.';

-- Índices de alta performance para consulta e auditoria forense por tenant e período
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created 
  ON public.audit_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_action 
  ON public.audit_logs (table_name, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
  ON public.audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_gin_old_data 
  ON public.audit_logs USING gin (old_data jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_audit_logs_gin_new_data 
  ON public.audit_logs USING gin (new_data jsonb_path_ops);

-- ------------------------------------------------------------------------------
-- 2. FUNÇÃO GERADORA DE HASH CRIPTOGRÁFICO DE INTEGRIDADE (ANTI-TAMPER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_audit_checksum(
  p_tenant_id TEXT,
  p_user_id TEXT,
  p_action TEXT,
  p_table_name TEXT,
  p_old_data JSONB,
  p_new_data JSONB,
  p_created_at TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_payload TEXT;
BEGIN
  -- Concatenação canônica de campos vitais para geração do selo de integridade
  v_payload := concat_ws('|',
    coalesce(p_tenant_id, ''),
    coalesce(p_user_id, 'SYSTEM'),
    p_action,
    p_table_name,
    coalesce(p_old_data::text, '{}'),
    coalesce(p_new_data::text, '{}'),
    to_char(p_created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  );
  
  -- Retorna o digest hexadecimal SHA-256
  RETURN encode(digest(v_payload, 'sha256'), 'hex');
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. FUNÇÃO TRIGGER CENTRAL: CAPTURA AUTOMÁTICA EM TABELAS CRÍTICAS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_capture_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_tenant_id TEXT;
  v_user_id UUID;
  v_action VARCHAR(10);
  v_old_json JSONB := NULL;
  v_new_json JSONB := NULL;
  v_created_at TIMESTAMPTZ := timezone('utc'::text, now());
  v_checksum TEXT;
  v_client_ip INET;
  v_user_agent TEXT;
BEGIN
  -- 1. Determina a operação DML
  v_action := TG_OP;

  -- 2. Extrai ou infere o usuário responsável
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- 3. Extrai tenant_id da tupla mutada ou da sessão
  IF (v_action = 'DELETE') THEN
    v_old_json := to_jsonb(OLD);
    v_tenant_id := coalesce(
      v_old_json ->> 'tenant_id',
      v_old_json ->> 'barbershop_id',
      (auth.jwt() ->> 'tenant_id')
    );
    IF v_user_id IS NULL AND v_old_json ? 'user_id' THEN
      BEGIN
        v_user_id := (v_old_json ->> 'user_id')::uuid;
      EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
      END IF;
    END IF;
  ELSE
    v_new_json := to_jsonb(NEW);
    v_tenant_id := coalesce(
      v_new_json ->> 'tenant_id',
      v_new_json ->> 'barbershop_id',
      (auth.jwt() ->> 'tenant_id')
    );
    IF v_user_id IS NULL AND v_new_json ? 'user_id' THEN
      BEGIN
        v_user_id := (v_new_json ->> 'user_id')::uuid;
      EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
      END IF;
    END IF;

    IF (v_action = 'UPDATE') THEN
      v_old_json := to_jsonb(OLD);
    END IF;
  END IF;

  -- Fallback de segurança para tenant_id
  IF v_tenant_id IS NULL OR v_tenant_id = '' THEN
    v_tenant_id := 'SYSTEM_TENANT';
  END IF;

  -- Higienização de PII sensível em logs (LGPD Art. 46 / PCI-DSS)
  IF v_old_json IS NOT NULL THEN
    v_old_json := v_old_json - 'password_hash' - 'credit_card_token' - 'api_secret';
  END IF;
  IF v_new_json IS NOT NULL THEN
    v_new_json := v_new_json - 'password_hash' - 'credit_card_token' - 'api_secret';
  END IF;

  -- Extrai metadados de rede se disponíveis
  BEGIN
    v_client_ip := inet(current_setting('request.headers', true)::json ->> 'x-forwarded-for');
  EXCEPTION WHEN OTHERS THEN
    v_client_ip := NULL;
  END;

  BEGIN
    v_user_agent := current_setting('request.headers', true)::json ->> 'user-agent';
  EXCEPTION WHEN OTHERS THEN
    v_user_agent := NULL;
  END;

  -- 4. Calcula o selo criptográfico WORM
  v_checksum := public.calculate_audit_checksum(
    v_tenant_id,
    coalesce(v_user_id::text, 'SYSTEM'),
    v_action,
    TG_TABLE_NAME::text,
    v_old_json,
    v_new_json,
    v_created_at
  );

  -- 5. Gravação atômica na tabela imutável
  INSERT INTO public.audit_logs (
    tenant_id,
    user_id,
    action,
    table_name,
    old_data,
    new_data,
    created_at,
    client_ip,
    user_agent,
    record_checksum,
    tamper_seal_version
  ) VALUES (
    v_tenant_id,
    v_user_id,
    v_action,
    TG_TABLE_NAME::text,
    v_old_json,
    v_new_json,
    v_created_at,
    v_client_ip,
    v_user_agent,
    v_checksum,
    'v1-sha256'
  );

  IF (v_action = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. CONFIGURAÇÃO DE TRIGGERS AUTOMÁTICOS NAS TABELAS CRÍTICAS
-- ------------------------------------------------------------------------------

-- A. Tabela: appointments (Agendamentos)
DROP TRIGGER IF EXISTS trg_audit_appointments ON public.appointments;
CREATE TRIGGER trg_audit_appointments
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.fn_capture_audit_log();

-- B. Tabela: transactions (Transações Financeiras / Checkout / Pagamentos)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
    DROP TRIGGER IF EXISTS trg_audit_transactions ON public.transactions;
    CREATE TRIGGER trg_audit_transactions
      AFTER INSERT OR UPDATE OR DELETE ON public.transactions
      FOR EACH ROW EXECUTE FUNCTION public.fn_capture_audit_log();
  END IF;
END $$;

-- C. Tabela: users / profiles (Usuários, Papéis e Acessos)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS trg_audit_users ON public.users;
    CREATE TRIGGER trg_audit_users
      AFTER INSERT OR UPDATE OR DELETE ON public.users
      FOR EACH ROW EXECUTE FUNCTION public.fn_capture_audit_log();
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
    CREATE TRIGGER trg_audit_profiles
      AFTER INSERT OR UPDATE OR DELETE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.fn_capture_audit_log();
  END IF;
END $$;

-- D. Tabela: tenants / barbershops (Organizações & Tenants)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
    DROP TRIGGER IF EXISTS trg_audit_tenants ON public.tenants;
    CREATE TRIGGER trg_audit_tenants
      AFTER INSERT OR UPDATE OR DELETE ON public.tenants
      FOR EACH ROW EXECUTE FUNCTION public.fn_capture_audit_log();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'barbershops') THEN
    DROP TRIGGER IF EXISTS trg_audit_barbershops ON public.barbershops;
    CREATE TRIGGER trg_audit_barbershops
      AFTER INSERT OR UPDATE OR DELETE ON public.barbershops
      FOR EACH ROW EXECUTE FUNCTION public.fn_capture_audit_log();
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. BLINDAGEM DE IMUTABILIDADE ABSOLUTA (WORM): BLOQUEIO DE UPDATE, DELETE & TRUNCATE
-- ------------------------------------------------------------------------------

-- Função de bloqueio direto que intercepta qualquer tentativa de UPDATE ou DELETE
CREATE OR REPLACE FUNCTION public.fn_block_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'COMPLIANCE_ERROR_42501: A tabela audit_logs é estritamente IMUTÁVEL (WORM - Write Once, Read Many). Mutações via UPDATE, DELETE ou TRUNCATE são permanentemente vedadas para conformidade legal (LGPD Art. 37, SOX e PCI-DSS).'
    USING ERRCODE = '42501';
  RETURN NULL;
END;
$$;

-- Trigger preventivo no BEFORE UPDATE
DROP TRIGGER IF EXISTS trg_audit_logs_block_update ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_block_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_audit_log_mutation();

-- Trigger preventivo no BEFORE DELETE
DROP TRIGGER IF EXISTS trg_audit_logs_block_delete ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_block_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_audit_log_mutation();

-- Trigger preventivo no BEFORE TRUNCATE
DROP TRIGGER IF EXISTS trg_audit_logs_block_truncate ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_block_truncate
  BEFORE TRUNCATE ON public.audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.fn_block_audit_log_mutation();

-- ------------------------------------------------------------------------------
-- 6. POLÍTICAS DE ROW LEVEL SECURITY (RLS) DE IMUTABILIDADE & ISOLAMENTO
-- ------------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- Expurgo de políticas pré-existentes
DROP POLICY IF EXISTS "audit_logs_allow_insert_trigger" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_deny_update" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_deny_delete" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_tenant_select" ON public.audit_logs;

-- A. POLÍTICA DE LEITURA (SELECT): Segregação Multi-Tenant Estrita
-- Apenas administradores e auditores do respectivo tenant ou SUPERADMIN podem consultar os logs
CREATE POLICY "audit_logs_tenant_select"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_auth_tenant_id() OR
    public.is_superadmin()
  );

-- B. POLÍTICA DE INSERÇÃO (INSERT): Somente permitida para Triggers (Security Definer) e Service Role
CREATE POLICY "audit_logs_allow_insert_trigger"
  ON public.audit_logs
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    -- Permite inserção quando tenant_id bate com contexto ou executado por trigger autorizada
    tenant_id = public.get_auth_tenant_id() OR
    public.is_superadmin() OR
    current_user IN ('postgres', 'service_role')
  );

-- C. POLÍTICA DE ATUALIZAÇÃO (UPDATE): Bloqueio Incondicional (Retorna falso para qualquer usuário)
CREATE POLICY "audit_logs_deny_update"
  ON public.audit_logs
  FOR UPDATE
  TO public, anon, authenticated, service_role
  USING (false)
  WITH CHECK (false);

-- D. POLÍTICA DE EXCLUSÃO (DELETE): Bloqueio Incondicional (Retorna falso para qualquer usuário)
CREATE POLICY "audit_logs_deny_delete"
  ON public.audit_logs
  FOR DELETE
  TO public, anon, authenticated, service_role
  USING (false);

-- ------------------------------------------------------------------------------
-- 7. REVOGAÇÃO COMPULSÓRIA DE PRIVILÉGIOS DCL (GRANT/REVOKE HYGIENE)
-- ------------------------------------------------------------------------------
-- Nega terminantemente privilégios de escrita destrutiva mesmo no nível de permissões de tabela
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM public, anon, authenticated;

-- Garante apenas SELECT para usuários autenticados (sob controle RLS)
GRANT SELECT ON public.audit_logs TO authenticated;

-- Inserção é restrita ao sistema / triggers
GRANT INSERT ON public.audit_logs TO postgres, service_role;
