export const supportStyles = {
  // Container principal
  container: "w-full max-w-5xl mx-auto space-y-6 text-left select-none",

  // 1. Cabeçalho com Status do Plantão e Botão WhatsApp
  headerCard:
    "p-6 bg-neutral-900 border border-neutral-800 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden",
  headerInfo: "space-y-1.5",
  headerTitle:
    "text-2xl font-black text-white tracking-tight flex items-center gap-2",
  headerSubtitle: "text-xs text-neutral-400 leading-relaxed max-w-xl",

  // Status do Plantão
  supportStatusBadge:
    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400",
  statusDot: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse",

  // 2. Grade de 2 Colunas (FAQ à esquerda + Formulário de Ticket à direita)
  gridContent: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start",

  // Coluna FAQ (7 colunas)
  faqColumn: "lg:col-span-7 space-y-4",
  faqCard:
    "p-6 bg-neutral-900/90 border border-neutral-800 rounded-3xl space-y-4 shadow-xl",
  sectionTitle: "text-base font-bold text-white flex items-center gap-2",
  sectionSubtitle: "text-xs text-neutral-400 leading-relaxed -mt-1",

  // Item de FAQ (Accordion)
  accordionItem: "p-4 rounded-2xl border transition-all duration-200 text-xs",
  accordionOpen: "bg-neutral-950/80 border-amber-500/50 shadow-md",
  accordionClosed:
    "bg-neutral-950/40 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-950",
  accordionHeader:
    "flex items-center justify-between font-bold text-neutral-200 cursor-pointer select-none",
  accordionBody:
    "pt-3 mt-2 border-t border-neutral-800/60 text-neutral-400 leading-relaxed space-y-2",

  // Coluna Formulário de Chamado (5 colunas)
  ticketColumn: "lg:col-span-5 space-y-4",
  ticketCard:
    "p-6 bg-neutral-900/90 border border-neutral-800 rounded-3xl space-y-4 shadow-xl text-left",

  // Rodapé de Vídeos Tutoriais Rápidos
  tutorialBanner:
    "p-5 bg-neutral-900/60 border border-neutral-800 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs",
  tutorialItem: "flex items-center gap-3",
  tutorialIcon:
    "w-10 h-10 rounded-2xl bg-amber-600/20 border border-amber-500/30 text-amber-400 flex items-center justify-center text-lg shrink-0",
};
