import React from "react";
import SkeletonCard from "./SkeletonCard";

/**
 * SkeletonBookingView Component
 *
 * Tela completa de Skeleton Screen para o fluxo de agendamento de clientes (ClientBookingView).
 * Exibida durante carregamentos sob alta latência, evitando que a tela fique em branco
 * e transmitindo estabilidade e sensação de resposta imediata ao usuário.
 */
export default function SkeletonBookingView({ latencyNotice = false }) {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Aviso de Alta Latência opcional */}
      {latencyNotice && (
        <div className="p-3 bg-neutral-900/90 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-200 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Rede com alta latência detectada. Otimizando o carregamento dos horários disponíveis...</span>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">Modo Resiliente</span>
        </div>
      )}

      {/* Header Institucional Skeleton */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-6 bg-neutral-800 rounded-lg w-2/3 max-w-sm" />
            <div className="h-3.5 bg-neutral-800/60 rounded w-1/2 max-w-xs" />
          </div>
          <div className="h-8 bg-neutral-800/60 rounded-xl w-32 shrink-0" />
        </div>
      </div>

      {/* Etapas do Wizard Skeleton */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
        <div className="h-8 bg-neutral-800 rounded-lg" />
        <div className="h-8 bg-neutral-850 rounded-lg opacity-60" />
        <div className="h-8 bg-neutral-850 rounded-lg opacity-40" />
      </div>

      {/* Seção 1: Escolha de Serviços Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-neutral-800 rounded w-44" />
          <div className="h-3 bg-neutral-800/60 rounded w-24" />
        </div>
        <SkeletonCard variant="service" count={4} />
      </div>

      {/* Seção 2: Escolha de Barbeiros Skeleton */}
      <div className="space-y-3 pt-2">
        <div className="h-4 bg-neutral-800 rounded w-36" />
        <SkeletonCard variant="barber" count={3} />
      </div>
    </div>
  );
}
