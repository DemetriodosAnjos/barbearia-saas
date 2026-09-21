export const financialStyles = {
  // Container principal
  container: "w-full max-w-7xl mx-auto space-y-6 text-left select-none",

  // Cabeçalho da Página
  headerCard:
    "p-6 bg-neutral-900 border border-neutral-800 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl",
  titleWrapper: "space-y-1 text-left",
  title:
    "text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2",
  subtitle: "text-xs text-neutral-400 leading-relaxed",

  // Controles do Cabeçalho (Filtro de Data + Privacidade + Exportar)
  controlsRow: "flex flex-wrap items-center gap-3 w-full md:w-auto justify-end",
  periodSelect:
    "bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer font-semibold",

  // 1. GRADE DOS 5 BIG NUMBERS (RESPONSIVA: 1 col mobile, 2 sm, 5 desktop)
  kpiGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4",

  // 2. SEÇÃO DE FECHAMENTO DE COMISSÕES DA EQUIPE
  commissionSection:
    "p-6 bg-neutral-900 border border-neutral-800 rounded-3xl space-y-4 shadow-xl text-left",
  sectionHeader:
    "flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800",
  sectionTitle:
    "text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2",
  barbersGrid: "grid grid-cols-1 md:grid-cols-3 gap-4",
};
