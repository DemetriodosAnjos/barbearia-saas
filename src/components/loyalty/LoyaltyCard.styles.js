export const loyaltyStyles = {
  // Container principal simulando um cartão de fidelidade físico de luxo
  card: "relative w-full max-w-md p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between select-none text-left shadow-2xl overflow-hidden",

  // Estados: Em Progresso vs Meta Atingida (Pronto para Resgatar)
  cardInProgress:
    "bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border-neutral-800",
  cardCompleted:
    "bg-gradient-to-br from-amber-950/40 via-neutral-950 to-amber-950/30 border-amber-500/80 shadow-amber-950/40 ring-1 ring-amber-500/40",

  // Cabeçalho do Cartão (Marca, Cliente e Validade)
  header: "flex items-start justify-between gap-3 pb-3 border-b border-white/5",
  brandInfo: "flex items-center gap-2.5",
  brandIcon:
    "w-8 h-8 rounded-xl bg-amber-600 flex items-center justify-center text-white text-sm font-black shadow-md",
  title: "text-xs font-bold text-neutral-100",
  clientName: "text-[11px] text-neutral-400 mt-0.5",

  // Selo de Status da Recompensa
  rewardBadgeReady:
    "text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-neutral-950 animate-pulse",
  rewardBadgePending:
    "text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700",

  // Grade dos Carimbos (Stamps Grid)
  stampsGrid: "grid grid-cols-5 gap-2.5 my-5",

  // Cada Selo/Círculo
  stampSlot:
    "aspect-square rounded-2xl border flex flex-col items-center justify-center transition-all duration-200 relative",

  // Selo Preenchido (Carimbado)
  stampFilled:
    "bg-amber-500/10 border-amber-500/60 text-amber-400 shadow-xs shadow-amber-950/40 scale-100",
  stampFilledIcon: "text-lg leading-none filter drop-shadow",

  // Selo Vazio (Aguardando carimbo)
  stampEmpty:
    "bg-neutral-900/40 border-dashed border-neutral-700/60 text-neutral-600",
  stampNumber: "text-xs font-mono font-bold",

  // Selo do Prêmio Final (Último slot com ícone de presente)
  stampGiftSlot: "border-amber-500/40 bg-amber-950/20 text-amber-400",
  stampGiftReady:
    "bg-amber-500 text-neutral-950 border-amber-400 font-extrabold animate-bounce",

  // Barra de Progresso e Notificação de Meta
  progressSection: "space-y-1.5 pt-2 border-t border-white/5",
  progressTextWrapper:
    "flex justify-between items-center text-xs font-semibold",
  progressBarBg: "w-full h-2 rounded-full bg-neutral-800 overflow-hidden",
  progressBarFill:
    "h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500",

  // Rodapé (Instruções e Botão de Resgate)
  footer: "flex items-center justify-between gap-3 pt-3 mt-auto",
  rewardDetails: "text-[11px] text-neutral-300 font-medium",
  expirationText: "text-[10px] text-neutral-500",
};
