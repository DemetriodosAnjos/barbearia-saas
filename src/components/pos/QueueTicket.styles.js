export const queueTicketStyles = {
  // Container do Ticket
  container:
    "relative w-full p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between select-none text-left shadow-xs hover:shadow-md",

  // Estados de Status do Ticket
  states: {
    waiting: "bg-neutral-900/80 border-neutral-800 hover:border-neutral-700",
    called:
      "bg-sky-950/20 border-sky-500 shadow-md shadow-sky-950/50 ring-1 ring-sky-500/40",
    absent: "bg-neutral-950/40 border-neutral-900 opacity-60",
  },

  // Cabeçalho (Posição, Nome e Tag de Prioridade)
  header: "flex items-start justify-between gap-3 mb-2",
  clientGroup: "flex items-center gap-3 truncate",

  // Badge da Senha (#01, #02)
  ticketNumber:
    "w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-400 font-black text-sm flex items-center justify-center shrink-0",
  ticketNumberCalled:
    "w-10 h-10 rounded-xl bg-sky-500 text-neutral-950 font-black text-sm flex items-center justify-center shrink-0 shadow-md shadow-sky-500/30 animate-pulse",

  clientInfo: "truncate",
  clientName: "text-sm font-bold text-neutral-100 truncate",
  serviceRequested: "text-xs text-neutral-400 truncate mt-0.5",

  // Badges de Prioridade
  priorityBadges: {
    normal:
      "text-[10px] font-bold text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-700",
    vip: "text-[10px] font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1",
    legal:
      "text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1",
  },

  // Metadados Centrais (Tempo de Espera e Entrada)
  metaGroup:
    "flex flex-wrap items-center gap-3 py-2.5 my-1 border-y border-neutral-800/80 text-xs text-neutral-300",
  metaItem: "flex items-center gap-1.5",
  highlightWait: "text-amber-400 font-bold",

  // Rodapé de Ações Rápidas da Recepção
  footer: "flex items-center justify-between gap-2 pt-2 mt-auto",
  actionButtonsGroup: "flex items-center gap-2",

  // Botões de Ação
  btnWhatsapp:
    "text-neutral-400 hover:text-emerald-400 p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 transition-colors cursor-pointer",
  btnAbsent:
    "text-neutral-400 hover:text-red-400 p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 transition-colors cursor-pointer text-xs",
};
