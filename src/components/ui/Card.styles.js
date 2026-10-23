export const cardStyles = {
  base: "relative w-full rounded-3xl border transition-all duration-200 flex flex-col justify-between text-left select-none overflow-hidden",

  variants: {
    default: "bg-neutral-900/80 border-neutral-800 shadow-xl",
    clickable:
      "bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 hover:-translate-y-0.5 hover:shadow-2xl cursor-pointer active:scale-[0.99]",
    selected:
      "bg-amber-950/20 border-amber-500 shadow-xl shadow-amber-950/30 ring-1 ring-amber-500/40 cursor-pointer",
    outline: "bg-transparent border-neutral-800 hover:border-neutral-700",
  },

  paddings: {
    sm: "p-4",
    md: "p-5 md:p-6",
    lg: "p-6 md:p-8",
  },

  header:
    "flex items-start justify-between gap-4 pb-4 border-b border-neutral-800/80",
  titleWrapper: "space-y-1 flex-1 truncate",
  title:
    "text-base font-bold text-neutral-100 tracking-tight leading-tight truncate",
  description: "text-xs text-neutral-400 leading-relaxed",
  headerAction: "shrink-0 flex items-center gap-2",

  body: "flex-1 py-1 space-y-3 text-neutral-300 text-sm",

  footer:
    "flex items-center justify-between gap-3 pt-4 mt-auto border-t border-neutral-800/80 text-xs text-neutral-400",
};
