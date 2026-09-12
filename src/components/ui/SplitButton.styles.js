export const splitButtonStyles = {
  // Container que mantém os botões juntos e serve de âncora para o menu
  container: "relative inline-flex rounded-lg shadow-xs align-middle",

  // Variantes visuais (Primary e Secondary)
  variants: {
    primary: {
      main: "bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800",
      trigger:
        "bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 border-l border-amber-700/60",
    },
    secondary: {
      main: "bg-neutral-800 text-neutral-200 hover:bg-neutral-700 active:bg-neutral-600 border border-r-0 border-neutral-700",
      trigger:
        "bg-neutral-800 text-neutral-200 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700 border-l-neutral-700/80",
    },
  },

  // Estilo compartilhado do botão principal
  mainButton:
    "inline-flex items-center justify-center font-medium text-sm rounded-l-lg px-4 py-2.5 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:z-10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",

  // Estilo compartilhado do botão da seta
  triggerButton:
    "inline-flex items-center justify-center px-2.5 py-2.5 rounded-r-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:z-10 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",

  // Menu suspenso (Dropdown)
  menu: "absolute right-0 top-full mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100",

  // Itens do menu
  menuItem:
    "w-full px-3.5 py-2.5 text-left text-xs font-medium text-neutral-200 hover:bg-neutral-800/80 hover:text-amber-400 transition-colors flex items-center gap-2.5 cursor-pointer",
  menuItemDisabled: "opacity-40 cursor-not-allowed pointer-events-none",
};
