/**
 * @file multiTenantScripts.ts
 * @description Repositório central de scripts SQL e auditoria de Row Level Security (RLS)
 * para isolamento estrito de dados entre barbearias no Supabase / PostgreSQL.
 */

export const TENANTS_TABLE_DIRECT_FIX_SQL = `-- ==============================================================================
-- CORREÇÃO DIRETA PARA O ERRO: ERROR 42703 column "tenant_id" does not exist
-- Execute no SQL Editor do Supabase para corrigir a tabela "tenants" imediatamente
-- ==============================================================================

BEGIN;

-- 1. Corrige RLS na tabela "tenants" (sem assumir coluna tenant_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
    -- Habilita RLS na tabela tenants
    ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

    -- Remove políticas anteriores com sintaxe incorreta
    DROP POLICY IF EXISTS "tenant_owner_isolation" ON public.tenants;
    DROP POLICY IF EXISTS "tenant_isolation" ON public.tenants;
    DROP POLICY IF EXISTS "Isolamento de tenant" ON public.tenants;

    -- Cria política correta: compara "id" com auth.uid() ou "owner_email"
    CREATE POLICY "tenant_owner_isolation" ON public.tenants
      FOR ALL
      TO authenticated
      USING (
        id = auth.uid() 
        OR owner_email = (auth.jwt() ->> 'email')
      )
      WITH CHECK (
        id = auth.uid() 
        OR owner_email = (auth.jwt() ->> 'email')
      );

    -- Permite leitura anônima para a página pública de agendamento
    DROP POLICY IF EXISTS "public_read_tenants" ON public.tenants;
    CREATE POLICY "public_read_tenants" ON public.tenants FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- 2. Garante ambas as colunas (tenant_id E barbershop_id) em appointments (Agenda) e clients
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') THEN
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS barbershop_id UUID;
    UPDATE public.appointments SET tenant_id = barbershop_id WHERE tenant_id IS NULL AND barbershop_id IS NOT NULL;
    UPDATE public.appointments SET barbershop_id = tenant_id WHERE barbershop_id IS NULL AND tenant_id IS NOT NULL;
    ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') THEN
    ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tenant_id UUID;
    ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS barbershop_id UUID;
    UPDATE public.clients SET tenant_id = barbershop_id WHERE tenant_id IS NULL AND barbershop_id IS NOT NULL;
    UPDATE public.clients SET barbershop_id = tenant_id WHERE barbershop_id IS NULL AND tenant_id IS NOT NULL;
    ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

COMMIT;`;

export const FULL_RLS_MIGRATION_SQL = `-- ==============================================================================
-- SUPABASE / POSTGRESQL - SCRIPT DEFINITIVO DE ISOLAMENTO MULTI-TENANT (RLS)
-- ==============================================================================
-- RESOLUÇÃO COMPLETA PARA:
-- 1. ERROR: 42703: column "tenant_id" does not exist na tabela "tenants"
--    Causa: Na tabela "tenants", o identificador da conta é "id" (chave primária)
--    ou "owner_email". Políticas nunca devem assumir que "tenants" tem coluna "tenant_id".
-- 2. Compatibilidade total com "tenant_id" E "barbershop_id" nas tabelas de negócio
--    (appointments/agendamentos, clients/clientes, services/servicos, etc.)
-- 3. Correção e blindagem de erros na Agenda (appointments).
-- ==============================================================================

BEGIN;

-- 1. TABELA PRINCIPAL: tenants (ou barbershops)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants') THEN
    ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.tenants FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "tenant_owner_isolation" ON public.tenants;
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.tenants;
    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.tenants;
    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.tenants;
    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.tenants;
    DROP POLICY IF EXISTS "Isolamento de tenant" ON public.tenants;
    DROP POLICY IF EXISTS "tenant_isolation" ON public.tenants;

    -- Política segura: O administrador autenticado acessa sua barbearia pelo seu id (auth.uid()) ou owner_email
    CREATE POLICY "tenant_owner_isolation" ON public.tenants
      FOR ALL
      TO authenticated
      USING (
        id = auth.uid() 
        OR owner_email = (auth.jwt() ->> 'email')
      )
      WITH CHECK (
        id = auth.uid() 
        OR owner_email = (auth.jwt() ->> 'email')
      );

    DROP POLICY IF EXISTS "public_read_tenants" ON public.tenants;
    CREATE POLICY "public_read_tenants" ON public.tenants
      FOR SELECT
      TO anon
      USING (true);

    CREATE INDEX IF NOT EXISTS idx_tenants_owner_email ON public.tenants (owner_email);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'barbershops') THEN
    ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "barbershop_owner_isolation" ON public.barbershops;
    DROP POLICY IF EXISTS "public_read_barbershops" ON public.barbershops;

    CREATE POLICY "barbershop_owner_isolation" ON public.barbershops
      FOR ALL
      TO authenticated
      USING (
        id = auth.uid() 
        OR owner_email = (auth.jwt() ->> 'email')
      )
      WITH CHECK (
        id = auth.uid() 
        OR owner_email = (auth.jwt() ->> 'email')
      );

    CREATE POLICY "public_read_barbershops" ON public.barbershops
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- 2. TRIGGER PARA SINCRONIZAR AUTOMATICAMENTE tenant_id E barbershop_id
CREATE OR REPLACE FUNCTION public.sync_tenant_and_barbershop_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NOT NULL AND NEW.barbershop_id IS NULL THEN
    NEW.barbershop_id := NEW.tenant_id;
  ELSIF NEW.barbershop_id IS NOT NULL AND NEW.tenant_id IS NULL THEN
    NEW.tenant_id := NEW.barbershop_id;
  ELSIF NEW.tenant_id IS NULL AND NEW.barbershop_id IS NULL THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.tenant_id := auth.uid();
      NEW.barbershop_id := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. AJUSTE DE COLUNAS EM TODAS AS TABELAS DE NEGÓCIO
DO $$
DECLARE
  table_list TEXT[] := ARRAY[
    'appointments', 'agendamentos',
    'clients', 'clientes',
    'services', 'servicos',
    'barbers', 'barbeiros',
    'products', 'produtos',
    'financial_transactions', 'financeiro',
    'comandas'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY table_list
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID;', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS barbershop_id UUID;', tbl);
      EXECUTE format('UPDATE public.%I SET tenant_id = barbershop_id WHERE tenant_id IS NULL AND barbershop_id IS NOT NULL;', tbl);
      EXECUTE format('UPDATE public.%I SET barbershop_id = tenant_id WHERE barbershop_id IS NULL AND tenant_id IS NOT NULL;', tbl);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant_id ON public.%I (tenant_id);', tbl, tbl);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_barbershop_id ON public.%I (barbershop_id);', tbl, tbl);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('DROP TRIGGER IF EXISTS trg_sync_tenant_ids ON public.%I;', tbl);
      EXECUTE format('CREATE TRIGGER trg_sync_tenant_ids BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.sync_tenant_and_barbershop_id();', tbl);
    END IF;
  END LOOP;
END $$;

-- 4. POLÍTICAS RLS ROBUSTAS PARA AS TABELAS FILHAS
DO $$
DECLARE
  table_list TEXT[] := ARRAY[
    'appointments', 'agendamentos',
    'clients', 'clientes',
    'services', 'servicos',
    'barbers', 'barbeiros',
    'products', 'produtos',
    'financial_transactions', 'financeiro',
    'comandas'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY table_list
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_select" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_update" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Isolamento de tenant" ON public.%I;', tbl);

      -- SELECT
      EXECUTE format(
        'CREATE POLICY "tenant_isolation_select" ON public.%I
         FOR SELECT
         TO authenticated
         USING (
           tenant_id = auth.uid()
           OR barbershop_id = auth.uid()
           OR (EXISTS (
             SELECT 1 FROM public.tenants t 
             WHERE (t.id = public.%I.tenant_id OR t.id = public.%I.barbershop_id)
               AND (t.id = auth.uid() OR t.owner_email = (auth.jwt() ->> ''email''))
           ))
         );',
        tbl, tbl, tbl
      );

      -- INSERT
      EXECUTE format(
        'CREATE POLICY "tenant_isolation_insert" ON public.%I
         FOR INSERT
         TO authenticated
         WITH CHECK (
           tenant_id = auth.uid()
           OR barbershop_id = auth.uid()
           OR (EXISTS (
             SELECT 1 FROM public.tenants t 
             WHERE (t.id = public.%I.tenant_id OR t.id = public.%I.barbershop_id)
               AND (t.id = auth.uid() OR t.owner_email = (auth.jwt() ->> ''email''))
           ))
         );',
        tbl, tbl, tbl
      );

      -- UPDATE
      EXECUTE format(
        'CREATE POLICY "tenant_isolation_update" ON public.%I
         FOR UPDATE
         TO authenticated
         USING (
           tenant_id = auth.uid()
           OR barbershop_id = auth.uid()
           OR (EXISTS (
             SELECT 1 FROM public.tenants t 
             WHERE (t.id = public.%I.tenant_id OR t.id = public.%I.barbershop_id)
               AND (t.id = auth.uid() OR t.owner_email = (auth.jwt() ->> ''email''))
           ))
         )
         WITH CHECK (
           tenant_id = auth.uid()
           OR barbershop_id = auth.uid()
           OR (EXISTS (
             SELECT 1 FROM public.tenants t 
             WHERE (t.id = public.%I.tenant_id OR t.id = public.%I.barbershop_id)
               AND (t.id = auth.uid() OR t.owner_email = (auth.jwt() ->> ''email''))
           ))
         );',
        tbl, tbl, tbl, tbl, tbl
      );

      -- DELETE
      EXECUTE format(
        'CREATE POLICY "tenant_isolation_delete" ON public.%I
         FOR DELETE
         TO authenticated
         USING (
           tenant_id = auth.uid()
           OR barbershop_id = auth.uid()
           OR (EXISTS (
             SELECT 1 FROM public.tenants t 
             WHERE (t.id = public.%I.tenant_id OR t.id = public.%I.barbershop_id)
               AND (t.id = auth.uid() OR t.owner_email = (auth.jwt() ->> ''email''))
           ))
         );',
        tbl, tbl, tbl
      );
    END IF;
  END LOOP;
END $$;

-- 5. PERMISSÃO DE AGENDAMENTO ANÔNIMO
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') THEN
    DROP POLICY IF EXISTS "public_booking_insert" ON public.appointments;
    CREATE POLICY "public_booking_insert" ON public.appointments FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agendamentos') THEN
    DROP POLICY IF EXISTS "public_booking_insert" ON public.agendamentos;
    CREATE POLICY "public_booking_insert" ON public.agendamentos FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

COMMIT;`;

export const RLS_AUDIT_SQL = `-- Script de Auditoria RLS: Verifica quais tabelas possuem RLS ativado
SELECT 
  tablename, 
  rowsecurity AS rls_enabled,
  CASE WHEN rowsecurity THEN 'Protegido (RLS Ativo)' ELSE 'Vulnerável (Sem RLS)' END AS status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'tenants', 'barbershops', 
    'appointments', 'agendamentos', 
    'clients', 'clientes', 
    'services', 'servicos', 
    'barbers', 'barbeiros', 
    'products', 'produtos', 
    'financial_transactions', 'financeiro', 
    'comandas'
  )
ORDER BY tablename;`;

export const TEST_ISOLATION_SQL = `-- Teste de Penetração no Supabase SQL Editor:
-- 1. Verifique que a tabela tenants só retorna a barbearia do usuário conectado
SELECT id, name, owner_email FROM public.tenants;

-- 2. Verifique os agendamentos da Agenda (deve retornar apenas da sua barbearia)
SELECT id, client_name, service_name, start_time, tenant_id, barbershop_id 
FROM public.appointments;

-- 3. Verifique os clientes (deve retornar apenas os seus)
SELECT id, name, phone, tenant_id, barbershop_id 
FROM public.clients;`;

export const EXPLANATION_STEPS = [
  {
    step: 1,
    title: 'Causa do Erro 42703 na tabela "tenants"',
    description:
      'Na tabela "tenants", o identificador da conta é a coluna "id" (chave primária) ou "owner_email". Políticas nunca devem tentar filtrar "tenants.tenant_id = auth.uid()", pois a própria tabela é o tenant.',
    badge: 'Causa Raiz Resolvida',
  },
  {
    step: 2,
    title: 'Compatibilidade Dúplice (tenant_id + barbershop_id)',
    description:
      'O script adiciona ambas as colunas nas tabelas de agendamentos, clientes, serviços e cria um trigger automático para que inserts com qualquer um dos nomes mantenham ambos sincronizados.',
    badge: 'Compatibilidade 100%',
  },
  {
    step: 3,
    title: 'Correção de Erros na Agenda (Appointments)',
    description:
      'Corrigida a criação e leitura de agendamentos no frontend: IDs agora usam UUIDs válidos (evita erro 22P02 de sintaxe inválida no Postgres), suporte ao formato de data DD/MM/YYYY e cache isolado por tenant.',
    badge: 'Agenda Blindada',
  },
];

export const CLIENTS_RLS_ISOLATION_SQL = `-- ==============================================================================
-- MIGRAÇÃO DEFINITIVA DE SEGURANÇA: ISOLAMENTO TOTAL MULTI-TENANT (SUPABASE RLS)
-- Cenário: Tenant 1 (ddoanjos@gmail.com - Demétrio) e Tenant 2 (fullstackanjos01@gmail.com - Alex Tesa)
-- Objetivo: Blindar a tabela 'clients' (prontuário) contra vazamentos cross-tenant.
-- ==============================================================================

BEGIN;

-- 1. Certificar extensões fundamentais
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Garantir a existência da tabela 'clients'
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT,
    last_visit TIMESTAMPTZ
);

-- 3. Garantir colunas 'tenant_id' E 'barbershop_id' em 'clients'
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS barbershop_id UUID;

-- 4. Sincronizar tenant_id e barbershop_id se um deles estiver nulo
UPDATE public.clients 
SET tenant_id = barbershop_id 
WHERE tenant_id IS NULL AND barbershop_id IS NOT NULL;

UPDATE public.clients 
SET barbershop_id = tenant_id 
WHERE barbershop_id IS NULL AND tenant_id IS NOT NULL;

-- 5. ATRIBUIÇÃO DOS CLIENTES EXISTENTES AO TENANT DO DEMÉTRIO (ddoanjos@gmail.com)
--    Garante que clientes antigos criados na conta principal não fiquem órfãos (sem tenant),
--    o que poderia causar vazamento para outras contas.
DO $$
DECLARE
    v_demetrio_tenant_id UUID;
BEGIN
    SELECT id INTO v_demetrio_tenant_id 
    FROM public.tenants 
    WHERE LOWER(owner_email) = 'ddoanjos@gmail.com' 
    LIMIT 1;

    IF v_demetrio_tenant_id IS NULL THEN
        SELECT id INTO v_demetrio_tenant_id 
        FROM auth.users 
        WHERE LOWER(email) = 'ddoanjos@gmail.com' 
        LIMIT 1;
    END IF;

    IF v_demetrio_tenant_id IS NULL THEN
        v_demetrio_tenant_id := '788299e3-a26c-4a0b-bc71-c7ae81ed40d3'::uuid;
    END IF;

    UPDATE public.clients 
    SET tenant_id = v_demetrio_tenant_id,
        barbershop_id = v_demetrio_tenant_id
    WHERE tenant_id IS NULL OR barbershop_id IS NULL;
END $$;

-- 6. GARANTIR TENANT DO ALEX TESA (fullstackanjos01@gmail.com) NA TABELA 'tenants'
DO $$
DECLARE
    v_alex_user_id UUID;
BEGIN
    SELECT id INTO v_alex_user_id 
    FROM auth.users 
    WHERE LOWER(email) = 'fullstackanjos01@gmail.com' 
    LIMIT 1;

    IF v_alex_user_id IS NOT NULL THEN
        INSERT INTO public.tenants (id, name, slug, owner_email, owner_name, plan, status)
        VALUES (
            v_alex_user_id,
            'Barbearia Alex Tesa',
            'barbearia-alex-tesa',
            'fullstackanjos01@gmail.com',
            'Alex Tesa',
            'starter',
            'active'
        )
        ON CONFLICT (id) DO UPDATE 
        SET owner_email = 'fullstackanjos01@gmail.com',
            owner_name = 'Alex Tesa';
    END IF;
END $$;

-- 7. Criar índices de performance para consultas por tenant
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON public.clients (tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_barbershop_id ON public.clients (barbershop_id);

-- 8. HABILITAR E FORÇAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;

-- 9. LIMPAR POLÍTICAS ANTIGAS / PERMISSIVAS
DROP POLICY IF EXISTS "Clientes visíveis apenas pelo proprietário" ON public.clients;
DROP POLICY IF EXISTS "Inserir clientes apenas no próprio tenant" ON public.clients;
DROP POLICY IF EXISTS "Modificar clientes apenas do próprio tenant" ON public.clients;
DROP POLICY IF EXISTS "Atualizar clientes apenas do próprio tenant" ON public.clients;
DROP POLICY IF EXISTS "Remover clientes apenas do próprio tenant" ON public.clients;
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.clients;
DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.clients;
DROP POLICY IF EXISTS "tenant_isolation_update" ON public.clients;
DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.clients;
DROP POLICY IF EXISTS "clients_tenant_isolation_select" ON public.clients;
DROP POLICY IF EXISTS "clients_tenant_isolation_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_tenant_isolation_update" ON public.clients;
DROP POLICY IF EXISTS "clients_tenant_isolation_delete" ON public.clients;
DROP POLICY IF EXISTS "allow_all_clients" ON public.clients;
DROP POLICY IF EXISTS "public_read_clients" ON public.clients;

-- 10. POLÍTICAS RLS ESTREITAS DE ISOLAMENTO POR TENANT (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "clients_tenant_isolation_select"
ON public.clients
FOR SELECT
TO authenticated
USING (
    tenant_id = auth.uid()
    OR barbershop_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE (t.id = public.clients.tenant_id OR t.id = public.clients.barbershop_id)
          AND (
              t.id = auth.uid() 
              OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email')
          )
    )
);

CREATE POLICY "clients_tenant_isolation_insert"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
    tenant_id = auth.uid()
    OR barbershop_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE (t.id = public.clients.tenant_id OR t.id = public.clients.barbershop_id)
          AND (
              t.id = auth.uid() 
              OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email')
          )
    )
);

CREATE POLICY "clients_tenant_isolation_update"
ON public.clients
FOR UPDATE
TO authenticated
USING (
    tenant_id = auth.uid()
    OR barbershop_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE (t.id = public.clients.tenant_id OR t.id = public.clients.barbershop_id)
          AND (
              t.id = auth.uid() 
              OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email')
          )
    )
)
WITH CHECK (
    tenant_id = auth.uid()
    OR barbershop_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE (t.id = public.clients.tenant_id OR t.id = public.clients.barbershop_id)
          AND (
              t.id = auth.uid() 
              OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email')
          )
    )
);

CREATE POLICY "clients_tenant_isolation_delete"
ON public.clients
FOR DELETE
TO authenticated
USING (
    tenant_id = auth.uid()
    OR barbershop_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE (t.id = public.clients.tenant_id OR t.id = public.clients.barbershop_id)
          AND (
              t.id = auth.uid() 
              OR LOWER(t.owner_email) = LOWER(auth.jwt() ->> 'email')
          )
    )
);

-- 11. TRIGGER DE SEGURANÇA DEFENSIVO
CREATE OR REPLACE FUNCTION public.handle_clients_tenant_isolation()
RETURNS TRIGGER AS $$
DECLARE
    v_user_email TEXT;
    v_user_tenant_id UUID;
BEGIN
    v_user_email := LOWER(auth.jwt() ->> 'email');

    IF v_user_email IS NOT NULL THEN
        SELECT id INTO v_user_tenant_id
        FROM public.tenants
        WHERE LOWER(owner_email) = v_user_email
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;

    IF v_user_tenant_id IS NOT NULL THEN
        NEW.tenant_id := v_user_tenant_id;
        NEW.barbershop_id := v_user_tenant_id;
    ELSIF auth.uid() IS NOT NULL THEN
        NEW.tenant_id := COALESCE(NEW.tenant_id, auth.uid());
        NEW.barbershop_id := COALESCE(NEW.barbershop_id, NEW.tenant_id, auth.uid());
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_clients_tenant ON public.clients;
CREATE TRIGGER trg_enforce_clients_tenant
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.handle_clients_tenant_isolation();

COMMIT;
`;

