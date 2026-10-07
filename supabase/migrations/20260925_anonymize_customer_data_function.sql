-- ==============================================================================
-- MIGRAÇÃO DE CONFORMIDADE: MÓDULO 2 - ANONIMIZAÇÃO E MASCARAMENTO FISCAL (LGPD)
-- Autor: Data Privacy Specialist (LGPD/GDPR)
-- Referência: LGPD (Lei 13.709/2018) Arts. 16, I e 18 / CTN Art. 173 / GDPR Art. 17
-- Data: 25/09/2026
-- ==============================================================================

-- 1. Habilitação compulsória da extensão criptográfica pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Garantia de colunas de controle e dados na tabela public.customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN address TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'is_anonymized'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN is_anonymized BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'anonymized_at'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN anonymized_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'fiscal_retention_until'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN fiscal_retention_until TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- ==============================================================================
-- TASK 2.1: FUNÇÃO DE HASH IRREVERSÍVEL (PL/pgSQL COM PGCRYPTO)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.anonymize_customer_data(target_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_customer RECORD;
  v_name_hash TEXT;
  v_email_hash TEXT;
  v_cpf_hash TEXT;
  v_anon_name TEXT;
  v_anon_email TEXT;
  v_anon_cpf TEXT;
  v_orders_count INT := 0;
  v_invoices_count INT := 0;
BEGIN
  -- 1. Localiza e bloqueia a linha do cliente para concorrência segura
  SELECT 
    id, tenant_id, name, email, cpf, phone, is_anonymized
  INTO v_customer
  FROM public.customers
  WHERE id = target_id
  FOR UPDATE;

  -- Validação de existência do registro
  IF NOT FOUND THEN
    -- Fallback compatível se o registro residir na tabela legada public.clients
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
      SELECT id, tenant_id, name, email, cpf, phone, is_anonymized
      INTO v_customer
      FROM public.clients
      WHERE id = target_id
      FOR UPDATE;
    END IF;

    IF v_customer.id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'CUSTOMER_NOT_FOUND',
        'message', 'Cliente com o ID especificado não foi localizado.'
      );
    END IF;
  END IF;

  -- 2. Idempotência: caso já esteja previamente anonimizado
  IF v_customer.is_anonymized THEN
    RETURN jsonb_build_object(
      'success', true,
      'code', 'ALREADY_ANONYMIZED',
      'target_id', target_id,
      'message', 'O registro do cliente já se encontra devidamente anonimizado para fins fiscais.'
    );
  END IF;

  -- 3. Geração de Hashes Irreversíveis utilizando pgcrypto (digest(..., 'sha256'))
  -- Gera digests SHA-256 criptograficamente seguros e irreversíveis em formato hexadecimal
  v_name_hash  := encode(digest(coalesce(v_customer.name, '') || target_id::text, 'sha256'), 'hex');
  v_email_hash := encode(digest(coalesce(v_customer.email, '') || target_id::text, 'sha256'), 'hex');
  v_cpf_hash   := encode(digest(coalesce(v_customer.cpf, '') || target_id::text, 'sha256'), 'hex');

  -- Formatação padronizada e legível dos valores anonimizados
  v_anon_name  := 'TITULAR_ANONIMIZADO_' || upper(substring(v_name_hash from 1 for 16));
  v_anon_email := 'anonymized_' || substring(v_email_hash from 1 for 16) || '@lgpd.fiscal.local';
  v_anon_cpf   := 'HASH-CPF-' || upper(substring(v_cpf_hash from 1 for 16));

  -- 4. Atualização na tabela customers:
  -- - Substitui Nome, E-mail e CPF por hashes irreversíveis
  -- - Zera dados secundários (telefones, endereços, notas e detalhes pessoais)
  -- - Preserva o registro (ID, created_at, tenant_id) para manter integridade com notas/pedidos históricos
  UPDATE public.customers
  SET
    name                   = v_anon_name,
    email                  = v_anon_email,
    cpf                    = v_anon_cpf,
    phone                  = NULL,
    address                = NULL,
    notes                  = '[DADOS PESSOAIS E SECUNDÁRIOS EXPURGADOS CONFORME LGPD ART. 16 - CONFORMIDADE FISCAL CTN ART. 173]',
    is_anonymized          = TRUE,
    anonymized_at          = timezone('utc'::text, now()),
    fiscal_retention_until = timezone('utc'::text, now()) + INTERVAL '5 years',
    updated_at             = timezone('utc'::text, now())
  WHERE id = target_id;

  -- Atualização na tabela clients (se existente) para consistência no banco
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    UPDATE public.clients
    SET
      name                   = v_anon_name,
      email                  = v_anon_email,
      cpf                    = v_anon_cpf,
      phone                  = NULL,
      notes                  = '[EXPURGADO LGPD]',
      is_anonymized          = TRUE,
      anonymized_at          = timezone('utc'::text, now()),
      fiscal_retention_until = timezone('utc'::text, now()) + INTERVAL '5 years'
    WHERE id = target_id;
  END IF;

  -- 5. Preservação de Integridade Histórica (Pedidos, Transações e Notas Fiscais)
  -- Marcação em transações vinculadas sem destruição de montantes fiscais
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    UPDATE public.transactions
    SET 
      is_client_anonymized = TRUE,
      anonymized_at        = timezone('utc'::text, now())
    WHERE client_id = target_id;
    GET DIAGNOSTICS v_invoices_count = ROW_COUNT;
  END IF;

  -- Contagem de pedidos / agendamentos concluídos mantidos para histórico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
    -- Expurga apenas agendamentos futuros não realizados
    DELETE FROM public.appointments 
    WHERE client_id = target_id 
      AND status IN ('scheduled', 'pending');
      
    SELECT count(*) INTO v_orders_count 
    FROM public.appointments 
    WHERE client_id = target_id;
  END IF;

  -- 6. Retorna objeto de confirmação estruturado em JSONB
  RETURN jsonb_build_object(
    'success', true,
    'code', 'CUSTOMER_ANONYMIZED_SUCCESS',
    'target_id', target_id,
    'hashed_name', v_anon_name,
    'hashed_email', v_anon_email,
    'hashed_cpf', v_anon_cpf,
    'secondary_data_cleared', true,
    'phone_cleared', true,
    'address_cleared', true,
    'record_preserved', true,
    'historical_transactions_preserved', v_invoices_count,
    'historical_orders_preserved', v_orders_count,
    'legal_basis', 'LGPD Art. 16, I c/c CTN Art. 173 (Retenção Fiscal 5 Anos)',
    'anonymized_at', timezone('utc'::text, now())
  );
END;
$$;

-- 3. Permissões de Acesso (DCL)
REVOKE ALL ON FUNCTION public.anonymize_customer_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anonymize_customer_data(UUID) TO service_role, authenticated;

-- Comentário formal no catálogo do PostgreSQL para auditoria de schema
COMMENT ON FUNCTION public.anonymize_customer_data(UUID) IS 
  'Módulo 2 (Task 2.1): Anonimiza dados pessoais de clientes com pgcrypto digest sha256 e zera dados secundários para guarda fiscal.';
