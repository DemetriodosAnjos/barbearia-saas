export const navbarStyles = {
  // Barra superior fixa com leve transparência (efeito de vidro)
  container:
    "w-full bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 px-4 md:px-6 py-3 flex items-center justify-between gap-4 select-none sticky top-0 z-30 text-left",

  // Seções Direita e Esquerda
  leftSection: "flex items-center gap-3 md:gap-4 overflow-hidden",
  rightSection: "flex items-center gap-2.5 md:gap-3 shrink-0",

  // Botão hambúrguer no mobile para abrir a Sidebar
  menuButton:
    "md:hidden text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition-colors",

  // Breadcrumbs (Caminho da página)
  breadcrumbWrapper:
    "hidden sm:flex items-center gap-2 text-xs text-neutral-400 font-medium",
  breadcrumbCurrent: "text-neutral-100 font-semibold",
  breadcrumbSeparator: "text-neutral-600",

  // Seletor de Filial / Unidade
  branchSelect:
    "bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 text-xs font-medium py-1.5 px-3 rounded-lg border border-neutral-700/60 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer transition-colors max-w-[170px] truncate",

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
    "absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-black text-white bg-amber-600 rounded-full shadow-md",
  notificationDot:
    "absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-neutral-900",

  // Menu de Usuário / Perfil
  userButton:
    "flex items-center gap-2.5 p-1 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer border border-transparent hover:border-neutral-700",
  avatar:
    "w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0",
  userMeta: "hidden lg:flex flex-col text-left",
  userName: "text-xs font-semibold text-neutral-200 leading-tight",
  userRole: "text-[10px] text-neutral-400 leading-tight",

  // Dropdown Flutuante (Menu do Usuário / Status)
  dropdownMenu:
    "absolute right-0 top-full mt-2 w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-1.5 z-40 text-left animate-in fade-in zoom-in-95 duration-100",
  dropdownItem:
    "w-full px-3.5 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors flex items-center gap-2.5 cursor-pointer",
  dropdownDivider: "my-1 border-t border-neutral-800",

  // Elementos Exclusivos da Navbar do Cliente
  clientBrandWrapper: "flex items-center gap-3",
  clientGreeting: "text-xs font-medium text-neutral-400",
  clientName: "text-sm font-bold text-neutral-100",
  clientBranchBadge:
    "hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-800/80 border border-neutral-700/60 text-neutral-300",
  loyaltyPointsBadge:
    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400",
};
