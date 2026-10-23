export const chartStyles = {
  // Container principal do gráfico
  container:
    "w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-5 md:p-6 text-left select-none space-y-6 shadow-2xl",

  // Cabeçalho (Título, Métricas Totais e Filtro de Período)
  header:
    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80",
  titleWrapper: "space-y-0.5",
  title: "text-base font-bold text-neutral-100 flex items-center gap-2",
  subtitle: "text-xs text-neutral-400",

  // Alternador de Período (Semana | Mês | Ano)
  periodToggle:
    "flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-semibold self-start sm:self-auto",
  periodBtn:
    "px-3 py-1.5 rounded-lg transition-all duration-150 cursor-pointer",
  periodActive: "bg-amber-600 text-white shadow-xs font-bold",
  periodInactive: "text-neutral-400 hover:text-white",

  // Resumo de Faturamento no Topo do Gráfico
  summaryRow: "flex flex-wrap items-center justify-between gap-4 pt-1",
  totalFaturadoBox: "flex flex-col text-left",
  totalLabel:
    "text-[10px] font-extrabold uppercase tracking-wider text-neutral-400",
  totalValue: "text-2xl font-black text-amber-500 font-mono tracking-tight",

  // Legenda de Cores (Serviços vs Produtos)
  legendWrapper: "flex items-center gap-4 text-xs font-semibold",
  legendItem: "flex items-center gap-1.5 text-neutral-300",
  legendDotServices: "w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs",
  legendDotProducts: "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs",

  // 2. ÁREA DAS BARRAS DO GRÁFICO (CHART CANVAS)
  chartArea:
    "relative h-64 w-full flex items-end justify-between gap-2 sm:gap-4 pt-8 pb-6 px-2 border-b border-neutral-800/80",

  // Linhas de Grade de Fundo (Background Grid Lines)
  gridLinesWrapper:
    "absolute inset-0 flex flex-col justify-between pointer-events-none pb-6 text-[10px] font-mono text-neutral-600",
  gridLine: "w-full border-b border-neutral-800/40 flex justify-between pr-2",

  // Coluna de Cada Barra (Bar Slot)
  barColumn:
    "relative flex-1 flex flex-col items-center justify-end h-full z-10 group cursor-pointer",

  // Barra Empilhada (Stacked Bar)
  stackedBar:
    "w-full max-w-[38px] rounded-t-xl overflow-hidden flex flex-col justify-end transition-all duration-300 group-hover:brightness-110 group-hover:scale-y-[1.02] origin-bottom shadow-lg",
  barServices: "bg-amber-500 w-full transition-all duration-500",
  barProducts: "bg-emerald-500 w-full transition-all duration-500",
  barClosed:
    "bg-neutral-800/40 border border-dashed border-neutral-700/50 w-full rounded-t-xl",

  // Rótulo Inferior do Eixo X (Seg, Ter, Qua...)
  xLabel:
    "absolute -bottom-6 text-[11px] font-bold text-neutral-400 group-hover:text-amber-400 transition-colors capitalize",

  // Tooltip Flutuante no Hover
  tooltip:
    "absolute bottom-full mb-2 hidden group-hover:flex flex-col p-2.5 bg-neutral-950 border border-neutral-700 rounded-xl shadow-2xl text-[11px] z-30 min-w-[130px] pointer-events-none animate-in fade-in zoom-in-95 duration-100",
};
