export const searchInputStyles = {
  container: "relative w-full flex items-center text-left",

  // Ícone de Lupa à esquerda
  searchIcon:
    "absolute left-3.5 pointer-events-none text-neutral-400 transition-colors duration-150 flex items-center justify-center",

  // O campo de entrada com espaçamento calibrado para os ícones
  input:
    "w-full pl-10 pr-20 py-2.5 rounded-xl text-sm transition-all duration-200 bg-neutral-900 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed",

  // Ações à direita (Botão Limpar ou Atalho)
  actionsWrapper: "absolute right-3 flex items-center gap-1.5",

  // Botão de Limpar ("X")
  clearButton:
    "text-neutral-400 hover:text-neutral-100 p-1 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer",

  // Selo de atalho de teclado (ex: Ctrl + K)
  shortcutBadge:
    "hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400 bg-neutral-800 border border-neutral-700 rounded-md select-none pointer-events-none",

  // Spinner de busca ativa
  spinner: "animate-spin h-4 w-4 text-amber-500",
};
