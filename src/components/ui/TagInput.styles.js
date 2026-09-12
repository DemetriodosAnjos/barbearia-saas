export const tagInputStyles = {
  container: "w-full flex flex-col gap-3 text-left select-none",

  labelWrapper: "flex justify-between items-baseline",
  label: "text-sm font-medium text-neutral-300",
  counterText: "text-xs text-neutral-500 font-mono",

  // 1. O Campo de Entrada Limpo e Espaçoso
  input:
    "w-full px-4 py-2.5 rounded-xl text-xs bg-neutral-950 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all",

  // 2. Banco de Sugestões Rápidas (Meio)
  suggestionsSection: "space-y-1.5",
  suggestionsHeader:
    "text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5",
  suggestionsList: "flex flex-wrap items-center gap-1.5",
  suggestionBtn:
    "text-[10px] font-bold px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 border border-neutral-800 transition-all cursor-pointer flex items-center gap-1 active:scale-95",

  // 3. Área de Tags Ativas (Embaixo)
  activeSection:
    "p-4 bg-neutral-950/70 border border-neutral-800/80 rounded-2xl space-y-2.5 mt-1",
  activeHeader:
    "flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider",
  tagsGrid: "flex flex-wrap items-center gap-2 min-h-[32px]",

  // Tag Ativa
  tag: "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-xs transition-all animate-in fade-in zoom-in-95 duration-150",
  removeBtn:
    "text-amber-400/80 hover:text-red-400 p-0.5 rounded-md transition-colors cursor-pointer text-xs font-black",

  emptyState: "text-xs text-neutral-500 italic py-1",
};
