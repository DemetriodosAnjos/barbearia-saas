/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modal de Spinner com Overlay para Ações do Projeto
 * Garante tempo de execução mínimo de 2s a 3s (UX) com feedback visual,
 * micro-etapas de execução e indicador de progresso DevSecOps.
 */

import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';

export interface ActionModalConfig {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  steps: string[];
  durationMs?: number; // padrão 2500ms (2.5s)
  onComplete?: () => void;
}

interface ActionLoadingModalProps {
  config: ActionModalConfig;
  onClose: () => void;
}

export const ActionLoadingModal: React.FC<ActionLoadingModalProps> = ({ config, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const duration = config.durationMs || 2600;

  useEffect(() => {
    if (!config.isOpen) {
      setCurrentStepIndex(0);
      setIsFinished(false);
      return;
    }

    const stepsCount = Math.max(config.steps.length, 1);
    const stepInterval = duration / stepsCount;

    const intervalTimer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < stepsCount - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, stepInterval);

    const finishTimer = setTimeout(() => {
      setIsFinished(true);
      setTimeout(() => {
        if (config.onComplete) {
          config.onComplete();
        }
        onClose();
      }, 500);
    }, duration);

    return () => {
      clearInterval(intervalTimer);
      clearTimeout(finishTimer);
    };
  }, [config.isOpen, duration, config.steps.length, config.onComplete, onClose]);

  if (!config.isOpen) return null;

  const currentStepText = config.steps[currentStepIndex] || 'Processando validação de segurança...';
  const progressPercent = isFinished
    ? 100
    : Math.min(Math.round(((currentStepIndex + 1) / config.steps.length) * 95), 95);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/50 text-slate-100 overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Cabeçalho do modal */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            {isFinished ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-cyan-400 animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-wide">
              {config.title}
            </h3>
            {config.subtitle && (
              <p className="text-xs text-slate-400">{config.subtitle}</p>
            )}
          </div>
        </div>

        {/* Spinner central e visualização de status */}
        <div className="my-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center justify-center gap-3">
          <div className="relative flex items-center justify-center">
            {isFinished ? (
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
            ) : (
              <div className="relative flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping opacity-40" />
              </div>
            )}
          </div>

          <div className="text-center w-full px-2">
            <p className="text-xs font-mono font-medium text-cyan-300 truncate">
              {isFinished ? 'Validação concluída com sucesso!' : currentStepText}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Tempo de execução: ~{(duration / 1000).toFixed(1)}s (Garantia de integridade)
            </p>
          </div>

          {/* Barra de progresso */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
            <div
              className={`h-full transition-all duration-300 ease-out ${
                isFinished ? 'bg-emerald-400' : 'bg-gradient-to-r from-cyan-400 to-blue-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between w-full text-[10px] font-mono text-slate-400">
            <span>Progresso</span>
            <span>{progressPercent}%</span>
          </div>
        </div>

        {/* Micro-etapas de auditoria */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Etapas do Processo:
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
            {config.steps.map((st, idx) => {
              const isPast = idx < currentStepIndex || isFinished;
              const isCurrent = idx === currentStepIndex && !isFinished;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 text-xs py-1 px-2 rounded-lg transition-colors ${
                    isCurrent
                      ? 'bg-cyan-500/10 text-cyan-200 border border-cyan-500/30 font-medium'
                      : isPast
                      ? 'text-slate-400'
                      : 'text-slate-500'
                  }`}
                >
                  <span className="w-3.5 flex items-center justify-center">
                    {isPast ? (
                      <span className="text-emerald-400 font-bold">✓</span>
                    ) : isCurrent ? (
                      <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    )}
                  </span>
                  <span className="truncate">{st}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
