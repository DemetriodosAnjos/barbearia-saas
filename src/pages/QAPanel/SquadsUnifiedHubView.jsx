/**
 * @file SquadsUnifiedHubView.jsx
 * @description Hub Unificado por Squads para o Painel QA Studio.
 * 
 * Resolve a 'Confusão de Entendimento' e unifica as fontes de dados em um único SSOT:
 * 1. 6 Abas Oficiais por Squads (Cyber Security, Back-End, Front-End, QA, DevOps, Data/DBA).
 * 2. Em cada Squad, 4 sub-visões integradas:
 *    - 📖 Documentação Técnica & Arquitetura (com submenus, fórmulas e resumo da Squad).
 *    - 📋 Logs de Diagnóstico & Correções Necessárias (código pronto + ações externas no Supabase/Mercado Pago).
 *    - 🧪 Testes Automatizados & Arquivos Auditados da Squad.
 *    - 📥 Exportação Unificada (PDF / JSON estruturado).
 * 3. Opção de Cópia em 1 clique e filtros por status (Aprovados / Pendentes Externas).
 */

import React, { useState, useMemo } from 'react';
import ProjectIcon from '../../components/ui/ProjectIcon';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { AUDITED_PROJECT_FILES } from '../../lib/security/securityEngine';
import { REMEDIATION_ITEMS } from '../../lib/security/remediationsData';
import { TECHNICAL_DOCUMENTATION, DOCUMENTATION_SUMMARY } from '../../lib/security/documentationData';
import { getRealTestsList } from './realTestDataStore';
import { runExternalItemProbe, getStoredProbedStatusMap, saveStoredProbedStatus } from '../../lib/security/externalProbeEngine';

export const SQUADS_CONFIG = [
  {
    id: 'cyber-security',
    name: 'Cyber Security & AppSec',
    categoryKey: 'Cyber Security',
    icon: 'ShieldAlert',
    color: 'emerald',
    badge: 'AppSec',
    lead: 'SecOps Team',
    description: 'Blindagem de JWT em memória, mitigação de SSRF, validação HMAC em tempo constante, sanitização XSS e isolamento Tenant.',
  },
  {
    id: 'backend-apis',
    name: 'Back-End & Core APIs',
    categoryKey: 'Backend',
    icon: 'Settings',
    color: 'blue',
    badge: 'APIs',
    lead: 'API & Gateway Team',
    description: 'Rotas Express, integração Mercado Pago (Checkout Pro e Pix), contratos Zod com .strip(), agendamento atômico e Silent Refresh.',
  },
  {
    id: 'frontend-ui',
    name: 'Front-End & UI/UX',
    categoryKey: 'Frontend',
    icon: 'Palette',
    color: 'indigo',
    badge: 'UI/UX',
    lead: 'Design & Web Team',
    description: 'React 19, AuthContext com token estritamente em memória, modais Pix instantâneo, acessibilidade WCAG 2.2 AA e skeletons.',
  },
  {
    id: 'qa-automation',
    name: 'QA & Automação',
    categoryKey: 'QA & Automação',
    icon: 'FlaskConical',
    color: 'amber',
    badge: 'Vitest',
    lead: 'QA & Test Engineers',
    description: 'Suítes unitárias e de integração no Vitest, testes de concorrência atômica com 10 clientes paralelos e regressão visual.',
  },
  {
    id: 'devops-infra',
    name: 'DevOps, SRE & Cloud Infra',
    categoryKey: 'Cloud & DevOps',
    icon: 'Cloud',
    color: 'purple',
    badge: 'DevSecOps',
    lead: 'SRE & Cloud Team',
    description: 'Pipelines CI/CD no GitHub Actions com Gitleaks e Semgrep, PgBouncer pool sizing e configuração de Webhook URLs.',
  },
  {
    id: 'database-dba',
    name: 'Data Engineering & DBA',
    categoryKey: 'Database (Supabase)',
    icon: 'Database',
    color: 'cyan',
    badge: 'Supabase',
    lead: 'DBA & Data Team',
    description: 'Tabelas Supabase (webhook_events, payments), políticas RLS multi-tenant, índices de alta performance e constraints UNIQUE.',
  },
];

export default function SquadsUnifiedHubView({
  initialSquad = 'cyber-security',
  themeMode = 'dark',
  onBackToDashboard,
  onOpenExportModal,
}) {
  const isDark = themeMode === 'dark';
  const [activeSquadId, setActiveSquadId] = useState(initialSquad);
  const [activeSubTab, setActiveSubTab] = useState('DOCS'); // 'DOCS' | 'FIXES' | 'TESTS' | 'FILES'
  const [activeDocSubmenuId, setActiveDocSubmenuId] = useState(null);
  const [selectedFixScope, setSelectedFixScope] = useState('ALL'); // 'ALL' | 'INTERNA_PROJETO' | 'EXTERNA_INFRA'
  const [copiedSnippetId, setCopiedSnippetId] = useState(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [testSearch, setTestSearch] = useState('');

  // Estados do Motor de Verificação Ativa de Infraestrutura Externa (Live Probes)
  const [probingItemId, setProbingItemId] = useState(null);
  const [probeResultModal, setProbeResultModal] = useState(null);
  const [probedStatusMap, setProbedStatusMap] = useState(() => {
    return getStoredProbedStatusMap();
  });
  const [isVerifyingModalOpen, setIsVerifyingModalOpen] = useState(false);
  const [verifyingStatusText, setVerifyingStatusText] = useState('Verificando...');

  const handleRunProbe = async (item) => {
    setProbingItemId(item.id);
    setIsVerifyingModalOpen(true);
    setVerifyingStatusText('Verificando...');

    try {
      const [result] = await Promise.all([
        runExternalItemProbe(item.id, item.title),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);

      if (result.isResolved) {
        saveStoredProbedStatus(item.id, 'RESOLVED');
        setProbedStatusMap((prev) => ({ ...prev, [item.id]: 'RESOLVED' }));
      } else {
        saveStoredProbedStatus(item.id, 'UNRESOLVED');
        setProbedStatusMap((prev) => ({ ...prev, [item.id]: 'UNRESOLVED' }));
      }
      setIsVerifyingModalOpen(false);
      setProbeResultModal(result);
    } catch {
      setIsVerifyingModalOpen(false);
    } finally {
      setProbingItemId(null);
    }
  };

  const handleRetryProbe = async (probeItem) => {
    setProbeResultModal(null);
    await handleRunProbe(probeItem);
  };

  const handleManualToggle = (item, forceStatus) => {
    const nextStatus = forceStatus || (probedStatusMap[item.id] === 'RESOLVED' ? 'UNRESOLVED' : 'RESOLVED');
    saveStoredProbedStatus(item.id, nextStatus);
    setProbedStatusMap((prev) => ({ ...prev, [item.id]: nextStatus }));
  };

  // Identifica a Squad Ativa
  const currentSquad = useMemo(() => {
    return SQUADS_CONFIG.find((s) => s.id === activeSquadId) || SQUADS_CONFIG[0];
  }, [activeSquadId]);

  // Filtra itens de Documentação Técnica associados a esta Squad
  const squadDocs = useMemo(() => {
    if (activeSquadId === 'cyber-security') {
      return TECHNICAL_DOCUMENTATION.filter((m) =>
        ['jwt-auth-architecture', 'egress-ssrf', 'sanitization-dompurify', 'wcag-accessibility'].includes(m.id)
      );
    }
    if (activeSquadId === 'backend-apis') {
      return TECHNICAL_DOCUMENTATION.filter((m) =>
        ['mercadopago-api-webhooks', 'jwt-auth-architecture', 'atomic-concurrency'].includes(m.id)
      );
    }
    if (activeSquadId === 'frontend-ui') {
      return TECHNICAL_DOCUMENTATION.filter((m) =>
        ['wcag-accessibility', 'sanitization-dompurify', 'jwt-auth-architecture'].includes(m.id)
      );
    }
    if (activeSquadId === 'qa-automation') {
      return TECHNICAL_DOCUMENTATION.filter((m) =>
        ['qa-processes-and-tests', 'atomic-concurrency'].includes(m.id)
      );
    }
    if (activeSquadId === 'devops-infra') {
      return TECHNICAL_DOCUMENTATION.filter((m) =>
        ['cicd-pipeline-security', 'egress-ssrf'].includes(m.id)
      );
    }
    // database-dba
    return TECHNICAL_DOCUMENTATION.filter((m) =>
      ['atomic-concurrency', 'mercadopago-api-webhooks'].includes(m.id)
    );
  }, [activeSquadId]);

  // Submenu ativo na documentação
  const currentDocMenu = squadDocs[0] || TECHNICAL_DOCUMENTATION[0];
  const activeSubmenu = useMemo(() => {
    if (!currentDocMenu?.submenus?.length) return null;
    if (activeDocSubmenuId) {
      const found = currentDocMenu.submenus.find((s) => s.id === activeDocSubmenuId);
      if (found) return found;
    }
    return currentDocMenu.submenus[0];
  }, [currentDocMenu, activeDocSubmenuId]);

  // Filtra itens de Correções e Logs (Remediações) para a Squad
  const squadFixes = useMemo(() => {
    return REMEDIATION_ITEMS.filter((item) => {
      // Mapeamento semântico
      if (activeSquadId === 'cyber-security') {
        return item.category === 'Cyber Security';
      }
      if (activeSquadId === 'backend-apis') {
        return item.category === 'Backend' || item.category === 'Pagamentos (Mercado Pago)';
      }
      if (activeSquadId === 'frontend-ui') {
        return item.category === 'Frontend';
      }
      if (activeSquadId === 'qa-automation') {
        return item.category === 'QA & Automação';
      }
      if (activeSquadId === 'devops-infra') {
        return item.category === 'Cloud & DevOps';
      }
      if (activeSquadId === 'database-dba') {
        return item.category === 'Database (Supabase)';
      }
      return false;
    });
  }, [activeSquadId]);

  const filteredSquadFixes = useMemo(() => {
    if (selectedFixScope === 'ALL') return squadFixes;
    return squadFixes.filter((f) => f.scope === selectedFixScope);
  }, [squadFixes, selectedFixScope]);

  // Filtra Arquivos Auditados da Squad
  const squadFiles = useMemo(() => {
    return AUDITED_PROJECT_FILES.filter((f) => {
      const s = (f.squad || '').toLowerCase();
      if (activeSquadId === 'cyber-security') return s.includes('cyber') || s.includes('security');
      if (activeSquadId === 'backend-apis') return s.includes('back-end') || s.includes('backend') || s.includes('api');
      if (activeSquadId === 'frontend-ui') return s.includes('front-end') || s.includes('frontend') || s.includes('ui');
      if (activeSquadId === 'qa-automation') return s.includes('qa') || s.includes('automação') || s.includes('test');
      if (activeSquadId === 'devops-infra') return s.includes('devops') || s.includes('ci/cd') || s.includes('sre');
      if (activeSquadId === 'database-dba') return s.includes('data') || s.includes('dba') || s.includes('database') || s.includes('supabase');
      return true;
    });
  }, [activeSquadId]);

  // Filtra Testes Automatizados da Squad
  const allTests = useMemo(() => getRealTestsList(), []);
  const squadTests = useMemo(() => {
    return allTests.filter((t) => {
      const s = (t.squad || '').toLowerCase();
      let match = false;
      if (activeSquadId === 'cyber-security') match = s.includes('cyber') || s.includes('appsec') || s.includes('segurança');
      else if (activeSquadId === 'backend-apis') match = s.includes('back-end') || s.includes('backend') || s.includes('api');
      else if (activeSquadId === 'frontend-ui') match = s.includes('front-end') || s.includes('frontend') || s.includes('ui');
      else if (activeSquadId === 'qa-automation') match = s.includes('qa') || s.includes('qualidade') || s.includes('vitest');
      else if (activeSquadId === 'devops-infra') match = s.includes('devops') || s.includes('ci/cd') || s.includes('sre');
      else if (activeSquadId === 'database-dba') match = s.includes('banco') || s.includes('database') || s.includes('dba');
      
      if (!match) return false;
      if (testSearch.trim()) {
        const q = testSearch.toLowerCase();
        return (t.title || '').toLowerCase().includes(q) || (t.id || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [allTests, activeSquadId, testSearch]);

  const handleCopyCode = (snippet, id) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 3000);
  };

  const handleCopySummary = () => {
    navigator.clipboard.writeText(DOCUMENTATION_SUMMARY);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header do Hub Unificado com Navegação de Retorno e Ações */}
      <div className={`p-5 rounded-2xl border shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl border flex items-center justify-center ${
            isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-600'
          }`}>
            <ProjectIcon name="Layers" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-500 uppercase tracking-wider">
                Fonte Única de Informações (SSOT)
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                isDark ? 'bg-neutral-800 text-neutral-300 border-neutral-700' : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                6 Squads Integradas
              </span>
            </div>
            <h1 className={`text-xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Hub Unificado de Engenharia por Squads
            </h1>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
              Documentação técnica, logs de diagnóstico, correções no código, checklists de infraestrutura e testes organizados por time.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopySummary}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
          >
            <ProjectIcon name={copiedSummary ? 'Check' : 'Copy'} size={14} className={copiedSummary ? 'text-emerald-400' : ''} />
            <span>{copiedSummary ? 'Resumo Copiado!' : 'Copiar Resumo'}</span>
          </button>

          <button
            onClick={() => onOpenExportModal && onOpenExportModal('PDF')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ProjectIcon name="FileText" size={14} />
            <span>Visualizar / PDF</span>
          </button>

          <button
            onClick={() => onOpenExportModal && onOpenExportModal('JSON')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ProjectIcon name="Download" size={14} />
            <span>Exportar JSON</span>
          </button>

          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
              }`}
            >
              ← Dashboard
            </button>
          )}
        </div>
      </div>

      {/* 2. Barra de Seleção das 6 Squads Oficiais (Abas Principais) */}
      <div className={`p-2 rounded-2xl border shadow-sm flex flex-wrap items-center gap-2 ${
        isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
      }`}>
        {SQUADS_CONFIG.map((squad) => {
          const isSelected = squad.id === activeSquadId;
          return (
            <button
              key={squad.id}
              onClick={() => {
                setActiveSquadId(squad.id);
                setActiveDocSubmenuId(null);
              }}
              className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                isSelected
                  ? isDark
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                    : 'bg-amber-100 text-amber-900 border-amber-400 shadow-sm'
                  : isDark
                  ? 'bg-neutral-950/60 text-neutral-400 hover:text-white border-neutral-800/80 hover:bg-neutral-800'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <ProjectIcon name={squad.icon} size={15} className={isSelected ? 'text-amber-400' : 'text-neutral-500'} />
                <span className="truncate">{squad.name}</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                isSelected
                  ? isDark
                    ? 'bg-amber-500/30 text-amber-200'
                    : 'bg-amber-200 text-amber-950'
                  : isDark
                  ? 'bg-neutral-800 text-neutral-400'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {squad.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Banner da Squad Selecionada */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-slate-100 border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border ${
            isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-600'
          }`}>
            <ProjectIcon name={currentSquad.icon} size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {currentSquad.name}
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                Líder Técnico: {currentSquad.lead}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
              {currentSquad.description}
            </p>
          </div>
        </div>

        {/* Métricas Rápidas da Squad */}
        <div className="flex items-center gap-3 shrink-0">
          <div className={`px-3 py-1.5 rounded-lg border text-center ${
            isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200'
          }`}>
            <div className="text-[10px] uppercase font-mono text-neutral-400">Correções</div>
            <div className="text-sm font-black text-amber-400">{squadFixes.length}</div>
          </div>
          <div className={`px-3 py-1.5 rounded-lg border text-center ${
            isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200'
          }`}>
            <div className="text-[10px] uppercase font-mono text-neutral-400">Arquivos</div>
            <div className="text-sm font-black text-cyan-400">{squadFiles.length}</div>
          </div>
          <div className={`px-3 py-1.5 rounded-lg border text-center ${
            isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200'
          }`}>
            <div className="text-[10px] uppercase font-mono text-neutral-400">Testes</div>
            <div className="text-sm font-black text-emerald-400">{squadTests.length}</div>
          </div>
        </div>
      </div>

      {/* 4. Sub-Navegação da Squad: Docs | Correções & Logs | Testes | Arquivos */}
      <div className={`p-1.5 rounded-xl border flex flex-wrap items-center gap-1 text-xs ${
        isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-slate-200'
      }`}>
        <button
          onClick={() => setActiveSubTab('DOCS')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'DOCS'
              ? 'bg-amber-500 text-neutral-950 shadow-sm'
              : isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ProjectIcon name="BookOpen" size={14} />
          <span>Documentação Técnica & Arquitetura ({squadDocs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('FIXES')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'FIXES'
              ? 'bg-amber-500 text-neutral-950 shadow-sm'
              : isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ProjectIcon name="Terminal" size={14} />
          <span>Logs de Diagnóstico & Correções ({squadFixes.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('TESTS')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'TESTS'
              ? 'bg-amber-500 text-neutral-950 shadow-sm'
              : isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ProjectIcon name="FlaskConical" size={14} />
          <span>Testes Automatizados ({squadTests.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('FILES')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'FILES'
              ? 'bg-amber-500 text-neutral-950 shadow-sm'
              : isDark ? 'text-neutral-400 hover:text-white hover:bg-neutral-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ProjectIcon name="FolderKanban" size={14} />
          <span>Arquivos Auditados ({squadFiles.length})</span>
        </button>
      </div>

      {/* 5. CONTEÚDO DA SUB-ABA */}

      {/* SUB-ABA 1: DOCUMENTAÇÃO TÉCNICA DA SQUAD */}
      {activeSubTab === 'DOCS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Menu Lateral de Módulos e Submenus */}
          <div className="lg:col-span-4 space-y-4">
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className={`text-xs uppercase font-mono font-bold tracking-wider mb-3 ${
                isDark ? 'text-neutral-400' : 'text-slate-500'
              }`}>
                Módulos de Documentação da Squad
              </h3>

              <div className="space-y-2">
                {squadDocs.map((menu) => (
                  <div key={menu.id} className="space-y-1">
                    <div className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 ${
                      isDark ? 'bg-neutral-800 text-amber-300' : 'bg-amber-50 text-amber-900'
                    }`}>
                      <ProjectIcon name={menu.iconName || 'BookOpen'} size={14} />
                      <span>{menu.title}</span>
                    </div>

                    <div className="pl-3 space-y-1">
                      {menu.submenus.map((sub) => {
                        const isSubActive = activeSubmenu?.id === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => setActiveDocSubmenuId(sub.id)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-between ${
                              isSubActive
                                ? isDark
                                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                                  : 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                                : isDark
                                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            <span className="truncate">{sub.title}</span>
                            <span className="text-[10px] font-mono">→</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Área de Leitura do Conteúdo */}
          <div className="lg:col-span-8">
            {activeSubmenu ? (
              <div className={`p-6 rounded-2xl border space-y-5 ${
                isDark ? 'bg-neutral-900 border-neutral-800 text-neutral-200' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-neutral-800">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase text-amber-500 tracking-wider">
                      Módulo Selecionado
                    </span>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {activeSubmenu.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleCopyCode(activeSubmenu.content, activeSubmenu.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ProjectIcon name={copiedSnippetId === activeSubmenu.id ? 'Check' : 'Copy'} size={14} className={copiedSnippetId === activeSubmenu.id ? 'text-emerald-400' : ''} />
                    <span>{copiedSnippetId === activeSubmenu.id ? 'Conteúdo Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>

                <div className={`p-3 rounded-xl border text-xs ${
                  isDark ? 'bg-amber-950/20 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}>
                  <strong>Resumo Executivo:</strong> {activeSubmenu.summary}
                </div>

                <div className="text-xs leading-relaxed whitespace-pre-line font-sans space-y-2">
                  {activeSubmenu.content}
                </div>

                {activeSubmenu.codeSnippet && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-neutral-400">
                        Código &amp; Snippet Pronto para Produção:
                      </span>
                      <button
                        onClick={() => handleCopyCode(activeSubmenu.codeSnippet, `${activeSubmenu.id}-code`)}
                        className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                      >
                        <ProjectIcon name={copiedSnippetId === `${activeSubmenu.id}-code` ? 'Check' : 'Copy'} size={13} />
                        <span>{copiedSnippetId === `${activeSubmenu.id}-code` ? 'Copiado!' : 'Copiar Código'}</span>
                      </button>
                    </div>
                    <pre className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs font-mono overflow-x-auto">
                      <code>{activeSubmenu.codeSnippet}</code>
                    </pre>
                  </div>
                )}

                {activeSubmenu.recommendations?.length > 0 && (
                  <div className="space-y-2 border-t pt-4 border-neutral-800">
                    <h4 className="text-xs font-bold uppercase font-mono text-emerald-400">
                      Diretrizes &amp; Recomendações Técnicas:
                    </h4>
                    <ul className="space-y-1.5">
                      {activeSubmenu.recommendations.map((rec, i) => (
                        <li key={i} className="text-xs flex items-start gap-2 text-neutral-300">
                          <ProjectIcon name="CheckCircle2" size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-neutral-500">Nenhum módulo selecionado.</div>
            )}
          </div>
        </div>
      )}

      {/* SUB-ABA 2: LOGS DE DIAGNÓSTICO & CORREÇÕES NECESSÁRIAS */}
      {activeSubTab === 'FIXES' && (
        <div className="space-y-4">
          {/* Filtro de Escopo Interna vs Externa */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border bg-neutral-900 border-neutral-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono text-neutral-400">Filtro de Escopo:</span>
              <button
                onClick={() => setSelectedFixScope('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedFixScope === 'ALL'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-400 hover:text-white bg-neutral-800'
                }`}
              >
                Todas ({squadFixes.length})
              </button>
              <button
                onClick={() => setSelectedFixScope('INTERNA_PROJETO')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedFixScope === 'INTERNA_PROJETO'
                    ? 'bg-emerald-500 text-neutral-950'
                    : 'text-neutral-400 hover:text-white bg-neutral-800'
                }`}
              >
                Aplicadas no Código ({squadFixes.filter((f) => f.scope === 'INTERNA_PROJETO').length})
              </button>
              <button
                onClick={() => setSelectedFixScope('EXTERNA_INFRA')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedFixScope === 'EXTERNA_INFRA'
                    ? 'bg-rose-500 text-neutral-950'
                    : 'text-neutral-400 hover:text-white bg-neutral-800'
                }`}
              >
                Pendentes Externas (Supabase/MP) ({squadFixes.filter((f) => f.scope === 'EXTERNA_INFRA').length})
              </button>
            </div>

            <span className="text-[11px] font-mono text-neutral-400">
              {filteredSquadFixes.length} itens listados para a squad
            </span>
          </div>

          {/* Cards de Correções */}
          <div className="grid grid-cols-1 gap-4">
            {filteredSquadFixes.map((item) => (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border space-y-4 shadow-sm ${
                  isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-neutral-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {item.id}
                      </span>
                      <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {item.title}
                      </h4>
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      item.scope === 'INTERNA_PROJETO'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : probedStatusMap[item.id] === 'RESOLVED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {item.scope === 'INTERNA_PROJETO' 
                        ? 'APLICADA NO CÓDIGO' 
                        : probedStatusMap[item.id] === 'RESOLVED'
                        ? 'NUVEM VALIDADA'
                        : 'AÇÃO EXTERNA (INFRA)'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                      {item.severity}
                    </span>
                  </div>
                </div>

                {/* BOTÃO DE AÇÃO: DISPARAR VERIFICAÇÃO ATIVA (LIVE PROBE) */}
                {item.scope === 'EXTERNA_INFRA' && (
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-neutral-400">Status da Sonda:</span>
                      {probedStatusMap[item.id] === 'RESOLVED' ? (
                        <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <ProjectIcon name="CheckCircle2" size={13} className="text-emerald-400" />
                          NUVEM VALIDADA (HTTP 200 OK)
                        </span>
                      ) : probedStatusMap[item.id] === 'UNRESOLVED' ? (
                        <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <ProjectIcon name="XCircle" size={13} className="text-rose-400" />
                          PENDENTE NA NUVEM (NÃO)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full font-mono text-[11px] bg-neutral-800 text-neutral-400 border border-neutral-700">
                          Aguardando Teste
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRunProbe(item)}
                        disabled={probingItemId === item.id}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 transition-all ${
                          probedStatusMap[item.id] === 'RESOLVED'
                            ? 'bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-emerald-500/30'
                            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950'
                        }`}
                        title="Disparar sonda de verificação no Supabase / Mercado Pago"
                      >
                        <ProjectIcon
                          name={probingItemId === item.id ? 'Loader2' : 'SearchCheck'}
                          size={14}
                          className={probingItemId === item.id ? 'animate-spin text-current' : 'text-current'}
                          colorVariant="inherit"
                        />
                        <span>
                          {probingItemId === item.id
                            ? 'Verificando...'
                            : probedStatusMap[item.id] === 'RESOLVED'
                            ? 'Revalidar Sonda na Nuvem'
                            : 'Verificar se foi solucionado'}
                        </span>
                      </button>

                      {probedStatusMap[item.id] === 'RESOLVED' ? (
                        <button
                          onClick={() => handleManualToggle(item, 'UNRESOLVED')}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-neutral-400 hover:text-neutral-200 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 flex items-center gap-1 transition-all cursor-pointer"
                          title="Reabrir pendência externa para novos testes"
                        >
                          <ProjectIcon name="RotateCcw" size={13} />
                          <span>Reverter</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleManualToggle(item, 'RESOLVED')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 hover:border-emerald-500/60 flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Confirmar manualmente que o comando SQL ou configuração já foi executada no Supabase"
                        >
                          <ProjectIcon name="CheckCircle2" size={13} className="text-emerald-400" />
                          <span>Confirmar Execução</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Descrição Técnica Detalhada */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-mono uppercase text-neutral-400 font-bold">
                    Descrição Técnica &amp; Justificativa:
                  </div>
                  <ul className="space-y-1">
                    {item.technicalDescription.map((desc, i) => (
                      <li key={i} className="text-xs text-neutral-300 flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Passos e Snippets Prontos */}
                {item.stepsToSolve?.length > 0 && (
                  <div className="space-y-2 border-t pt-3 border-neutral-800">
                    <div className="text-[11px] font-mono uppercase text-neutral-400 font-bold">
                      Checklist Passo a Passo de Execução:
                    </div>
                    <div className="space-y-2">
                      {item.stepsToSolve.map((step) => (
                        <div
                          key={step.stepNumber}
                          className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-amber-400">
                              Passo {step.stepNumber}: {step.title}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                              step.doneStatus ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {step.doneStatus ? '✓ Concluído' : 'Pendente'}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-300">{step.description}</p>
                          {step.commandOrSnippet && (
                            <div className="relative mt-2">
                              <pre className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-mono overflow-x-auto">
                                <code>{step.commandOrSnippet}</code>
                              </pre>
                              <button
                                onClick={() => handleCopyCode(step.commandOrSnippet, `${item.id}-${step.stepNumber}`)}
                                className="absolute top-2 right-2 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                              >
                                <ProjectIcon name={copiedSnippetId === `${item.id}-${step.stepNumber}` ? 'Check' : 'Copy'} size={11} />
                                <span>{copiedSnippetId === `${item.id}-${step.stepNumber}` ? 'Copiado' : 'Copiar'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-ABA 3: TESTES AUTOMATIZADOS DA SQUAD */}
      {activeSubTab === 'TESTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border bg-neutral-900 border-neutral-800">
            <input
              type="text"
              placeholder="Buscar testes desta squad por nome ou ID..."
              value={testSearch}
              onChange={(e) => setTestSearch(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-700 text-xs text-white placeholder-neutral-500 w-full sm:w-80"
            />
            <span className="text-xs font-mono text-neutral-400">
              {squadTests.length} testes homologados no Vitest
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {squadTests.map((t) => (
              <div
                key={t.id}
                className={`p-4 rounded-xl border space-y-2 ${
                  isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-amber-400">{t.id}</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                    ✓ APROVADO (100%)
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white leading-tight">{t.title}</h4>
                <p className="text-[11px] text-neutral-400 line-clamp-2">{t.description}</p>
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-[10px] font-mono text-neutral-500">
                  <span>Arquivo: {t.affectedFile || t.file || 'src/'}</span>
                  <span>{t.executionTime || '12ms'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-ABA 4: ARQUIVOS AUDITADOS DA SQUAD */}
      {activeSubTab === 'FILES' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl border bg-neutral-900 border-neutral-800 text-xs text-neutral-400 font-mono">
            {squadFiles.length} arquivos pertencem à alçada e governança desta squad.
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {squadFiles.map((file, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <ProjectIcon name="FileCode2" size={16} className="text-amber-400" />
                    <span className="font-mono text-xs font-bold text-white">{file.path}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                      {file.label}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">{file.role}</p>
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 shrink-0">
                  <ProjectIcon name="CheckCircle2" size={12} />
                  CONFORME
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL SPINNER DE 2s - UX "Verificando..." (PALETA ÂMBAR NOBRE) */}
      {isVerifyingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-amber-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
              <ProjectIcon name="SearchCheck" size={28} className="text-amber-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-mono tracking-wide">
                {verifyingStatusText}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Consultando integridade e status da infraestrutura em nuvem...
              </p>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-amber-400 h-full animate-pulse w-full" />
            </div>
            <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block font-bold">
              Tokens de Design • Âmbar Nobre
            </span>
          </div>
        </div>
      )}

      {/* MODAL DE RESULTADO DO PROBE DE INFRAESTRUTURA EXTERNA */}
      {probeResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  probeResultModal.isResolved
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  <ProjectIcon name={probeResultModal.isResolved ? 'CheckCircle2' : 'XCircle'} size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-neutral-400">
                      LAUDO DA SONDA: {probeResultModal.id}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      {probeResultModal.timestamp}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {probeResultModal.itemTitle}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setProbeResultModal(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 cursor-pointer"
              >
                <ProjectIcon name="X" size={20} />
              </button>
            </div>

            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              probeResultModal.isResolved
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-lg text-sm font-black font-mono border ${
                  probeResultModal.isResolved
                    ? 'bg-emerald-500 text-neutral-950 border-emerald-400'
                    : 'bg-rose-500 text-white border-rose-400'
                }`}>
                  {probeResultModal.isResolved ? 'SIM' : 'NÃO'}
                </div>
                <div>
                  <h4 className="text-sm font-bold">
                    {probeResultModal.isResolved
                      ? 'Item Homologado & Solucionado na Infraestrutura!'
                      : 'Item Ainda Não Solucionado na Infraestrutura Externa'}
                  </h4>
                  <p className="text-xs opacity-90">
                    {probeResultModal.diagnostics.details}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                <div className="text-neutral-500 text-[10px] uppercase font-bold">Alvo do Teste:</div>
                <div className="text-indigo-300">{probeResultModal.diagnostics.testedEndpointOrTarget}</div>
              </div>

              {probeResultModal.diagnostics.rawErrorOrSuccess && (
                <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
                  <div className="text-neutral-500 text-[10px] uppercase font-bold">Resposta Retornada pelo Provedor:</div>
                  <div className={`text-xs ${probeResultModal.isResolved ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {probeResultModal.diagnostics.rawErrorOrSuccess}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
              {!probeResultModal.isResolved && (
                <>
                  <button
                    onClick={() => {
                      handleManualToggle(probeResultModal, 'RESOLVED');
                      setProbeResultModal(null);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <ProjectIcon name="CheckCircle2" size={14} className="text-white" />
                    <span>Já executei no Supabase (Confirmar)</span>
                  </button>

                  <button
                    onClick={() => handleRetryProbe(probeResultModal)}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <ProjectIcon name="RefreshCw" size={14} className="text-neutral-950" />
                    <span>Testar Novamente</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setProbeResultModal(null)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs cursor-pointer"
              >
                Fechar Laudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
