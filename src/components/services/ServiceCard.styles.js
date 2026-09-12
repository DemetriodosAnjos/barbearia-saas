export const serviceCardStyles = {
  // Container principal do Card
  container:
    "relative w-full p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between select-none text-left cursor-pointer shadow-xs hover:shadow-md",

  // Estados: Normal vs Selecionado
  states: {
    default:
      "bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900",
    selected:
      "bg-amber-950/20 border-amber-500 shadow-md shadow-amber-950/40 ring-1 ring-amber-500/40",
    disabled:
      "opacity-40 bg-neutral-950/50 border-neutral-900 cursor-not-allowed pointer-events-none",
  },

  // Cabeçalho do Card (Categoria e Badges de Destaque)
  header: "flex items-center justify-between gap-2 mb-2",
  categoryBadge:
    "text-[10px] font-bold uppercase tracking-wider text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded-md border border-neutral-700/60",
  promoBadge:
    "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500 text-black shadow-xs",

  // Título e Descrição
  title:
    "text-sm font-bold text-neutral-100 group-hover:text-amber-400 transition-colors",
  description: "text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed",

  // Rodapé (Preço, Duração e Ação)
  footer:
    "flex items-center justify-between mt-4 pt-3 border-t border-neutral-800/80 gap-3",

  // Metadados (Duração com ícone)
  metaGroup: "flex items-center gap-2 text-xs text-neutral-300 font-medium",
  durationIcon: "text-neutral-500 text-xs",

  // Preço em Reais
  priceText: "text-base font-extrabold text-amber-500 tracking-tight",

  // Botão de Seleção
  selectButton:
    "text-xs font-bold py-1.5 px-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 cursor-pointer",
  btnDefault:
    "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700",
  btnSelected:
    "bg-amber-600 hover:bg-amber-500 text-white shadow-xs shadow-amber-950/60",
};
