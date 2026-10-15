export const buttonStyles = {
  base: "inline-flex items-center justify-center font-medium text-sm rounded-lg px-4 py-2.5 transition-all duration-200 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950 disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500 disabled:cursor-not-allowed cursor-pointer",

  variants: {
    primary:
      "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 dark:bg-amber-700 dark:text-white dark:hover:bg-amber-800 dark:active:bg-amber-900 focus-visible:ring-emerald-500 dark:focus-visible:ring-amber-400 shadow-sm",
    secondary:
      "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 active:bg-zinc-300 border border-zinc-300 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 dark:active:bg-neutral-600 dark:border-neutral-600 focus-visible:ring-emerald-500 dark:focus-visible:ring-neutral-300",
    danger:
      "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 dark:bg-red-700 dark:text-white dark:hover:bg-red-800 dark:active:bg-red-900 focus-visible:ring-red-400 shadow-sm",
    outline:
      "bg-transparent hover:bg-zinc-100 text-zinc-700 border border-zinc-300 active:bg-zinc-200 dark:bg-transparent dark:text-amber-400 dark:border-amber-500 dark:hover:bg-amber-500/10 dark:active:bg-amber-500/20 focus-visible:ring-emerald-500 dark:focus-visible:ring-amber-400 font-medium",
    success:
      "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-400 shadow-sm font-bold",
    ghost:
      "bg-transparent hover:bg-zinc-100 text-zinc-700 border border-transparent dark:bg-transparent dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800/60 dark:active:bg-neutral-800 focus-visible:ring-emerald-500 dark:focus-visible:ring-neutral-400 font-medium",
    transparent:
      "bg-transparent hover:bg-zinc-100 text-zinc-700 border border-zinc-300 active:bg-zinc-200 dark:bg-transparent dark:text-neutral-300 dark:border-neutral-700 dark:hover:bg-neutral-800 font-medium",
  },

  spinner: "animate-spin -ml-1 mr-2 h-4 w-4 text-current",
};
