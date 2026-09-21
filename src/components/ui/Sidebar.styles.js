export const sidebarStyles = {
  backdrop:
    "fixed inset-0 bg-black/80 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300",

  drawer:
    "fixed md:sticky md:top-0 inset-y-0 left-0 z-40 md:z-20 w-72 md:w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0 select-none shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out h-full md:h-screen md:min-h-screen",
  drawerOpen: "translate-x-0",
  drawerClosed: "-translate-x-full md:translate-x-0",

  header:
    "p-5 border-b border-neutral-800/80 flex items-center justify-between shrink-0",
  brandWrapper: "flex items-center gap-3",
  brandLogo:
    "w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-amber-900/40 shrink-0",
  brandInfo: "flex flex-col text-left truncate",
  brandTitle:
    "text-sm font-bold text-neutral-100 tracking-tight leading-tight truncate",
  brandPlan:
    "text-[11px] font-semibold text-amber-500 uppercase tracking-wider mt-0.5",
  closeMobileButton:
    "md:hidden text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 cursor-pointer transition-colors",

  nav: "flex-1 px-3 py-4 space-y-1.5 overflow-y-auto",

  // Itens normais e itens-pai
  navItem:
    "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-amber-500/40",
  navItemActive:
    "bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold shadow-xs",
  navItemInactive:
    "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60 border border-transparent",

  navItemIcon: "w-5 h-5 shrink-0 flex items-center justify-center text-base",
  navItemLabel: "flex-1 truncate",
  navItemBadge:
    "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-600 text-white shadow-xs",

  // 👇 NOVOS ESTILOS PARA SUBMENUS
  chevronIcon:
    "w-4 h-4 text-neutral-500 transition-transform duration-200 shrink-0",
  chevronExpanded: "rotate-180 text-amber-400",

  // Lista com recuo à esquerda e linha divisória sutil
  submenuList:
    "pl-6 pr-1 py-1 space-y-1 border-l-2 border-neutral-800/80 ml-5 my-1 animate-in fade-in duration-150",
  subItem:
    "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer text-left focus:outline-none",
  subItemActive: "bg-amber-500/15 text-amber-400 font-bold",
  subItemInactive:
    "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50",

  footer:
    "p-4 border-t border-neutral-800/80 mt-auto flex items-center justify-between bg-neutral-900/60 shrink-0",
  userWrapper: "flex items-center gap-3 text-left overflow-hidden",
  userAvatar:
    "w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0",
  userInfo: "flex flex-col truncate",
  userName: "text-xs font-semibold text-neutral-200 truncate",
  userRole: "text-[10px] text-neutral-500 uppercase tracking-wide truncate",
  logoutButton:
    "text-neutral-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-neutral-800/80 transition-colors cursor-pointer shrink-0",
};
