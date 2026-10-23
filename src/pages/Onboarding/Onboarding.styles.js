export const onboardingStyles = {
  // Fundo com degradê escuro imersivo
  pageWrapper:
    "min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none",

  // Container central
  container:
    "w-full max-w-xl flex flex-col gap-6 text-left animate-in fade-in zoom-in-95 duration-200",

  // Cabeçalho da Marca
  brandHeader: "flex items-center justify-center gap-2.5 text-center",
  brandLogo:
    "w-10 h-10 rounded-2xl bg-amber-600 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-amber-950/60",
  brandTitle: "text-xl font-black tracking-tight text-white",

  // Barra de Passos (Stepper Progress Bar)
  stepperWrapper: "flex items-center justify-between relative px-2 py-3",
  stepperLineBg:
    "absolute top-1/2 left-8 right-8 -translate-y-1/2 h-0.5 bg-neutral-800 -z-0",
  stepperLineProgress:
    "absolute top-1/2 left-8 -translate-y-1/2 h-0.5 bg-amber-500 transition-all duration-300 -z-0",

  // Cada Ponto do Passo (Step Node)
  stepNode: "flex flex-col items-center gap-1.5 z-10",
  stepCircle:
    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 border-2",
  stepActive:
    "bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-950/60 scale-110",
  stepCompleted: "bg-emerald-600 border-emerald-500 text-white",
  stepPending: "bg-neutral-900 border-neutral-800 text-neutral-500",
  stepLabel: "text-[11px] font-bold tracking-tight",

  // Card do Formulário
  cardForm:
    "bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-md",
  formHeader: "space-y-1",
  formTitle: "text-lg font-black text-white",
  formSubtitle: "text-xs text-neutral-400 leading-relaxed",

  // Botão do Google
  googleButton:
    "w-full py-2.5 px-4 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs",

  // Medidor de Força de Senha
  passwordStrengthWrapper: "space-y-1 pt-1",
  strengthBars: "grid grid-cols-4 gap-1.5 h-1.5",
  strengthBar: "rounded-full transition-all duration-300",
  strengthText: "text-[10px] font-bold text-right",

  // Rodapé com Ações de Avançar e Voltar
  footerActions:
    "flex items-center justify-between gap-3 pt-4 border-t border-neutral-800",
};
