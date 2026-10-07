-- ==============================================================================
-- MIGRAÇÃO DE CONFORMIDADE: MÓDULO 1 - ESTRUTURA DE SOFT-DELETE NO BANCO DE DADOS
-- Autor: Data Engineer especialista em PostgreSQL / Supabase
-- Referência: LGPD (Lei 13.709/2018) Arts. 16/18 / GDPR Art. 17
-- Data: 25/09/2026
-- ==============================================================================

-- ==============================================================================
-- TASK 1.1: CAMADA DE DDL & PERFORMANCE (TABELA CUSTOMERS)
-- ==============================================================================

-- 1. Criação/Adequação da tabela de clientes (customers)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  cpf VARCHAR(20),
  notes TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Adiciona a coluna deleted_at caso a tabela já exista previamente sem a coluna
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- 2. Índices Parciais de Alta Performance (Otimização para Registros Ativos e Varredura)
-- Índice parcial que otimiza 99% das buscas cotidianas da aplicação (exclusão de deletados)
CREATE INDEX IF NOT EXISTS idx_customers_active_tenant 
  ON public.customers (tenant_id, id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customers_active_lookup 
  ON public.customers (tenant_id, phone, email) 
  WHERE deleted_at IS NULL;

-- Índice parcial para o motor de expurgo e auditoria de registros descontinuados
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at 
  ON public.customers (deleted_at) 
  WHERE deleted_at IS NOT NULL;

-- 3. VIEW active_customers: Abstração transparente do filtro de exclusão lógica
CREATE OR REPLACE VIEW public.active_customers AS
SELECT 
  id,
  tenant_id,
  name,
  phone,
  email,
  cpf,
  notes,
  created_at,
  updated_at
FROM public.customers
WHERE deleted_at IS NULL;

-- ==============================================================================
-- TASK 1.2: PROCEDURE DE EXCLUSÃO LÓGICA (STORED PROCEDURE PL/PGSQL)
-- ==============================================================================

CREATE OR REPLACE PROCEDURE public.soft_delete_customer(target_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- 1. Atualiza o campo deleted_at com NOW() na tabela customers
  UPDATE public.customers
  SET 
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = target_id 
    AND deleted_at IS NULL;

  -- Compatibilidade com tabela clients se existir no schema
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    UPDATE public.clients
    SET deleted_at = NOW()
    WHERE id = target_id AND deleted_at IS NULL;
  END IF;

  -- 2. Revoga permissões ativas e encerra sessões ativas associadas ao ID do usuário
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
    UPDATE public.sessions
    SET 
      is_active = FALSE,
      revoked_at = NOW(),
      revocation_reason = 'CUSTOMER_SOFT_DELETED_LGPD'
    WHERE user_id = target_id 
      AND is_active = TRUE;
  END IF;

  -- Revoga tokens ativos e bloqueia login no sistema de autenticação auth.users
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    UPDATE auth.users
    SET 
      banned_until = '2999-12-31 23:59:59+00'::timestamptz,
      raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{is_active}',
        'false'::jsonb
      )
    WHERE id = target_id;
  END IF;

  -- Cancela agendamentos futuros não realizados do cliente
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
    UPDATE public.appointments
    SET deleted_at = NOW()
    WHERE (client_id = target_id::text OR client_id = target_id)
      AND (status IN ('scheduled', 'pending') OR status IS NULL)
      AND deleted_at IS NULL;
  END IF;

  -- Registra evento forense na auditoria de segurança se a tabela existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_audit_events') THEN
    INSERT INTO public.security_audit_events (
      event_type,
      user_id,
      actor_id,
      reason,
      metadata,
      created_at
    ) VALUES (
      'CUSTOMER_SOFT_DELETE',
      target_id::text,
      'DBA_PROCEDURE',
      'Exclusão lógica e revogação de credenciais via soft_delete_customer',
      jsonb_build_object(
        'target_id', target_id,
        'deleted_at', NOW(),
        'sessions_revoked', true
      ),
      NOW()
    );
  END IF;
END;
$$;
