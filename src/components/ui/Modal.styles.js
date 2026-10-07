export const modalStyles = {
  // Fundo escurecido
  backdrop:
    "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs transition-opacity duration-200",

  // Base do container
  containerBase:
    "relative w-full bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150",

  container:
    "relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150",

  // Tamanhos disponíveis para modais
  sizes: {
    sm: "max-w-md",
    md: "max-w-lg", // Tamanho padrão anterior
    lg: "max-w-2xl",
    xl: "max-w-4xl", // Ideal para 3 cards lado a lado
    "1xl": "max-w-3xl", // Ultra espaçoso
    "2xl": "max-w-5xl", // Amplo para formulários complexos e dashboards
    "3xl": "max-w-6xl",
    full: "max-w-[95vw]",
  },

  // Partes do Modal
  header:
    "flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0",
  title: "text-lg font-bold text-neutral-100 tracking-tight",
  closeButton:
    "text-neutral-400 hover:text-amber-400 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900",

  body: "p-6 space-y-4 max-h-[80vh] overflow-y-auto text-neutral-300 text-sm",
  footer:
    "flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-800 bg-neutral-900/50 shrink-0",
};
