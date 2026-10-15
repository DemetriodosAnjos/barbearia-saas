export const tagInputStyles = {
  container: "w-full flex flex-col gap-3 text-left select-none",

  labelWrapper: "flex justify-between items-baseline",
  label: "text-sm font-medium text-zinc-700 dark:text-neutral-300",
  counterText: "text-xs text-zinc-500 dark:text-neutral-500 font-mono",

  // 1. O Campo de Entrada Limpo e Espaçoso
  input:
    "w-full px-4 py-2.5 rounded-xl text-xs bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:bg-neutral-950 dark:border-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-amber-500 dark:focus:ring-amber-500/20 transition-all",

  // 2. Banco de Sugestões Rápidas (Meio)
  suggestionsSection: "space-y-1.5",
  suggestionsHeader:
    "text-[11px] font-semibold text-zinc-600 dark:text-neutral-400 flex items-center gap-1.5",
  suggestionsList: "flex flex-wrap items-center gap-1.5",
  suggestionBtn:
    "text-[10px] font-bold px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-emerald-700 border border-zinc-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:hover:text-amber-400 dark:border-neutral-800 transition-all cursor-pointer flex items-center gap-1 active:scale-95",

  // 3. Área de Tags Ativas (Embaixo)
  activeSection:
    "p-4 bg-zinc-50 border border-zinc-200 dark:bg-neutral-950/70 dark:border-neutral-800/80 rounded-2xl space-y-2.5 mt-1",
  activeHeader:
    "flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-amber-400 uppercase tracking-wider",
  tagsGrid: "flex flex-wrap items-center gap-2 min-h-[32px]",

  // Tag Ativa (Paleta 3: bg-zinc-100 text-zinc-800 border border-zinc-200)
  tag: "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-amber-500/10 dark:border-amber-500/40 dark:text-amber-300 text-xs font-bold shadow-xs transition-all animate-in fade-in zoom-in-95 duration-150",
  removeBtn:
    "text-zinc-500 hover:text-red-500 dark:text-amber-400/80 dark:hover:text-red-400 p-0.5 rounded-md transition-colors cursor-pointer text-xs font-black",

  emptyState: "text-xs text-zinc-500 dark:text-neutral-500 italic py-1",
};
