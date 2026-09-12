export const radioStyles = {
  // Container clicável com destaque suave quando selecionado
  container:
    "flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none text-left",

  // Estados visuais do container
  containerDefault:
    "border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800/60 hover:border-neutral-700",
  containerSelected: "border-amber-500/80 bg-amber-500/10 shadow-xs",
  containerDisabled: "opacity-40 cursor-not-allowed pointer-events-none",

  // O círculo externo do Radio
  circleOuter:
    "relative flex items-center justify-center w-5 h-5 rounded-full border transition-all duration-200 shrink-0 mt-0.5",
  circleOuterDefault: "border-neutral-600 bg-neutral-900",
  circleOuterSelected: "border-amber-500 bg-amber-500",

  // O pontinho central interno quando marcado
  circleInner:
    "w-2 h-2 rounded-full bg-neutral-950 transition-transform duration-150 scale-100",

  // Área de textos (Título e descrição)
  textWrapper: "flex-1",
  label: "text-sm font-medium text-neutral-200 cursor-pointer",
  labelSelected: "text-amber-400 font-semibold",
  description: "text-xs text-neutral-400 mt-0.5 leading-relaxed",
};
