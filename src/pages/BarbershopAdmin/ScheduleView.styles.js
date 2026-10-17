export const scheduleStyles = {
  // Container principal
  container: "w-full space-y-6 text-left select-none",

  // Card Previsão Atual (Dropdown Expansível com Big Numbers)
  headerCard:
    "p-3.5 sm:p-4 md:p-5 bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-xl transition-all duration-300",
  titleWrapper: "space-y-1 text-left",
  title:
    "text-base sm:text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2",
  subtitle: "text-xs text-neutral-400 leading-relaxed max-w-2xl",

  // Big Numbers da Previsão Atual
  bigNumbersGrid: "grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4",
  bigNumberCard:
    "p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-neutral-950/70 border border-neutral-800 flex flex-col justify-between transition-all duration-150 hover:border-neutral-700/80 shadow-xs",

  // Badges de Resumo
  statsGroup: "flex flex-wrap items-center gap-3",
  statBadge:
    "px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold font-mono",
  statAppointments: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  statRevenue: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
};
