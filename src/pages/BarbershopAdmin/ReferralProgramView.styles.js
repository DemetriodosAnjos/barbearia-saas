export const referralStyles = {
  // Container principal
  container: "w-full max-w-5xl mx-auto space-y-6 text-left select-none",

  // 1. Banner Hero de Apresentação (Visual de Gamificação / Ouro)
  heroCard:
    "p-6 md:p-8 rounded-3xl bg-gradient-to-br from-amber-950/40 via-neutral-900 to-neutral-950 border border-amber-500/40 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden",
  heroInfo: "space-y-2 max-w-xl text-left z-10",
  heroBadge:
    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-500 text-neutral-950 shadow-md tracking-wider",
  heroTitle:
    "text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight",
  heroSubtitle: "text-xs text-neutral-300 leading-relaxed",

  // 2. Card de Compartilhamento do Link
  shareCard:
    "p-5 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-3 shadow-xl text-left",
  shareTitle:
    "text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5",
  linkBox:
    "flex flex-col sm:flex-row items-center gap-2 p-2 bg-neutral-950 border border-neutral-800 rounded-2xl",
  linkInput:
    "bg-transparent text-xs font-mono font-bold text-amber-400 px-3 py-2 w-full outline-none truncate",

  // 3. Grade de Métricas de Indicação
  metricsGrid: "grid grid-cols-2 sm:grid-cols-4 gap-3",
  metricCard:
    "p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col text-left space-y-1 shadow-md",
  metricLabel:
    "text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider",
  metricValue: "text-xl font-black text-white font-mono",
  metricValueGold: "text-xl font-black text-amber-400 font-mono",

  // 4. Lista dos Amigos Indicados (Esteira de Progresso)
  referredSection:
    "p-6 bg-neutral-900/90 border border-neutral-800 rounded-3xl space-y-5 shadow-xl text-left",
  sectionHeader:
    "flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3",
  sectionTitle: "text-base font-bold text-white flex items-center gap-2",

  // Card individual de cada barbearia indicada
  referredCard:
    "p-4 bg-neutral-950/80 border border-neutral-800 rounded-2xl space-y-4 hover:border-neutral-700 transition-all",
  referredHeader: "flex flex-wrap items-center justify-between gap-2",
  barberMeta: "flex items-center gap-3",
  barberIcon:
    "w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-lg shrink-0",

  // Passos da Esteira de Pagamento (Stepper)
  stepperGrid:
    "grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-800/60 text-center",
  stepBox:
    "p-2 rounded-xl border flex flex-col items-center justify-center gap-1 text-[11px] font-bold transition-all",
  stepCompleted: "bg-emerald-950/30 border-emerald-800/60 text-emerald-300",
  stepActive:
    "bg-amber-950/30 border-amber-500/60 text-amber-300 animate-pulse",
  stepPending: "bg-neutral-900/40 border-neutral-800 text-neutral-600",

  // Card do Cupom Pronto para Resgate
  rewardReadyBox:
    "p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs",
};
