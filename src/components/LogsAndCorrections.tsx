/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Aba Console de Logs & Correções Necessárias
 * Classificação por times (Cyber Security, Frontend, Backend, Cloud/DevOps, Supabase, Mercado Pago)
 * com menus, subtítulos, checklist passo a passo, código pronto e instruções para ações externas.
 */

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  Terminal, 
  ExternalLink, 
  Filter, 
  Layers, 
  Database, 
  CreditCard, 
  Code2, 
  Cloud,
  FileCheck
} from 'lucide-react';
import { REMEDIATION_ITEMS, RemediationItem } from '../lib/security/remediationsData';

interface LogsAndCorrectionsProps {
  triggerActionWithModal: (
    title: string,
    subtitle: string,
    steps: string[],
    action: () => void
  ) => void;
  onNavigateToWorkbench?: () => void;
}

export const LogsAndCorrections: React.FC<LogsAndCorrectionsProps> = ({
  triggerActionWithModal,
  onNavigateToWorkbench
}) => {
  const [items, setItems] = useState<RemediationItem[]>(REMEDIATION_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedScope, setSelectedScope] = useState<'ALL' | 'INTERNA_PROJETO' | 'EXTERNA_INFRA'>('ALL');
  const [activeItemId, setActiveItemId] = useState<string>(REMEDIATION_ITEMS[0].id);
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  const categories = [
    { id: 'ALL', label: 'Todos os Times', icon: Layers },
    { id: 'Cyber Security', label: 'Cyber Security', icon: ShieldAlert },
    { id: 'Backend', label: 'Backend', icon: Code2 },
    { id: 'Frontend', label: 'Frontend', icon: Code2 },
    { id: 'Cloud & DevOps', label: 'Cloud & DevOps', icon: Cloud },
    { id: 'Database (Supabase)', label: 'Supabase / DB', icon: Database },
    { id: 'Pagamentos (Mercado Pago)', label: 'Mercado Pago', icon: CreditCard },
    { id: 'QA & Automação', label: 'QA & Automação', icon: FileCheck }
  ];

  const filteredItems = items.filter(item => {
    const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchScope = selectedScope === 'ALL' || item.scope === selectedScope;
    return matchCategory && matchScope;
  });

  const activeItem = items.find(i => i.id === activeItemId) || filteredItems[0] || items[0];

  const handleToggleStep = (itemId: string, stepNumber: number) => {
    triggerActionWithModal(
      'Atualizando Status de Correção',
      `Registrando alteração na etapa #${stepNumber}...`,
      [
        'Verificando conformidade com as diretrizes de segurança...',
        'Validando dependências do checklist técnico...',
        'Sincronizando estado da tarefa...'
      ],
      () => {
        setItems(prev => prev.map(item => {
          if (item.id !== itemId) return item;
          const updatedSteps = item.stepsToSolve.map(s => {
            if (s.stepNumber === stepNumber) {
              return { ...s, doneStatus: !s.doneStatus };
            }
            return s;
          });
          const allDone = updatedSteps.every(s => s.doneStatus);
          return {
            ...item,
            stepsToSolve: updatedSteps,
            status: allDone ? 'VERIFICADA' : (item.scope === 'INTERNA_PROJETO' ? 'APLICADA_NO_CODIGO' : 'PENDENTE_EXTERNA')
          };
        }));
      }
    );
  };

  const handleCopySnippet = (snippet: string, identifier: string) => {
    triggerActionWithModal(
      'Copiando Instrução / Script',
      'Formatando código e variáveis...',
      [
        'Verificando sintaxe e encoding...',
        'Preparando payload de transferência...',
        'Copiando para a área de transferência...'
      ],
      () => {
        navigator.clipboard.writeText(snippet);
        setCopiedSnippetId(identifier);
        setTimeout(() => setCopiedSnippetId(null), 3000);
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros de Equipes e Escopo */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-mono text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Equipe:
          </span>
          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filtro de Escopo: Interna vs Externa */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setSelectedScope('ALL')}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              selectedScope === 'ALL' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setSelectedScope('INTERNA_PROJETO')}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              selectedScope === 'INTERNA_PROJETO' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            No Projeto ({items.filter(i => i.scope === 'INTERNA_PROJETO').length})
          </button>
          <button
            onClick={() => setSelectedScope('EXTERNA_INFRA')}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              selectedScope === 'EXTERNA_INFRA' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            Externas ({items.filter(i => i.scope === 'EXTERNA_INFRA').length})
          </button>
        </div>
      </div>

      {/* Grid Principal: Lista de Menus de Correções e Detalhes da Correção Selecionada */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna 1: Menus das Correções */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
            <span>Catálogo de Correções ({filteredItems.length})</span>
            <span>Severidade / Escopo</span>
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredItems.map(item => {
              const isSelected = item.id === activeItemId;
              const isApplied = item.status === 'APLICADA_NO_CODIGO' || item.status === 'VERIFICADA';

              return (
                <div
                  key={item.id}
                  onClick={() => setActiveItemId(item.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/50 shadow-md shadow-cyan-950/30'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-mono font-medium text-cyan-400">
                      {item.id} • {item.category}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      item.scope === 'INTERNA_PROJETO'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    }`}>
                      {item.scope === 'INTERNA_PROJETO' ? 'Código Interno' : 'Ação Externa'}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-white truncate">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.subtitle}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1 font-mono text-[10px]">
                      {isApplied ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      {isApplied ? 'Código Implementado' : 'Passo a Passo Pendente'}
                    </span>
                    <span className="text-slate-500 font-mono text-[10px]">
                      {item.stepsToSolve.filter(s => s.doneStatus).length}/{item.stepsToSolve.length} Etapas
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna 2: Detalhes Técnicos e Lista de Passos da Correção Selecionada */}
        <div className="lg:col-span-7">
          <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
            {/* Header do Item Ativo */}
            <div className="border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    {activeItem.id}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Equipe Responsável: <strong className="text-white">{activeItem.category}</strong>
                  </span>
                </div>
                <span className={`text-xs font-mono px-2.5 py-0.5 rounded font-bold ${
                  activeItem.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  activeItem.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}>
                  Severidade: {activeItem.severity}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white">
                {activeItem.title}
              </h3>
              <p className="text-xs text-slate-300 mt-1 font-medium">
                {activeItem.subtitle}
              </p>
              <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center gap-2">
                <span>Alvo / Componente:</span>
                <code className="text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                  {activeItem.affectedComponent}
                </code>
              </div>
            </div>

            {/* Descrição Técnica em Formato de Lista */}
            <div className="space-y-2">
              <h4 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400">
                Descrição Técnica Detalhada:
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {activeItem.technicalDescription.map((desc, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                    <span className="text-cyan-400 font-bold">•</span>
                    <span>{desc}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Se for interna, link para o código */}
            {activeItem.codeFixReference && (
              <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>Código de correção já integrado e ativo em: <strong>{activeItem.codeFixReference}</strong></span>
                </div>
                {onNavigateToWorkbench && (
                  <button
                    onClick={() => {
                      triggerActionWithModal(
                        'Abrindo Inspetor de Código',
                        'Carregando arquivo de correção no QA Workbench...',
                        ['Localizando arquivo no workspace...', 'Validando sintaxe...', 'Abrindo visualizador...'],
                        onNavigateToWorkbench
                      );
                    }}
                    className="text-[11px] underline text-cyan-400 hover:text-cyan-300 cursor-pointer font-medium"
                  >
                    Ver no Workbench
                  </button>
                )}
              </div>
            )}

            {/* Checklist Passo a Passo para Solução */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400">
                  {activeItem.scope === 'INTERNA_PROJETO' ? 'Etapas de Validação do Código' : 'Guia Passo a Passo (Ação Externa)'}
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  Clique no checkbox para atualizar o status
                </span>
              </div>

              <div className="space-y-3">
                {activeItem.stepsToSolve.map((step) => (
                  <div
                    key={step.stepNumber}
                    className={`p-3.5 rounded-xl border transition-all ${
                      step.doneStatus
                        ? 'bg-slate-950/60 border-emerald-500/30'
                        : 'bg-slate-950/90 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleStep(activeItem.id, step.stepNumber)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all mt-0.5 cursor-pointer ${
                          step.doneStatus
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'border-slate-700 bg-slate-900 text-transparent hover:border-cyan-400'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h5 className={`text-xs font-semibold ${step.doneStatus ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                            Passo {step.stepNumber}: {step.title}
                          </h5>
                          {step.doneStatus && (
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                              Concluído
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {step.description}
                        </p>

                        {/* Bloco de Código/Comando Copiável se existir */}
                        {step.commandOrSnippet && (
                          <div className="mt-2 pt-2 border-t border-slate-800/80">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                                <Terminal className="w-3 h-3" />
                                Script Pronto para Execução
                              </span>
                              <button
                                onClick={() => handleCopySnippet(step.commandOrSnippet!, `${activeItem.id}-${step.stepNumber}`)}
                                className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                              >
                                {copiedSnippetId === `${activeItem.id}-${step.stepNumber}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>{copiedSnippetId === `${activeItem.id}-${step.stepNumber}` ? 'Copiado!' : 'Copiar'}</span>
                              </button>
                            </div>
                            <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-cyan-200 overflow-x-auto leading-relaxed max-h-48">
                              {step.commandOrSnippet}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
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
