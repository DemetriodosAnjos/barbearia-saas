export const avatarStyles = {
  // Container do Avatar
  container:
    "relative inline-flex items-center justify-center shrink-0 select-none font-bold",

  // Tamanhos calibrados
  sizes: {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl",
  },

  // Imagem real
  image: "w-full h-full object-cover rounded-2xl",

  // Caixa de Iniciais (Fallback)
  fallback:
    "w-full h-full rounded-2xl flex items-center justify-center border border-white/10 shadow-xs uppercase tracking-wider font-extrabold",

  // Pontos de Status Presencial (Bottom-Right)
  statusDot:
    "absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-neutral-950 shadow-xs shrink-0",
  statusSizes: {
    xs: "w-2 h-2",
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
    xl: "w-4 h-4",
  },
  statuses: {
    available: "bg-emerald-500 animate-pulse",
    in_service: "bg-purple-500",
    on_break: "bg-amber-500",
    offline: "bg-neutral-600",
  },

  // Selo VIP / Assinante (Top-Right)
  vipBadge:
    "absolute -top-1 -right-1 text-[10px] w-4 h-4 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center font-black shadow-md",
};
