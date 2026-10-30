export const modalStyles = {
  // Fundo escurecido
  backdrop:
    "fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs transition-opacity duration-200 overflow-x-hidden",

  // Base do container
  containerBase:
    "relative w-full max-w-full bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150 mx-auto min-w-0",

  container:
    "relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150 mx-auto min-w-0",

  // Tamanhos disponíveis para modais
  sizes: {
    xs: "max-w-[320px]",
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
    "flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-800 shrink-0 min-w-0",
  title: "text-base sm:text-lg font-bold text-neutral-100 tracking-tight truncate min-w-0 pr-2",
  closeButton:
    "text-neutral-400 hover:text-amber-400 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 shrink-0",

  body: "p-3.5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto overflow-x-hidden text-neutral-300 text-sm min-w-0 max-w-full",
  footer:
    "flex items-center justify-end gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-neutral-800 bg-neutral-900/50 shrink-0",
};
