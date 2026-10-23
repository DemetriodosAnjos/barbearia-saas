export const selectStyles = {
  container: "w-full flex flex-col gap-1.5 text-left",

  label: "text-sm font-medium text-neutral-200",

  // Wrapper relativo para posicionar a seta personalizada
  wrapper: "relative w-full",

  // O elemento select nativo com aparência personalizada
  baseSelect:
    "w-full px-3.5 py-2.5 rounded-lg text-sm transition-all duration-200 bg-neutral-900 border text-neutral-100 placeholder-neutral-400 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer pr-10",

  // Variações de status (Borda normal vs Erro)
  status: {
    default:
      "border-neutral-600 focus-visible:border-amber-400 focus-visible:ring-amber-400",
    error: "border-rose-500 focus-visible:border-rose-400 focus-visible:ring-rose-400",
  },

  // Seta SVG personalizada posicionada no canto direito
  arrowIcon:
    "pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-300",

  errorMessage: "text-xs text-rose-300 flex items-center gap-1.5 mt-1 font-medium",
  helperText: "text-xs text-neutral-300 mt-1",
};
