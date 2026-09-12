export const settingsStyles = {
  // Container principal
  container: "w-full max-w-4xl mx-auto space-y-6 text-left select-none",

  // Cabeçalho da Página de Configurações
  headerCard:
    "p-6 bg-neutral-900 border border-neutral-800 rounded-3xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 shadow-xl",
  headerTitle:
    "text-xl font-black text-white tracking-tight flex items-center gap-2",
  headerSubtitle: "text-xs text-neutral-400 leading-relaxed mt-1",

  // Card que envolve o conteúdo da aba
  tabContentCard:
    "p-6 bg-neutral-900/90 border border-neutral-800 rounded-3xl space-y-6 shadow-xl",
  sectionTitle: "text-base font-bold text-white flex items-center gap-2",
  sectionSubtitle: "text-xs text-neutral-400 leading-relaxed -mt-1",

  // Grades de Formulário
  gridTwoCols: "grid grid-cols-1 sm:grid-cols-2 gap-4",
  gridThreeCols: "grid grid-cols-1 sm:grid-cols-3 gap-4",

  // Upload e Pré-visualização da Logo da Barbearia
  logoUploadBox:
    "p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row items-center gap-4",
  logoPreview:
    "w-16 h-16 rounded-2xl bg-amber-600 flex items-center justify-center text-white text-2xl font-black shrink-0 shadow-md border border-amber-500/30 overflow-hidden",
  logoImg: "w-full h-full object-cover",
  logoInfo: "space-y-1 text-center sm:text-left flex-1",

  // Rodapé com Botão Salvar
  footerActions:
    "flex items-center justify-end gap-3 pt-4 border-t border-neutral-800",
};
