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
    "cursor-pointer hover:scale-105 active:scale-95 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:focus:ring-amber-500/40",

  // 1. VARIANTE SUBTLE (Paleta 3: bg-emerald-50 text-emerald-700 border-emerald-200 no light mode, dark mode preservado)
  subtle: {
    waiting:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    confirmed:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    in_progress:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
    completed:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    cancelled:
      "bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-neutral-800/70 dark:text-neutral-400 dark:border-neutral-700",
    no_show:
      "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60",
  },

  // 2. VARIANTE SOLID (Cor cheia de alto impacto)
  solid: {
    waiting:
      "bg-emerald-600 text-white shadow-xs dark:bg-amber-600 dark:shadow-amber-950/50",
    confirmed:
      "bg-emerald-600 text-white shadow-xs dark:bg-emerald-600 dark:shadow-emerald-950/50",
    in_progress:
      "bg-emerald-700 text-white shadow-xs dark:bg-purple-600 dark:shadow-purple-950/50",
    completed:
      "bg-emerald-600 text-white shadow-xs dark:bg-emerald-600 dark:shadow-emerald-950/50",
    cancelled:
      "bg-zinc-200 text-zinc-700 dark:bg-neutral-700 dark:text-neutral-200",
    no_show:
      "bg-rose-600 text-white shadow-xs dark:bg-red-600 dark:shadow-red-950/50",
  },

  // 3. VARIANTE OUTLINE (Apenas contorno e texto)
  outline: {
    waiting:
      "bg-transparent text-emerald-700 border border-emerald-300 dark:text-amber-400 dark:border-amber-500/70",
    confirmed:
      "bg-transparent text-emerald-700 border border-emerald-300 dark:text-emerald-400 dark:border-emerald-500/70",
    in_progress:
      "bg-transparent text-emerald-700 border border-emerald-300 dark:text-purple-400 dark:border-purple-500/70",
    completed:
      "bg-transparent text-emerald-700 border border-emerald-300 dark:text-emerald-400 dark:border-emerald-500/70",
    cancelled:
      "bg-transparent text-zinc-500 border border-zinc-300 dark:text-neutral-400 dark:border-neutral-600",
    no_show:
      "bg-transparent text-rose-600 border border-rose-300 dark:text-red-400 dark:border-red-500/70",
  },

  // Ponto pulsante de atraso (Delay indicator)
  delayDot: "w-2 h-2 rounded-full bg-red-500 animate-ping mr-0.5",

  // Dropdown de Transição de Status
  dropdownMenu:
    "absolute left-0 top-full mt-1.5 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100",
  dropdownItem:
    "w-full px-3 py-2 text-xs font-medium text-neutral-200 hover:bg-neutral-800 transition-colors flex items-center gap-2 cursor-pointer",
};
