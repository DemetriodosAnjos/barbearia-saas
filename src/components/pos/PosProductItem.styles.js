export const posProductStyles = {
  // Container principal do Card de Produto
  container:
    "relative w-full p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between select-none text-left shadow-xs hover:shadow-md",

  // Estados: Normal, Baixo Estoque e Esgotado
  states: {
    available:
      "bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 cursor-pointer",
    lowStock:
      "bg-neutral-900/80 border-amber-800/60 hover:border-amber-600 hover:bg-neutral-900 cursor-pointer",
    outOfStock:
      "bg-neutral-950/40 border-neutral-900 opacity-40 cursor-not-allowed pointer-events-none",
  },

  // Cabeçalho (Ícone/Foto + Nome + Selos de Estoque)
  header: "flex items-start gap-3 mb-2.5",
  productIcon:
    "w-11 h-11 rounded-xl bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-xl shrink-0 shadow-xs",

  infoWrapper: "truncate flex-1",
  name: "text-sm font-bold text-neutral-100 truncate",
  categoryText: "text-[11px] text-neutral-400 capitalize mt-0.5",

  // Badges de Estoque
  badgesGroup: "flex items-center gap-1.5 shrink-0",
  outBadge:
    "text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-red-950/60 text-red-400 border border-red-800/60",
  lowBadge:
    "text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30",
  stockCount: "text-[10px] text-neutral-500 font-mono",

  // Seletor de Variações de Tamanho/Embalagem (50g vs 100g, etc.)
  variantsWrapper:
    "flex items-center gap-1.5 my-2 pt-2 border-t border-neutral-800/60",
  variantPill:
    "text-[10px] font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer",
  variantActive: "bg-amber-600 text-white shadow-xs font-extrabold",
  variantInactive:
    "bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800",

  // Rodapé (Preço, Comissão e Botão de Adição)
  footer:
    "flex items-center justify-between gap-3 mt-auto pt-2.5 border-t border-neutral-800/80",
  priceGroup: "flex flex-col text-left",
  priceText: "text-base font-black text-amber-500 tracking-tight",
  commissionBadge: "text-[10px] text-emerald-400 font-semibold",

  // Botão de Adicionar à Comanda
  addButton:
    "text-xs font-bold py-1.5 px-3 rounded-xl transition-all duration-150 flex items-center gap-1.5 cursor-pointer bg-neutral-800 hover:bg-amber-600 text-neutral-200 hover:text-white border border-neutral-700 hover:border-amber-600 active:scale-95 shadow-xs",
  counterBadge:
    "w-5 h-5 rounded-full bg-amber-500 text-black font-extrabold text-[10px] flex items-center justify-center -ml-1",
};
