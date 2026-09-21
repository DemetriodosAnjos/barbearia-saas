export const posStyles = {
  // Container principal
  container: "w-full max-w-7xl mx-auto space-y-6 text-left select-none",

  // 1. Cabeçalho com Métricas do Caixa do Dia
  headerCard:
    "p-5 md:p-6 bg-neutral-900 border border-neutral-800 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl",
  headerInfo: "space-y-1 text-left",
  title:
    "text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2",
  subtitle: "text-xs text-neutral-400 leading-relaxed",

  // KPIs Rápidos do Caixa
  kpiGroup: "flex flex-wrap items-center gap-3",
  kpiBadge:
    "px-3.5 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold font-mono shadow-xs",
  kpiRevenue: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  kpiOpen: "bg-amber-500/10 border-amber-500/30 text-amber-400",

  // 2. Layout Central em 2 Colunas (Comandas à Esquerda + PDV Bar/Fila à Direita)
  gridContent: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start",

  // Coluna Principal de Comandas (7 colunas)
  comandasColumn: "lg:col-span-7 space-y-4",
  comandasHeader:
    "flex items-center justify-between pb-2 border-b border-neutral-800",
  sectionTitle:
    "text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2",

  // Coluna Lateral de Lançamento Rápido de Bar e Fila (5 colunas)
  sidebarColumn: "lg:col-span-5 space-y-5",
  quickBox:
    "p-5 bg-neutral-900/90 border border-neutral-800 rounded-3xl space-y-4 shadow-xl",
  quickHeader:
    "flex items-center justify-between pb-3 border-b border-neutral-800",
};
