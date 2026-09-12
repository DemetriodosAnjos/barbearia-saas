export const barbershopStyles = {
  // Container principal de tela cheia
  pageWrapper:
    "min-h-screen bg-neutral-950 text-neutral-100 flex flex-col text-left select-none relative",

  // Garante que os filhos (Sidebar e Conteúdo) se estiquem até a base
  layoutBody:
    "flex-1 flex flex-col md:flex-row items-stretch min-h-[calc(100vh-42px)]",

  mainContent:
    "flex-1 p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full overflow-y-auto",
  // Cabeçalho da Seção de Serviços & Produtos
  viewHeader:
    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80",
  titleWrapper: "space-y-1",
  viewTitle:
    "text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2",
  viewSubtitle: "text-xs text-neutral-400 leading-relaxed",

  // Barra de Ações (Filtro por Abas + Botão Adicionar)
  toolbar:
    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-lg",
  tabsWrapper:
    "flex items-center gap-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs font-semibold",
  tabBtn:
    "px-3.5 py-1.5 rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-2",
  tabActive: "bg-amber-600 text-white shadow-xs font-bold",
  tabInactive: "text-neutral-400 hover:text-white",

  // Grade de Exibição
  gridList: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
};
