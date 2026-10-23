export const tableStyles = {
  // Container com bordas arredondadas e sombra
  container:
    "w-full bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl select-none text-left flex flex-col",

  // 1. Barra de Ações em Lote (Surge quando há itens selecionados)
  bulkBar:
    "p-3.5 bg-amber-500/10 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-amber-300 animate-in fade-in duration-150",
  bulkInfo: "flex items-center gap-2",

  // 2. Área de Rolagem da Tabela
  scrollArea: "w-full overflow-x-auto relative scrollbar-thin",
  table: "w-full text-left text-xs border-collapse",

  // Cabeçalho (thead)
  thead:
    "bg-neutral-950 border-b border-neutral-800 text-[11px] uppercase font-bold text-neutral-400 tracking-wider",
  th: "py-3.5 px-4 whitespace-nowrap",
  thSortable:
    "cursor-pointer hover:text-amber-400 transition-colors select-none",

  // Linhas do Corpo (tbody)
  tr: "border-b border-neutral-800/60 hover:bg-neutral-800/40 transition-colors group",
  trSelected: "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20",
  td: "py-3 px-4 whitespace-nowrap text-neutral-200",

  // Coluna de Ações Fixa à Direita (Sticky Column com sombra de profundidade)
  stickyActionTh:
    "sticky right-0 bg-neutral-950 px-4 py-3.5 text-right shadow-[-12px_0_16px_rgba(0,0,0,0.6)] z-20",
  stickyActionTd:
    "sticky right-0 bg-neutral-900 group-hover:bg-neutral-850 px-4 py-3 text-right shadow-[-12px_0_16px_rgba(0,0,0,0.6)] z-10",

  // Menu/Botões de Ação da Linha
  actionsGroup: "inline-flex items-center justify-end gap-1.5",
  actionBtn:
    "p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer",
  actionBtnDanger:
    "p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer",

  // Estado Vazio
  emptyState: "p-8 text-center text-xs text-neutral-500 space-y-1",
};
