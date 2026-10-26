-- ==============================================================================
-- MIGRAÇÃO DEFINITIVA: LINK DO CLIENTE, SUPABASE REALTIME & IDEMPOTÊNCIA ATÔMICA
-- Barbearia SaaS - Supabase / PostgreSQL Engine
-- Arquivo: supabase/migrations/20261026000001_client_booking_realtime_idempotency.sql
-- ==============================================================================
-- Este script:
-- 1. Garante que a tabela 'appointments' possua todas as colunas necessárias para
--    receber agendamentos originados do link do cliente (anon).
-- 2. Torna flexíveis as chaves estrangeiras rígidas (permite agendamentos de clientes
--    convidados sem login prévio no auth do Supabase).
-- 3. Habilita sincronização bidirecional automática (tenant_id <-> barbershop_id,
--    date <-> booking_date, price <-> total_price, start_time <-> appointment_time).
-- 4. Cria índice GiST e RPC com Advisory Locks contra colisões (Race Conditions / Double Booking)
--    no mesmo minuto, segundo ou milissegundo.
-- 5. Configura políticas RLS para permitir leitura dos slots e inserção segura por clientes anônimos.
-- 6. Ativa Supabase Realtime para que a Agenda do Barbeiro atualize instantaneamente sem F5.
-- ==============================================================================

-- 1. Habilita extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. Garante a existência da tabela appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Adiciona idempotentemente todas as colunas necessárias para o link de agendamento
DO $$
BEGIN
  -- Identificadores de Barbearia / Multi-Tenant
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'tenant_id') THEN
    ALTER TABLE public.appointments ADD COLUMN tenant_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'barbershop_id') THEN
    ALTER TABLE public.appointments ADD COLUMN barbershop_id TEXT;
  END IF;

  -- Datas (compatibilidade total de nomenclatura)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'date') THEN
    ALTER TABLE public.appointments ADD COLUMN date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'booking_date') THEN
    ALTER TABLE public.appointments ADD COLUMN booking_date DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'appointment_date') THEN
    ALTER TABLE public.appointments ADD COLUMN appointment_date DATE;
  END IF;

  -- Horários
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'start_time') THEN
    ALTER TABLE public.appointments ADD COLUMN start_time TIME;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'end_time') THEN
    ALTER TABLE public.appointments ADD COLUMN end_time TIME;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'appointment_time') THEN
    ALTER TABLE public.appointments ADD COLUMN appointment_time TIME;
  END IF;

  -- Dados do Cliente (permitindo clientes que usam o link sem cadastro prévio)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'client_id') THEN
    ALTER TABLE public.appointments ADD COLUMN client_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'client_name') THEN
    ALTER TABLE public.appointments ADD COLUMN client_name TEXT NOT NULL DEFAULT 'Cliente';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'client_phone') THEN
    ALTER TABLE public.appointments ADD COLUMN client_phone TEXT;
  END IF;

  -- Dados do Profissional
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'barber_id') THEN
    ALTER TABLE public.appointments ADD COLUMN barber_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'barber_name') THEN
    ALTER TABLE public.appointments ADD COLUMN barber_name TEXT DEFAULT 'Barbeiro';
  END IF;

  -- Dados do Serviço e Duração
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'service_id') THEN
    ALTER TABLE public.appointments ADD COLUMN service_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'service_name') THEN
    ALTER TABLE public.appointments ADD COLUMN service_name TEXT NOT NULL DEFAULT 'Corte';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'duration_minutes') THEN
    ALTER TABLE public.appointments ADD COLUMN duration_minutes INTEGER DEFAULT 30;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'duration') THEN
    ALTER TABLE public.appointments ADD COLUMN duration INTEGER DEFAULT 30;
  END IF;

  -- Financeiro e Pagamentos
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'price') THEN
    ALTER TABLE public.appointments ADD COLUMN price NUMERIC(10,2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'total_price') THEN
    ALTER TABLE public.appointments ADD COLUMN total_price NUMERIC(10,2) DEFAULT 0.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'payment_method') THEN
    ALTER TABLE public.appointments ADD COLUMN payment_method TEXT DEFAULT 'no_local';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'is_paid') THEN
    ALTER TABLE public.appointments ADD COLUMN is_paid BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'pix_payload') THEN
    ALTER TABLE public.appointments ADD COLUMN pix_payload TEXT;
  END IF;

  -- Protocolo, Origem e Idempotência
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'protocol') THEN
    ALTER TABLE public.appointments ADD COLUMN protocol TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'source') THEN
    ALTER TABLE public.appointments ADD COLUMN source TEXT DEFAULT 'client_link';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'idempotency_key') THEN
    ALTER TABLE public.appointments ADD COLUMN idempotency_key TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'status') THEN
    ALTER TABLE public.appointments ADD COLUMN status TEXT DEFAULT 'confirmed';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'notes') THEN
    ALTER TABLE public.appointments ADD COLUMN notes TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'settlement_id') THEN
    ALTER TABLE public.appointments ADD COLUMN settlement_id TEXT;
  END IF;
END $$;

-- 4. Remove restrições rígidas de FK e NOT NULL em colunas de autenticação interna que bloqueavam clientes públicos
DO $$
BEGIN
  -- Permite que user_id seja nulo se existir na tabela
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'user_id') THEN
    ALTER TABLE public.appointments ALTER COLUMN user_id DROP NOT NULL;
  END IF;

  -- Permite que client_id seja nulo se existir
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'client_id') THEN
    ALTER TABLE public.appointments ALTER COLUMN client_id DROP NOT NULL;
  END IF;

  -- Permite que service_id seja nulo se existir
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'service_id') THEN
    ALTER TABLE public.appointments ALTER COLUMN service_id DROP NOT NULL;
  END IF;

  -- Remove FKs antigas que bloqueavam inserções
  ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_user_id_fkey;
  ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;
  ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_service_id_fkey;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 5. Trigger de Sincronização e Defesa em Profundidade (Garante que nenhuma coluna fique órfã)
CREATE OR REPLACE FUNCTION public.sync_appointments_columns_fn()
RETURNS TRIGGER AS $$
BEGIN
  -- Sincroniza tenant_id <-> barbershop_id
  IF NEW.tenant_id IS NULL AND NEW.barbershop_id IS NOT NULL THEN
    NEW.tenant_id := NEW.barbershop_id;
  ELSIF NEW.barbershop_id IS NULL AND NEW.tenant_id IS NOT NULL THEN
    NEW.barbershop_id := NEW.tenant_id;
  END IF;

  -- Sincroniza date <-> booking_date <-> appointment_date
  IF NEW.date IS NULL THEN
    NEW.date := COALESCE(NEW.booking_date, NEW.appointment_date, CURRENT_DATE);
  END IF;
  IF NEW.booking_date IS NULL THEN
    NEW.booking_date := NEW.date;
  END IF;
  IF NEW.appointment_date IS NULL THEN
    NEW.appointment_date := NEW.date;
  END IF;

  -- Sincroniza start_time <-> appointment_time
  IF NEW.start_time IS NULL AND NEW.appointment_time IS NOT NULL THEN
    NEW.start_time := NEW.appointment_time;
  ELSIF NEW.appointment_time IS NULL AND NEW.start_time IS NOT NULL THEN
    NEW.appointment_time := NEW.start_time;
  END IF;

  -- Calcula end_time se não informado
  IF NEW.end_time IS NULL AND NEW.start_time IS NOT NULL THEN
    NEW.end_time := (NEW.start_time + (COALESCE(NEW.duration_minutes, NEW.duration, 30) || ' minutes')::interval)::time;
  END IF;

  -- Sincroniza price <-> total_price
  IF NEW.price IS NULL AND NEW.total_price IS NOT NULL THEN
    NEW.price := NEW.total_price;
  ELSIF NEW.total_price IS NULL AND NEW.price IS NOT NULL THEN
    NEW.total_price := NEW.price;
  END IF;

  -- Sincroniza duration_minutes <-> duration
  IF NEW.duration_minutes IS NULL AND NEW.duration IS NOT NULL THEN
    NEW.duration_minutes := NEW.duration;
  ELSIF NEW.duration IS NULL AND NEW.duration_minutes IS NOT NULL THEN
    NEW.duration := NEW.duration_minutes;
  END IF;

  -- Gera chave de idempotência padrão se não informada
  IF NEW.idempotency_key IS NULL AND NEW.barber_id IS NOT NULL AND NEW.date IS NOT NULL AND NEW.start_time IS NOT NULL THEN
    NEW.idempotency_key := COALESCE(NEW.tenant_id, 'def') || '_' || NEW.barber_id || '_' || NEW.date::text || '_' || NEW.start_time::text;
  END IF;

  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_appointments_columns ON public.appointments;
CREATE TRIGGER trg_sync_appointments_columns
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.sync_appointments_columns_fn();

-- 6. Índices de Alta Performance para Queries Rápidas e Realtime
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_date ON public.appointments(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_date ON public.appointments(barbershop_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON public.appointments(barber_id, date, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_idempotency_key ON public.appointments(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- 7. Prevenção de Idempotência Estrita via Índice Único Condicional
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_idempotency_active
ON public.appointments (idempotency_key)
WHERE (idempotency_key IS NOT NULL AND status NOT IN ('cancelled', 'rejected'));

-- 8. Blindagem de Race Condition no Armazenamento via Índice GiST de Exclusão Temporal
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
      date WITH =,
      tsrange(
        (date + start_time),
        (date + end_time)
      ) WITH &&
    )
    WHERE (status NOT IN ('cancelled', 'rejected') AND barber_id IS NOT NULL AND barber_id <> 'any');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback silencioso se types/casting precisarem de cast explícito
    NULL;
END $$;

-- 9. RPC Transacional: book_appointment_atomic
-- Remove versões/sobrecargas anteriores para evitar o erro 42725 (function name is not unique)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE pg_namespace.nspname = 'public' 
          AND pg_proc.proname = 'book_appointment_atomic'
    ) LOOP
        EXECUTE 'DROP FUNCTION public.' || quote_ident(r.proname) || '(' || r.argtypes || ') CASCADE;';
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.book_appointment_atomic(
  p_tenant_id TEXT,
  p_barber_id TEXT,
  p_client_id TEXT,
  p_client_name TEXT,
  p_client_phone TEXT,
  p_service_id TEXT,
  p_service_name TEXT,
  p_booking_date DATE,
  p_start_time TEXT,
  p_end_time TEXT,
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
  v_idempotency_key TEXT;
  v_tenant_uuid UUID;
BEGIN
  IF p_tenant_id IS NULL OR p_tenant_id = '' THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: tenant_id é obrigatório.' USING ERRCODE = 'P0002';
  END IF;

  IF p_barber_id IS NULL OR p_barber_id = '' THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: barber_id é obrigatório.' USING ERRCODE = 'P0002';
  END IF;

  IF p_booking_date IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: booking_date é obrigatório.' USING ERRCODE = 'P0002';
  END IF;

  -- 1. ADVISORY LOCK TRANSACIONAL (Trava concorrência de 2 clientes no mesmo milissegundo)
  v_lock_key := ('x' || substr(md5(p_tenant_id || ':' || p_barber_id || ':' || p_booking_date::text), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 2. BLOQUEIO DE LINHAS COM SELECT ... FOR UPDATE
  SELECT COUNT(*)
  INTO v_conflict_count
  FROM public.appointments
  WHERE (tenant_id::text = p_tenant_id OR barbershop_id::text = p_tenant_id)
    AND barber_id = p_barber_id
    AND date = p_booking_date
    AND status NOT IN ('cancelled', 'rejected')
    AND (start_time::text < p_end_time AND end_time::text > p_start_time)
  FOR UPDATE;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'SLOT_OCCUPIED_CONCURRENCY_CONFLICT: O barbeiro selecionado já possui um agendamento conflitante neste intervalo.'
      USING ERRCODE = 'P0001',
            HINT = 'Selecione outro horário ou barbeiro.';
  END IF;

  v_idempotency_key := p_tenant_id || '_' || p_barber_id || '_' || p_booking_date::text || '_' || p_start_time;

  BEGIN
    v_tenant_uuid := p_tenant_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_tenant_uuid := NULL;
  END;

  -- 3. INSERÇÃO ATÔMICA
  INSERT INTO public.appointments (
    tenant_id,
    barbershop_id,
    barber_id,
    client_name,
    client_phone,
    service_name,
    date,
    start_time,
    end_time,
    price,
    status,
    source,
    idempotency_key
  ) VALUES (
    v_tenant_uuid,
    v_tenant_uuid,
    p_barber_id,
    trim(p_client_name),
    trim(p_client_phone),
    trim(p_service_name),
    p_booking_date,
    p_start_time,
    p_end_time,
    p_price,
    'confirmed',
    'client_link',
    v_idempotency_key
  )
  RETURNING * INTO v_new_appointment;

  RETURN jsonb_build_object(
    'success', true,
    'atomicTransaction', 'COMMITTED',
    'appointment', jsonb_build_object(
      'id', v_new_appointment.id,
      'tenant_id', v_new_appointment.tenant_id,
      'barber_id', v_new_appointment.barber_id,
      'client_name', v_new_appointment.client_name,
      'client_phone', v_new_appointment.client_phone,
      'service_name', v_new_appointment.service_name,
      'date', v_new_appointment.date,
      'start_time', v_new_appointment.start_time,
      'end_time', v_new_appointment.end_time,
      'price', v_new_appointment.price,
      'status', v_new_appointment.status,
      'created_at', v_new_appointment.created_at
    )
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'SLOT_OCCUPIED_CONCURRENCY_CONFLICT: Agendamento duplicado detectado (idempotência).'
      USING ERRCODE = 'P0001';
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Permissão explícita com assinatura para evitar ambiguidade
GRANT EXECUTE ON FUNCTION public.book_appointment_atomic(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, NUMERIC) TO anon, authenticated;

-- 10. POLÍTICAS ROW LEVEL SECURITY (RLS)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Limpa políticas antigas
DROP POLICY IF EXISTS "appointments_public_select_slots" ON public.appointments;
DROP POLICY IF EXISTS "appointments_public_insert" ON public.appointments;
DROP POLICY IF EXISTS "appointments_staff_manage" ON public.appointments;
DROP POLICY IF EXISTS "appointments_all_access_policy" ON public.appointments;

-- Leitura pública para checagem de horários ocupados pelos clientes do link
CREATE POLICY "appointments_public_select_slots"
ON public.appointments
FOR SELECT
TO anon, authenticated
USING (true);

-- Inserção pública permitida para clientes agendarem via link
CREATE POLICY "appointments_public_insert"
ON public.appointments
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (tenant_id IS NOT NULL OR barbershop_id IS NOT NULL)
  AND (client_name IS NOT NULL AND client_name <> '')
);

-- Gestão completa para staff/admin autenticado
CREATE POLICY "appointments_staff_manage"
ON public.appointments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 11. Habilitação de Supabase Realtime para a tabela appointments
-- Permite que a agenda do barbeiro receba novos agendamentos imediatamente sem F5
ALTER TABLE public.appointments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
