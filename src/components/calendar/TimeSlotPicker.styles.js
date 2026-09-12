export const timeSlotPickerStyles = {
  container:
    "w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-left select-none space-y-5 shadow-xl",

  summaryBar:
    "p-3.5 bg-neutral-950 border border-neutral-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs",
  durationTag: "flex items-center gap-1.5 text-neutral-300",
  bufferTag:
    "text-[11px] text-amber-500 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20",

  periodSection: "space-y-2.5",
  periodHeader:
    "flex items-center gap-2 text-xs font-bold text-neutral-400 uppercase tracking-wider pb-1 border-b border-neutral-800/60",

  slotsGrid: "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2",

  slotButton:
    "relative py-2.5 px-3 rounded-xl text-xs font-semibold text-center transition-all duration-150 border flex flex-col items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500",

  states: {
    // 1. Disponível para agendar
    available:
      "border-neutral-800 bg-neutral-950 text-neutral-200 hover:border-amber-500 hover:bg-neutral-800 hover:text-white",

    // 2. Selecionado
    selected:
      "border-amber-600 bg-amber-600 text-white font-bold shadow-md shadow-amber-950/50 scale-[1.02]",

    // 3. Ocupado (agora clicável para consultar a ficha do cliente!)
    occupied:
      "border-neutral-800/80 bg-neutral-900/60 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-700 hover:text-neutral-200 cursor-pointer",

    // 4. Reservado temporariamente (em processo de checkout)
    held: "border-amber-800/60 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 cursor-pointer",
  },

  subLabel: "text-[9px] font-normal opacity-80 mt-0.5",
};
