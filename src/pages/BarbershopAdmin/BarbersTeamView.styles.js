export const teamStyles = {
  // Container principal
  container: "w-full max-w-6xl mx-auto space-y-6 text-left select-none",

  // Cabeçalho da Página de Equipe
  headerCard:
    "p-6 bg-neutral-900 border border-neutral-800 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl",
  titleWrapper: "space-y-1 text-left",
  title:
    "text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2",
  subtitle: "text-xs text-neutral-400 leading-relaxed",

  // Selo de Cadeiras / Vagas do Plano
  capacityBadge:
    "text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5 shrink-0",

  // Grade dos Cards de Barbeiros
  teamGrid:
    "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch",

  // Card Expandido de Gestão do Barbeiro
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
