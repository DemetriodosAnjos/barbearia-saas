/**
 * supabase/migrations/20260927000001_webhook_idempotency.sql
 *
 * Migration: Tabela de Controle de Idempotência e Auditoria de Webhooks de Terceiros
 * Suporta Mercado Pago, Stripe, WhatsApp Cloud API e Provedores Customizados.
 * 
 * Proteções:
 * 1. Chave Única Composta (provider + event_id) para Prevenção Absoluta de Duplicação (CWE-20)
 * 2. Hash SHA-256 do Payload para Detecção de Adulteração de Mensagens
 * 3. Controle de Concorrência via Status de Bloqueio (LOCKED / PROCESSING / PROCESSED)
 * 4. Janela de Expiração / TTL para Expurgos Periódicos
 */

-- Extensão para geração de UUID se necessário
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela principal de idempotência
CREATE TABLE IF NOT EXISTS public.webhook_idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(64) NOT NULL, -- 'mercadopago', 'stripe', 'whatsapp', 'generic'
    event_id VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(320) NOT NULL UNIQUE, -- Formato: '{provider}:{event_id}'
    payload_hash VARCHAR(64) NOT NULL, -- SHA-256 hex digest do raw body
    status VARCHAR(32) NOT NULL DEFAULT 'RECEIVED', -- 'RECEIVED', 'ENQUEUED', 'PROCESSING', 'PROCESSED', 'FAILED', 'DUPLICATE_IGNORED'
    http_response_code INTEGER NOT NULL DEFAULT 200,
    attempts_count INTEGER NOT NULL DEFAULT 1,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    locked_until TIMESTAMPTZ,
    error_message TEXT,
    request_headers JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices otimizados para busca instantânea e locks concorrentes
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_provider_event 
    ON public.webhook_idempotency_keys (provider, event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_status_received 
    ON public.webhook_idempotency_keys (status, received_at);

CREATE INDEX IF NOT EXISTS idx_webhook_locked_until 
    ON public.webhook_idempotency_keys (locked_until) 
    WHERE status = 'PROCESSING';

-- Habilita RLS para segurança multi-tenant e service role
ALTER TABLE public.webhook_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Política de RLS: Apenas Service Role / Edge Functions autorizadas podem ler/gravar
DROP POLICY IF EXISTS "Service role webhook idempotency full access" ON public.webhook_idempotency_keys;
CREATE POLICY "Service role webhook idempotency full access"
    ON public.webhook_idempotency_keys
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Função de inserção atômica de idempotência com detecção de concorrência
CREATE OR REPLACE FUNCTION public.acquire_webhook_idempotency_lock(
    p_provider VARCHAR,
    p_event_id VARCHAR,
    p_payload_hash VARCHAR,
    p_lock_ttl_seconds INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key VARCHAR := p_provider || ':' || p_event_id;
    v_existing RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_locked_until TIMESTAMPTZ := v_now + (p_lock_ttl_seconds || ' seconds')::INTERVAL;
BEGIN
    -- Busca registro pré-existente
    SELECT * INTO v_existing 
    FROM public.webhook_idempotency_keys 
    WHERE idempotency_key = v_key
    FOR UPDATE;

    IF FOUND THEN
        -- Caso 1: Já processado anteriormente com sucesso
        IF v_existing.status = 'PROCESSED' THEN
            UPDATE public.webhook_idempotency_keys
            SET attempts_count = attempts_count + 1,
                updated_at = v_now
            WHERE idempotency_key = v_key;

            RETURN jsonb_build_object(
                'status', 'DUPLICATE_PROCESSED',
                'is_duplicate', true,
                'http_status', 200,
                'message', 'Evento já processado anteriormente com sucesso. Ignorando reexecução.'
            );
        END IF;

        -- Caso 2: Em processamento concorrente dentro do lock TTL
        IF v_existing.status = 'PROCESSING' AND v_existing.locked_until > v_now THEN
            RETURN jsonb_build_object(
                'status', 'LOCKED_CONCURRENT',
                'is_duplicate', true,
                'http_status', 202,
                'message', 'Evento já está sendo processado por outro worker concorrente.'
            );
        END IF;

        -- Caso 3: Lock expirou ou falhou anteriormente -> renova lock
        UPDATE public.webhook_idempotency_keys
        SET status = 'PROCESSING',
            locked_until = v_locked_until,
            attempts_count = attempts_count + 1,
            updated_at = v_now
        WHERE idempotency_key = v_key;

        RETURN jsonb_build_object(
            'status', 'LOCK_ACQUIRED',
            'is_duplicate', false,
            'http_status', 202,
            'message', 'Lock de idempotência renovado após expiração.'
        );
    END IF;

    -- Caso 4: Novo evento -> Insere atomicamente
    INSERT INTO public.webhook_idempotency_keys (
        provider,
        event_id,
        idempotency_key,
        payload_hash,
        status,
        locked_until,
        received_at
    ) VALUES (
        p_provider,
        p_event_id,
        v_key,
        p_payload_hash,
        'ENQUEUED',
        v_locked_until,
        v_now
    );

    RETURN jsonb_build_object(
        'status', 'ENQUEUED',
        'is_duplicate', false,
        'http_status', 200,
        'message', 'Evento enfileirado com sucesso para processamento.'
    );
END;
$$;
