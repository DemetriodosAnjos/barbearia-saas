export const iconButtonStyles = {
  base: "inline-flex items-center justify-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",

  // Variantes visuais
  variants: {
    ghost:
      "bg-transparent text-neutral-300 hover:text-white hover:bg-neutral-800 active:bg-neutral-700",
    outline:
      "bg-transparent text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800 active:bg-neutral-700",
    solid:
      "bg-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700/50",
  },

  // Tamanhos calibrados para clique confortável
  sizes: {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  },
};
