export const serviceMultiSelectStyles = {
  // Contêiner principal do catálogo de seleção
  container:
    "w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-5 flex flex-col gap-6 select-none text-left shadow-2xl",

  // Cabeçalho da Seção com Filtros de Categoria
  header:
    "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80",
  titleWrapper: "space-y-0.5",
  title: "text-base font-bold text-neutral-100",
  subtitle: "text-xs text-neutral-400",

  // Pílulas de Categoria (Todos, Cabelo, Barba...)
  categoriesWrapper:
    "flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none",
  categoryPill:
    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer focus:outline-none shrink-0",
  categoryActive: "bg-amber-600 text-white shadow-xs font-bold",
  categoryInactive:
    "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800",

  // Grade de Exibição dos Serviços
  servicesGrid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",

  // Barra de Resumo Inferior (Dock de Fechamento / Carrinho)
  summaryDock:
    "p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl",

  // Informações da Soma (Tempo e Preço)
  totalsGroup: "flex items-center gap-6 text-left w-full sm:w-auto",
  metricBox: "flex flex-col",
  metricLabel:
    "text-[10px] uppercase font-bold text-neutral-400 tracking-wider",
  metricValueTime:
    "text-sm font-bold text-neutral-100 flex items-center gap-1.5",
  metricValuePrice: "text-lg font-black text-amber-500",

  // Ações do Resumo (Limpar e Avançar)
  actionsGroup: "flex items-center justify-end gap-3 w-full sm:w-auto",
  clearButton:
    "text-xs font-semibold text-neutral-400 hover:text-red-400 py-2 px-3 rounded-lg hover:bg-neutral-800/60 transition-colors cursor-pointer",
};
