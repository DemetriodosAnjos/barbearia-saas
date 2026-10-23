import { useState, useEffect } from "react";
import ProjectIcon from "../ui/ProjectIcon";
import { safeStorage } from "../../utils/safeStorage";

/**
 * ProfileCompletionBanner
 *
 * Alerta no topo do painel da barbearia orientando o profissional recém-cadastrado
 * a concluir as informações do seu perfil (chave PIX, telefone, slug).
 */
export default function ProfileCompletionBanner({
  tenant,
  user,
  onCompleteProfile,
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verifica se o usuário precisa completar o perfil
    const needed = safeStorage.getItem("barber_profile_completion_needed") === "true";
    const dismissed = safeStorage.getItem("barber_profile_banner_dismissed") === "true";
    const hasPhone = Boolean(tenant?.phone || user?.phone || user?.user_metadata?.phone);

    // Exibe se foi sinalizado no onboarding recente ou se ainda não tem telefone cadastrado
    if ((needed || !hasPhone) && !dismissed) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [tenant, user]);

  const handleDismiss = () => {
    safeStorage.setItem("barber_profile_banner_dismissed", "true");
    setIsVisible(false);
  };

  const handleAction = () => {
    if (onCompleteProfile) {
      onCompleteProfile();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 sm:px-6 transition-all duration-200 animate-fadeIn"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-left w-full sm:w-auto">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <ProjectIcon name="Sparkles" size={18} />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>Cadastro inicial realizado com sucesso!</span>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase">
                Próximo Passo
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-300">
              Complete os dados do seu perfil para cadastrar sua chave PIX, telefone e link de agendamento online.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
          <button
            type="button"
            onClick={handleAction}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
            title="Ir para configurações do perfil"
          >
            <span>Completar meu perfil</span>
            <ProjectIcon name="ChevronRight" size={14} colorVariant="inherit" />
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800/60 transition-colors cursor-pointer"
            title="Dispensar aviso"
            aria-label="Dispensar aviso"
          >
            <ProjectIcon name="X" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
