export const bottomNavStyles = {
  // Barra inferior fixa com cantos arredondados apenas no topo e dark theme nativo (sem vazamento)
  containerFixed:
    "fixed bottom-0 left-0 right-0 z-50 md:hidden bg-neutral-900 text-neutral-100 border-t border-x border-neutral-800/90 rounded-t-2xl px-2 pt-1.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.6)] select-none",

  // Versão embutida (ideal para preview/testes sem esconder em desktop)
  containerStatic:
    "w-full bg-neutral-900 text-neutral-100 border-t border-x border-neutral-800/90 rounded-t-2xl px-2 pt-1.5 pb-2 select-none shadow-lg",

  // Layout simétrico de 5 itens (2 + 1 + 2) em grid de 5 colunas rigorosamente iguais
  navGrid:
    "w-full max-w-md mx-auto grid grid-cols-5 items-center justify-items-center relative",

  // Cada botão de aba regular (colunas 1, 2, 4, 5)
  tabButton:
    "flex flex-col items-center justify-center w-full min-h-[48px] py-1 px-1 transition-all duration-150 cursor-pointer relative group focus:outline-none select-none",

  // Estados da aba com ícones em Âmbar (tom padrão do Dark Theme)
  tabActive:
    "text-amber-500 dark:text-amber-400 font-bold",
  tabInactive:
    "text-amber-500/70 hover:text-amber-400 dark:text-amber-400/70 dark:hover:text-amber-300 font-medium",

  // Ícone em tom Âmbar
  iconWrapper:
    "relative flex items-center justify-center w-6 h-6 mb-0.5 transition-transform duration-150 group-active:scale-95 text-amber-500 dark:text-amber-400",
  label:
    "text-[10px] tracking-tight leading-tight transition-transform duration-150 text-center truncate max-w-[68px] text-[#55555E] dark:text-[#969696]",
  labelActive:
    "scale-105 font-bold text-amber-500 dark:text-amber-400",

  // Ponto indicador sob a aba ativa
  activeIndicator:
    "w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 mt-0.5",

  // Selo de aviso / notificação na aba
  badge:
    "absolute -top-1 -right-1 flex items-center justify-center min-w-3.5 h-3.5 px-0.5 text-[9px] font-black text-white bg-red-600 rounded-full ring-2 ring-white dark:ring-neutral-900",

  // Botão Central de Ação em Destaque (Novo Atendimento - Coluna 3 em Layout 2+1+2)
  centerButtonWrapper:
    "flex flex-col items-center justify-center -mt-6 w-full cursor-pointer focus:outline-none select-none group min-h-[60px] relative z-10",
  centerButton:
    "w-13 h-13 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 active:from-orange-700 active:to-amber-600 text-white flex items-center justify-center shadow-lg shadow-orange-600/40 transition-all duration-200 active:scale-95 border-4 border-neutral-900 group-hover:scale-105 ring-2 ring-orange-500/20",
  centerLabel:
    "text-[9.5px] font-bold text-orange-600 dark:text-amber-400 mt-0.5 truncate max-w-[85px] text-center tracking-tight leading-tight",

  // Menu Suspenso Popover ("Mais") - Padrão rigoroso do dropdown da Navbar
  morePopover:
    "absolute bottom-[calc(100%+12px)] right-1 sm:right-2 z-50 w-64 max-w-[calc(100vw-1.5rem)] bg-[#F4F4F5] dark:bg-[#262626] border border-[#D4D4D8] dark:border-[#969696] rounded-xl shadow-2xl py-1.5 text-left select-none animate-in fade-in zoom-in-95 duration-100",
  morePopoverArrow:
    "absolute -bottom-1.5 right-6 w-3 h-3 bg-[#F4F4F5] dark:bg-[#262626] border-b border-r border-[#D4D4D8] dark:border-[#969696] rotate-45",
  moreHeader:
    "px-3.5 py-2 flex items-center justify-between text-xs text-[#55555E] dark:text-[#969696] border-b border-[#E4E4E7] dark:border-[#969696]",
  moreItem:
    "w-full px-3.5 py-2 text-xs font-medium text-[#55555E] dark:text-[#969696] hover:bg-[#262626] hover:text-white dark:hover:bg-neutral-800/80 dark:hover:text-white transition-colors flex items-center gap-2.5 cursor-pointer group",
  moreDivider:
    "my-1 border-t border-[#E4E4E7] dark:border-[#969696]",
};
