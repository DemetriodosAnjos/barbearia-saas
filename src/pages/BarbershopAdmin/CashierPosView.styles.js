export const posStyles = {
  // Container principal
  container: "w-full max-w-7xl mx-auto space-y-6 text-left select-none",

  // 1. Cabeçalho Principal do Caixa
  headerCard:
    "p-5 md:p-6 bg-neutral-900 border border-neutral-800 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl",
  headerInfo: "space-y-1 text-left",
  title:
    "text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2",
  subtitle: "text-xs text-neutral-400 leading-relaxed",

  // 2. Barra de Controle de Data do Caixa
  dateControlBar:
    "p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md",
  dateNavGroup: "flex items-center gap-1.5",
  dateButton:
    "px-3 py-1.5 text-xs font-bold rounded-xl border border-neutral-700 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer",
  dateActiveButton:
    "px-3 py-1.5 text-xs font-bold rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-300 transition-colors cursor-pointer",
  datePickerInput:
    "bg-neutral-950 border border-neutral-700 text-xs font-mono font-bold text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer",

  // 3. Grid dos 3 Cartões de Previsão Financeira (KPIs)
  kpiGrid: "grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4",
  kpiCard:
    "p-4 md:p-5 rounded-2xl border transition-all shadow-md relative overflow-hidden flex flex-col justify-between",
  kpiCardForecast:
    "bg-neutral-900/90 border-neutral-800 hover:border-neutral-700",
  kpiCardReceived:
    "bg-emerald-950/20 border-emerald-800/40 hover:border-emerald-700/60",
  kpiCardPending:
    "bg-amber-950/20 border-amber-800/40 hover:border-amber-700/60",

  kpiCardHeader: "flex items-center justify-between gap-2 pb-1.5",
  kpiCardLabel: "text-[11px] font-bold uppercase tracking-wider text-neutral-400",
  kpiCardValue: "text-2xl sm:text-3xl font-black font-mono tracking-tight",
  kpiCardSubtext: "text-xs text-neutral-400 font-medium flex items-center gap-1.5 pt-1",

  // 4. Layout das Comandas em Coluna (Linha por Linha, semelhante ao Superadmin)
  gridContent: "space-y-8 w-full",

  // Lista Principal de Comandas (Disposição em Coluna, uma abaixo da outra)
  comandasColumn: "w-full space-y-3",
  comandasHeader:
    "flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800",
  sectionTitle:
    "text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2",

  // Seção de Lançamento Rápido de Bar e Fila de Espera abaixo das comandas
  sidebarColumn: "grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-800/80 w-full",
  quickBox:
    "p-5 bg-neutral-900/90 border border-neutral-800 rounded-3xl space-y-4 shadow-xl",
  quickHeader:
    "flex items-center justify-between pb-3 border-b border-neutral-800",
};
