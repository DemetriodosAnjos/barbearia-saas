import React from "react";

export default {
  title: "Design System/Overview/Tokens & Paleta",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Visão geral dos Design Tokens, hierarquia tipográfica e paletas cromáticas auditadas contra regressão visual.",
      },
    },
  },
};

export const PaletteTokens = {
  render: () => (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-2">
          Cores Primárias da Marca (Brand Amber)
        </h3>
        <div className="grid grid-cols-5 gap-3 font-mono text-xs text-neutral-300">
          <div className="p-3 rounded-lg bg-amber-400 text-neutral-950 font-bold">amber-400<br/>#fbbf24</div>
          <div className="p-3 rounded-lg bg-amber-500 text-neutral-950 font-bold">amber-500<br/>#f59e0b</div>
          <div className="p-3 rounded-lg bg-amber-600 text-white font-bold">amber-600<br/>#d97706</div>
          <div className="p-3 rounded-lg bg-amber-700 text-white font-bold">amber-700<br/>#b45309</div>
          <div className="p-3 rounded-lg bg-amber-950 text-amber-200 border border-amber-800">amber-950<br/>#451a03</div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-2">
          Superfícies Neutras & Modo Escuro (Dark Surfaces)
        </h3>
        <div className="grid grid-cols-5 gap-3 font-mono text-xs text-neutral-300">
          <div className="p-3 rounded-lg bg-neutral-950 text-neutral-400 border border-neutral-800">neutral-950 (Canvas)</div>
          <div className="p-3 rounded-lg bg-neutral-900 text-neutral-300 border border-neutral-800">neutral-900 (Cards)</div>
          <div className="p-3 rounded-lg bg-neutral-800 text-neutral-200">neutral-800 (Bordas)</div>
          <div className="p-3 rounded-lg bg-neutral-700 text-neutral-100">neutral-700 (Divisores)</div>
          <div className="p-3 rounded-lg bg-white text-neutral-950 font-bold">white (Texto Puro)</div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-2">
          Cores Semânticas de Status
        </h3>
        <div className="grid grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300">Sucesso (#10b981)</div>
          <div className="p-3 rounded-lg bg-amber-950 border border-amber-500/40 text-amber-300">Aviso (#f59e0b)</div>
          <div className="p-3 rounded-lg bg-rose-950 border border-rose-500/40 text-rose-300">Erro (#f43f5e)</div>
          <div className="p-3 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300">Info (#06b6d4)</div>
        </div>
      </div>
    </div>
  ),
};
