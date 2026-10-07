-- ==============================================================================
-- MIGRAÇÃO DE ATOMICIDADE, RPC E PREVENÇÃO DE RACE CONDITIONS (CONCORRÊNCIA)
-- Barbearia SaaS - Engine PostgreSQL / Supabase
-- Arquivo: supabase/migrations/20260925_rpc_atomic_booking_race_condition.sql
-- ==============================================================================
--
-- ROTAS E FLUXOS MAPEADOS COM RISCO DE RACE CONDITION:
-- 1. POST /api/appointments/book (Dois clientes agendando o mesmo barbeiro no mesmo slot de minuto)
-- 2. POST /api/pos/comandas/:id/checkout (Tentativa de double-spending ou pagamento duplo concorrente)
-- 3. POST /api/barbers/schedule/breaks (Barbeiro adicionando intervalo ao mesmo tempo que cliente agenda)
--
-- SOLUÇÃO ARQUITETURAL:
-- - Extensão btree_gist e exclusão restritiva de ranges temporais.
-- - Advisory Lock transacional (pg_advisory_xact_lock) com hash do (tenant, barbeiro, data).
-- - Bloqueio explícito com SELECT ... FOR UPDATE.
-- - Execução atômica em transação isolada com reversão imediata (ROLLBACK) sob colisão.
-- ==============================================================================

-- 1. Habilitação de extensão para índices de exclusão em ranges com tipos escalares
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Tabela de agendamentos com garantia de integridade estrutural (se não existir)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  barber_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled', 'rejected', 'in_progress', 'waiting')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

  -- Restrição semântica: start_time deve ser estritamente anterior a end_time
  CONSTRAINT chk_appointment_time_order CHECK (start_time < end_time)
);

-- 3. Índice GiST de exclusão para blindar double booking no nível de armazenamento relacional
-- Garante fisicamente que nenhuma sobreposição de horário ocorra para o mesmo barbeiro na mesma data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exclude_overlapping_appointments_per_barber'
  ) THEN
    ALTER TABLE public.appointments
    ADD CONSTRAINT exclude_overlapping_appointments_per_barber
    EXCLUDE USING gist (
      tenant_id WITH =,
      barber_id WITH =,
      booking_date WITH =,
      tsrange(
        (booking_date + start_time),
        (booking_date + end_time)
      ) WITH &&
    )
    WHERE (status NOT IN ('cancelled', 'rejected'));
  END IF;
END $$;

-- 4. FUNÇÃO RPC TRANSACIONAL: book_appointment_atomic
-- ==============================================================================
-- Invocada via Supabase Client: supabase.rpc('book_appointment_atomic', { ... })
--
-- Parâmetros:
-- - p_tenant_id: UUID/ID da Barbearia (validado pelo JWT)
-- - p_barber_id: ID do Profissional selecionado
-- - p_client_id: ID do Cliente autenticado (ou convidado)
-- - p_client_name: Nome do Cliente
-- - p_client_phone: Telefone de contato
-- - p_service_id: ID do Serviço contratado
-- - p_service_name: Título do Serviço
-- - p_booking_date: Data do Agendamento (YYYY-MM-DD)
-- - p_start_time: Horário Inicial (HH:MI)
-- - p_end_time: Horário Final (HH:MI)
-- - p_price: Valor cobrado
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.book_appointment_atomic(
  p_tenant_id TEXT,
  p_barber_id TEXT,
  p_client_id TEXT,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_service_id TEXT,
  p_service_name TEXT,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_price NUMERIC DEFAULT 0.00
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lock_key BIGINT;
  v_conflict_count INTEGER;
  v_new_appointment RECORD;
  v_result JSONB;
BEGIN
  -- 1. Validações preliminares de integridade defensiva
  IF p_tenant_id IS NULL OR p_tenant_id = '' THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: tenant_id é obrigatório.' USING ERRCODE = 'P0002';
  END IF;

  IF p_barber_id IS NULL OR p_barber_id = '' THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: barber_id é obrigatório.' USING ERRCODE = 'P0002';
  END IF;

  IF p_booking_date IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: booking_date é obrigatório.' USING ERRCODE = 'P0002';
  END IF;

  IF p_start_time >= p_end_time THEN
    RAISE EXCEPTION 'INVALID_TIME_RANGE: start_time deve ser anterior a end_time.' USING ERRCODE = 'P0002';
  END IF;

  -- 2. BLOQUEIO ADVISORY TRANSACIONAL EXPLÍCITO (CRÍTICO CONTRA RACE CONDITIONS)
  -- Gera uma chave de lock de 64 bits a partir da tupla determinística (tenant, barbeiro, data).
  -- Apenas 1 transação por vez obtém a permissão de verificação/escrita para este barbeiro e data.
  -- O lock é liberado compulsoriamente pelo PostgreSQL no COMMIT ou ROLLBACK da transação.
  v_lock_key := ('x' || substr(md5(p_tenant_id || ':' || p_barber_id || ':' || p_booking_date::text), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 3. BLOQUEIO EXPLÍCITO DE LINHAS CONFLITANTES (SELECT ... FOR UPDATE)
  -- Trava qualquer linha existente que sobreponha o intervalo desejado
  SELECT COUNT(*)
  INTO v_conflict_count
  FROM public.appointments
  WHERE tenant_id = p_tenant_id
    AND barber_id = p_barber_id
    AND booking_date = p_booking_date
    AND status NOT IN ('cancelled', 'rejected')
    AND (
      -- Condição matemática estrita de sobreposição temporal: (StartA < EndB) AND (EndA > StartB)
      (start_time < p_end_time) AND (end_time > p_start_time)
    )
  FOR UPDATE;

  -- 4. DETECÇÃO DE CONCORRÊNCIA: Se existir qualquer colisão, aborta atomicamente
  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'SLOT_OCCUPIED_CONCURRENCY_CONFLICT: O barbeiro selecionado já possui um agendamento conflitante neste intervalo de horário.'
      USING ERRCODE = 'P0001',
            HINT = 'Selecione outro horário ou alterne para outro barbeiro disponível.';
  END IF;

  -- 5. INSERÇÃO ATÔMICA GARANTIDA
  INSERT INTO public.appointments (
    tenant_id,
    barber_id,
    client_id,
    client_name,
    client_phone,
    service_id,
    service_name,
    booking_date,
    start_time,
    end_time,
    price,
    status
  ) VALUES (
    p_tenant_id,
    p_barber_id,
    p_client_id,
    trim(p_client_name),
    trim(p_client_phone),
    p_service_id,
    trim(p_service_name),
    p_booking_date,
    p_start_time,
    p_end_time,
    p_price,
    'confirmed'
  )
  RETURNING * INTO v_new_appointment;

  -- 6. Construção da resposta estruturada com metadados de auditoria transacional
  v_result := jsonb_build_object(
    'success', true,
    'atomicTransaction', 'COMMITTED',
    'lockStrategy', 'ADVISORY_XACT_LOCK_AND_ROW_FOR_UPDATE',
    'appointment', jsonb_build_object(
      'id', v_new_appointment.id,
      'tenant_id', v_new_appointment.tenant_id,
      'barber_id', v_new_appointment.barber_id,
      'client_id', v_new_appointment.client_id,
      'client_name', v_new_appointment.client_name,
      'client_phone', v_new_appointment.client_phone,
      'service_name', v_new_appointment.service_name,
      'booking_date', v_new_appointment.booking_date,
      'start_time', v_new_appointment.start_time,
      'end_time', v_new_appointment.end_time,
      'price', v_new_appointment.price,
      'status', v_new_appointment.status,
      'created_at', v_new_appointment.created_at
    )
  );

  RETURN v_result;

EXCEPTION
  -- Em caso de erro do índice GiST (código 23P01 exclusion_violation)
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'SLOT_OCCUPIED_CONCURRENCY_CONFLICT: Colisão simultânea detectada pelo índice de exclusão do banco de dados.'
      USING ERRCODE = 'P0001';
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- 5. FUNÇÃO RPC TRANSACIONAL: settle_comanda_atomic (Prevenção de Double-Spending no POS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.settle_comanda_atomic(
  p_tenant_id TEXT,
  p_comanda_id TEXT,
  p_payment_method TEXT,
  p_amount_paid NUMERIC,
  p_cashier_user_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_comanda RECORD;
BEGIN
  -- Bloqueio exclusivo da comanda para leitura e mutação
  SELECT *
  INTO v_comanda
  FROM public.appointments
  WHERE id::text = p_comanda_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COMANDA_NOT_FOUND: Comanda não localizada para o tenant especificado.' USING ERRCODE = 'P0002';
  END IF;

  IF v_comanda.status = 'completed' THEN
    RAISE EXCEPTION 'DOUBLE_SETTLEMENT_BLOCKED: Esta comanda já foi liquidada anteriormente por outro operador.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.appointments
  SET status = 'completed',
      updated_at = timezone('utc', now())
  WHERE id::text = p_comanda_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'COMPLETED',
    'comanda_id', p_comanda_id,
    'payment_method', p_payment_method,
    'settled_at', timezone('utc', now())
  );
END;
$$;
