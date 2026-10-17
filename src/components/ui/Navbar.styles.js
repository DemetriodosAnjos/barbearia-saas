export const navbarStyles = {
  // Barra superior fixa com leve transparência (efeito de vidro)
  container:
    "w-full bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 px-4 md:px-6 py-3 flex items-center justify-between gap-4 select-none sticky z-40 text-left",

  // Seções Direita e Esquerda
  leftSection: "flex items-center gap-3 md:gap-4 overflow-hidden",
  rightSection: "flex items-center gap-1.5 sm:gap-2.5 md:gap-3 shrink-0",

  // Botão hambúrguer no mobile para abrir a Sidebar
  menuButton:
    "md:hidden text-[#059669] hover:text-emerald-700 dark:text-amber-400 dark:hover:text-amber-300 p-2 rounded-lg hover:bg-[#F4F4F5] dark:hover:bg-neutral-800 transition-colors cursor-pointer",

  // Breadcrumbs (Caminho da página) - Oculto no mobile para preservar espaço limpo
  breadcrumbWrapper:
    "hidden md:flex items-center gap-2 text-xs font-medium",
  breadcrumbCurrent:
    "font-semibold text-[#059669] dark:text-amber-400 navbar-breadcrumb-current",
  breadcrumbSeparator: "text-zinc-400 dark:text-neutral-600 navbar-breadcrumb-separator",

  // Seletor de Filial / Unidade (Posicionado ao lado do Alerta / Sino)
  branchSelect:
    "bg-[#F4F4F5] dark:bg-neutral-900/80 hover:bg-[#E4E4E7] dark:hover:bg-neutral-800 text-[#55555E] dark:text-[#969696] text-[11px] sm:text-xs font-medium py-1 px-2.5 sm:py-1.5 sm:px-3 rounded-lg border border-[#D4D4D8] dark:border-[#969696] focus:outline-none focus:ring-1 focus:ring-[#969696] cursor-pointer transition-colors max-w-[125px] xs:max-w-[155px] sm:max-w-[210px] md:max-w-[240px] truncate select-none",

  // Badge de Status de Atendimento do Barbeiro
  statusBadge:
    "relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-all duration-150 shadow-xs",
  statusDot: "w-2 h-2 rounded-full shrink-0",
  statusStates: {
    available:
      "bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40",
    busy: "bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/40",
    break:
      "bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:bg-neutral-700/80",
  },
  statusDots: {
    available: "bg-emerald-400 animate-pulse",
    busy: "bg-amber-400",
    break: "bg-neutral-500",
  },

  // Botão de Notificações com Badge Contador
  notificationWrapper: "relative",
  notificationBadge:
    "absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-black text-white bg-red-600 rounded-full shadow-md",
  notificationDot:
    "absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-white dark:ring-neutral-900",

  // Menu de Usuário / Perfil
  userButton:
    "flex items-center gap-2.5 p-1 rounded-xl transition-colors cursor-pointer border border-transparent hover:bg-[#262626] hover:border-neutral-700",
  userButtonActive:
    "bg-[#262626] border-neutral-700 shadow-md",
  avatar:
    "w-8 h-8 rounded-lg bg-[#F4F4F5] dark:bg-neutral-800 border border-[#D4D4D8] dark:border-neutral-700 flex items-center justify-center text-xs font-bold text-zinc-900 dark:text-[#FFB900] shrink-0",
  userMeta: "hidden lg:flex flex-col text-left",
  userName: "text-xs font-semibold text-[#059669] dark:text-neutral-200 leading-tight",
  userRole: "text-[10px] text-[#55555E] dark:text-[#FFB900] leading-tight font-medium",

  // Dropdown Flutuante (Menu do Usuário / Status)
  dropdownMenu:
    "absolute right-0 top-full mt-2 w-56 bg-[#F4F4F5] dark:bg-[#262626] border border-[#D4D4D8] dark:border-neutral-700 rounded-xl shadow-2xl py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100",
  dropdownHeader:
    "px-3.5 py-2.5 border-b border-[#E4E4E7] dark:border-neutral-800",
  dropdownItem:
    "w-full px-3.5 py-2 text-xs font-medium text-[#55555E] dark:text-neutral-300 hover:bg-[#262626] hover:text-white dark:hover:bg-neutral-800/80 dark:hover:text-white transition-colors flex items-center gap-2.5 cursor-pointer",
  dropdownDivider: "my-1 border-t border-[#E4E4E7] dark:border-neutral-800",

  // Elementos Exclusivos da Navbar do Cliente
  clientBrandWrapper: "flex items-center gap-3",
  clientGreeting: "text-xs font-medium text-neutral-400",
  clientName: "text-sm font-bold text-neutral-100",
  clientBranchBadge:
    "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-800/80 border border-neutral-700/60 text-neutral-300",
  loyaltyPointsBadge:
    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400",
};
