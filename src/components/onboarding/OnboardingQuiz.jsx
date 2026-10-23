import { useState } from "react";
import ProjectIcon from "../ui/ProjectIcon";
import Button from "../ui/Button";

/**
 * OnboardingQuiz Component
 * 
 * Quiz simplificado com Radio Buttons para direcionar o usuário recém-autenticado
 * para o cenário ideal de sua operação:
 * 1. Dono do negócio com equipe
 * 2. Profissional autônomo solo
 */
export default function OnboardingQuiz({
  user,
  onSelectScenario,
  onCancel,
}) {
  const [selectedScenario, setSelectedScenario] = useState("owner_team");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scenarios = [
    {
      id: "owner_team",
      title: "sou o dono do meu negócio e tenho uma equipe que trabalha comigo",
      subtitle: "Para barbearias com múltiplos profissionais",
      description:
        "Gerencie escalas de trabalho, rateio automático de comissões por barbeiro, comandas no PDV e relatórios financeiros completos.",
      icon: "Users",
      recommendedBadge: "Completo",
    },
    {
      id: "solo_barber",
      title: "sou profissional autônomo e trabalho sozinho",
      subtitle: "Para barbeiro solo ou espaço individual",
      description:
        "Configuração rápida de 1 cadeira: grade de horários própria, chave PIX pessoal e link direto exclusivo para seus clientes agendarem.",
      icon: "Scissors",
      recommendedBadge: "Simplificado",
    },
  ];

  const handleConfirm = () => {
    if (!selectedScenario || isSubmitting) return;
    setIsSubmitting(true);
    if (onSelectScenario) {
      onSelectScenario(selectedScenario);
    }
  };

  const userName = user?.name || user?.user_metadata?.name || "Profissional";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-2xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-8 animate-fadeIn">
        {/* Cabeçalho Oficial do Quiz */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-2">
            <ProjectIcon name="Scissors" size={24} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Olá seja bem-vindo ao barber saas
          </h1>
          <p className="text-sm sm:text-base text-neutral-300 max-w-lg mx-auto">
            {userName ? `Olá, ${userName}! ` : ""}
            Escolha um dos cenários abaixo que mais se encaixa com a sua realidade
          </p>
        </div>

        {/* Grupo de Radio Buttons para Seleção Única */}
        <div
          role="radiogroup"
          aria-label="Cenários de operação da barbearia"
          className="space-y-4"
        >
          {scenarios.map((scenario) => {
            const isSelected = selectedScenario === scenario.id;

            return (
              <div
                key={scenario.id}
                role="radio"
                tabIndex={0}
                aria-checked={isSelected}
                onClick={() => setSelectedScenario(scenario.id)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setSelectedScenario(scenario.id);
                  }
                }}
                className={`
                  relative flex items-start gap-4 p-5 rounded-xl border transition-all cursor-pointer
                  ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500/70 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/50"
                      : "bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/40"
                  }
                `}
              >
                {/* Indicador Visual do Radio Button */}
                <div className="pt-0.5 shrink-0">
                  <div
                    className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                      ${
                        isSelected
                          ? "border-amber-500 bg-amber-500"
                          : "border-neutral-600 bg-neutral-800"
                      }
                    `}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-neutral-950" />
                    )}
                  </div>
                </div>

                {/* Ícone representativo */}
                <div
                  className={`
                    w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors
                    ${
                      isSelected
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-neutral-800 text-neutral-400"
                    }
                  `}
                >
                  <ProjectIcon name={scenario.icon} size={20} />
                </div>

                {/* Textos do Cenário */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-semibold text-white capitalize leading-tight">
                      {scenario.title}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider shrink-0">
                      {scenario.recommendedBadge}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                    {scenario.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé com Botão de Confirmação */}
        <div className="pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-neutral-400 text-center sm:text-left">
            Você poderá ajustar as configurações da sua barbearia a qualquer momento no painel.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onCancel && (
              <Button
                variant="ghost"
                onClick={onCancel}
                className="w-full sm:w-auto text-neutral-400 hover:text-white"
              >
                Voltar
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={!selectedScenario || isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 transition-colors shrink-0 shadow-md"
            >
              {isSubmitting ? "Carregando..." : "Continuar para configuração"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
