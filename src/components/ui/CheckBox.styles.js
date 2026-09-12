export const checkboxStyles = {
  // Container clicável no mesmo padrão elegante do RadioButton
  container:
    "flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none text-left",

  // Variações do container
  containerDefault:
    "border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800/60 hover:border-neutral-700",
  containerChecked: "border-amber-500/80 bg-amber-500/10 shadow-xs",
  containerDisabled: "opacity-40 cursor-not-allowed pointer-events-none",

  // O quadradinho do CheckBox
  box: "relative flex items-center justify-center w-5 h-5 rounded-md border transition-all duration-200 shrink-0 mt-0.5",
  boxDefault: "border-neutral-600 bg-neutral-900",
  boxChecked: "border-amber-500 bg-amber-500 text-neutral-950",

  // Ícone de visto (Checkmark)
  icon: "w-3.5 h-3.5 stroke-current stroke-[3]",

  // Textos
  textWrapper: "flex-1",
  label: "text-sm font-medium text-neutral-200 cursor-pointer",
  labelChecked: "text-amber-400 font-semibold",
  description: "text-xs text-neutral-400 mt-0.5 leading-relaxed",
};
