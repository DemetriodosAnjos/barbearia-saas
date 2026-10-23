export const toggleStyles = {
  container:
    "flex items-start justify-between gap-4 py-2 cursor-pointer select-none",
  containerDisabled: "opacity-50 cursor-not-allowed",

  textWrapper: "flex flex-col text-left",
  label: "text-sm font-medium text-neutral-200",
  description: "text-xs text-neutral-400 mt-0.5 leading-relaxed",

  // O "trilho" por onde o botão desliza
  track:
    "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-neutral-950",
  trackChecked: "bg-amber-600",
  trackUnchecked: "bg-neutral-800 border border-neutral-700",

  // O "círculo" que se desloca
  thumb:
    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition duration-200 ease-in-out mt-0.5",
  thumbChecked: "translate-x-5.5",
  thumbUnchecked: "translate-x-0.5",
};
