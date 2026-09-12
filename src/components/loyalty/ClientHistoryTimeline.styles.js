export const timelineStyles = {
  // Container principal do Prontuário
  container:
    "w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-3xl p-5 md:p-6 text-left select-none space-y-6 shadow-2xl",

  // 1. Métricas de Fidelidade e Frequência do Topo
  metricsGrid:
    "grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl",
  metricBox: "flex flex-col text-left",
  metricLabel:
    "text-[10px] uppercase font-extrabold text-neutral-400 tracking-wider",
  metricValue: "text-base font-black text-neutral-100 font-mono mt-0.5",
  metricHighlight: "text-amber-500",

  // 2. Ficha Técnica e Preferências de Corte
  notesBox:
    "p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-3",
  notesHeader:
    "flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider",
  notesText: "text-xs text-neutral-300 leading-relaxed",
  allergyTag:
    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs font-bold",

  // 3. Linha do Tempo Cronológica (Timeline)
  timelineWrapper: "space-y-4 pt-2 border-t border-neutral-800/80",
  timelineTitle:
    "text-xs font-extrabold uppercase tracking-wider text-neutral-400",
  eventsList: "relative pl-6 border-l-2 border-neutral-800 space-y-6 ml-2",

  // Nó do Evento (Ponto na linha do tempo)
  eventNode: "relative",
  nodeDot:
    "absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-neutral-950 flex items-center justify-center text-[9px] shadow-sm",
  dotService: "bg-emerald-500 text-neutral-950 ring-2 ring-emerald-500/30",
  dotProduct: "bg-sky-500 text-neutral-950 ring-2 ring-sky-500/30",
  dotNoShow: "bg-red-500 text-white ring-2 ring-red-500/30",

  // Card do Evento
  eventCard:
    "p-3.5 bg-neutral-900/80 border border-neutral-800 rounded-2xl space-y-2 hover:border-neutral-700 transition-colors",
  eventHeader: "flex items-start justify-between gap-2",
  eventTitle: "text-xs font-bold text-neutral-200",
  eventDate: "text-[10px] font-mono text-neutral-400 shrink-0",
  eventMeta: "text-[11px] text-neutral-400 flex items-center gap-2",
  eventPrice: "text-xs font-black text-amber-500 font-mono",
  eventTechnicalNote:
    "p-2 rounded-lg bg-neutral-950/80 text-[11px] text-neutral-300 italic border border-neutral-800/60",
};
