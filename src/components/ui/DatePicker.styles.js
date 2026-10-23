export const datePickerStyles = {
  container:
    "bg-neutral-900 border border-neutral-800 rounded-2xl p-5 w-full max-w-md text-left shadow-xl",

  // Barra de ferramentas superior (Alternador Mês/Semana e Navegação)
  topToolbar:
    "flex items-center justify-between gap-2 mb-4 pb-3 border-b border-neutral-800/80",

  // Seletores Rápidos de Mês e Ano
  selectorsWrapper: "flex items-center gap-1.5",
  inlineSelect:
    "bg-neutral-800/90 hover:bg-neutral-800 text-neutral-100 text-xs font-semibold py-1.5 px-2.5 rounded-lg border border-neutral-700/70 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer transition-colors",

  // Alternador de visualização (Pills: Mês | Semana)
  viewToggleWrapper:
    "flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs",
  viewToggleButton:
    "px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer",
  viewToggleActive: "bg-amber-600 text-white shadow-xs font-semibold",
  viewToggleInactive: "text-neutral-400 hover:text-white",

  // Rótulo da semana ou mês atual
  periodLabel: "text-xs font-medium text-neutral-400 mb-3 block text-center",

  // Grade dos Dias da Semana
  weekdaysGrid: "grid grid-cols-7 gap-1 text-center mb-2",
  weekdayLabel:
    "text-xs font-semibold text-neutral-500 py-1 uppercase tracking-wider",

  // Grade dos Dias
  daysGrid: "grid grid-cols-7 gap-1 text-center",

  // Botões de Cada Dia
  dayButton:
    "h-9 w-9 mx-auto rounded-lg text-xs font-medium transition-all duration-150 flex flex-col items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500",
  dayDefault: "text-neutral-200 hover:bg-neutral-800 hover:text-white",
  daySelected:
    "bg-amber-600 text-white font-bold shadow-md shadow-amber-900/40 hover:bg-amber-500",
  dayToday: "border border-amber-500/60 text-amber-400 font-bold",
  dayPast: "text-neutral-500 opacity-60 hover:bg-neutral-800/50", // Visível para consulta histórica!

  // Seção de Horários (Time Slots)
  timeSection: "mt-5 pt-4 border-t border-neutral-800",
  timeTitle:
    "text-xs font-semibold text-neutral-400 mb-3 flex items-center justify-between",
  timeGrid: "grid grid-cols-3 gap-2",
  timeButton:
    "py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500",
  timeDefault:
    "border-neutral-800 bg-neutral-900/90 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-700 hover:text-white",
  timeSelected:
    "border-amber-600 bg-amber-600 text-white font-bold shadow-sm shadow-amber-900/30",
  timeUnavailable:
    "border-neutral-800/50 bg-neutral-900/30 text-neutral-600 opacity-40 line-through cursor-not-allowed pointer-events-none",
};
