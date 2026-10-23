-- ==============================================================================
-- MIGRAÇÃO DE CONFORMIDADE: MOTOR DE HARD-DELETE E EXPURGO DEFINITIVO (LGPD/GDPR)
-- Task 3.1: Stored Procedure PL/pgSQL purge_expired_customers(retention_days INT)
-- Padrões Regulatórios:
--   - LGPD (Lei 13.709/2018) Art. 16 (Eliminação dos Dados) & Art. 18 (Exclusão)
--   - GDPR Art. 17 (Right to Erasure / Right to be Forgotten)
--   - Código Tributário Nacional (CTN) Art. 173 (Prazo Decadencial Fiscal 5 Anos)
-- ==============================================================================

CREATE OR REPLACE PROCEDURE public.purge_expired_customers(retention_days INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_cutoff_timestamp TIMESTAMPTZ;
  v_customer RECORD;
  v_has_fiscal_obligation BOOLEAN;
  v_scanned_count INT := 0;
  v_anonymized_count INT := 0;
  v_hard_deleted_count INT := 0;
  v_appointments_purged INT := 0;
  v_notes_purged INT := 0;
  v_start_time TIMESTAMPTZ := clock_timestamp();
  v_execution_ms INT;
BEGIN
  -- 1. Validação defensiva do parâmetro de retenção (mínimo de 0 dias)
  IF retention_days IS NULL OR retention_days < 0 THEN
    RAISE EXCEPTION 'O parâmetro retention_days deve ser um inteiro não-negativo. Valor recebido: %', retention_days;
  END IF;

  -- 2. Definição do carimbo temporal de corte conforme janela regulatória
  v_cutoff_timestamp := timezone('utc'::text, now()) - (retention_days || ' days')::INTERVAL;

  -- 3. Cursor pessimista com SKIP LOCKED para execução concorrente segura em bancos clusterizados
  FOR v_customer IN
    SELECT 
      c.id, 
      c.tenant_id, 
      c.name, 
      c.deleted_at, 
      c.is_anonymized
    FROM public.customers c
    WHERE c.deleted_at IS NOT NULL
      AND c.deleted_at <= v_cutoff_timestamp
    FOR UPDATE OF c SKIP LOCKED
  LOOP
    v_scanned_count := v_scanned_count + 1;

    -- 4. Verificação de Obrigação Legal/Tributária (CTN Art. 173 c/c LGPD Art. 16, I)
    -- Checa se o cliente possui registros fiscais ou transações financeiras pagas nos últimos 5 anos
    v_has_fiscal_obligation := FALSE;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
      SELECT EXISTS (
        SELECT 1 
        FROM public.transactions t
        WHERE t.client_id = v_customer.id
          AND t.status IN ('paid', 'completed')
          AND t.created_at >= (timezone('utc'::text, now()) - INTERVAL '5 years')
      ) INTO v_has_fiscal_obligation;
    END IF;

    -- Verificação complementar em faturas/invoices históricas se existentes
    IF NOT v_has_fiscal_obligation AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
      SELECT EXISTS (
        SELECT 1 
        FROM public.invoices inv
        WHERE inv.customer_id = v_customer.id
          AND inv.created_at >= (timezone('utc'::text, now()) - INTERVAL '5 years')
      ) INTO v_has_fiscal_obligation;
    END IF;

    -- 5. Decisão Arquitetural: Preservação Fiscal com Anonimização vs Expurgo Definitivo (Hard-Delete)
    IF v_has_fiscal_obligation THEN
      -- CASO A: Há Obrigação Fiscal (CTN Art. 173) -> Executa ANONIMIZAÇÃO IRREVERSÍVEL (Task 2.1)
      IF NOT v_customer.is_anonymized THEN
        PERFORM public.anonymize_customer_data(v_customer.id);
        v_anonymized_count := v_anonymized_count + 1;
      END IF;
    ELSE
      -- CASO B: Sem Obrigação Fiscal Pendente -> EXECUTA HARD-DELETE EM CASCATA RESPEITANDO FKS

      -- 5.1. Expurgo em tabelas secundárias/filhas (ordem estrita de integridade referencial)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_notes') THEN
        DELETE FROM public.customer_notes WHERE customer_id = v_customer.id;
        GET DIAGNOSTICS v_notes_purged = ROW_COUNT;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
        DELETE FROM public.appointments WHERE client_id = v_customer.id;
        GET DIAGNOSTICS v_appointments_purged = ROW_COUNT;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loyalty_points') THEN
        DELETE FROM public.loyalty_points WHERE customer_id = v_customer.id;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_tags') THEN
        DELETE FROM public.client_tags WHERE client_id = v_customer.id;
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        -- Expurga apenas transações canceladas, abandonadas ou sem lastro fiscal
        DELETE FROM public.transactions WHERE client_id = v_customer.id;
      END IF;

      -- 5.2. Exclusão física definitiva (Hard-Delete) do registro pai na tabela customers
      DELETE FROM public.customers WHERE id = v_customer.id;
      v_hard_deleted_count := v_hard_deleted_count + 1;

      -- 5.3. Sincronização em tabela legada clients se presente na base de dados
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        DELETE FROM public.clients WHERE id = v_customer.id;
      END IF;
    END IF;
  END LOOP;

  v_execution_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INT;

  -- 6. Emissão de Log Estruturado na Tabela de Auditoria Imutável (audit_logs)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    INSERT INTO public.audit_logs (
      id,
      tenant_id,
      action,
      entity,
      details,
      created_at
    ) VALUES (
      gen_random_uuid(),
      'system_crontab_engine',
      'PURGE_EXPIRED_CUSTOMERS',
      'customers',
      jsonb_build_object(
        'procedure', 'purge_expired_customers',
        'retention_days', retention_days,
        'cutoff_timestamp', v_cutoff_timestamp,
        'scanned_customers', v_scanned_count,
        'anonymized_fiscal', v_anonymized_count,
        'hard_deleted', v_hard_deleted_count,
        'execution_ms', v_execution_ms,
        'status', 'SUCCESS'
      ),
      timezone('utc'::text, now())
    );
  END IF;

  -- 7. Registro de log de telemetria no console PostgreSQL para operadores DBA
  RAISE NOTICE 'PURGE_EXPIRED_CUSTOMERS CONCLUÍDO: Retenção: % dias | Varredura: % | Anonimizados Fiscal: % | Hard-Deleted: % | Tempo: %ms',
    retention_days, v_scanned_count, v_anonymized_count, v_hard_deleted_count, v_execution_ms;
END;
$$;

-- Restrição de privilégios: apenas service_role e superadministradores executam o expurgo
REVOKE ALL ON PROCEDURE public.purge_expired_customers(INT) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE public.purge_expired_customers(INT) TO service_role;
