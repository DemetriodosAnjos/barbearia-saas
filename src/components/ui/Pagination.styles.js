export const paginationStyles = {
  // Container principal flexível e responsivo
  container:
    "w-full flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 text-xs select-none text-left",

  // Lado Esquerdo: Resumo do Escopo e Seletor de Limite
  infoSection: "flex flex-wrap items-center gap-3 text-neutral-400 font-medium",
  strongText: "text-neutral-100 font-semibold",

  // Seletor de registros por página (pageSize)
  pageSizeWrapper: "flex items-center gap-1.5",
  pageSizeSelect:
    "bg-neutral-900 hover:bg-neutral-800 text-neutral-200 py-1 px-2 rounded-lg border border-neutral-700/80 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer transition-colors",

  // Lado Direito: Controles e Botões Numéricos
  controlsWrapper: "flex items-center gap-1",

  // Botões de Ação (< Anterior, Próxima >, << Primeira, >> Última)
  navButton:
    "h-8 px-2.5 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300 font-medium hover:bg-neutral-800 hover:text-white transition-all duration-150 flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-neutral-900 disabled:hover:text-neutral-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500",

  // Botões Numéricos de Página
  pageNumbersWrapper: "hidden md:flex items-center gap-1",
  pageButton:
    "w-8 h-8 rounded-lg font-medium transition-all duration-150 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500",
  pageActive: "bg-amber-600 text-white font-bold shadow-md shadow-amber-950/50",
  pageInactive:
    "border border-neutral-800/80 bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white",

  // Indicador de Elipse (...)
  ellipsis:
    "w-8 h-8 flex items-center justify-center text-neutral-500 font-bold select-none",
};
