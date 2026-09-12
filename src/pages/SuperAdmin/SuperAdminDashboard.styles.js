export const superAdminStyles = {
  // 1. Container que alinha a sidebar e o conteúdo esticados verticalmente
  pageWrapper:
    "min-h-screen bg-neutral-950 text-neutral-100 flex flex-col md:flex-row text-left select-none relative items-stretch",

  // Fundo escuro com desfoque quando a gaveta abre no celular (Backdrop)
  backdrop:
    "fixed inset-0 bg-black/80 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300",

  // 2. SIDEBAR FULL HEIGHT (Ocupa 100% da altura vertical da tela e fica fixa no scroll)
  sidebar:
    "fixed md:sticky md:top-0 inset-y-0 left-0 z-50 w-72 md:w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0 select-none shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out h-full md:h-screen md:min-h-screen",
  sidebarOpen: "translate-x-0",
  sidebarClosed: "-translate-x-full md:translate-x-0",

  sidebarHeader:
    "p-5 border-b border-neutral-800 flex items-center justify-between shrink-0",
  brandGroup: "flex items-center gap-2.5",
  brandLogo:
    "w-8 h-8 rounded-xl bg-amber-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-amber-950/50",
  superBadge:
    "text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-950/60 text-red-400 border border-red-800/60",
  closeDrawerBtn:
    "md:hidden text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer",

  // 3. Área de navegação que se expande empurrando o rodapé para a base
  nav: "p-3 space-y-1.5 flex-1 overflow-y-auto",
  navItem:
    "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer text-left focus:outline-none",
  navActive: "bg-amber-600 text-white shadow-md shadow-amber-950/60 font-bold",
  navInactive: "text-neutral-400 hover:text-white hover:bg-neutral-800/60",

  // 4. Rodapé cravado no final da tela com mt-auto
  sidebarFooter:
    "p-4 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between shrink-0 mt-auto",
  adminUser: "flex flex-col text-left truncate pr-2",
  adminName: "text-xs font-bold text-white truncate",
  adminRole: "text-[10px] text-neutral-500 truncate",

  // 2. CONTEÚDO PRINCIPAL (ÁREA CENTRAL)
  mainContent:
    "flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full",

  // Barra Superior (Mobile e Desktop)
  topbar:
    "md:hidden bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md",
  hamburgerBtn:
    "p-2 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer transition-colors focus:outline-none",

  pageHeader:
    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80",
  titleWrapper: "space-y-1",
  pageTitle:
    "text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2",
  pageSubtitle: "text-xs text-neutral-400 leading-relaxed",

  // KPIs
  kpiGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",

  // Barra de Filtros
  tableSection: "space-y-4",
  filterBar:
    "p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg",
  filterControls: "flex flex-wrap items-center gap-3 w-full md:w-auto",
  filterSelect:
    "bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer",

  // Aba Nubank PJ
  nubankCard:
    "p-5 md:p-6 bg-neutral-900 border border-purple-500/30 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden text-left",
  nubankBadge:
    "text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40",

  // Aba de Planos
  plansGrid: "grid grid-cols-1 md:grid-cols-3 gap-6",
  planCard:
    "p-5 bg-neutral-900 border border-neutral-800 rounded-3xl flex flex-col justify-between space-y-4 shadow-xl text-left",
};
