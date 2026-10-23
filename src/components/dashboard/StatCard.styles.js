export const statCardStyles = {
  // Container principal do Card de KPI
  container:
    "relative w-full p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between select-none text-left shadow-xs hover:shadow-md bg-neutral-900/80 border-neutral-800 hover:border-neutral-700",

  // Cabeçalho (Título da Métrica e Ícone)
  header: "flex items-start justify-between gap-3 mb-3",
  titleWrapper: "flex items-center gap-2",
  title: "text-xs font-bold uppercase tracking-wider text-neutral-400",

  // Ícone com fundo arredondado
  iconWrapper:
    "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-xs",
  iconThemes: {
    gold: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    blue: "bg-sky-500/10 text-sky-400 border border-sky-500/20",
    purple: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
  },

  // Valor Principal em Destaque
  valueText:
    "text-2xl sm:text-3xl font-black text-neutral-100 font-mono tracking-tight",
  maskedText:
    "text-2xl font-black text-neutral-600 tracking-widest select-none",

  // Rodapé (Variação Percentual Delta e Texto de Comparação)
  footer:
    "flex items-center gap-2 mt-4 pt-3 border-t border-neutral-800/80 text-xs",

  // Badge de Variação (Delta %)
  deltaBadge:
    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-extrabold text-[11px] font-mono",
  deltaPositive:
    "bg-emerald-950/50 text-emerald-400 border border-emerald-800/60",
  deltaNegative: "bg-red-950/50 text-red-400 border border-red-800/60",
  deltaNeutral: "bg-neutral-800 text-neutral-400 border border-neutral-700",

  comparisonText: "text-neutral-500 text-[11px] truncate",
};
