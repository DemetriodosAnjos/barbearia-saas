export const skeletonStyles = {
  // Base com suporte a acessibilidade (se o usuário tiver ativado 'reduzir movimento', desliga a animação)
  base: "bg-neutral-800/80 select-none motion-reduce:animate-none",

  // Tipos de animação
  animations: {
    pulse: "animate-pulse",
    none: "",
  },

  // Formatos estruturais comuns
  variants: {
    text: "h-3.5 w-full rounded-md",
    circular: "rounded-full shrink-0",
    rectangular: "rounded-none",
    rounded: "rounded-xl",
  },
};
