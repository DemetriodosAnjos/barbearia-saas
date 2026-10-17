export const bottomNavStyles = {
  // Barra inferior fixa com efeito de vidro e borda superior sutil (fixa na base no mobile)
  containerFixed:
    "fixed bottom-0 inset-x-0 z-50 md:hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-lg border-t border-zinc-200 dark:border-neutral-800/80 px-2 pt-1.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-2xl select-none",

  // Versão embutida (ideal para preview/testes sem esconder em desktop)
  containerStatic:
    "w-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-lg border-t border-zinc-200 dark:border-neutral-800/80 px-2 pt-1.5 pb-2 select-none",

  // Layout simétrico de 5 itens (2 + 1 + 2) em grid de 5 colunas rigorosamente iguais
  navGrid:
    "w-full max-w-md mx-auto grid grid-cols-5 items-center justify-items-center",

  // Cada botão de aba regular (colunas 1, 2, 4, 5)
  tabButton:
    "flex flex-col items-center justify-center w-full min-h-[48px] py-1 px-1 transition-all duration-150 cursor-pointer relative group focus:outline-none select-none",

  // Estados da aba (Ativa vs Inativa com suporte pleno ao Âmbar/Laranja Nobre e Zinc neutro)
  tabActive:
    "text-orange-600 dark:text-amber-400 font-bold",
  tabInactive:
    "text-zinc-500 hover:text-zinc-800 dark:text-neutral-400 dark:hover:text-neutral-200 font-medium",

  // Ícone e Rótulo da aba
  iconWrapper:
    "relative flex items-center justify-center w-6 h-6 mb-0.5 transition-transform duration-150 group-active:scale-95",
  label:
    "text-[10px] tracking-tight leading-tight transition-transform duration-150 text-center truncate max-w-[68px]",
  labelActive:
    "scale-105 font-bold text-orange-600 dark:text-amber-400",

  // Ponto indicador sob a aba ativa
  activeIndicator:
    "w-1.5 h-1.5 rounded-full bg-orange-600 dark:bg-amber-400 mt-0.5",

  // Selo de aviso / notificação na aba
  badge:
    "absolute -top-1 -right-1 flex items-center justify-center min-w-3.5 h-3.5 px-0.5 text-[9px] font-black text-white bg-red-600 rounded-full ring-2 ring-white dark:ring-neutral-900",

  // Botão Central de Ação em Destaque (Novo Atendimento - Coluna 3 em Layout 2+1+2)
  centerButtonWrapper:
    "flex flex-col items-center justify-center -mt-6 w-full cursor-pointer focus:outline-none select-none group min-h-[60px] relative z-10",
  centerButton:
    "w-13 h-13 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 active:from-orange-700 active:to-amber-600 text-white flex items-center justify-center shadow-lg shadow-orange-600/40 transition-all duration-200 active:scale-95 border-4 border-white dark:border-neutral-900 group-hover:scale-105 ring-2 ring-orange-500/20",
  centerLabel:
    "text-[9.5px] font-bold text-orange-600 dark:text-amber-400 mt-0.5 truncate max-w-[85px] text-center tracking-tight leading-tight",
};

