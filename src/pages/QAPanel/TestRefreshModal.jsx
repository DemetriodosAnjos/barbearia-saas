import { useMemo } from "react";
import ProjectIcon from "../../components/ui/ProjectIcon";

/**
 * TestRefreshModal.jsx
 * 
 * Modal com overlay e spinner de carregamento para o ciclo de atualização em tempo real.
 * Fases executadas:
 * 1. Carregando dados... (consulta ao Supabase, checagem de conexão e autenticação)
 * 2. Executando testes... (varredura profunda de arquivos e pastas /src, /supabase e execução de suítes)
 * 3. Exibindo resultados... (consolidação dos big numbers e métricas reais)
 * 
 * Regra estrita: Os segundos calibrados para cada fase são controlados exclusivamente no código
 * e NUNCA são exibidos no modal.
 * Todos os ícones utilizam lucide-react (^1.48.0) e herdam a Paleta Oficial Âmbar Nobre.
 */
export default function TestRefreshModal({ isOpen, currentPhase = "loading" }) {
  const phases = useMemo(
    () => [
      {
        id: "loading",
        label: "Carregando dados...",
        description:
          "Consultando instâncias e tabelas no Supabase, verificando integridade das sessões e credenciais de ambiente...",
        icon: "Zap",
      },
      {
        id: "running",
        label: "Executando testes...",
        description:
          "Varrendo arquivos e pastas do código (/src, /supabase), validando contratos de segurança, isolamento BOLA e executando suítes...",
        icon: "FlaskConical",
      },
      {
        id: "displaying",
        label: "Exibindo resultados...",
        description:
          "Consolidando métricas em tempo real, recalculando dados dos Big Numbers e atualizando o painel...",
        icon: "BarChart3",
      },
    ],
    []
  );

  if (!isOpen) return null;

  const currentPhaseIndex = phases.findIndex((p) => p.id === currentPhase);
  const activePhase = phases[currentPhaseIndex] || phases[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="refresh-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300"
    >
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60 text-neutral-100 overflow-hidden">
        {/* Efeito de brilho de fundo sutil */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Spinner animado central */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Anel giratório externo */}
            <div className="absolute inset-0 rounded-full border-4 border-neutral-800 border-t-amber-500 border-r-amber-400 animate-spin" />
            {/* Anel pulsante interno */}
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
              <ProjectIcon name={activePhase.icon} size={20} className="text-amber-400" />
            </div>
          </div>

          <h3
            id="refresh-modal-title"
            className="mt-5 text-xl font-black text-white tracking-tight"
          >
            {activePhase.label}
          </h3>

          <p className="mt-2 text-xs text-neutral-400 text-center leading-relaxed max-w-sm">
            {activePhase.description}
          </p>
        </div>

        {/* Indicadores de Fase com Steps */}
        <div className="space-y-3 bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3.5">
          {phases.map((phase, idx) => {
            const isCompleted = idx < currentPhaseIndex;
            const isCurrent = idx === currentPhaseIndex;

            return (
              <div
                key={phase.id}
                className={`flex items-center gap-3 p-2 rounded-lg text-xs transition-colors ${
                  isCurrent
                    ? "bg-neutral-800/80 text-white font-bold"
                    : isCompleted
                    ? "text-emerald-400 font-medium"
                    : "text-neutral-500"
                }`}
              >
                <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-[11px]">
                  {isCompleted ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
                      <ProjectIcon name="Check" size={11} className="text-emerald-400" />
                    </span>
                  ) : isCurrent ? (
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-500 border border-neutral-700/60 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                  )}
                </div>

                <div className="flex-1 truncate">
                  <span className={isCurrent ? "text-amber-300" : ""}>
                    {phase.label}
                  </span>
                </div>

                <div className="shrink-0">
                  {isCompleted && (
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
                      Concluído
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/60 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      Em andamento
                    </span>
                  )}
                  {!isCompleted && !isCurrent && (
                    <span className="text-[10px] text-neutral-600">
                      Aguardando
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé institucional discreto sem contagem de segundos */}
        <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sincronizando com ambiente de produção</span>
          </span>
          <span className="font-mono text-neutral-400 font-semibold">
            QA Workbench
          </span>
        </div>
      </div>
    </div>
  );
}
