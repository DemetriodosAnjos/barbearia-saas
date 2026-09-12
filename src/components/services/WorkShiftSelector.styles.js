export const workShiftStyles = {
  container:
    "w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-5 md:p-6 text-left select-none space-y-6 shadow-2xl",

  // Cabeçalho da Escala
  header:
    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-800/80",
  titleWrapper: "space-y-1",
  title: "text-base font-bold text-neutral-100 flex items-center gap-2",
  subtitle: "text-xs text-neutral-400",
  weeklyHoursBadge:
    "text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5 shrink-0",

  // 1. CARD DE CONFIGURAÇÃO RÁPIDA EM LOTE (BULK SETUP)
  bulkCard:
    "p-4 md:p-5 bg-neutral-900/90 border border-amber-500/30 rounded-2xl space-y-4 shadow-lg shadow-black/40",
  bulkHeader:
    "flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-800",
  bulkTitle:
    "text-xs font-extrabold text-amber-400 flex items-center gap-2 uppercase tracking-wider",
  bulkSubtitle: "text-[11px] text-neutral-400",

  // Checkboxes de Destino (Dias Úteis, Sábado, Domingo)
  targetCheckboxGroup:
    "flex flex-wrap items-center gap-4 text-xs font-medium text-neutral-200",
  checkboxItem:
    "flex items-center gap-2 cursor-pointer hover:text-white transition-colors",

  // Linha de Inputs e Botão do Lote
  bulkInputsRow: "flex flex-wrap items-center justify-between gap-4 pt-1",
  bulkInputsGroup: "flex flex-wrap items-center gap-3",

  // 2. LISTA INDIVIDUAL DOS 7 DIAS
  daysList: "space-y-3",
  dayRow:
    "p-4 rounded-xl border transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4",
  dayRowActive: "bg-neutral-900/60 border-neutral-800",
  dayRowOff: "bg-neutral-950/40 border-neutral-900 opacity-60",

  dayIdentity: "flex items-center gap-3 min-w-[170px]",
  dayName: "text-xs font-bold text-neutral-200",
  dayOffBadge:
    "text-[10px] font-bold text-neutral-500 uppercase px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800",

  timeInputsGroup: "flex flex-wrap items-center gap-4 flex-1 md:justify-end",
  timeField: "flex items-center gap-1.5 text-xs text-neutral-400",
  fieldLabel: "text-[11px] font-medium text-neutral-400 shrink-0",
  timeInput:
    "bg-neutral-900 border border-neutral-700/80 text-neutral-100 text-xs font-mono font-semibold px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer",

  breakDivider: "hidden lg:block w-px h-6 bg-neutral-800",
};
