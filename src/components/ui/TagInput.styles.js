export const tagInputStyles = {
  container: "w-full flex flex-col gap-3 text-left select-none",

  labelWrapper: "flex justify-between items-baseline",
  label: "text-sm font-medium text-[#18181B] dark:text-neutral-300",
  counterText: "text-xs text-[#18181B] dark:text-neutral-500 font-mono",

  // 1. O Campo de Entrada Limpo e Espaçoso
  input:
    "w-full px-4 py-2.5 rounded-xl text-xs bg-white border border-zinc-300 text-[#18181B] placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-amber-500 dark:focus:ring-amber-500/20 transition-all",

  // 2. Banco de Sugestões Rápidas (Meio)
  suggestionsSection: "space-y-1.5",
  suggestionsHeader:
    "text-[11px] font-semibold text-[#18181B] dark:text-neutral-400 flex items-center gap-1.5",
  suggestionsList: "flex flex-wrap items-center gap-1.5",
  suggestionBtn:
    "text-[10px] font-bold px-2.5 py-1 rounded-lg bg-transparent hover:bg-transparent text-[#171719] hover:text-[#059669] border border-[#171719] hover:border-[#059669] dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:hover:text-amber-400 dark:border-neutral-800 transition-all cursor-pointer flex items-center gap-1 active:scale-95",

  // 3. Área de Tags Ativas (Embaixo)
  activeSection:
    "p-4 bg-transparent border border-zinc-200 dark:bg-neutral-950/70 dark:border-neutral-800/80 rounded-2xl space-y-2.5 mt-1",
  activeHeader:
    "flex items-center justify-between text-xs font-bold uppercase tracking-wider",
  tagsGrid: "flex flex-wrap items-center gap-2 min-h-[32px]",

  // Tag Ativa (Fundo #ECFDF5, Texto #059669)
  tag:
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#ECFDF5] text-[#059669] border border-emerald-200/80 dark:bg-amber-500/10 dark:border-amber-500/40 dark:text-amber-300 text-xs font-bold shadow-xs transition-all animate-in fade-in zoom-in-95 duration-150",
  // Botão remover com Ícone X em #ffffff (Branco) no light e âmbar no dark
  removeBtn:
    "bg-[#059669] hover:bg-[#047857] text-white dark:bg-transparent dark:text-amber-400/80 dark:hover:text-red-400 w-4 h-4 rounded-full flex items-center justify-center p-0.5 transition-colors cursor-pointer shrink-0 text-xs font-black",

  emptyState: "text-xs text-[#18181B] dark:text-neutral-500 italic py-1",
};
