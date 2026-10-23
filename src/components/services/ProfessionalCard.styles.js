export const professionalCardStyles = {
  // Container principal do Card
  container:
    "relative w-full p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between select-none text-left cursor-pointer shadow-xs hover:shadow-md",

  // Estados Visuais (Padrão, Selecionado e Desabilitado)
  states: {
    default:
      "bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900",
    selected:
      "bg-amber-950/20 border-amber-500 shadow-md shadow-amber-950/40 ring-1 ring-amber-500/40",
    disabled:
      "opacity-40 bg-neutral-950/50 border-neutral-900 cursor-not-allowed pointer-events-none",
  },

  // Cabeçalho (Foto/Avatar + Informações + Avaliação)
  header: "flex items-start justify-between gap-3 mb-3",
  profileGroup: "flex items-center gap-3 truncate",

  // Avatar com iniciais ou imagem
  avatar:
    "w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-500/40 text-amber-400 font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs",
  avatarAny:
    "w-12 h-12 rounded-2xl bg-neutral-800 border border-neutral-700 text-neutral-300 font-extrabold text-lg flex items-center justify-center shrink-0",

  nameWrapper: "truncate",
  name: "text-sm font-bold text-neutral-100 group-hover:text-amber-400 transition-colors truncate",
  role: "text-xs text-neutral-400 truncate mt-0.5",

  // Avaliação por Estrelas (Rating)
  ratingBadge:
    "flex items-center gap-1 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800 shrink-0",
  starIcon: "text-amber-400 text-xs",
  ratingScore: "text-xs font-black text-white",
  reviewCount: "text-[10px] text-neutral-500 font-medium",

  // Pílulas de Especialidades
  specialtiesWrapper: "flex flex-wrap gap-1.5 my-3",
  specialtyTag:
    "text-[10px] font-semibold text-neutral-300 bg-neutral-800/80 px-2 py-0.5 rounded-md border border-neutral-700/50",

  // Rodapé (Próximo Horário e Botão de Ação)
  footer:
    "flex items-center justify-between mt-auto pt-3 border-t border-neutral-800/80 gap-3",

  // Próximo Horário Vago
  nextSlotText:
    "text-xs font-semibold text-emerald-400 flex items-center gap-1.5",
  nextSlotOff:
    "text-xs font-semibold text-neutral-500 flex items-center gap-1.5",

  // Botão de Seleção
  selectButton:
    "text-xs font-bold py-1.5 px-3.5 rounded-xl transition-all duration-150 flex items-center gap-1.5 cursor-pointer shrink-0",
  btnDefault:
    "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700",
  btnSelected:
    "bg-amber-600 hover:bg-amber-500 text-white shadow-xs shadow-amber-950/60",
};
