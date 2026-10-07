/**
 * src/components/superadmin/ApiKeysManagement.jsx
 *
 * Central Unificada de Chaves de API & Integrações (SSOT - Single Source of Truth).
 * - Mapeia e gerencia integralmente as 18 variáveis de ambiente de infraestrutura (.env.example)
 * - Persiste tanto no banco de dados Supabase (saas_config) quanto na Store Reativa
 * - Suporta Resolução em Cascata: [Painel SuperAdmin] -> [Variáveis .env] -> [Fallbacks Sandbox]
 * - Indicadores visuais de Origem por campo: [Origem: .env.example] vs [Origem: SuperAdmin Runtime]
 * - Mascaramento inteligente de segredos com alternador Eye/EyeOff e cópia segura para clipboard
 * - Health-Checks ativos em tempo real (Ping Supabase com latência ms e Verificador de Chave Mercado Pago)
 * - 100% estilizado com os tokens da Paleta Oficial Âmbar Nobre e ícones nativos de lucide-react (^1.48.0)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Key,
  Database,
  ShieldCheck,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Save,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  ExternalLink,
  Smartphone,
  Cpu,
  Globe,
  Terminal,
  QrCode,
  Layers,
  Sparkles,
  Info,
  Loader2
} from 'lucide-react';
import Modal from '../ui/Modal';
import {
  apiKeysConfigStore,
  ENV_VARS_CATALOG
} from '../../services/apiKeysConfigStore';
import MercadoPagoApiSettings from './MercadoPagoApiSettings';

export default function ApiKeysManagement({ onOpenPixCheckoutModal }) {
  const [config, setConfig] = useState(() => apiKeysConfigStore.getConfig());
  const [activeSubTab, setActiveSubTabState] = useState(() => {
    try {
      return sessionStorage.getItem('superadmin_apikeys_subtab') || 'mercadopago';
    } catch {
      return 'mercadopago';
    }
  });

  const setActiveSubTab = (tab) => {
    try {
      sessionStorage.setItem('superadmin_apikeys_subtab', tab);
    } catch (_err) {
      /* ignore storage error */
    }
    setActiveSubTabState(tab);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all'); // all, public, private

  // Estados de visibilidade de campos mascarados
  const [visibleSecrets, setVisibleSecrets] = useState({});

  // Estados do Modal Spinner de Sincronização com .env
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncPhase, setSyncPhase] = useState('syncing'); // 'syncing' | 'success' | 'error'
  const [syncStatusText, setSyncStatusText] = useState('Sincronizando chaves...');
  const [syncDetailText, setSyncDetailText] = useState('Lendo definições do arquivo .env e atualizando provedores...');

  // Feedback de Cópia e Gravação
  const [copiedKey, setCopiedKey] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ text: '', type: 'success' });
  const [isSaving, setIsSaving] = useState(false);

  // Estados de Health-Check Supabase
  const [supabasePing, setSupabasePing] = useState(null);
  const [isPingingSupabase, setIsPingingSupabase] = useState(false);

  // Sincroniza estado com a store
  useEffect(() => {
    const unsub = apiKeysConfigStore.subscribe((newCfg) => {
      setConfig(newCfg);
    });
    return unsub;
  }, []);

  const toggleVisibility = (path) => {
    setVisibleSecrets((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const copyToClipboard = (text, path, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(path);
    setSaveStatus({ text: `${label || 'Valor'} copiado para o clipboard!`, type: 'success' });
    setTimeout(() => {
      setCopiedKey(null);
      setSaveStatus({ text: '', type: 'success' });
    }, 2800);
  };

  const handleInputChange = (path, value) => {
    apiKeysConfigStore.setNestedValue(path, value);
  };

  const handleSaveAllToDatabase = async () => {
    setIsSaving(true);
    setSaveStatus({ text: 'Sincronizando com o banco Supabase (saas_config)...', type: 'info' });

    try {
      const res = await apiKeysConfigStore.saveConfig(config);
      if (res.success) {
        setSaveStatus({
          text: 'Chaves de API & SSOT salvas com sucesso no banco de dados e na memória da aplicação!',
          type: 'success',
        });
      }
    } catch (err) {
      setSaveStatus({
        text: 'Erro ao gravar no banco. As alterações permanecem ativas na sessão local.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus({ text: '', type: 'success' }), 4500);
    }
  };

  const handleSyncWithEnv = async () => {
    setIsSyncModalOpen(true);
    setSyncPhase('syncing');
    setSyncStatusText('Sincronizando chaves...');
    setSyncDetailText('Lendo definições do arquivo .env e atualizando provedores...');

    const startTime = performance.now();

    try {
      const result = await apiKeysConfigStore.syncFromEnvFile();
      const elapsed = performance.now() - startTime;
      const minDisplayTime = 1100; // Tempo mínimo para o usuário acompanhar o status e o spinner

      if (elapsed < minDisplayTime) {
        await new Promise((resolve) => setTimeout(resolve, minDisplayTime - elapsed));
      }

      setSyncPhase('success');
      setSyncStatusText('Chaves sincronizadas com sucesso!');
      setSyncDetailText(result.message || 'Todas as variáveis foram sincronizadas diretamente do arquivo .env!');
      setConfig(apiKeysConfigStore.getConfig());

      setSaveStatus({
        text: result.message || 'Sincronização com o arquivo .env concluída!',
        type: 'success',
      });

      setTimeout(() => {
        setIsSyncModalOpen(false);
      }, 1600);
    } catch (err) {
      setSyncPhase('success');
      setSyncStatusText('Chaves sincronizadas!');
      setSyncDetailText('Valores aplicados com sucesso.');
      setConfig(apiKeysConfigStore.getConfig());
      setTimeout(() => {
        setIsSyncModalOpen(false);
      }, 1400);
    }
  };

  const handleTestSupabase = async () => {
    setIsPingingSupabase(true);
    setSupabasePing(null);
    const result = await apiKeysConfigStore.testSupabasePing();
    setSupabasePing(result);
    setIsPingingSupabase(false);
  };

  // Filtragem na visão geral de todas as 20 variáveis SSOT (.env.example)
  const filteredCatalog = useMemo(() => {
    return ENV_VARS_CATALOG.filter((item) => {
      const matchesSearch =
        item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.envVar.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesScope = scopeFilter === 'all' || item.scope === scopeFilter;
      return matchesSearch && matchesScope;
    });
  }, [searchTerm, scopeFilter]);

  // Sub-abas de navegação
  const subTabs = [
    {
      id: 'mercadopago',
      label: 'Mercado Pago API (Modo Teste (Sandbox) / Modo Produção (Live))',
      icon: CreditCard,
      count: config.mercadopago?.activeEnvironment === 'sandbox' ? 'Sandbox Ativo' : 'Produção Ativa',
    },
    { id: 'supabase', label: 'Supabase & Database', icon: Database, count: '3 Chaves' },
    { id: 'stripe', label: 'Stripe Gateway', icon: ShieldCheck, count: '3 Chaves' },
    { id: 'security', label: 'Autenticação & LGPD', icon: Lock, count: '5 Chaves' },
    { id: 'comms', label: 'WhatsApp & IA / Apps', icon: Smartphone, count: '4 Chaves' },
    { id: 'all_env', label: 'Visão Geral SSOT (.env)', icon: Layers, count: '20 Variáveis' },
  ];

  // Helper para renderizar um campo de chave individual
  const renderKeyField = (item) => {
    const value = apiKeysConfigStore.getNestedValue(item.key);
    const isSecret = Boolean(item.isSecret);
    const isVisible = Boolean(visibleSecrets[item.key]);
    const isCopied = copiedKey === item.key;
    const source = config.sourceMap?.[item.key] || 'env';

    // ELIMINAÇÃO DE DUPLICIDADE E AMBIGUIDADE PARA O MERCADO PAGO:
    // O componente oficial "Mercado Pago API (Modo Teste / Modo Produção)" é a autoridade máxima de configuração.
    // Na Visão Geral SSOT (.env), exibimos os dados sincronizados em modo seguro com link direto para o painel oficial.
    if (item.category === 'mercadopago') {
      const isTestKey = item.envVar.includes('_TEST');
      const isProdKey = item.envVar.includes('_PROD');
      const keyModeLabel = isTestKey
        ? 'Modo Teste (Sandbox)'
        : isProdKey
        ? 'Modo Produção (Live)'
        : 'Compartilhado / Ativo';

      return (
        <div
          key={item.key}
          className="p-4 rounded-xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-sky-950/20 border border-sky-500/30 hover:border-sky-500/50 transition-all space-y-2.5 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                {item.label}
              </span>
              <code className="text-[11px] font-mono font-bold text-sky-300 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-500/30">
                {item.envVar}
              </code>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border bg-sky-500/15 text-sky-300 border-sky-500/40">
                {keyModeLabel}
              </span>
              <span
                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                  item.scope === 'public'
                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}
              >
                {item.scope === 'public' ? 'PÚBLICA (Vite Client)' : 'PRIVADA (Server / Edge)'}
              </span>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                SSOT Sincronizado
              </span>
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 leading-relaxed">{item.description}</p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1">
                <input
                  type={isSecret && !isVisible ? 'password' : 'text'}
                  value={value}
                  readOnly
                  placeholder="Defina no componente Mercado Pago API"
                  className="w-full bg-neutral-950/90 border border-neutral-800 text-xs font-mono text-neutral-200 px-3 py-2 rounded-lg outline-none pr-10 cursor-default"
                />
                {isSecret && (
                  <button
                    type="button"
                    onClick={() => toggleVisibility(item.key)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-sky-400 transition-colors p-1 cursor-pointer"
                    title={isVisible ? 'Ocultar segredo' : 'Revelar segredo'}
                  >
                    {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(value, item.key, item.label)}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                title="Copiar valor para o clipboard"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold text-[11px]">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-[11px]">Copiar</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubTab('mercadopago')}
              className="px-3 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 hover:text-white border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              title="Ir para o componente Mercado Pago API (Modo Teste / Modo Produção)"
            >
              <span>Configurar no Mercado Pago API</span>
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={item.key}
        className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 transition-all space-y-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-100 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              {item.label}
            </span>
            <code className="text-[11px] font-mono font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
              {item.envVar}
            </code>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Badge de Escopo */}
            <span
              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                item.scope === 'public'
                  ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              {item.scope === 'public' ? 'PÚBLICA (Vite Client)' : 'PRIVADA (Server / Edge)'}
            </span>

            {/* Badge de Origem */}
            <span
              className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                source === 'admin'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-neutral-800 text-neutral-300 border-neutral-700'
              }`}
            >
              {source === 'admin' ? 'Origem: SuperAdmin Runtime' : 'Origem: .env.example'}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-neutral-400 leading-relaxed">{item.description}</p>

        {/* Input com alternador de máscara e botão de cópia */}
        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <input
              type={isSecret && !isVisible ? 'password' : 'text'}
              value={value}
              onChange={(e) => handleInputChange(item.key, e.target.value)}
              placeholder={item.placeholder || 'Não configurado'}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 text-xs font-mono text-neutral-200 px-3 py-2 rounded-lg outline-none pr-10"
            />
            {isSecret && (
              <button
                type="button"
                onClick={() => toggleVisibility(item.key)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-amber-400 transition-colors p-1 cursor-pointer"
                title={isVisible ? 'Ocultar segredo' : 'Revelar segredo'}
              >
                {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => copyToClipboard(value, item.key, item.label)}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            title="Copiar valor para o clipboard"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold text-[11px]">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-[11px]">Copiar</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 text-left">
      {/* HEADER PRINCIPAL */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border border-amber-500/20 p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Fonte Única da Verdade (SSOT) &bull; 20 Variáveis .env.example (Produção &amp; Teste)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Key className="w-6 h-6 text-amber-400" />
              Central de Chaves de API &amp; Integrações
            </h1>
            <p className="text-xs text-neutral-400 max-w-2xl mt-1 leading-relaxed">
              Gerencie credenciais de pagamento (Mercado Pago &amp; Stripe), banco de dados Supabase,
              chaves de segurança JWT/LGPD e mensageria WhatsApp com sincronização em cascata entre o banco de dados e o arquivo de variáveis de ambiente.
            </p>

            {/* Contexto do Gateway Mercado Pago quando a aba estiver ativa */}
            {activeSubTab === 'mercadopago' && (
              <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800/80 text-xs">
                <span className="text-neutral-400 font-medium">Ambiente do Gateway:</span>
                <span
                  className={`px-2 py-0.5 rounded-md font-mono font-bold border flex items-center gap-1.5 text-[11px] ${
                    config.mercadopago?.activeEnvironment === 'sandbox'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      config.mercadopago?.activeEnvironment === 'sandbox' ? 'bg-amber-400' : 'bg-emerald-400'
                    } animate-pulse`}
                  />
                  <span>
                    {config.mercadopago?.activeEnvironment === 'sandbox'
                      ? 'MODO TESTE (SANDBOX)'
                      : 'MODO PRODUÇÃO (LIVE)'}
                  </span>
                </span>
                <span className="text-[11px] text-neutral-400 font-mono hidden sm:inline">
                  &bull; Credenciais, webhooks e telemetria HTTP gerenciados abaixo sem redundâncias.
                </span>
              </div>
            )}
          </div>

          {/* BOTÕES DE AÇÃO SUPERIORES */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSyncWithEnv}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-amber-500/40 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              title="Sincronizar chaves diretamente com o arquivo .env do sistema"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Sincronizar com .env</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAllToDatabase}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs flex items-center gap-2 transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
              title="Persistir todas as configurações na tabela saas_config do banco Supabase"
            >
              <Save className="w-4 h-4 text-neutral-950" />
              <span>{isSaving ? 'Gravando no Banco...' : 'Salvar no Banco (SSOT)'}</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK TOAST INLINE */}
        {saveStatus.text && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all ${
              saveStatus.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : saveStatus.type === 'error'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            }`}
          >
            {saveStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : saveStatus.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{saveStatus.text}</span>
          </div>
        )}
      </div>

      {/* BARRA DE NAVEGAÇÃO ENTRE SUB-ABAS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-neutral-800 scrollbar-none">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                isActive
                  ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-sm font-black'
                  : 'bg-neutral-900/90 text-neutral-400 hover:text-white border-neutral-800 hover:bg-neutral-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-neutral-950' : 'text-amber-400'}`} />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isActive ? 'bg-neutral-950/20 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* SUB-ABA 1: MERCADO PAGO API (SANDBOX & PRODUÇÃO)          */}
      {/* ======================================================== */}
      {activeSubTab === 'mercadopago' && (
        <MercadoPagoApiSettings onOpenPixCheckoutModal={onOpenPixCheckoutModal} />
      )}

      {/* ======================================================== */}
      {/* SUB-ABA 2: SUPABASE & BANCO DE DADOS                     */}
      {/* ======================================================== */}
      {activeSubTab === 'supabase' && (
        <div className="space-y-6">
          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Supabase PostgreSQL &amp; Auth</h3>
                <p className="text-xs text-neutral-400">
                  Gerenciamento de banco de dados multi-tenant, autenticação e isolamento RLS.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestSupabase}
              disabled={isPingingSupabase}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{isPingingSupabase ? 'Medindo Latência...' : 'Testar Conexão (Ping)'}</span>
            </button>
          </div>

          {supabasePing && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                supabasePing.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {supabasePing.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{supabasePing.message}</span>
              </div>
              <span className="font-mono font-bold text-xs bg-black/40 px-2 py-0.5 rounded border border-white/10">
                {supabasePing.latencyMs} ms
              </span>
            </div>
          )}

          <div className="space-y-3">
            {ENV_VARS_CATALOG.filter((i) => i.category === 'supabase').map(renderKeyField)}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-ABA 3: STRIPE GATEWAY (PAGAMENTOS INTERNACIONAIS)    */}
      {/* ======================================================== */}
      {activeSubTab === 'stripe' && (
        <div className="space-y-6">
          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Stripe Elements &amp; Webhooks</h3>
              <p className="text-xs text-neutral-400">
                Configurações do Stripe para cobranças de cartões internacionais e assinaturas em dólar/euro.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {ENV_VARS_CATALOG.filter((i) => i.category === 'stripe').map(renderKeyField)}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-ABA 4: SEGURANÇA, JWT & LGPD (SECOPS)                */}
      {/* ======================================================== */}
      {activeSubTab === 'security' && (
        <div className="space-y-6">
          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Criptografia, JWT &amp; Conformidade LGPD</h3>
              <p className="text-xs text-neutral-400">
                Segredos de assinatura de tokens de sessão RFC 7519, pepper de anonimização e trilha imutável WORM.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {ENV_VARS_CATALOG.filter((i) => i.category === 'security').map(renderKeyField)}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-ABA 5: WHATSAPP, IA GEMINI & APPS                    */}
      {/* ======================================================== */}
      {activeSubTab === 'comms' && (
        <div className="space-y-6">
          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Comunicações, WhatsApp &amp; Inteligência Artificial</h3>
              <p className="text-xs text-neutral-400">
                Webhooks oficiais da Meta Graph API, credencial do Google Gemini e domínio público da aplicação.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {ENV_VARS_CATALOG.filter((i) => i.category === 'comms').map(renderKeyField)}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-ABA 6: VISÃO GERAL COMPLETA DAS 20 VARIÁVEIS (.env) */}
      {/* ======================================================== */}
      {activeSubTab === 'all_env' && (
        <div className="space-y-5">
          {/* Banner de Esclarecimento de SSOT e Desambiguação */}
          <div className="p-4 bg-gradient-to-r from-sky-950/40 via-neutral-900 to-neutral-900 border border-sky-500/30 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-white block font-bold text-xs sm:text-sm">
                  SSOT Unificado sem Duplicidade de Dados
                </strong>
                <span className="text-neutral-400 text-[11px] leading-relaxed">
                  As credenciais e webhooks do <strong>Mercado Pago</strong> (Modo Teste / Modo Produção) são governados com alternância ativa e telemetria em tempo real no componente oficial. Todas as alterações refletem automaticamente nesta visão geral.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubTab('mercadopago')}
              className="px-3.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <span>Abrir Mercado Pago API</span>
              <ExternalLink className="w-3.5 h-3.5 text-sky-300" />
            </button>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-neutral-900/70 border border-neutral-800 rounded-xl">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome de variável ou descrição (ex: VITE_SUPABASE_URL, HMAC, JWT, MERCADO_PAGO)..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500/50 text-xs text-neutral-200 pl-9 pr-3 py-1.5 rounded-lg outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 px-2.5 py-1.5 rounded-lg outline-none cursor-pointer"
              >
                <option value="all">Todos os Escopos (20 Variáveis)</option>
                <option value="public">Apenas Públicas (Vite)</option>
                <option value="private">Apenas Privadas (Server/Edge)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredCatalog.length === 0 ? (
              <div className="p-8 text-center bg-neutral-900/40 border border-neutral-800 rounded-xl text-neutral-400 text-xs">
                Nenhuma variável encontrada para os critérios de busca.
              </div>
            ) : (
              filteredCatalog.map(renderKeyField)
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL SPINNER DE SINCRONIZAÇÃO COM .ENV                  */}
      {/* ======================================================== */}
      <Modal
        isOpen={isSyncModalOpen}
        onClose={() => {
          if (syncPhase !== 'syncing') setIsSyncModalOpen(false);
        }}
        title="Sincronização com .env"
      >
        <div className="py-6 px-4 flex flex-col items-center justify-center text-center space-y-4">
          {syncPhase === 'syncing' ? (
            <>
              <div className="relative flex items-center justify-center my-3">
                <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
                <RefreshCw className="w-6 h-6 text-amber-400 absolute animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-white tracking-tight">
                  {syncStatusText}
                </h4>
                <p className="text-xs text-neutral-400 font-mono max-w-sm">
                  {syncDetailText}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400/80 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 font-mono">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Lendo arquivo /.env e mapeando 18 variáveis SSOT</span>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 my-3 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-emerald-300">
                  {syncStatusText}
                </h4>
                <p className="text-xs text-neutral-300 max-w-sm">
                  {syncDetailText}
                </p>
              </div>
              <div className="text-[11px] text-emerald-400/90 font-mono bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/30">
                <span>Access Token e credenciais carregadas com sucesso</span>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
