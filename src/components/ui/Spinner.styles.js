export const spinnerStyles = {
  // Tamanhos padronizados
  sizes: {
    xs: "w-3.5 h-3.5",
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  },

  // Paleta de cores semânticas
  colors: {
    primary: "text-amber-500",
    white: "text-white",
    neutral: "text-neutral-400",
    success: "text-emerald-400",
  },

  // Overlay blocante (para containers ou tela cheia)
  overlay:
    "absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-neutral-950/80 backdrop-blur-xs rounded-2xl transition-opacity duration-200 select-none",
  overlayText:
    "text-xs font-semibold text-neutral-300 animate-pulse tracking-wide",
};
