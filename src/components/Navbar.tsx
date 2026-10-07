/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Navbar & Navegação Principal
 */

import React from 'react';
import { 
  ShieldCheck, 
  GitPullRequest, 
  Terminal, 
  BookOpen, 
  FileCheck2, 
  Play, 
  Download,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { ScanRunResult } from '../lib/security/securityEngine';

interface NavbarProps {
  activeTab: 'workbench' | 'documentation' | 'remediations';
  onSelectTab: (tab: 'workbench' | 'documentation' | 'remediations') => void;
  scanResult: ScanRunResult;
  onOpenExportModal: (format: 'PDF' | 'JSON') => void;
  onRunScan: () => void;
  triggerActionWithModal: (
    title: string,
    subtitle: string,
    steps: string[],
    action: () => void
  ) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  scanResult,
  onOpenExportModal,
  onRunScan,
  triggerActionWithModal
}) => {
  const isGatePassed = scanResult.gateResult === 'PASSED';

  const handleValidateCiCd = () => {
    triggerActionWithModal(
      'Validando Pipeline CI/CD (.github/workflows/security.yml)',
      'Verificando sintaxe, jobs e gatilhos de Pull Request...',
      [
        'Validando esquema YAML do GitHub Actions...',
        'Inspecionando permissões: security-events: write...',
        'Verificando Gitleaks Action v2 e Semgrep Container...',
        'Conferindo flags de falha (--audit-level=high)...',
        'Pipeline validada e pronta para execução!'
      ],
      () => {
        // Callback pós-validação
      }
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo e Título */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-lg shadow-cyan-950/50">
              <ShieldCheck className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-tight">
                  SecPipeline
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-semibold">
                  CI/CD DevSecOps
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans hidden sm:block">
                SAST • Secret Scanning • Prevenção SSRF &amp; Egress Guard
              </p>
            </div>
          </div>

          {/* Status do Gate de CI/CD */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <GitPullRequest className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-mono text-slate-300">PR Gate:</span>
            {isGatePassed ? (
              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> APROVADO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-rose-400">
                <Flame className="w-3.5 h-3.5" /> BLOQUEADO
              </span>
            )}
          </div>

          {/* Botões de Ação no Topo */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleValidateCiCd}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono transition-colors cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Validar security.yml</span>
            </button>
            <button
              onClick={() => onOpenExportModal('PDF')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar (PDF/JSON)</span>
            </button>
            <button
              onClick={onRunScan}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-950/40 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Executar Scan</span>
            </button>
          </div>
        </div>

        {/* Abas Principais */}
        <div className="flex space-x-1 border-t border-slate-800/80 pt-2 pb-1 overflow-x-auto">
          <button
            onClick={() => onSelectTab('workbench')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'workbench'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>QA Studio &amp; Testing Workbench</span>
          </button>

          <button
            onClick={() => onSelectTab('documentation')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'documentation'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>Documentação Técnica &amp; SSRF</span>
          </button>

          <button
            onClick={() => onSelectTab('remediations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'remediations'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Console de Logs &amp; Correções Necessárias</span>
          </button>
        </div>
      </div>
    </header>
  );
};
