export const commissionStyles = {
  // Container principal do Card
  container:
    "w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl p-5 md:p-6 text-left select-none space-y-5 shadow-2xl transition-all duration-200",

  // Cabeçalho (Barbeiro, Foto, Período e Status da Folha)
  header:
    "flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-neutral-800",
  profileGroup: "flex items-center gap-3",
  avatar:
    "w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-500/40 text-amber-400 font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs",
  nameWrapper: "truncate",
  barberName: "text-sm font-bold text-neutral-100 truncate",
  periodLabel: "text-xs text-neutral-400 mt-0.5",

  // Status da Folha (Pendente vs Paga)
  statusBadge:
    "px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 border shadow-xs",
  statusPending:
    "bg-amber-950/40 text-amber-300 border-amber-800/60 animate-pulse",
  statusPaid: "bg-emerald-950/40 text-emerald-300 border-emerald-800/60",

  // Grade de Métricas Brutas do Barbeiro
  metricsRow:
    "grid grid-cols-2 gap-3 p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-2xl text-xs",
  metricBox: "flex flex-col text-left",
  metricLabel:
    "text-[10px] uppercase font-bold text-neutral-400 tracking-wider",
  metricValue: "text-sm font-black text-neutral-200 font-mono mt-0.5",

  // Extrato das Entradas e Deduções (Breakdown)
  breakdownList: "space-y-2 py-1",
  breakdownRow:
    "flex justify-between items-center text-xs text-neutral-300 py-1",
  rowLabel: "flex items-center gap-2",
  creditValue: "font-mono font-bold text-emerald-400",
  debitValue: "font-mono font-bold text-red-400",

  // Destaque do Saldo Líquido Final a Pagar
  netBox:
    "p-4 bg-amber-950/20 border border-amber-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-inner",
  netLabel: "flex flex-col",
  netTitle: "text-xs font-extrabold uppercase text-amber-400 tracking-wider",
  netSubtitle: "text-[10px] text-neutral-400",
  netAmount: "text-2xl font-black text-amber-400 font-mono tracking-tight",
  netAmountPaid:
    "text-2xl font-black text-emerald-400 font-mono tracking-tight",

  // Rodapé de Ações (Exportar e Quitar)
  footer:
    "flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-800",
};
