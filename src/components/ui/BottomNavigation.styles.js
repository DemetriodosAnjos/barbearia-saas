export const bottomNavStyles = {
  // Barra inferior com efeito de vidro e borda superior sutil
  containerFixed:
    "fixed bottom-0 inset-x-0 z-40 bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-800/80 px-2 py-1.5 flex items-center justify-around select-none shadow-2xl",

  // Versão embutida (ideal para simular a tela do celular dentro de um card)
  containerStatic:
    "w-full bg-neutral-900/95 backdrop-blur-lg border-t border-neutral-800/80 px-2 py-1.5 flex items-center justify-around select-none",

  // Cada botão de aba regular
  tabButton:
    "flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all duration-150 cursor-pointer relative group focus:outline-none",

  // Estados da aba (Ativa vs Inativa)
  tabActive: "text-amber-500 font-semibold",
  tabInactive: "text-neutral-400 hover:text-neutral-200",

  // Ícone e Rótulo da aba
  iconWrapper: "relative flex items-center justify-center w-6 h-6 mb-0.5",
  label:
    "text-[10px] tracking-tight leading-tight transition-transform duration-150",
  labelActive: "scale-105 font-bold",

  // Ponto indicador sob a aba ativa
  activeIndicator: "w-1 h-1 rounded-full bg-amber-500 mt-0.5",

  // Selo de aviso / notificação na aba
  badge:
    "absolute -top-1 -right-1 flex items-center justify-center min-w-3.5 h-3.5 px-0.5 text-[9px] font-black text-white bg-red-600 rounded-full ring-2 ring-neutral-900",

  // Botão Central de Ação em Destaque (ex: Agendar Agora)
  centerButtonWrapper:
    "flex flex-col items-center justify-center -mt-5 flex-1 cursor-pointer focus:outline-none",
  centerButton:
    "w-12 h-12 rounded-full bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-950/60 transition-transform duration-150 active:scale-95 border-4 border-neutral-900",
  centerLabel: "text-[10px] font-bold text-amber-500 mt-1",
};
