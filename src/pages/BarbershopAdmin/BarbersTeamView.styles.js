export const teamStyles = {
  // Container principal
  container: "w-full max-w-6xl mx-auto space-y-5 text-left select-none",

  // Cabeçalho da Página de Equipe (Componente 1)
  headerCard:
    "p-6 bg-neutral-900 border border-neutral-800 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl",
  titleWrapper: "space-y-1 text-left",
  title:
    "text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2",
  subtitle: "text-xs text-neutral-400 leading-relaxed",

  // Selo de Cadeiras / Vagas do Plano
  capacityBadge:
    "text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5 shrink-0",

  // Barra de Pesquisa e Ordenação (Componente 2)
  filterBar:
    "p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-lg",

  // Barra de Título / Cabeçalho da Tabela Inline (Componente 3)
  tableHeader:
    "bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-xs font-bold text-neutral-400 uppercase tracking-wider hidden md:grid md:grid-cols-12 items-center gap-3 select-none",

  // Lista de Profissionais / Linha da Tabela Inline (Componente 4)
  tableList: "space-y-2.5",
  tableRow:
    "p-3.5 bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700/80 rounded-2xl transition-all duration-150 flex flex-col md:grid md:grid-cols-12 md:items-center gap-3 text-xs text-neutral-200 shadow-md",

  // Card Expandido legado / fallback
  barberCard:
    "p-5 bg-neutral-900 border border-neutral-800 rounded-3xl flex flex-col justify-between space-y-4 shadow-xl text-left hover:border-neutral-700 transition-all",
  cardHeader:
    "flex items-start justify-between gap-3 pb-3 border-b border-neutral-800",
  profileInfo: "flex items-center gap-3 truncate",
  nameWrapper: "truncate",
  barberName: "text-sm font-bold text-white truncate",
  barberRole: "text-xs text-neutral-400 truncate mt-0.5",

  // Bloco de Métricas de Comissão
  commissionBox:
    "p-3 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-between text-xs",
  commissionItem: "flex flex-col text-left",
  commissionLabel:
    "text-[10px] uppercase font-bold text-neutral-500 tracking-wider",
  commissionValue: "font-mono font-bold text-emerald-400 text-sm",

  // Rodapé com Ações de Escala e Edição
  actionsFooter:
    "flex items-center justify-between gap-2 pt-3 border-t border-neutral-800",
};

