/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Aba de Documentação Técnica DevSecOps
 * Navegação hierárquica com menus e submenus, com foco em Restrição de Saída de Rede e Prevenção de SSRF,
 * opções de copiar/colar o resultado e exportar/visualizar em PDF e JSON.
 */

import React, { useState } from 'react';
import { 
  Network, 
  ShieldCheck, 
  Copy, 
  Check, 
  FileText, 
  Download, 
  Terminal, 
  ChevronRight, 
  Lock, 
  AlertTriangle,
  Server,
  BookOpen
} from 'lucide-react';
import { TECHNICAL_DOCUMENTATION, DOCUMENTATION_SUMMARY } from '../lib/security/documentationData';
import { ScanRunResult } from '../lib/security/securityEngine';

interface TechnicalDocumentationProps {
  scanResult: ScanRunResult;
  onOpenExportModal: (format: 'PDF' | 'JSON') => void;
  triggerActionWithModal: (
    title: string,
    subtitle: string,
    steps: string[],
    action: () => void
  ) => void;
}

export const TechnicalDocumentation: React.FC<TechnicalDocumentationProps> = ({
  scanResult,
  onOpenExportModal,
  triggerActionWithModal
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string>('egress-ssrf');
  const [activeSubmenuId, setActiveSubmenuId] = useState<string>('ssrf-fundamentals');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const currentMenu = TECHNICAL_DOCUMENTATION.find(m => m.id === activeMenuId) || TECHNICAL_DOCUMENTATION[0];
  const currentSubmenu = currentMenu.submenus.find(s => s.id === activeSubmenuId) || currentMenu.submenus[0];

  const handleCopySubmenuContent = () => {
    triggerActionWithModal(
      'Copiando Documentação Técnica',
      'Formatando conteúdo técnico e código...',
      [
        'Extraindo tópicos e recomendações...',
        'Formatando blocos de código e tabelas de IP...',
        'Copiando para a área de transferência...'
      ],
      () => {
        const textToCopy = `### ${currentSubmenu.title}
Resumo: ${currentSubmenu.summary}

${currentSubmenu.content}

Recomendações:
${currentSubmenu.recommendations.map(r => `- ${r}`).join('\n')}
${currentSubmenu.codeSnippet ? `\nCódigo / Snippet:\n${currentSubmenu.codeSnippet}` : ''}`;
        
        navigator.clipboard.writeText(textToCopy);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 3000);
      }
    );
  };

  const handleCopySummary = () => {
    triggerActionWithModal(
      'Copiando Resumo Executivo',
      'Formatando resumo da documentação técnica...',
      [
        'Compilando sumário de SSRF e CI/CD Gate...',
        'Formatando texto limpo em Markdown...',
        'Copiando para a área de transferência...'
      ],
      () => {
        navigator.clipboard.writeText(DOCUMENTATION_SUMMARY);
        setCopiedSummary(true);
        setTimeout(() => setCopiedSummary(false), 3000);
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Barra de Ações Rápidas de Documentação */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              Documentação Técnica DevSecOps &amp; SSRF Egress Control
            </h2>
            <p className="text-xs text-slate-400">
              Guia oficial de arquitetura, testes de mitigação de SSRF e regras estritas de CI/CD
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSummary ? 'Resumo Copiado!' : 'Copiar Resumo'}</span>
          </button>
          <button
            onClick={() => onOpenExportModal('PDF')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium border border-cyan-500/30 hover:border-cyan-500/60 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Visualizar / PDF</span>
          </button>
          <button
            onClick={() => onOpenExportModal('JSON')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar JSON</span>
          </button>
        </div>
      </div>

      {/* Caixa de Resumo em Destaque */}
      <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-cyan-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white uppercase tracking-wider font-mono text-[11px] block">
              Política de Restrição de Saída (Zero Trust Egress &amp; SSRF)
            </span>
            <span className="text-slate-300 text-xs">
              Conexões de saída bloqueadas para <strong>169.254.169.254</strong> (Metadados Cloud), faixas privadas <strong>RFC 1918</strong> e <strong>Loopbacks</strong>.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
            Compliance: 100%
          </span>
          <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
            Regra IMDSv2 Ativa
          </span>
        </div>
      </div>

      {/* Layout de Duas Colunas: Menu e Submenu à esquerda / Conteúdo à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Lateral: Menus & Submenus */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Menus &amp; Tópicos Técnicos
            </h3>

            <div className="space-y-3">
              {TECHNICAL_DOCUMENTATION.map((menu) => {
                const isSelectedMenu = menu.id === activeMenuId;
                const MenuIcon = menu.id === 'egress-ssrf' ? Network : ShieldCheck;

                return (
                  <div key={menu.id} className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveMenuId(menu.id);
                        setActiveSubmenuId(menu.submenus[0].id);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        isSelectedMenu
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <MenuIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <span className="truncate">{menu.title}</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelectedMenu ? 'rotate-90 text-cyan-400' : 'text-slate-500'}`} />
                    </button>

                    {/* Submenus expandidos */}
                    {isSelectedMenu && (
                      <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-cyan-500/30 ml-3">
                        {menu.submenus.map((sub) => {
                          const isSelectedSub = sub.id === activeSubmenuId;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => setActiveSubmenuId(sub.id)}
                              className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer ${
                                isSelectedSub
                                  ? 'bg-slate-800 text-cyan-300 font-medium border border-slate-700'
                                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                              }`}
                            >
                              <span className="truncate">{sub.title}</span>
                              {isSelectedSub && (
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Endpoints Protegidos no Projeto</span>
            </div>
            <ul className="space-y-1 font-mono text-[11px] text-slate-400">
              <li className="flex items-center gap-1.5">
                <span className="text-rose-400 font-bold">✗</span> 169.254.169.254/32 (Metadata)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-rose-400 font-bold">✗</span> 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> api.mercadopago.com
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">✓</span> *.supabase.co (RLS protegido)
              </li>
            </ul>
          </div>
        </div>

        {/* Painel Central: Conteúdo Detalhado do Submenu Selecionado */}
        <div className="lg:col-span-8 space-y-5">
          <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                  <span>{currentMenu.title}</span>
                  <span>/</span>
                  <span className="text-slate-300">{currentSubmenu.title}</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  {currentSubmenu.title}
                </h3>
              </div>
              <button
                onClick={handleCopySubmenuContent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer self-start sm:self-center"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText ? 'Copiado!' : 'Copiar Submenu'}</span>
              </button>
            </div>

            {/* Resumo do Submenu */}
            <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
              <strong className="text-cyan-300 font-semibold block mb-1">Resumo Executivo do Tópico:</strong>
              {currentSubmenu.summary}
            </div>

            {/* Conteúdo Técnico */}
            <div className="text-xs text-slate-300 space-y-3 leading-relaxed whitespace-pre-line font-sans">
              {currentSubmenu.content}
            </div>

            {/* Bloco de Código se houver */}
            {currentSubmenu.codeSnippet && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    Snippet de Implementação Técnica
                  </span>
                </div>
                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
                  {currentSubmenu.codeSnippet}
                </pre>
              </div>
            )}

            {/* Recomendações e Boas Práticas */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Recomendações e Ações de Engenharia
              </h4>
              <div className="space-y-1.5">
                {currentSubmenu.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-[10px] font-mono flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
