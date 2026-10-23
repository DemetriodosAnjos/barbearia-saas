export const fabStyles = {
  // Posicionamento flutuante fixo no canto inferior
  base: "fixed bottom-6 right-6 z-40 flex items-center justify-center gap-2 rounded-full font-semibold shadow-2xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-amber-500/30 active:scale-95 cursor-pointer",

  // Variantes visuais
  variants: {
    primary:
      "bg-amber-600 text-white hover:bg-amber-500 shadow-amber-950/50 hover:shadow-amber-600/30 hover:-translate-y-1",
    secondary:
      "bg-neutral-800 text-neutral-100 hover:bg-neutral-700 border border-neutral-700 shadow-black/60 hover:-translate-y-1",
  },

  // Formatos: Circular (apenas ícone) ou Estendido (ícone + texto)
  types: {
    circular: "w-14 h-14",
    extended: "px-5 py-3.5 h-14 text-sm tracking-wide",
  },

  icon: "w-6 h-6 shrink-0",
};
