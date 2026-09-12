export const tabsStyles = {
  // Contêiner com rolagem horizontal suave no celular (sem barra de rolagem feia)
  scrollContainer:
    "w-full overflow-x-auto scrollbar-none select-none text-left",

  // Variantes do Wrapper da Lista de Abas
  listWrapper: {
    line: "flex items-center gap-6 border-b border-neutral-800 min-w-max",
    pill: "inline-flex items-center gap-1.5 p-1 bg-neutral-950 border border-neutral-800/80 rounded-xl min-w-max",
  },

  // Botão da Aba - Variante 'line'
  tabLine: {
    base: "flex items-center gap-2 pb-3 px-1 text-sm font-medium transition-all duration-150 border-b-2 cursor-pointer focus:outline-none",
    active: "border-amber-500 text-amber-400 font-bold",
    inactive:
      "border-transparent text-neutral-400 hover:text-neutral-200 hover:border-neutral-700",
  },

  // Botão da Aba - Variante 'pill'
  tabPill: {
    base: "flex items-center gap-2 py-1.5 px-3.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer focus:outline-none",
    active: "bg-amber-600 text-white font-bold shadow-xs",
    inactive: "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60",
  },

  // Ícone da Aba
  icon: "shrink-0 text-base leading-none",

  // Badges / Selos Numéricos (ex: contagem de agendamentos)
  badge: {
    base: "px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-colors",
    activeLine: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    inactiveLine: "bg-neutral-800 text-neutral-400",
    activePill: "bg-black/30 text-white",
    inactivePill: "bg-neutral-800 text-neutral-400",
  },
};
