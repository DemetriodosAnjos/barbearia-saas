export const breadcrumbStyles = {
  nav: "flex items-center select-none text-left overflow-hidden",

  // Lista ordenada flexível
  list: "flex items-center flex-wrap gap-1.5 md:gap-2 text-xs font-medium text-neutral-400",

  // Cada item da trilha
  item: "inline-flex items-center gap-1.5",

  // Link clicável (páginas anteriores)
  link: "hover:text-amber-400 transition-colors duration-150 cursor-pointer flex items-center gap-1.5 text-neutral-400 focus:outline-none focus:text-amber-400",

  // Página atual (último item, não clicável)
  currentPage:
    "text-neutral-100 font-semibold truncate max-w-[180px] sm:max-w-xs md:max-w-none",

  // Separador entre os itens (seta ou barra)
  separator: "text-neutral-600 shrink-0 select-none flex items-center",
};
