export const subscriptionStyles = {
  // 1. VARIANTE COMPACTA (BADGE / PÍLULA)
  badgeBase:
    "inline-flex items-center gap-1.5 font-bold text-xs px-3 py-1 rounded-full border select-none transition-all duration-150 shadow-xs",

  // Status da Pílula
  statusBadge: {
    active: "bg-emerald-950/40 border-emerald-800/60 text-emerald-300",
    overdue: "bg-amber-950/40 border-amber-800/60 text-amber-300 animate-pulse",
    cancelled: "bg-neutral-900 border-neutral-800 text-neutral-400 opacity-60",
  },

  // 2. VARIANTE CARTÃO DETALHADO (CARD / WIDGET)
  cardContainer:
    "w-full max-w-sm p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between select-none text-left shadow-xl space-y-4",

  // Status do Cartão
  cardStatus: {
    active: "bg-neutral-900 border-emerald-500/40 shadow-emerald-950/20",
    overdue:
      "bg-neutral-900 border-amber-500/50 shadow-amber-950/30 ring-1 ring-amber-500/30",
    cancelled: "bg-neutral-950 border-neutral-800 opacity-60",
  },

  // Cabeçalho do Cartão (Plano + Tag de Status)
  cardHeader:
    "flex items-start justify-between gap-3 pb-3 border-b border-neutral-800",
  planName: "text-sm font-black text-neutral-100 flex items-center gap-1.5",
  planPrice: "text-[11px] text-neutral-400 font-mono mt-0.5",

  // Barra de Consumo de Franquia (2 de 4 cortes)
  quotaWrapper: "space-y-1.5",
  quotaTextRow: "flex justify-between items-center text-xs font-semibold",
  quotaBarBg:
    "w-full h-2 rounded-full bg-neutral-950 border border-neutral-800 overflow-hidden",
  quotaBarFill:
    "h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-500",

  // Notificação de Inadimplência
  overdueAlert:
    "p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2",

  // Rodapé do Cartão (Renovação e Ações)
  cardFooter:
    "flex items-center justify-between gap-2 pt-3 border-t border-neutral-800/80 text-[11px] text-neutral-400",
  renewalDate: "font-semibold text-neutral-300 font-mono",
};
