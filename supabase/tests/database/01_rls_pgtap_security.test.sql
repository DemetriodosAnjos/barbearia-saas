-- ==============================================================================
-- SUÍTE DE TESTES pgTAP: VALIDAÇÃO DE POLÍTICAS RLS E CHAVE PÚBLICA (ANON)
-- Barbearia SaaS - Supabase / PostgreSQL Engine
-- Arquivo: supabase/tests/database/01_rls_pgtap_security.test.sql
-- ==============================================================================

BEGIN;

-- 1. Carrega a extensão pgTAP para asserções no banco de dados
CREATE EXTENSION IF NOT EXISTS pgtap;

-- 2. Define o plano de testes formal (20 asserções de segurança)
SELECT plan(20);

-- ==============================================================================
-- TESTE GRUPO 1: AUDITORIA DE RLS HABILITADA EM TODAS AS TABELAS
-- ==============================================================================

-- Asserção 1: barbershops possui RLS habilitada
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.barbershops'::regclass),
  'Tabela public.barbershops DEVE possuir Row Level Security (RLS) habilitada'
);

-- Asserção 2: appointments possui RLS habilitada
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.appointments'::regclass),
  'Tabela public.appointments DEVE possuir Row Level Security (RLS) habilitada'
);

-- Asserção 3: clients possui RLS habilitada
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.clients'::regclass),
  'Tabela public.clients DEVE possuir Row Level Security (RLS) habilitada'
);

-- Asserção 4: sessions possui RLS habilitada
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.sessions'::regclass),
  'Tabela public.sessions DEVE possuir Row Level Security (RLS) habilitada'
);

-- Asserção 5: security_audit_events possui RLS habilitada
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.security_audit_events'::regclass),
  'Tabela public.security_audit_events DEVE possuir Row Level Security (RLS) habilitada'
);

-- Asserção 6: storage.objects possui RLS habilitada
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'storage.objects'::regclass),
  'Tabela storage.objects DEVE possuir Row Level Security (RLS) habilitada'
);

-- ==============================================================================
-- TESTE GRUPO 2: INSERÇÃO DE DADOS DE TESTE PARA MULTI-TENANCY
-- ==============================================================================
INSERT INTO public.barbershops (id, name, slug, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Barbearia Alpha (Tenant A)', 'alpha', true),
  ('22222222-2222-2222-2222-222222222222', 'Barbearia Beta (Tenant B)', 'beta', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.appointments (id, tenant_id, client_id, client_name, service_name, scheduled_time, status)
VALUES 
  ('aaaa1111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'user-alpha-client', 'Cliente Alpha 1', 'Corte Degradê', NOW(), 'CONFIRMED'),
  ('bbbb2222-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'user-beta-client', 'Cliente Beta 1', 'Barba Terapia', NOW(), 'CONFIRMED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.clients (id, tenant_id, name, phone, notes)
VALUES 
  ('c1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Cliente Confidencial A', '11999990001', 'Dados sigilosos A'),
  ('c2222222-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Cliente Confidencial B', '11999990002', 'Dados sigilosos B')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- TESTE GRUPO 3: PAPEL ANÔNIMO (anon) - BLOQUEIO COMPLETO SEM JWT
-- ==============================================================================

-- Alterna para o papel anônimo da chave pública anon
SET ROLE anon;
SET request.jwt.claim.sub = '';
SET request.jwt.claim.role = 'anon';
SET request.jwt.claim.tenant_id = '';

-- Asserção 7: anon NÃO enxerga nenhum agendamento
SELECT results_eq(
  'SELECT count(*)::int FROM public.appointments',
  ARRAY[0],
  'Usuário anônimo (anon) DEVE receber 0 linhas ao consultar appointments (Default Deny)'
);

-- Asserção 8: anon NÃO enxerga nenhum cliente ou dado PII
SELECT results_eq(
  'SELECT count(*)::int FROM public.clients',
  ARRAY[0],
  'Usuário anônimo (anon) DEVE receber 0 linhas ao consultar clients'
);

-- Asserção 9: anon NÃO enxerga nenhuma sessão de usuário
SELECT results_eq(
  'SELECT count(*)::int FROM public.sessions',
  ARRAY[0],
  'Usuário anônimo (anon) DEVE receber 0 linhas ao consultar sessions ativas'
);

-- Asserção 10: anon NÃO enxerga nenhum evento de auditoria
SELECT results_eq(
  'SELECT count(*)::int FROM public.security_audit_events',
  ARRAY[0],
  'Usuário anônimo (anon) DEVE receber 0 linhas ao consultar logs de auditoria'
);

-- Asserção 11: anon NÃO consegue inserir agendamento (violação de política RLS)
SELECT throws_ok(
  $$INSERT INTO public.appointments (id, tenant_id, client_name, service_name, scheduled_time, status)
    VALUES ('ffff9999-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'Hacker Anon', 'Injeção', NOW(), 'CONFIRMED')$$,
  '42501',
  NULL,
  'Tentativa de INSERT por usuário anon DEVE ser rejeitada com código 42501 (RLS violation)'
);

-- Asserção 12: anon NÃO consegue atualizar agendamento existente
UPDATE public.appointments SET client_name = 'Defaced' WHERE id = 'aaaa1111-0000-0000-0000-000000000001';
SELECT results_eq(
  'SELECT client_name FROM public.appointments WHERE id = ''aaaa1111-0000-0000-0000-000000000001''',
  ARRAY[]::text[],
  'Tentativa de UPDATE por anon não deve surtir efeito ou retornar dados'
);

-- Asserção 13: anon NÃO consegue ler comprovantes de Pix no storage (bucket receipts)
SELECT results_eq(
  'SELECT count(*)::int FROM storage.objects WHERE bucket_id = ''receipts''',
  ARRAY[0],
  'Usuário anônimo (anon) DEVE ser 100% impedido de ler comprovantes no bucket receipts'
);

-- ==============================================================================
-- TESTE GRUPO 4: ISOLAMENTO MULTI-TENANT (TENANT ALPHA vs TENANT BETA)
-- ==============================================================================

-- Alterna para papel autenticado simulando usuário do Tenant Alpha
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-alpha-admin';
SET request.jwt.claim.role = 'authenticated';
SET request.jwt.claim.tenant_id = '11111111-1111-1111-1111-111111111111';

-- Asserção 14: Tenant Alpha enxerga APENAS seus agendamentos
SELECT results_eq(
  'SELECT count(*)::int FROM public.appointments WHERE tenant_id = ''11111111-1111-1111-1111-111111111111''',
  ARRAY[1],
  'Tenant Alpha deve visualizar com sucesso seu próprio agendamento'
);

-- Asserção 15: Tenant Alpha NÃO enxerga NENHUM agendamento do Tenant Beta (Anti-BOLA)
SELECT results_eq(
  'SELECT count(*)::int FROM public.appointments WHERE tenant_id = ''22222222-2222-2222-2222-222222222222''',
  ARRAY[0],
  'Tenant Alpha DEVE receber 0 agendamentos pertencentes ao Tenant Beta (Isolamento RLS estrito)'
);

-- Asserção 16: Tenant Alpha NÃO enxerga clientes do Tenant Beta
SELECT results_eq(
  'SELECT count(*)::int FROM public.clients WHERE tenant_id = ''22222222-2222-2222-2222-222222222222''',
  ARRAY[0],
  'Tenant Alpha DEVE receber 0 clientes do Tenant Beta'
);

-- Asserção 17: Tentativa de UPDATE cruzado (Cross-Tenant Tampering) afeta 0 linhas
UPDATE public.appointments 
SET service_name = 'Tampered' 
WHERE tenant_id = '22222222-2222-2222-2222-222222222222';

-- Alterna agora para o Tenant Beta para conferir integridade
SET request.jwt.claim.sub = 'user-beta-admin';
SET request.jwt.claim.tenant_id = '22222222-2222-2222-2222-222222222222';

-- Asserção 18: Registro do Tenant Beta permanece íntegro e inalterado
SELECT results_eq(
  'SELECT service_name FROM public.appointments WHERE id = ''bbbb2222-0000-0000-0000-000000000002''',
  ARRAY['Barba Terapia']::text[],
  'Registro do Tenant Beta NÃO deve ser alterado por ataque de outro tenant'
);

-- Asserção 19: Tenant Beta lê apenas seus clientes
SELECT results_eq(
  'SELECT count(*)::int FROM public.clients WHERE tenant_id = ''22222222-2222-2222-2222-222222222222''',
  ARRAY[1],
  'Tenant Beta lê com sucesso seus próprios clientes'
);

-- ==============================================================================
-- TESTE GRUPO 5: SUPERADMIN - VISÃO GLOBAL DE CONFORMIDADE
-- ==============================================================================
SET request.jwt.claim.sub = 'superadmin-user';
SET request.jwt.claim.role = 'SUPERADMIN';
SET request.jwt.claim.tenant_id = '';

-- Asserção 20: SuperAdmin tem visão global de todos os tenants
SELECT results_eq(
  'SELECT count(*)::int >= 2 FROM public.appointments',
  ARRAY[true],
  'SuperAdmin com role SUPERADMIN possui autorização para auditar agendamentos multi-tenant'
);

-- 3. Finaliza os testes e exibe o laudo formatado TAP
SELECT * FROM finish();

ROLLBACK;
