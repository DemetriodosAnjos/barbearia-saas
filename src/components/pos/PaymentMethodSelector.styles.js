export const paymentStyles = {
  // Container principal do Checkout
  container:
    "w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl p-5 md:p-6 text-left select-none space-y-6 shadow-2xl",

  // Cabeçalho (Total a Pagar e Saldo Restante)
  header:
    "p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-wrap items-center justify-between gap-3",
  totalBox: "flex flex-col text-left",
  totalLabel:
    "text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider",
  totalAmount: "text-2xl font-black text-amber-500 tracking-tight",

  balanceBadge: "flex flex-col text-right",
  balancePending: "text-xs font-bold text-amber-400 font-mono",
  balancePaid:
    "text-xs font-black text-emerald-400 font-mono flex items-center gap-1",

  // Seletor de Métodos (Tabs/Pills com Ícones)
  methodsGrid: "grid grid-cols-2 sm:grid-cols-5 gap-2",
  methodButton:
    "p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer focus:outline-none text-center",
  methodActive:
    "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-950/50 scale-[1.02]",
  methodInactive:
    "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800",

  // Área do Método Específico Selecionado
  methodPanel:
    "p-4 bg-neutral-950/80 border border-neutral-800 rounded-2xl space-y-4 text-xs",
  panelTitle:
    "font-bold text-neutral-200 flex items-center gap-2 text-xs uppercase tracking-wider",

  // Lista de Pagamentos Fracionados Lançados
  paymentsList: "space-y-2 pt-2 border-t border-neutral-800",
  paymentItem:
    "p-2.5 bg-neutral-900 border border-neutral-800/80 rounded-xl flex items-center justify-between text-xs",
  removePaymentBtn:
    "text-neutral-500 hover:text-red-400 p-1 rounded-md transition-colors cursor-pointer",

  // Destaque do Troco em Dinheiro
  changeBox:
    "p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl flex items-center justify-between text-emerald-300 font-bold",

  // Botões de Ação Final
  footer:
    "flex items-center justify-between gap-3 pt-4 border-t border-neutral-800",
};
