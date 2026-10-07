import React from "react";
import SkeletonCard from "./SkeletonCard";

/**
 * SkeletonDashboard Component
 *
 * Exibido durante o carregamento de painéis administrativos e dados analíticos
 * em conexões de alta latência (>1200ms) ou durante oscilações de rede.
 */
export default function SkeletonDashboard({ latencyNotice = false }) {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-pulse">
      {/* Aviso de Latência */}
      {latencyNotice && (
        <div className="p-3 bg-neutral-900 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>Sincronizando métricas do painel em modo resiliente...</span>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">Latência Alta</span>
        </div>
      )}

      {/* Topo do Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-neutral-900/80 border border-neutral-800 rounded-2xl">
        <div className="space-y-2">
          <div className="h-6 bg-neutral-800 rounded-lg w-56" />
          <div className="h-3.5 bg-neutral-800/60 rounded w-80" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 bg-neutral-800 rounded-xl w-28" />
          <div className="h-9 bg-neutral-800/80 rounded-xl w-32" />
        </div>
      </div>

      {/* Grid de Métricas Principais (Big Numbers) */}
      <SkeletonCard variant="metric" count={4} />

      {/* Grid de Conteúdo: Gráficos e Agendamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 bg-neutral-900/80 border border-neutral-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-neutral-800 rounded w-44" />
            <div className="h-3 bg-neutral-800/60 rounded w-20" />
          </div>
          <div className="h-64 bg-neutral-800/40 rounded-xl" />
        </div>

        <div className="p-5 bg-neutral-900/80 border border-neutral-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-neutral-800 rounded w-36" />
            <div className="h-3 bg-neutral-800/60 rounded w-16" />
          </div>
          <SkeletonCard variant="appointment" count={3} />
        </div>
      </div>
    </div>
  );
}
