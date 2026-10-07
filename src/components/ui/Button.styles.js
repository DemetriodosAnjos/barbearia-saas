export const buttonStyles = {
  base: "inline-flex items-center justify-center font-medium text-sm rounded-lg px-4 py-2.5 transition-all duration-200 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",

  variants: {
    primary:
      "bg-amber-700 text-white hover:bg-amber-800 active:bg-amber-900 focus-visible:ring-amber-400 shadow-sm",
    secondary:
      "bg-neutral-800 text-neutral-100 hover:bg-neutral-700 active:bg-neutral-600 focus-visible:ring-neutral-300 border border-neutral-600",
    danger:
      "bg-red-700 text-white hover:bg-red-800 active:bg-red-900 focus-visible:ring-red-400 shadow-sm",
    outline:
      "bg-transparent text-amber-400 border border-amber-500 hover:bg-amber-500/10 focus-visible:ring-amber-400",
  },

  spinner: "animate-spin -ml-1 mr-2 h-4 w-4 text-current",
};
