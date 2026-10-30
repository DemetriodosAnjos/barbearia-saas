export const calendarViewStyles = {
  // Contêiner principal da agenda com contexto de empilhamento isolado (isolate z-10)
  container:
    "w-full bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl select-none text-left relative isolate z-10",

  // Header do Container da Agenda de Atendimentos
  agendaHeader:
    "p-3.5 sm:p-4 bg-neutral-900 flex items-center justify-between",
  agendaTitle:
    "text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2",
  agendaDivider:
    "border-t border-neutral-800 w-full",

  // 1. Barra Superior de Controles (Header da Agenda: Linha Superior e Linha Inferior)
  toolbar:
    "p-3 sm:p-4 bg-neutral-900 border-b border-neutral-800 flex flex-col gap-2.5 sm:gap-3",
  navGroup: "flex items-center justify-between w-full py-0.5",
  dateTitle:
    "text-xs xs:text-sm sm:text-base md:text-lg font-bold text-white tracking-tight text-center truncate",

  // Linha Inferior: Controles Compactos e CTA em Linha Única
  controlsRow:
    "flex items-center justify-between gap-1.5 xs:gap-2 pt-2.5 border-t border-neutral-800/80 w-full",

  // 2. Área da Grade Diária
  gridWrapper:
    "relative flex-1 flex overflow-x-auto overflow-y-auto min-h-[500px]",

  // Régua Horária da Esquerda (Time Gutter) - z-30 para sobrepor o cabeçalho dos slots da agenda (z-20) no mobile
  timeGutter:
    "w-16 shrink-0 bg-neutral-900/95 backdrop-blur-md border-r border-neutral-800/80 flex flex-col sticky left-0 z-30 select-none shadow-sm",
  timeGutterHeader:
    "h-[62px] border-b border-neutral-800 bg-neutral-900 flex items-center justify-center text-[10px] font-bold text-neutral-500 uppercase sticky top-0 z-40",
  timeGutterSlot:
    "flex items-start justify-center pt-1 text-[11px] font-mono text-neutral-500 border-b border-neutral-800/30",

  // Colunas dos Barbeiros lado a lado
  columnsContainer: "relative flex flex-1 min-w-max",

  // Linha Vermelha do Horário Atual
  currentTimeLine:
    "absolute inset-x-0 z-20 pointer-events-none flex items-center",
  currentTimeDot:
    "w-3 h-3 rounded-full bg-red-500 shadow-md shadow-red-500/50 -ml-1.5 ring-2 ring-neutral-950",
  currentTimeBar: "flex-1 h-0.5 bg-red-500/80 shadow-xs shadow-red-500/50",

  // 3. Visão Semanal (Grade de 7 dias com cards ricos)
  weekGrid:
    "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 p-4 w-full",
  weekDayCard:
    "p-4 bg-neutral-900/70 border border-neutral-800 rounded-2xl flex flex-col justify-between min-h-[140px] text-left transition-all duration-150 cursor-pointer hover:scale-[1.02] shadow-xs",

  // 4. Visão Mensal (Grid de 30 dias)
  monthGrid: "grid grid-cols-7 gap-2 p-4 w-full",
  monthDayCard:
    "p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col justify-between min-h-[95px] text-left hover:border-amber-500/50 transition-colors cursor-pointer",
};
