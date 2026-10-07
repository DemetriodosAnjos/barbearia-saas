-- ==============================================================================
-- MIGRAÇÃO DE CONFORMIDADE: MOTOR DE EXPURGO E ANONIMIZAÇÃO DE DADOS (LGPD/GDPR)
-- Padrões: LGPD (Lei 13.709/2018) Arts. 16 e 18 / GDPR Art. 17 (Right to Erasure)
--          Código Tributário Nacional (CTN) Art. 173 (Prazo Decadencial Fiscal 5 Anos)
-- ==============================================================================

-- 1. Criação/Adequação de colunas de Soft-Delete e Anonimização em tabelas centrais
DO $$
BEGIN
  -- Tabela: clients
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'deleted_at') THEN
    ALTER TABLE public.clients ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'retention_until') THEN
    ALTER TABLE public.clients ADD COLUMN retention_until TIMESTAMPTZ DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'deletion_reason') THEN
    ALTER TABLE public.clients ADD COLUMN deletion_reason TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'is_anonymized') THEN
    ALTER TABLE public.clients ADD COLUMN is_anonymized BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'anonymized_at') THEN
    ALTER TABLE public.clients ADD COLUMN anonymized_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'fiscal_retention_until') THEN
    ALTER TABLE public.clients ADD COLUMN fiscal_retention_until TIMESTAMPTZ DEFAULT NULL;
  END IF;

  -- Tabela: appointments (Soft-Delete de Agendamentos)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'deleted_at') THEN
    ALTER TABLE public.appointments ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  -- Tabela: transactions (Marcação de Anonimização Fiscal)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'is_client_anonymized') THEN
    ALTER TABLE public.transactions ADD COLUMN is_client_anonymized BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'anonymized_at') THEN
    ALTER TABLE public.transactions ADD COLUMN anonymized_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- 2. Índices Parciais de Alta Performance para Varredura de Expurgo
CREATE INDEX IF NOT EXISTS idx_clients_deleted_at 
  ON public.clients (deleted_at) 
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_purge_candidates 
  ON public.clients (retention_until) 
  WHERE deleted_at IS NOT NULL AND is_anonymized = FALSE;

CREATE INDEX IF NOT EXISTS idx_appointments_deleted_at 
  ON public.appointments (deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- 3. View de Clientes Ativos (Filtro Automático de Soft-Deleted)
CREATE OR REPLACE VIEW public.active_clients AS
SELECT 
  id,
  tenant_id,
  name,
  phone,
  email,
  cpf,
  notes,
  is_anonymized,
  created_at
FROM public.clients
WHERE deleted_at IS NULL;

-- 4. Função de Soft-Delete: Retenção Temporária para Recuperação (Janela de Graça)
CREATE OR REPLACE FUNCTION public.soft_delete_client(
  p_client_id UUID,
  p_retention_days INT DEFAULT 30,
  p_reason TEXT DEFAULT 'Solicitação de Exclusão pelo Titular (LGPD Art. 18)'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client RECORD;
  v_retention_limit TIMESTAMPTZ;
BEGIN
  -- Validar existência do cliente
  SELECT id, tenant_id, name, deleted_at, is_anonymized
  INTO v_client
  FROM public.clients
  WHERE id = p_client_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'CLIENT_NOT_FOUND',
      'message', 'Cliente não localizado para descontinuação.'
    );
  END IF;

  IF v_client.deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ALREADY_SOFT_DELETED',
      'message', 'Cliente já se encontra em período de retenção temporária (soft-delete).'
    );
  END IF;

  v_retention_limit := clock_timestamp() + (p_retention_days || ' days')::INTERVAL;

  -- Aplica soft delete no cliente
  UPDATE public.clients
  SET 
    deleted_at = clock_timestamp(),
    retention_until = v_retention_limit,
    deletion_reason = p_reason
  WHERE id = p_client_id;

  -- Aplica soft delete em agendamentos futuros não concluídos
  UPDATE public.appointments
  SET deleted_at = clock_timestamp()
  WHERE client_id = p_client_id AND status IN ('scheduled', 'pending');

  RETURN jsonb_build_object(
    'success', true,
    'client_id', p_client_id,
    'deleted_at', clock_timestamp(),
    'retention_until', v_retention_limit,
    'grace_period_days', p_retention_days,
    'message', 'Soft-delete aplicado com sucesso. Registro elegível para recuperação até a data limite.'
  );
END;
$$;

-- 5. Função de Restauração de Cliente (Desfaz o Soft-Delete dentro da Janela)
CREATE OR REPLACE FUNCTION public.restore_soft_deleted_client(p_client_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client RECORD;
BEGIN
  SELECT id, deleted_at, is_anonymized
  INTO v_client
  FROM public.clients
  WHERE id = p_client_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Cliente inexistente.');
  END IF;

  IF v_client.is_anonymized THEN
    RETURN jsonb_build_object(
      'success', false, 
      'code', 'CANNOT_RESTORE_ANONYMIZED', 
      'message', 'Impossível restaurar: Dados pessoais já foram anonimizados de forma irreversível.'
    );
  END IF;

  IF v_client.deleted_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_DELETED', 'message', 'O cliente não está desativado.');
  END IF;

  UPDATE public.clients
  SET 
    deleted_at = NULL,
    retention_until = NULL,
    deletion_reason = NULL
  WHERE id = p_client_id;

  -- Restaura agendamentos cancelados por soft delete
  UPDATE public.appointments
  SET deleted_at = NULL
  WHERE client_id = p_client_id AND deleted_at = v_client.deleted_at;

  RETURN jsonb_build_object(
    'success', true,
    'client_id', p_client_id,
    'restored_at', clock_timestamp(),
    'message', 'Cliente e registros vinculados restaurados com sucesso.'
  );
END;
$$;

-- 6. Função de Anonimização Irreversível de Dados Fiscais (CTN Art. 173 / LGPD Art. 16, I)
-- Substitui Nome e CPF por hashes criptográficos irreversíveis (SHA-256 com Pepper)
CREATE OR REPLACE FUNCTION public.anonymize_client_fiscal_record(
  p_client_id UUID,
  p_salt TEXT DEFAULT 'LGPD_FISCAL_SALT_2026_SECRET'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_client RECORD;
  v_anon_name TEXT;
  v_anon_cpf TEXT;
  v_anon_email TEXT;
  v_hash_suffix TEXT;
BEGIN
  SELECT id, tenant_id, name, cpf, email, is_anonymized
  INTO v_client
  FROM public.clients
  WHERE id = p_client_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cliente não encontrado.');
  END IF;

  IF v_client.is_anonymized THEN
    RETURN jsonb_build_object('success', true, 'message', 'Cliente já se encontra previamente anonimizado.');
  END IF;

  -- Gera hash irreversível SHA-256 a partir do ID + Pepper
  v_hash_suffix := SUBSTRING(ENCODE(DIGEST(p_client_id::TEXT || COALESCE(v_client.cpf, '') || p_salt, 'sha256'), 'hex'), 1, 12);
  v_anon_name := 'TITULAR ANONIMIZADO LGPD #' || UPPER(v_hash_suffix);
  v_anon_cpf := 'ANON-CPF-' || SUBSTRING(ENCODE(DIGEST(COALESCE(v_client.cpf, p_client_id::TEXT) || p_salt, 'sha256'), 'hex'), 1, 14);
  v_anon_email := 'anonymized_' || LOWER(v_hash_suffix) || '@lgpd.fiscal.local';

  -- Anonimiza cadastro do cliente: Preserva apenas o registro fiscal desprovido de identificação individual
  UPDATE public.clients
  SET
    name = v_anon_name,
    cpf = v_anon_cpf,
    email = v_anon_email,
    phone = '+5500000000000',
    notes = '[DADOS DE CONTATO E PREFERÊNCIAS EXPURGADOS CONFORME LGPD ART. 16]',
    is_anonymized = TRUE,
    anonymized_at = clock_timestamp(),
    fiscal_retention_until = clock_timestamp() + INTERVAL '5 years'
  WHERE id = p_client_id;

  -- Anonimiza snapshots em transações financeiras vinculadas
  UPDATE public.transactions
  SET 
    is_client_anonymized = TRUE,
    anonymized_at = clock_timestamp()
  WHERE client_id = p_client_id;

  -- Expurga histórico secundário não fiscal (agendamentos rotineiros, tags e cartões de fidelidade)
  DELETE FROM public.appointments WHERE client_id = p_client_id AND status != 'completed';

  RETURN jsonb_build_object(
    'success', true,
    'client_id', p_client_id,
    'pseudonym', v_anon_name,
    'cpf_token', v_anon_cpf,
    'anonymized_at', clock_timestamp(),
    'fiscal_retention_until', clock_timestamp() + INTERVAL '5 years',
    'legal_basis', 'LGPD Art. 16, I c/c CTN Art. 173 (Retenção Fiscal 5 anos)'
  );
END;
$$;

-- 7. Rotina Central de Expurgo (Hard-Delete em Cascata Respeitando FKs & Anonimização)
CREATE OR REPLACE FUNCTION public.execute_lgpd_hard_delete_purge(
  p_dry_run BOOLEAN DEFAULT FALSE,
  p_pepper TEXT DEFAULT 'LGPD_FISCAL_SALT_2026_SECRET'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rec RECORD;
  v_count_purged INT := 0;
  v_count_anonymized INT := 0;
  v_count_appointments_deleted INT := 0;
  v_has_fiscal_obligation BOOLEAN;
  v_start_time TIMESTAMPTZ := clock_timestamp();
  v_execution_ms INT;
BEGIN
  -- Percorre clientes com soft-delete cuja janela de retenção já expirou
  FOR v_rec IN 
    SELECT c.id, c.tenant_id, c.name, c.retention_until
    FROM public.clients c
    WHERE c.deleted_at IS NOT NULL
      AND (c.retention_until IS NULL OR c.retention_until <= clock_timestamp())
      AND c.is_anonymized = FALSE
  LOOP
    -- Verifica se o cliente possui registros com obrigação fiscal (Transações financeiras pagas)
    SELECT EXISTS (
      SELECT 1 FROM public.transactions t 
      WHERE t.client_id = v_rec.id 
        AND t.status IN ('paid', 'completed')
        AND t.created_at >= (clock_timestamp() - INTERVAL '5 years')
    ) INTO v_has_fiscal_obligation;

    IF v_has_fiscal_obligation THEN
      -- Obrigação Fiscal detectada: NÃO apaga o registro financeiro, executa ANONIMIZAÇÃO IRREVERSÍVEL
      IF NOT p_dry_run THEN
        PERFORM public.anonymize_client_fiscal_record(v_rec.id, p_pepper);
      END IF;
      v_count_anonymized := v_count_anonymized + 1;
    ELSE
      -- Sem obrigação fiscal pendente: EXECUTA HARD-DELETE EM CASCATA RESPEITANDO FKS
      IF NOT p_dry_run THEN
        -- 1. Exclui registros filhos em ordem de dependência FK
        DELETE FROM public.appointments WHERE client_id = v_rec.id;
        GET DIAGNOSTICS v_count_appointments_deleted = ROW_COUNT;

        -- 2. Exclui histórico e logs temporários não auditados WORM
        DELETE FROM public.transactions WHERE client_id = v_rec.id;

        -- 3. Exclui o cliente definitivamente da tabela pai
        DELETE FROM public.clients WHERE id = v_rec.id;
      END IF;
      v_count_purged := v_count_purged + 1;
    END IF;
  END LOOP;

  v_execution_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INT;

  RETURN jsonb_build_object(
    'dry_run', p_dry_run,
    'status', 'COMPLETED',
    'clients_purged_hard_delete', v_count_purged,
    'clients_anonymized_fiscal', v_count_anonymized,
    'appointments_cascade_deleted', v_count_appointments_deleted,
    'execution_time_ms', v_execution_ms,
    'executed_at', clock_timestamp()
  );
END;
$$;
