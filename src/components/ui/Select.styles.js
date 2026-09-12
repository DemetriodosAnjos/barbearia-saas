export const selectStyles = {
  container: "w-full flex flex-col gap-1.5 text-left",

  label: "text-sm font-medium text-neutral-300",

  // Wrapper relativo para posicionar a seta personalizada
  wrapper: "relative w-full",

  // O elemento select nativo com aparência personalizada
  baseSelect:
    "w-full px-3.5 py-2.5 rounded-lg text-sm transition-all duration-200 bg-neutral-900 border text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer pr-10",

  // Variações de status (Borda normal vs Erro)
  status: {
    default:
      "border-neutral-700 focus:border-amber-500 focus:ring-amber-500/20",
    error: "border-red-500 focus:border-red-500 focus:ring-red-500/20",
  },

  // Seta SVG personalizada posicionada no canto direito
  arrowIcon:
    "pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400",

  errorMessage: "text-xs text-red-500 flex items-center gap-1 mt-0.5",
  helperText: "text-xs text-neutral-400 mt-0.5",
};
