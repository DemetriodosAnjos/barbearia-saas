import React, { useState } from 'react';
import { CorrectionItem, ConsoleLog, TeamRole, LogLevel } from '../../types/qa';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Terminal,
  ShieldCheck,
  Server,
  Layout,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Info,
  CheckCircle2,
  Trash2,
  Filter,
  CheckSquare,
} from 'lucide-react';

export interface ConsoleLogsCorrectionsProps {
  corrections: CorrectionItem[];
  logs: ConsoleLog[];
  onClearLogs: () => void;
}

export const ConsoleLogsCorrections: React.FC<ConsoleLogsCorrectionsProps> = ({
  corrections,
  logs,
  onClearLogs,
}) => {
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [selectedCorrectionId, setSelectedCorrectionId] = useState<string>(corrections[0]?.id || '');
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [copiedStep, setCopiedStep] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<string>('ALL');

  const filteredCorrections = corrections.filter(
    (item) => selectedTeam === 'ALL' || item.team === selectedTeam
  );

  const selectedCorrection =
    corrections.find((c) => c.id === selectedCorrectionId) || filteredCorrections[0] || corrections[0];

  const filteredLogs = logs.filter(
    (log) => logFilter === 'ALL' || log.level === logFilter
  );

  const handleCopyText = (text: string, identifier: string, isStep = false) => {
    navigator.clipboard.writeText(text);
    if (isStep) {
      setCopiedStep(identifier);
      setTimeout(() => setCopiedStep(null), 2000);
    } else {
      setCopiedLogId(identifier);
      setTimeout(() => setCopiedLogId(null), 2000);
    }
  };

  const getTeamIcon = (team: TeamRole) => {
    switch (team) {
      case 'Frontend':
        return <Layout className="w-3.5 h-3.5 text-indigo-400" />;
      case 'Backend':
        return <Server className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Cyber Security':
        return <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />;
      case 'Serviços Externos (Supabase / Mercado Pago)':
        return <ExternalLink className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getLogLevelBadge = (level: LogLevel) => {
    switch (level) {
      case 'SUCCESS':
        return <Badge variant="success" size="sm">SUCCESS</Badge>;
      case 'WARN':
        return <Badge variant="warning" size="sm">WARN</Badge>;
      case 'ERROR':
        return <Badge variant="danger" size="sm">ERROR</Badge>;
      case 'SECURITY':
        return <Badge variant="warning" size="sm">SECURITY</Badge>;
      default:
        return <Badge variant="info" size="sm">INFO</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-400 font-mono uppercase tracking-wider">
              Diagnóstico Multidisciplinar
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400">Hub de Engenharia & Operações</span>
          </div>
          <h2 className="text-lg font-bold text-slate-100 mt-1">
            Console de Logs & Correções Necessárias
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Classificação rigorosa por time (Frontend, Backend, Cyber Security, DevOps e Serviços Externos com guias passo a passo).
          </p>
        </div>

        {/* Team Filter Pills / Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/70 rounded-lg border border-slate-800">
          {[
            { id: 'ALL', label: 'Todos os Times' },
            { id: 'Frontend', label: 'Frontend' },
            { id: 'Backend', label: 'Backend' },
            { id: 'Cyber Security', label: 'Cyber Security' },
            { id: 'QA / DevOps', label: 'QA / DevOps' },
            { id: 'Serviços Externos (Supabase / Mercado Pago)', label: 'Serviços Externos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedTeam(tab.id);
                const firstMatching = corrections.find(
                  (c) => tab.id === 'ALL' || c.team === tab.id
                );
                if (firstMatching) setSelectedCorrectionId(firstMatching.id);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedTeam === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left = Corrections Menu | Right = Detailed Technical Steps & Externals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Menu: List of Corrections (4 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                Correções e Ajustes ({filteredCorrections.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {corrections.filter((c) => c.status === 'Corrigido no Código').length} aplicadas
            </span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[560px] overflow-y-auto">
            {filteredCorrections.map((corr) => {
              const isSelected = corr.id === selectedCorrection?.id;
              const isExternal = corr.scope === 'External (Fora do Projeto)';

              return (
                <button
                  key={corr.id}
                  onClick={() => setSelectedCorrectionId(corr.id)}
                  className={`w-full p-4 text-left transition-colors flex flex-col gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/40 border-l-2 border-indigo-500'
                      : 'hover:bg-slate-850/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {getTeamIcon(corr.team)}
                      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-tight">
                        {corr.team}
                      </span>
                    </div>
                    <Badge variant={isExternal ? 'warning' : 'success'} size="sm">
                      {corr.status}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-200 leading-snug">
                      {corr.title}
                    </h4>
                    {corr.subtitles && (
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5 block truncate">
                        {corr.subtitles}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Detail Pane (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xs">
          {selectedCorrection ? (
            <div className="space-y-6">
              {/* Correction Header */}
              <div className="pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  {getTeamIcon(selectedCorrection.team)}
                  <span className="text-xs font-mono text-indigo-400 font-semibold">
                    {selectedCorrection.team}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-xs text-slate-400 font-mono">{selectedCorrection.scope}</span>
                </div>

                <h3 className="text-lg font-bold text-slate-100">
                  {selectedCorrection.title}
                </h3>

                {selectedCorrection.subtitles && (
                  <div className="text-xs font-mono text-slate-400 mt-1">
                    Alvo: <span className="text-indigo-300 font-semibold">{selectedCorrection.subtitles}</span>
                  </div>
                )}
              </div>

              {/* Status and Severity Badges */}
              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    selectedCorrection.status === 'Corrigido no Código' ? 'success' : 'warning'
                  }
                >
                  {selectedCorrection.status}
                </Badge>
                <Badge variant={selectedCorrection.severity === 'Crítica' ? 'danger' : 'neutral'}>
                  Severidade: {selectedCorrection.severity}
                </Badge>
                {selectedCorrection.targetService && (
                  <Badge variant="info">Serviço: {selectedCorrection.targetService}</Badge>
                )}
              </div>

              {/* Technical Description (Lista de cada correção) */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Descrição Técnica & Ajustes Executados
                </h4>
                <ul className="space-y-2 text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-lg border border-slate-800">
                  {selectedCorrection.description.map((desc, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                      <span>{desc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* External Tasks Step-by-Step Guide (Supabase, Mercado Pago, Chromatic) */}
              {selectedCorrection.externalSteps && selectedCorrection.externalSteps.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Instruções Passo a Passo para Configuração Externa</span>
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      {selectedCorrection.externalSteps.length} etapas
                    </span>
                  </div>

                  <div className="space-y-3">
                    {selectedCorrection.externalSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                            {step}
                          </div>
                          <button
                            onClick={() => handleCopyText(step, `step-${idx}`, true)}
                            title="Copiar instrução"
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                          >
                            {copiedStep === `step-${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-12 text-center">
              Selecione uma correção na lista para visualizar o detalhamento técnico.
            </div>
          )}
        </div>
      </div>

      {/* Real-Time Console Logs Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
              Console de Execução de Logs & Eventos em Tempo Real
            </h3>
            <span className="text-[11px] font-mono text-slate-500">({filteredLogs.length} logs)</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter by Log Level */}
            <div className="flex items-center gap-1 p-1 bg-slate-950/60 rounded-md border border-slate-800 text-[11px]">
              {['ALL', 'SUCCESS', 'INFO', 'WARN', 'SECURITY'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLogFilter(lvl)}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    logFilter === lvl ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <Button variant="ghost" size="sm" onClick={onClearLogs} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
              Limpar Logs
            </Button>
          </div>
        </div>

        {/* Console Log Rows */}
        <div className="p-4 bg-slate-950 font-mono text-xs max-h-64 overflow-y-auto space-y-2">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 rounded bg-slate-900/60 border border-slate-850 hover:bg-slate-900 transition-colors flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-slate-500 shrink-0 tabular-nums">[{log.timestamp}]</span>
                <div className="shrink-0">{getLogLevelBadge(log.level)}</div>
                <div className="min-w-0">
                  <div className="text-slate-200 font-medium">{log.message}</div>
                  {log.details && (
                    <div className="text-[11px] text-slate-400 font-sans mt-0.5">{log.details}</div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleCopyText(`[${log.timestamp}] [${log.level}] ${log.message}`, log.id)}
                title="Copiar log"
                className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer shrink-0"
              >
                {copiedLogId === log.id ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
