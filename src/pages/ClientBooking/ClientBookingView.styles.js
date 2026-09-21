export const clientBookingStyles = {
  pageWrapper:
    "min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between select-none text-left relative overflow-x-hidden",

  // 👇 pb-48 garante espaço de sobra para o conteúdo nunca ficar atrás da barra fixa!
  appContainer:
    "w-full max-w-lg mx-auto flex-1 flex flex-col p-4 sm:p-6 space-y-6 pb-48",

  deepLinkBanner:
    "p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300 animate-in fade-in duration-200",
  deepLinkBarber: "font-bold text-white flex items-center gap-1.5",

  stepperBox:
    "p-3 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-between text-xs sticky top-14 z-20 backdrop-blur-md bg-neutral-900/90",
  stepText: "font-bold text-neutral-300 flex items-center gap-2",
  stepIndicator:
    "w-6 h-6 rounded-full bg-amber-600 text-white font-extrabold flex items-center justify-center text-[11px]",
  stepTitle: "text-amber-400 font-bold",

  stepHeader: "space-y-1 text-left",
  stepHeading:
    "text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2",
  stepDescription: "text-xs text-neutral-400 leading-relaxed",

  bottomDock:
    "fixed bottom-0 inset-x-0 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 p-4 z-40 shadow-2xl",
  dockContent: "max-w-lg mx-auto flex items-center justify-between gap-4",
  dockTotalBox: "flex flex-col text-left",
  dockPrice: "text-lg font-black text-amber-500 font-mono leading-tight",
  dockMeta: "text-[11px] text-neutral-400",

  voucherCard:
    "p-6 bg-neutral-900 border border-emerald-500/40 rounded-3xl space-y-5 shadow-2xl text-left animate-in zoom-in-95 duration-200",
  voucherHeader: "flex items-center gap-3 pb-4 border-b border-neutral-800",
  successIconBox:
    "w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-2xl flex items-center justify-center shrink-0",
  voucherItem:
    "flex justify-between items-center text-xs py-1 text-neutral-300",
  voucherItemValue: "font-bold text-white font-mono",
};
