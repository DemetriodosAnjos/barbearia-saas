export const comandaStyles = {
  // Container principal da comanda
  container:
    "w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-6 text-left select-none space-y-5 shadow-2xl transition-all duration-200",

  // Cabeçalho (Número da Comanda, Cliente e Barbeiro)
  header:
    "flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-neutral-800",
  identityWrapper: "flex items-center gap-3",
  comandaBadge:
    "px-2.5 py-1 rounded-xl bg-amber-500 text-neutral-950 font-black text-xs shadow-xs tracking-wider",
  clientName: "text-sm font-bold text-neutral-100 flex items-center gap-2",
  barberMeta: "text-xs text-neutral-400 mt-0.5",

  // Status da Comanda (Aberta, Pendente, Paga)
  statusBadge:
    "px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 border shadow-xs",
  statusOpen: "bg-emerald-950/40 text-emerald-300 border-emerald-800/60",
  statusPending:
    "bg-amber-950/40 text-amber-300 border-amber-800/60 animate-pulse",
  statusPaid: "bg-neutral-800 text-neutral-300 border-neutral-700",

  // Seções de Itens (Serviços e Produtos)
  section: "space-y-2",
  sectionTitle:
    "text-[11px] font-extrabold text-neutral-400 uppercase tracking-wider flex items-center justify-between",

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

  // Resumo de Totais Financeiros
  summaryFooter: "pt-4 border-t border-neutral-800 space-y-3",
  totalRow: "flex justify-between items-baseline",
  totalLabel:
    "text-xs uppercase font-extrabold text-neutral-400 tracking-wider",
  totalValue: "text-2xl font-black text-amber-500 tracking-tight",

  // Ações da Comanda
  actionsRow: "flex flex-wrap items-center justify-end gap-3 pt-2",
};
