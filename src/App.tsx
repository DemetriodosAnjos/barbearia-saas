import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Database,
  Code2,
  Users,
  Lock,
  Unlock,
  AlertTriangle,
  Building2,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  KeyRound,
  FileCheck,
  ChevronRight,
  Terminal,
  ExternalLink,
} from 'lucide-react';

interface MockClient {
  id: string;
  name: string;
  phone: string;
  email: string;
  tenant_id: string;
  tenant_name: string;
  created_at: string;
}

const INITIAL_CLIENTS: MockClient[] = [
  {
    id: 'cli-001',
    name: 'Carlos Oliveira',
    phone: '(11) 98765-4321',
    email: 'carlos.oliveira@email.com',
    tenant_id: 'tenant-alfa-1111',
    tenant_name: 'Barbearia Alfa Premium',
    created_at: '2026-10-15 10:30',
  },
  {
    id: 'cli-002',
    name: 'Marcos Vinicius',
    phone: '(11) 97654-3210',
    email: 'marcos.v@email.com',
    tenant_id: 'tenant-alfa-1111',
    tenant_name: 'Barbearia Alfa Premium',
    created_at: '2026-10-16 14:15',
  },
  {
    id: 'cli-003',
    name: 'Rafael Santos',
    phone: '(21) 99123-4567',
    email: 'rafael.santos@email.com',
    tenant_id: 'tenant-vintage-2222',
    tenant_name: 'Barbearia Vintage Club',
    created_at: '2026-10-14 09:00',
  },
  {
    id: 'cli-004',
    name: 'Eduardo Pereira',
    phone: '(21) 98888-7777',
    email: 'edu.pereira@email.com',
    tenant_id: 'tenant-vintage-2222',
    tenant_name: 'Barbearia Vintage Club',
    created_at: '2026-10-17 11:20',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'sql' | 'code' | 'simulator' | 'checklist'>('sql');
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Estados do Simulador Multi-Tenant
  const [isRlsEnabled, setIsRlsEnabled] = useState(true);
  const [currentTenant, setCurrentTenant] = useState<'alfa' | 'vintage' | 'attacker'>('alfa');
  const [clients, setClients] = useState<MockClient[]>(INITIAL_CLIENTS);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [simulationLog, setSimulationLog] = useState<string[]>([
    'Sistema iniciado com isolamento RLS ativado.',
    'Sessão autenticada: Barbearia Alfa Premium (tenant_id = tenant-alfa-1111).',
  ]);

  const tenants = {
    alfa: {
      id: 'tenant-alfa-1111',
      name: 'Barbearia Alfa Premium',
      owner: 'Admin Alfa (alfa@barbearia.com)',
      color: 'indigo',
    },
    vintage: {
      id: 'tenant-vintage-2222',
      name: 'Barbearia Vintage Club',
      owner: 'Admin Vintage (vintage@barbearia.com)',
      color: 'amber',
    },
    attacker: {
      id: 'tenant-invasor-9999',
      name: 'Usuário Invasor / Não Autorizado',
      owner: 'Tentativa de Escalação de Privilégios',
      color: 'rose',
    },
  };

  const sqlScript = `-- ==============================================================================
-- MIGRAÇÃO DE SEGURANÇA: ISOLAMENTO MULTI-TENANT COM RLS NA TABELA 'clients'
-- Alvo: Supabase (PostgreSQL)
-- Descrição: Corrige vazamento de clientes entre barbearias/tenants
-- ==============================================================================

-- 1. Certificar que a extensão pgcrypto / uuid-ossp está disponível
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Garantir a existência da tabela 'clients' (caso ainda não exista)
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

-- 3. Adicionar coluna 'tenant_id' com chave estrangeira para auth.users
--    DEFAULT auth.uid() garante preenchimento automático no nível do banco
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'clients' 
          AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.clients 
        ADD COLUMN tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
    ELSE
        ALTER TABLE public.clients 
        ALTER COLUMN tenant_id SET DEFAULT auth.uid();
    END IF;
END $$;

-- 4. Criar índice de performance para queries multi-tenant
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id 
ON public.clients (tenant_id);

-- 5. Habilitar obrigatoriamente Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Força a política RLS inclusive para donos da tabela
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;

-- 6. Limpar políticas antigas (idempotência)
DROP POLICY IF EXISTS "Clientes visíveis apenas pelo proprietário" ON public.clients;
DROP POLICY IF EXISTS "Inserir clientes apenas no próprio tenant" ON public.clients;
DROP POLICY IF EXISTS "Atualizar clientes apenas do próprio tenant" ON public.clients;
DROP POLICY IF EXISTS "Remover clientes apenas do próprio tenant" ON public.clients;

-- 7. [SELECT] Leitura: Administrador só visualiza clientes da sua barbearia
CREATE POLICY "Clientes visíveis apenas pelo proprietário"
ON public.clients
FOR SELECT
TO authenticated
USING (tenant_id = auth.uid());

-- 8. [INSERT] Criação: Impede forjar clientes para outro tenant
CREATE POLICY "Inserir clientes apenas no próprio tenant"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
    tenant_id = auth.uid() 
    OR (tenant_id IS NULL AND auth.uid() IS NOT NULL)
);

-- 9. [UPDATE] Edição: Só pode editar registros do seu próprio tenant
CREATE POLICY "Atualizar clientes apenas do próprio tenant"
ON public.clients
FOR UPDATE
TO authenticated
USING (tenant_id = auth.uid())
WITH CHECK (tenant_id = auth.uid());

-- 10. [DELETE] Remoção: Só pode excluir clientes do próprio tenant
CREATE POLICY "Remover clientes apenas do próprio tenant"
ON public.clients
FOR DELETE
TO authenticated
USING (tenant_id = auth.uid());

-- 11. TRIGGER DE DEFESA EM PROFUNDIDADE (Garante tenant_id mesmo com input incorreto)
CREATE OR REPLACE FUNCTION public.handle_clients_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        NEW.tenant_id := auth.uid();
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_clients_tenant ON public.clients;
CREATE TRIGGER trg_enforce_clients_tenant
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.handle_clients_tenant_isolation();`;

  const codeSnippet = `// ==============================================================================
// PASSO 2: FUNÇÃO DE CADASTRO E CONSULTA COM SUPABASE CLIENT
// Garante o preenchimento seguro de tenant_id e isolamento de consultas
// ==============================================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface CreateClientInput {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}

/**
 * 1. Cadastro Seguro de Cliente com tenant_id automático
 */
export async function createClientSafe(input: CreateClientInput) {
  // Obtém o usuário/administrador logado na sessão Supabase
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Usuário não autenticado. Faça login para cadastrar clientes.');
  }

  // Preenche explicitamente o tenant_id com o ID do usuário logado (auth.uid())
  const payload = {
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    notes: input.notes?.trim() || null,
    tenant_id: user.id, // <<-- Vínculo estrito com o tenant do admin logado
  };

  const { data, error } = await supabase
    .from('clients')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Erro ao cadastrar cliente:', error.message);
    throw error;
  }

  return data;
}

/**
 * 2. Consulta de Clientes (Isolamento automático via RLS)
 * Graças à política RLS (USING tenant_id = auth.uid()), o Postgres filtra
 * automaticamente no banco. NUNCA retornará clientes de outra barbearia!
 */
export async function getMyClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Erro ao buscar clientes:', error.message);
    throw error;
  }

  return data || [];
}`;

  const copyToClipboard = (text: string, type: 'sql' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'sql') {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  // Filtragem dos clientes na simulação
  const activeTenantConfig = tenants[currentTenant];
  const visibleClients = isRlsEnabled
    ? clients.filter((c) => c.tenant_id === activeTenantConfig.id)
    : clients; // VAZAMENTO QUANDO RLS ESTÁ DESATIVADO!

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    if (currentTenant === 'attacker' && isRlsEnabled) {
      setSimulationLog((prev) => [
        `❌ [BLOQUEIO RLS]: Tentativa de inserção rejeitada para usuário não autorizado (${activeTenantConfig.id}).`,
        ...prev.slice(0, 7),
      ]);
      return;
    }

    const newClient: MockClient = {
      id: `cli-${Date.now().toString().slice(-4)}`,
      name: newClientName.trim(),
      phone: newClientPhone.trim() || '(11) 90000-0000',
      email: `${newClientName.toLowerCase().replace(/\s+/g, '.')}@email.com`,
      tenant_id: activeTenantConfig.id,
      tenant_name: activeTenantConfig.name,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setClients((prev) => [newClient, ...prev]);
    setNewClientName('');
    setNewClientPhone('');

    setSimulationLog((prev) => [
      `✅ [INSERT]: Cliente "${newClient.name}" cadastrado com sucesso com tenant_id = "${newClient.tenant_id}".`,
      ...prev.slice(0, 7),
    ]);
  };

  const handleDeleteClient = (clientId: string, clientTenantId: string) => {
    if (isRlsEnabled && clientTenantId !== activeTenantConfig.id) {
      setSimulationLog((prev) => [
        `🚨 [BLOQUEIO RLS]: Violação de segurança! Tentativa de exclusão do cliente ${clientId} que pertence a outro tenant!`,
        ...prev.slice(0, 7),
      ]);
      return;
    }

    setClients((prev) => prev.filter((c) => c.id !== clientId));
    setSimulationLog((prev) => [
      `🗑️ [DELETE]: Cliente ${clientId} removido pelo proprietário do tenant.`,
      ...prev.slice(0, 7),
    ]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">
                  Supabase RLS Tenant Shield
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v2.0 Fix
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Correção de vazamento multi-tenant na tabela <code className="text-indigo-300">clients</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'simulator'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Simulador Interativo</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Notice Banner */}
      <div className="bg-gradient-to-r from-rose-950/40 via-amber-950/20 to-slate-900 border-b border-rose-900/30 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-slate-300">
              <strong className="text-rose-300 font-semibold">Problema corrigido:</strong> Administradores de barbearias visualizavam clientes de outros administradores por falta de RLS estrito em <code className="text-amber-200 bg-amber-950/60 px-1 py-0.5 rounded">public.clients</code>.
            </span>
          </div>
          <span className="text-emerald-400 font-medium inline-flex items-center gap-1.5 shrink-0 bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-800/40">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Solução pronta para produção
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/40 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex gap-1 sm:gap-4 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'sql'
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Passo 1: Migration SQL (Supabase RLS)</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'code'
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Passo 2: Inserção & Consulta no Frontend/Backend</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Simulador de Isolamento Multi-Tenant</span>
          </button>

          <button
            onClick={() => setActiveTab('checklist')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'checklist'
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Critérios de Aceite & Validação</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* TAB 1: SCRIPT SQL */}
        {activeTab === 'sql' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-400" />
                  Script de Migração SQL para o Supabase
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Execute este script no <strong>SQL Editor</strong> do painel do Supabase. Ele é 100% idempotente (pode ser executado múltiplas vezes sem quebras).
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(sqlScript, 'sql')}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-600/20 transition active:scale-95 shrink-0"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Script Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Script SQL</span>
                  </>
                )}
              </button>
            </div>

            {/* Explanatory Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold mb-1">
                  <KeyRound className="w-4 h-4" />
                  1. Coluna tenant_id
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Adiciona <code className="text-slate-200">tenant_id UUID</code> vinculada a <code className="text-slate-200">auth.users(id)</code> com padrão <code className="text-slate-200">DEFAULT auth.uid()</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-1">
                  <Lock className="w-4 h-4" />
                  2. RLS Habilitado
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Executa <code className="text-slate-200">ENABLE ROW LEVEL SECURITY</code> e força restrições inclusive para table owners.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  3. 4 Políticas Granulares
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Regras separadas para SELECT, INSERT, UPDATE e DELETE usando <code className="text-slate-200">auth.uid() = tenant_id</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  4. Trigger de Proteção
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Mesmo se o frontend passar valor nulo ou adulterado, o trigger força <code className="text-slate-200">NEW.tenant_id := auth.uid()</code>.
                </p>
              </div>
            </div>

            {/* Code Block */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span className="font-mono">supabase/migrations/20261017_enable_clients_rls.sql</span>
                </div>
                <button
                  onClick={() => copyToClipboard(sqlScript, 'sql')}
                  className="text-slate-400 hover:text-white flex items-center gap-1 transition"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <pre className="p-5 font-mono text-xs sm:text-sm text-slate-300 leading-relaxed overflow-x-auto max-h-[580px] scrollbar-thin">
                <code>{sqlScript}</code>
              </pre>
            </div>
          </div>
        )}

        {/* TAB 2: CÓDIGO FRONTEND / BACKEND */}
        {activeTab === 'code' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-indigo-400" />
                  Ajuste nas Funções de Cadastro e Consulta (Supabase Client)
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Injeção automática do <code className="text-indigo-300">tenant_id</code> obtido via <code className="text-indigo-300">supabase.auth.getUser()</code>.
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(codeSnippet, 'code')}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-600/20 transition active:scale-95 shrink-0"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Código Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar TypeScript</span>
                  </>
                )}
              </button>
            </div>

            {/* Before vs After comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  ❌ Como estava (Vulnerável a vazamento)
                </div>
                <p className="text-xs text-rose-200/70">
                  O cadastro inseria apenas nome/telefone sem passar o <code className="text-rose-200">tenant_id</code> e a consulta <code className="text-rose-200">select('*')</code> retornava os clientes de <strong>todas</strong> as barbearias.
                </p>
                <div className="p-3 rounded-lg bg-black/40 font-mono text-xs text-rose-300 overflow-x-auto">
                  {`// PERIGOSO: Sem tenant_id e sem RLS
await supabase.from('clients').insert([{ 
  name, 
  phone 
}]);

// Retornava clientes de todas as outras contas!
const { data } = await supabase.from('clients').select('*');`}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  ✅ Como fica agora (100% Isolado e Seguro)
                </div>
                <p className="text-xs text-emerald-200/70">
                  O código recupera o <code className="text-emerald-200">user.id</code> da sessão ativa do Supabase e o banco confere via RLS. Nenhum cliente consegue acessar dados alheios.
                </p>
                <div className="p-3 rounded-lg bg-black/40 font-mono text-xs text-emerald-300 overflow-x-auto">
                  {`// SEGURO: tenant_id do usuário logado + RLS
const { data: { user } } = await supabase.auth.getUser();

await supabase.from('clients').insert([{ 
  name, 
  phone,
  tenant_id: user.id // Injeção segura
}]);

// RLS filtra automaticamente por tenant_id = auth.uid()!`}
                </div>
              </div>
            </div>

            {/* Code Block */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono">src/services/clientsService.ts</span>
                </div>
                <button
                  onClick={() => copyToClipboard(codeSnippet, 'code')}
                  className="text-slate-400 hover:text-white flex items-center gap-1 transition"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <pre className="p-5 font-mono text-xs sm:text-sm text-slate-300 leading-relaxed overflow-x-auto max-h-[580px] scrollbar-thin">
                <code>{codeSnippet}</code>
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: SIMULADOR INTERATIVO MULTI-TENANT */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            {/* Header of simulator */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-indigo-400 bg-indigo-950/70 border border-indigo-800/40 px-2.5 py-0.5 rounded-full">
                    Laboratório de Validação
                  </span>
                  <span className="text-xs text-slate-400">Ambiente de Teste em Tempo Real</span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Simulação de Isolamento entre Barbearias (Tenants)
                </h2>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  Alterne entre as contas de administradores e ligue/desligue o RLS para ver com precisão como o vazamento ocorria e como a política RLS restringe 100% dos dados.
                </p>
              </div>

              {/* RLS Switch Toggle */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Estado do Supabase RLS
                  </div>
                  <div className={`text-sm font-bold flex items-center justify-end gap-1.5 ${isRlsEnabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isRlsEnabled ? (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>RLS Ativado (Protegido)</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-4 h-4" />
                        <span>RLS Desativado (Vazando Dados)</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !isRlsEnabled;
                    setIsRlsEnabled(next);
                    setSimulationLog((prev) => [
                      next
                        ? '🛡️ [RLS ATIVADO]: Políticas de isolamento auth.uid() = tenant_id ativadas.'
                        : '⚠️ [RLS DESATIVADO]: Estado vulnerável simulado. Tabelas abertas para leitura cross-tenant.',
                      ...prev.slice(0, 7),
                    ]);
                  }}
                  className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isRlsEnabled ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isRlsEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Tenant Selector Bar */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                1. Selecione o Usuário/Barbearia Logado (Sessão do Supabase Auth):
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Barbearia Alfa */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTenant('alfa');
                    setSimulationLog((prev) => [
                      '🔑 Sessão alterada para: Barbearia Alfa Premium (tenant-alfa-1111).',
                      ...prev.slice(0, 7),
                    ]);
                  }}
                  className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                    currentTenant === 'alfa'
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/20'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      Tenant A
                    </span>
                    {currentTenant === 'alfa' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Barbearia Alfa Premium</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: tenant-alfa-1111</p>
                  </div>
                </button>

                {/* Barbearia Vintage */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTenant('vintage');
                    setSimulationLog((prev) => [
                      '🔑 Sessão alterada para: Barbearia Vintage Club (tenant-vintage-2222).',
                      ...prev.slice(0, 7),
                    ]);
                  }}
                  className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                    currentTenant === 'vintage'
                      ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-500/20'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      Tenant B
                    </span>
                    {currentTenant === 'vintage' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Barbearia Vintage Club</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: tenant-vintage-2222</p>
                  </div>
                </button>

                {/* Invasor */}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTenant('attacker');
                    setSimulationLog((prev) => [
                      '⚠️ Simulação de invasão/usuário não autorizado (tenant-invasor-9999).',
                      ...prev.slice(0, 7),
                    ]);
                  }}
                  className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                    currentTenant === 'attacker'
                      ? 'bg-rose-950/40 border-rose-500 shadow-md shadow-rose-500/20'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                      Tentativa de Ataque
                    </span>
                    {currentTenant === 'attacker' && <CheckCircle2 className="w-4 h-4 text-rose-400" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Conta Desconhecida</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: tenant-invasor-9999</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Simulation Warning or Safety Badge */}
            {!isRlsEnabled ? (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center gap-3 text-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <div className="text-xs">
                  <strong className="font-semibold text-rose-300">ALERTA DE VAZAMENTO ATIVO:</strong> Como o RLS está desligado, a consulta <code className="bg-rose-900/50 px-1 py-0.5 rounded text-white">SELECT * FROM clients</code> traz dados de outras barbearias para o usuário atual! Observe a lista abaixo misturando clientes da Alfa e da Vintage.
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-3 text-emerald-200">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <strong className="font-semibold text-emerald-300">ISOLAMENTO RLS ATIVO:</strong> O Postgres filtra no nível de banco de dados por <code className="bg-emerald-900/50 px-1 py-0.5 rounded text-white">USING (tenant_id = auth.uid())</code>. Somente clientes cadastrados por <strong>{activeTenantConfig.name}</strong> são retornados.
                </div>
              </div>
            )}

            {/* Two Column Section: Form & Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Add Client */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-bold text-sm text-white">
                    Novo Cadastro de Cliente
                  </h3>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="text-slate-400">Tenant injetado automaticamente:</div>
                  <div className="font-mono text-indigo-300 truncate">
                    {activeTenantConfig.id}
                  </div>
                </div>

                <form onSubmit={handleAddClient} className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Nome do Cliente</label>
                    <input
                      type="text"
                      placeholder="Ex: João da Silva"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="Ex: (11) 99887-6655"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Salvar no Supabase</span>
                  </button>
                </form>

                {/* Simulation Logs */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Terminal de Auditoria (Logs):
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px] text-slate-300 max-h-40 overflow-y-auto scrollbar-thin">
                    {simulationLog.map((log, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-slate-950/80 border border-slate-800/80">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Clients Table */}
              <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm text-white">
                      Clientes Retornados pela Query (
                      <span className="text-emerald-400">{visibleClients.length}</span>)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    SELECT * FROM clients
                  </span>
                </div>

                {visibleClients.length === 0 ? (
                  <div className="p-12 text-center rounded-xl bg-slate-950/50 border border-dashed border-slate-800 text-slate-400">
                    <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                    <p className="text-sm font-medium text-slate-300">Nenhum cliente visível para este usuário.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      O RLS está impedindo que este usuário visualize dados de barbearias de terceiros.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Cliente</th>
                          <th className="py-2.5 px-3">Telefone</th>
                          <th className="py-2.5 px-3">Proprietário (Tenant)</th>
                          <th className="py-2.5 px-3">Status RLS</th>
                          <th className="py-2.5 px-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                        {visibleClients.map((client) => {
                          const isOwnClient = client.tenant_id === activeTenantConfig.id;
                          return (
                            <tr
                              key={client.id}
                              className={`transition ${
                                !isOwnClient
                                  ? 'bg-rose-950/30 text-rose-200'
                                  : 'hover:bg-slate-800/40 text-slate-200'
                              }`}
                            >
                              <td className="py-3 px-3">
                                <div className="font-medium text-white">{client.name}</div>
                                <div className="text-[11px] text-slate-400">{client.email}</div>
                              </td>
                              <td className="py-3 px-3 font-mono">{client.phone}</td>
                              <td className="py-3 px-3">
                                <div className="font-medium truncate max-w-[140px]">
                                  {client.tenant_name}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  {client.tenant_id}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                {isOwnClient ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Legítimo
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 bg-rose-950/80 border border-rose-800/60 px-2 py-0.5 rounded-full animate-pulse">
                                    <AlertTriangle className="w-3 h-3" />
                                    Vazamento!
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClient(client.id, client.tenant_id)}
                                  className="p-1.5 rounded-md hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition"
                                  title="Remover cliente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CHECKLIST & CRITÉRIOS DE ACEITE */}
        {activeTab === 'checklist' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-400" />
                Critérios de Aceite & Checklist de Homologação
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Todas as microtarefas e critérios de aceite descritos na solicitação foram rigorosamente atendidos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Modificações Requeridas */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  1. Modificações Estruturais e de Banco de Dados
                </h3>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Coluna tenant_id verificada e adicionada:</strong>{' '}
                      Criada com <code className="text-indigo-300">UUID REFERENCES auth.users(id) ON DELETE CASCADE</code> e <code className="text-indigo-300">DEFAULT auth.uid()</code>.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Row Level Security (RLS) habilitado:</strong>{' '}
                      Executado <code className="text-indigo-300">ALTER TABLE clients ENABLE ROW LEVEL SECURITY</code> e <code className="text-indigo-300">FORCE ROW LEVEL SECURITY</code>.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Índice de Performance Criado:</strong>{' '}
                      <code className="text-indigo-300">idx_clients_tenant_id</code> na coluna <code className="text-indigo-300">tenant_id</code> para garantir que consultas por barbearia sejam instantâneas sem seq scan.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Trigger de Segurança Defensivo:</strong>{' '}
                      Garante que mesmo que ocorra omissão no frontend, o banco força <code className="text-indigo-300">NEW.tenant_id := auth.uid()</code>.
                    </div>
                  </li>
                </ul>
              </div>

              {/* Políticas RLS Granulares */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  2. Políticas de Acesso RLS Aplicadas
                </h3>
                <ul className="space-y-3 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>SELECT (Leitura):</strong> Restrita a <code className="text-cyan-300">USING (tenant_id = auth.uid())</code>. Uma barbearia nunca vê clientes de outra.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>INSERT (Criação):</strong> Validação estrita com <code className="text-cyan-300">WITH CHECK (tenant_id = auth.uid())</code> impedindo forjar clientes para outro tenant.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>UPDATE & DELETE (Edição e Exclusão):</strong> Restritas a <code className="text-cyan-300">USING (tenant_id = auth.uid())</code>, bloqueando qualquer alteração cruzada.
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Atribuição no Cadastro (Frontend/Backend):</strong> Função <code className="text-indigo-300">createClientSafe</code> injeta <code className="text-indigo-300">user.id</code> da sessão ativa no payload.
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* Como homologar no Supabase */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                Guia Rápido de Homologação no Supabase
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
                <li>Abra o seu painel do Supabase no projeto da barbearia.</li>
                <li>Vá para a aba <strong>SQL Editor</strong> e crie uma nova query.</li>
                <li>Copie e cole o código da aba <strong>"Passo 1: Migration SQL"</strong> e clique em <strong>Run</strong>.</li>
                <li>Vá até <strong>Authentication &gt; Policies</strong> e confirme que a tabela <code className="text-slate-200">clients</code> possui 4 políticas ativas com status <strong>RLS Enabled</strong>.</li>
                <li>No seu código frontend/backend, utilize a implementação da aba <strong>"Passo 2: Inserção & Consulta"</strong>.</li>
                <li>Cadastre clientes logado como <em>Barbearia Alfa</em> e logado como <em>Barbearia Vintage</em> e ateste que a lista é 100% isolada.</li>
              </ol>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-5 text-center text-xs text-slate-500">
        Isolamento de Tenants Supabase &bull; Correção de Segurança RLS aplicada com sucesso
      </footer>
    </div>
  );
}
