export const loginStyles = {
  // Fundo com degradê escuro imersivo cobrindo toda a tela
  pageWrapper:
    "relative min-h-screen w-full bg-neutral-950 text-neutral-100 flex flex-col justify-center select-none overflow-x-hidden",

  // Camada com layout flexível para posicionar o form à direita na versão web
  layoutGrid:
    "relative z-10 w-full min-h-screen flex flex-col lg:flex-row items-center justify-center lg:justify-between px-4 py-8 sm:px-6 lg:px-12 xl:px-20 max-w-7xl mx-auto",

  // Container do formulário posicionado à direita no desktop
  container:
    "w-full max-w-md flex flex-col gap-6 text-left animate-in fade-in zoom-in-95 duration-200 lg:ml-auto shrink-0",

  // Cabeçalho da Marca
  brandHeader: "flex items-center justify-center gap-2.5 text-center",
  brandLogo:
    "w-11 h-11 rounded-2xl bg-amber-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-amber-950/60",
  brandTitle: "text-2xl font-black tracking-tight text-white",

  // Alternador Inteligente de Perfil (Dono vs Barbeiro)
  roleToggleWrapper:
    "grid grid-cols-2 p-1 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs font-bold shadow-inner",
  roleButton:
    "py-2.5 px-3 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 min-h-[40px]",
  roleActive: "bg-amber-600 text-white shadow-md shadow-amber-950/60 font-black",
  roleInactive: "text-neutral-300 hover:text-white hover:bg-neutral-800/60",

  // Card do Formulário
  cardForm:
    "bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl backdrop-blur-md",
  cardHeaderCentered: "flex flex-col items-center text-center space-y-1 mb-2",
  formHeader: "space-y-1",
  formTitle: "text-lg font-black text-white",
  formSubtitle: "text-xs text-neutral-300 leading-relaxed",

  // Botão do Google
  googleButton:
    "w-full py-2.5 px-4 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-750 text-neutral-100 text-xs font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 min-h-[44px]",

  // Campo de Senha com Olho para Revelar
  passwordWrapper: "relative w-full",
  togglePasswordBtn:
    "absolute right-3.5 top-9 text-neutral-300 hover:text-white cursor-pointer p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 min-h-[32px] min-w-[32px] flex items-center justify-center",

  // Opções de Rodapé do Form (Lembrar de mim e Esqueci senha)
  optionsRow: "flex items-center justify-between text-xs pt-1",
  rememberMeLabel:
    "flex items-center gap-2 text-neutral-300 cursor-pointer hover:text-white select-none",
  forgotPasswordLink:
    "text-amber-400 hover:text-amber-300 hover:underline font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded px-1",

  // Rodapé da Página (Link para Cadastro)
  footerLink: "text-xs text-neutral-300 text-center",
  signupHighlight:
    "text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded px-1",
};
