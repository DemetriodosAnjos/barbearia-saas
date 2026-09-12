export const buttonStyles = {
  base: "inline-flex items-center justify-center font-medium text-sm rounded-lg px-4 py-2.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",

  variants: {
    primary:
      "bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 focus:ring-amber-500 shadow-sm",
    secondary:
      "bg-neutral-800 text-neutral-200 hover:bg-neutral-700 active:bg-neutral-600 focus:ring-neutral-500 border border-neutral-700",
    danger:
      "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500 shadow-sm",
    outline:
      "bg-transparent text-amber-500 border border-amber-600 hover:bg-amber-600/10 focus:ring-amber-500",
  },

  spinner: "animate-spin -ml-1 mr-2 h-4 w-4 text-current",
};
