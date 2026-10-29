export const comandaStyles = {
  // Container principal da comanda (Estilo card/linha individual do cliente)
  container:
    "w-full bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 md:p-5 text-left select-none shadow-md transition-all duration-200 hover:border-neutral-700 hover:bg-neutral-900 space-y-3",

  // Linha visível: Grid idêntico ao card de títulos no desktop, flex no mobile
  rowVisible:
    "flex flex-col xl:grid xl:grid-cols-[1fr_210px_150px_180px_210px] gap-4 items-start xl:items-center w-full",

  // 1. Nome do Cliente (Alinhado à esquerda)
  clientColumn: "flex flex-col justify-center min-w-0 text-left w-full",
  clientInfo: "flex flex-col min-w-0",
  clientName:
    "text-sm font-bold text-white tracking-tight truncate",
  clientPhone: "text-[11px] text-neutral-400 font-normal truncate mt-0.5",

  // 2. Profissional Responsável (Alinhado à esquerda)
  barberColumn: "flex flex-col justify-center min-w-0 text-left w-full",
  barberLabel:
    "text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1 xl:hidden mb-0.5",
  barberName: "text-xs font-semibold text-neutral-200 truncate",
  barberMeta: "text-[10px] text-neutral-500 mt-0.5",

  // 3. Total dos Serviços (Centralizado)
  priceColumn: "flex flex-col items-start xl:items-center justify-center text-left xl:text-center w-full",
  priceLabel:
    "text-[10px] font-bold uppercase tracking-wider text-neutral-400 xl:hidden mb-0.5",
  priceValue: "text-sm font-black font-mono text-emerald-400 tracking-tight",
  priceSub: "text-[10px] text-neutral-500 font-mono mt-0.5",

  // 4. Status (Centralizado)
  statusColumn:
    "flex items-center justify-start xl:justify-center w-full",
  statusWrapper:
    "flex items-center gap-2 bg-neutral-950/80 px-2.5 py-1.5 rounded-xl border border-neutral-800 w-full max-w-[176px]",
  statusDot: "w-2.5 h-2.5 rounded-full shrink-0",
  statusSelect:
    "bg-neutral-900 border border-neutral-700 hover:border-amber-500/50 text-xs font-bold text-amber-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer transition-colors w-full text-center",

  // 5. Ações (Centralizado com os botões de ação e chevron)
  actionsGroup:
    "flex items-center justify-start xl:justify-center gap-1.5 w-full flex-wrap xl:flex-nowrap",

  // Tooltip container e popup
  actionTooltipWrapper: "relative group/tooltip inline-flex",
  actionTooltip:
    "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:flex items-center px-2.5 py-1 rounded-lg bg-neutral-950 text-white text-[11px] font-semibold whitespace-nowrap border border-neutral-700 shadow-2xl pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-150",
  actionTooltipRight:
    "absolute bottom-full right-0 mb-2 hidden group-hover/tooltip:flex items-center px-2.5 py-1 rounded-lg bg-neutral-950 text-white text-[11px] font-semibold whitespace-nowrap border border-neutral-700 shadow-2xl pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-150",
  actionTooltipArrow:
    "absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-neutral-700",
  actionTooltipArrowRight:
    "absolute top-full right-3 -mt-[1px] border-4 border-transparent border-t-neutral-700",

  // Botões de Ação apenas Ícones (com efeito hover e feedback tátil)
  btnPix:
    "p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:text-amber-300 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center shrink-0",

  btnCashier:
    "p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center shrink-0",

  btnAddItem:
    "p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center shrink-0",

  btnEdit:
    "p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center shrink-0",

  // Botão de Expansão (Chevron Down / Up) na Extrema Direita
  expandBtn:
    "p-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 transition-colors cursor-pointer flex items-center justify-center shrink-0",

  // ========================================================
  // CORPO EXPANDIDO (DETALHES REVELADOS PELO CHEVRON)
  // ========================================================
  expandedBody:
    "pt-4 mt-2 border-t border-neutral-800/80 space-y-4 transition-all duration-300",

  // Seções de Itens (Serviços e Produtos)
  section: "space-y-2",
  sectionTitle:
    "text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-neutral-800/60",

  // Linha de cada Item
  itemRow:
    "p-2.5 bg-neutral-950/70 border border-neutral-800/70 rounded-xl flex items-center justify-between gap-3 hover:border-neutral-700 transition-colors text-xs",
  itemName: "font-semibold text-neutral-200",
  itemCommission: "text-[10px] text-emerald-400/90 font-mono",
  itemPrice: "font-bold text-neutral-100 font-mono",
  itemDeleteBtn:
    "text-neutral-500 hover:text-red-400 p-1 rounded-md transition-colors cursor-pointer",

  // Rateio de Comissões (Transparência Financeira)
  commissionBox:
    "p-3.5 bg-neutral-950 border border-neutral-800/80 rounded-xl space-y-2 text-xs",
  commissionRow: "flex justify-between items-center text-neutral-400",
  commissionBarber: "text-amber-400 font-bold font-mono",
  commissionHouse: "text-neutral-200 font-bold font-mono",
};
