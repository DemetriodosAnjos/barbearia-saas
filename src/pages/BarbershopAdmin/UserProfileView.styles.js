export const profileStyles = {
  // Container principal
  container: "w-full max-w-4xl mx-auto space-y-6 text-left select-none",

  // Cabeçalho com Cartão de Identificação Rápida
  headerCard:
    "p-6 bg-[#FFFFFF] dark:bg-neutral-900 border border-zinc-200 dark:border-neutral-800 rounded-3xl flex flex-col md:flex-row md:items-stretch justify-between gap-6 shadow-xl relative overflow-hidden",
  profileIdentity:
    "flex items-center gap-5 text-left flex-1 min-w-0",
  avatarWrapper: "relative group cursor-pointer shrink-0",
  avatarOverlay:
    "absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-white font-bold transition-opacity",

  infoGroup: "space-y-1.5 flex flex-col justify-center min-w-0 flex-1",
  nameTitle:
    "text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 truncate",
  displayNameTag: "text-xs text-zinc-600 dark:text-neutral-400 flex items-center gap-2 flex-wrap",
  roleMeta:
    "text-xs text-zinc-500 dark:text-neutral-400 flex items-center gap-3 flex-wrap",

  // Bloco de Formulários por Aba
  tabContentCard:
    "p-6 bg-neutral-900/90 border border-neutral-800 rounded-3xl space-y-6 shadow-xl",
  sectionTitle: "text-base font-bold text-white flex items-center gap-2",
  sectionSubtitle: "text-xs text-neutral-400 leading-relaxed -mt-1",

  // Linhas e Grades de Formulário
  gridTwoCols: "grid grid-cols-1 sm:grid-cols-2 gap-4",
  gridThreeCols: "grid grid-cols-1 sm:grid-cols-3 gap-4",

  // Contador de Caracteres da Bio
  bioCounter: "text-[10px] font-mono text-right text-neutral-500",

  // Lista de Sessões / Dispositivos Conectados
  sessionItem:
    "p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-2xl flex items-center justify-between gap-4 text-xs",
  sessionIcon:
    "w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center text-base shrink-0",
  sessionInfo: "flex-1 text-left",
  activeNowBadge:
    "text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",

  // Rodapé com Botão Salvar
  footerActions:
    "flex items-center justify-end gap-3 pt-4 border-t border-neutral-800",
};
