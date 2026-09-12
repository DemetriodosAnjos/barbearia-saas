export const profileStyles = {
  // Container principal
  container: "w-full max-w-4xl mx-auto space-y-6 text-left select-none",

  // Cabeçalho com Cartão de Identificação Rápida
  headerCard:
    "p-6 bg-neutral-900 border border-neutral-800 rounded-3xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 shadow-xl relative overflow-hidden",
  profileIdentity:
    "flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left",
  avatarWrapper: "relative group cursor-pointer",
  avatarOverlay:
    "absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-white font-bold transition-opacity",

  infoGroup: "space-y-1",
  nameTitle:
    "text-xl font-black text-white flex items-center justify-center sm:justify-start gap-2",
  displayNameTag: "text-xs text-amber-400 font-semibold",
  roleMeta:
    "text-xs text-neutral-400 flex items-center justify-center sm:justify-start gap-2 pt-1",

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
