export const timelineColumnStyles = {
  // Coluna individual do barbeiro
  column:
    "relative flex-1 min-w-[240px] max-w-[320px] bg-neutral-950 border-r border-neutral-800/80 flex flex-col select-none",

  // Cabeçalho Fixo do Barbeiro
  header:
    "sticky top-0 z-20 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 p-3.5 flex items-center justify-between shadow-xs",
  barberInfo: "flex items-center gap-2.5 text-left truncate",
  avatar:
    "w-9 h-9 rounded-full bg-amber-600/20 border border-amber-500/40 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0",
  name: "text-xs font-bold text-neutral-100 truncate",
  role: "text-[10px] text-neutral-400 truncate",

  // Corpo da Régua Horária
  timelineBody: "relative w-full overflow-hidden",

  // Cada Linha da Hora (Grid de fundo)
  hourSlot:
    "w-full border-b border-neutral-800/50 hover:bg-neutral-900/40 transition-colors cursor-pointer flex items-start p-1.5 text-[10px] text-neutral-600 font-mono",
  halfHourSlot:
    "w-full border-b border-neutral-800/20 border-dashed hover:bg-neutral-900/30 transition-colors cursor-pointer",

  // Bloco de Pausa / Almoço (Faixas diagonais)
  breakBlock:
    "absolute inset-x-2 rounded-xl border border-neutral-800 ... z-10 select-none",
  breakText:
    "text-[11px] font-semibold text-neutral-400 tracking-wide flex items-center gap-1.5 bg-neutral-900/90 px-3 py-1 rounded-md border border-neutral-700/60 shadow-xs",

  // Camada onde os cards de agendamento são posicionados
  cardsLayer: "absolute inset-0 px-2 pointer-events-none z-20",
  cardWrapper:
    "absolute inset-x-2 pointer-events-auto transition-all duration-150",
};
