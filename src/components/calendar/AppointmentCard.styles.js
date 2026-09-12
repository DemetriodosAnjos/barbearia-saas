export const appointmentCardStyles = {
  // Container posicionado na grade horária com borda e sombra
  container:
    "relative w-full rounded-xl border p-2.5 flex flex-col justify-between transition-all duration-150 select-none text-left overflow-hidden group cursor-pointer shadow-xs hover:shadow-md hover:z-20",

  // Variantes de Status de Atendimento
  variants: {
    waiting: "bg-amber-950/30 border-amber-800/60 hover:border-amber-600",
    confirmed: "bg-sky-950/30 border-sky-800/60 hover:border-sky-600",
    in_progress:
      "bg-purple-950/40 border-purple-600/80 hover:border-purple-500 ring-1 ring-purple-500/30",
    completed:
      "bg-emerald-950/20 border-emerald-800/50 opacity-80 hover:opacity-100",
    cancelled: "bg-neutral-900 border-neutral-800 opacity-50 line-through",
    no_show: "bg-red-950/30 border-red-800/60 hover:border-red-600",
  },

  // Alerta de Atraso Crítico (Borda pulsante vermelha)
  delayedWarning: "border-red-500 ring-2 ring-red-500/50 animate-pulse",

  // Cabeçalho do Card (Horário e Badges)
  header: "flex items-center justify-between gap-1 mb-1",
  timeText: "text-[11px] font-bold text-neutral-300 font-mono tracking-tight",

  // Informações Centrais (Cliente e Serviço)
  clientName:
    "text-xs font-bold text-neutral-100 truncate flex items-center gap-1",
  serviceName: "text-[11px] text-neutral-400 truncate mt-0.5",

  // Rodapé (Pagamento e Ações)
  footer:
    "flex items-center justify-between mt-auto pt-1.5 border-t border-white/5",

  // Indicador de Pagamento
  paidBadge:
    "text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  pendingBadge:
    "text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-neutral-800 text-amber-400 border border-neutral-700",

  // Botão de Opções Rápidas (3 pontinhos)
  moreButton:
    "text-neutral-400 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors",

  // Menu de Ações Rápidas Flutuante
  menuDropdown:
    "absolute right-2 top-8 w-44 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-1 z-30 text-xs text-left animate-in fade-in zoom-in-95 duration-100",
  menuItem:
    "w-full px-3 py-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors flex items-center gap-2 cursor-pointer",
};
