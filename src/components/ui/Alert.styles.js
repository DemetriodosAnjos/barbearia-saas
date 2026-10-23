export const alertStyles = {
  container:
    "w-full p-4 rounded-xl border flex gap-3 transition-all duration-200 text-left",

  // Variantes visuais com contraste calibrado para fundo escuro
  variants: {
    info: {
      wrapper: "bg-sky-950/30 border-sky-800/60 text-sky-200",
      icon: "text-sky-400",
      title: "text-sky-300",
    },
    success: {
      wrapper: "bg-emerald-950/30 border-emerald-800/60 text-emerald-200",
      icon: "text-emerald-400",
      title: "text-emerald-300",
    },
    warning: {
      wrapper: "bg-amber-950/30 border-amber-800/60 text-amber-200",
      icon: "text-amber-400",
      title: "text-amber-300",
    },
    error: {
      wrapper: "bg-red-950/30 border-red-800/60 text-red-200",
      icon: "text-red-400",
      title: "text-red-300",
    },
  },

  iconWrapper: "shrink-0 mt-0.5",
  content: "flex-1 space-y-1",
  title: "text-sm font-semibold tracking-wide",
  message: "text-xs leading-relaxed opacity-90",
  closeButton:
    "shrink-0 text-neutral-400 hover:text-neutral-200 p-1 rounded-md transition-colors cursor-pointer",
};
