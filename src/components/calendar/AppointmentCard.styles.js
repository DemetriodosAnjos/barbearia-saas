export const appointmentCardStyles = {
  // Container posicionado na grade horária com borda e sombra
  container:
    "relative w-full rounded-xl border p-2.5 flex flex-col justify-between transition-all duration-200 select-none text-left group cursor-pointer shadow-xs hover:shadow-xl",

  // Variantes de Status de Atendimento com borda lateral colorida anti-confusão visual
  variants: {
    waiting:
      "bg-amber-950/40 border-amber-800/70 border-l-[3px] border-l-amber-500 hover:border-amber-500 hover:bg-amber-950/60",
    confirmed:
      "bg-sky-950/40 border-sky-800/70 border-l-[3px] border-l-sky-500 hover:border-sky-500 hover:bg-sky-950/60",
    in_progress:
      "bg-purple-950/50 border-purple-600/80 border-l-[3px] border-l-purple-500 hover:border-purple-400 ring-1 ring-purple-500/40 hover:bg-purple-950/70",
    completed:
      "bg-emerald-950/30 border-emerald-800/70 border-l-[3px] border-l-emerald-500 opacity-90 hover:opacity-100 hover:border-emerald-500 hover:bg-emerald-950/50",
    cancelled:
      "bg-neutral-900 border-neutral-800 opacity-50 line-through border-l-[3px] border-l-neutral-700",
    no_show:
      "bg-red-950/40 border-red-800/70 border-l-[3px] border-l-red-500 hover:border-red-500 hover:bg-red-950/60",
  },

  // Alerta de Atraso Crítico (Borda pulsante vermelha)
  delayedWarning: "border-red-500 ring-2 ring-red-500/50 animate-pulse",

  // Cabeçalho do Card (Horário e Badges)
  header: "flex items-center justify-between gap-1 mb-1",
  timeText: "text-[11px] font-bold text-neutral-200 font-mono tracking-tight",

  // Informações Centrais (Cliente e Serviço)
  clientName:
    "text-xs font-bold text-neutral-100 truncate flex items-center gap-1",
  serviceName: "text-[11px] text-neutral-400 truncate mt-0.5",

  // Rodapé (Pagamento e Ações)
  footer:
    "flex items-center justify-between mt-auto pt-1.5 border-t border-white/5 relative z-10",

  // Indicador de Pagamento
  paidBadge:
    "text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  pendingBadge:
    "text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30",

  // Botão de Opções Rápidas (3 pontinhos)
  moreButton:
    "text-neutral-400 hover:text-white p-1.5 rounded-md hover:bg-white/15 transition-all cursor-pointer shrink-0 active:scale-95",

  // Menu de Ações Rápidas Flutuante com z-index ultra elevado (z-[100]) e posicionamento inteligente
  menuDropdown:
    "absolute right-0 w-52 bg-neutral-900/98 backdrop-blur-xl border border-neutral-700/90 rounded-xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.95)] py-1.5 z-[100] text-xs text-left ring-1 ring-white/15 animate-in fade-in zoom-in-95 duration-100",
  menuDropdownTop: "bottom-full mb-1.5",
  menuDropdownBottom: "top-full mt-1.5",

  menuItem:
    "w-full px-3 py-2 text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors flex items-center gap-2.5 cursor-pointer font-medium text-xs",
};
