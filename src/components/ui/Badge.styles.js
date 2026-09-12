export const badgeStyles = {
  // Base compartilhada de todos os badges
  base: "inline-flex items-center gap-1.5 font-semibold transition-all duration-150 select-none text-left",

  // Tamanhos
  sizes: {
    sm: "px-2 py-0.5 text-[10px] rounded-md",
    md: "px-2.5 py-1 text-xs rounded-lg",
    lg: "px-3 py-1.5 text-sm rounded-xl",
  },

  // Interatividade (quando o barbeiro/recepção pode clicar para mudar o status)
  interactive:
    "cursor-pointer hover:scale-105 active:scale-95 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500/40",

  // 1. VARIANTE SUBTLE (Fundo suave + Borda translúcida)
  subtle: {
    waiting: "bg-amber-950/40 text-amber-300 border border-amber-800/60",
    confirmed: "bg-sky-950/40 text-sky-300 border border-sky-800/60",
    in_progress: "bg-purple-950/40 text-purple-300 border border-purple-800/60",
    completed:
      "bg-emerald-950/40 text-emerald-300 border border-emerald-800/60",
    cancelled: "bg-neutral-800/70 text-neutral-400 border border-neutral-700",
    no_show: "bg-red-950/40 text-red-300 border border-red-800/60",
  },

  // 2. VARIANTE SOLID (Cor cheia de alto impacto)
  solid: {
    waiting: "bg-amber-600 text-white shadow-xs shadow-amber-950/50",
    confirmed: "bg-sky-600 text-white shadow-xs shadow-sky-950/50",
    in_progress: "bg-purple-600 text-white shadow-xs shadow-purple-950/50",
    completed: "bg-emerald-600 text-white shadow-xs shadow-emerald-950/50",
    cancelled: "bg-neutral-700 text-neutral-200",
    no_show: "bg-red-600 text-white shadow-xs shadow-red-950/50",
  },

  // 3. VARIANTE OUTLINE (Apenas contorno e texto)
  outline: {
    waiting: "bg-transparent text-amber-400 border border-amber-500/70",
    confirmed: "bg-transparent text-sky-400 border border-sky-500/70",
    in_progress: "bg-transparent text-purple-400 border border-purple-500/70",
    completed: "bg-transparent text-emerald-400 border border-emerald-500/70",
    cancelled: "bg-transparent text-neutral-400 border border-neutral-600",
    no_show: "bg-transparent text-red-400 border border-red-500/70",
  },

  // Ponto pulsante de atraso (Delay indicator)
  delayDot: "w-2 h-2 rounded-full bg-red-500 animate-ping mr-0.5",

  // Dropdown de Transição de Status
  dropdownMenu:
    "absolute left-0 top-full mt-1.5 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100",
  dropdownItem:
    "w-full px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-800 transition-colors flex items-center gap-2 cursor-pointer",
};
