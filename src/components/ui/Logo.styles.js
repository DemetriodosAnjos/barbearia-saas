export const logoStyles = {
  // Container do logo
  wrapper: "inline-flex items-center gap-2.5 select-none",
  wrapperCentered:
    "flex flex-col items-center text-center justify-center gap-2",

  // Caixa do Ícone / Símbolo
  iconBox:
    "rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-950/50 shrink-0 border border-amber-500/30",

  // Tamanhos Padronizados (com opção exata de 32x32px)
  sizes: {
    xs: {
      box: "w-6 h-6 text-xs rounded-lg",
      text: "text-sm",
      sub: "text-[9px]",
    },
    sm: {
      box: "w-8 h-8 text-sm rounded-xl",
      text: "text-base",
      sub: "text-[10px]",
    }, // w-8 h-8 = 32px x 32px!
    md: {
      box: "w-10 h-10 text-lg rounded-2xl",
      text: "text-xl",
      sub: "text-xs",
    },
    lg: {
      box: "w-12 h-12 text-xl rounded-2xl",
      text: "text-2xl",
      sub: "text-xs",
    },
  },

  // Imagem real do logo (quando a barbearia tiver imagem própria)
  image: "w-full h-full object-cover rounded-xl",

  // Textos da Marca
  textGroup: "flex flex-col text-left leading-tight",
  brandName: "font-black tracking-tight text-white",
  subtitle: "text-neutral-400 font-medium",
};
