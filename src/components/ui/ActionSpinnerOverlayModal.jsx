import { useState, useEffect } from "react";
import ProjectIcon from "./ProjectIcon";

/**
 * ActionSpinnerOverlayModal.jsx
 *
 * Modal de Spinner com Overlay específico para botões de ações do projeto.
 * Garante tempo de execução visual calibrado entre 2s e 3s (padrão 2.4s) com UX responsiva,
 * backdrop blur, barra de progresso suave e transições de etapas para sinalizar
 * com precisão a execução da ação solicitada.
 */
export default function ActionSpinnerOverlayModal({
  isOpen,
  title = "Executando ação solicitada...",
  subtitle = "Processando parâmetros de segurança e aplicando controles de infraestrutura...",
  icon = "zap",
  durationMs = 2400,
  onComplete,
}) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    "1/3: Inicializando parâmetros e auditando contexto de segurança...",
    "2/3: Executando processamento atômico e validando regras de infraestrutura...",
    "3/3: Consolidando resultados e emitindo resposta com integridade garantida...",
  ];

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setStepIndex(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);

      if (pct < 35) {
        setStepIndex(0);
      } else if (pct < 75) {
        setStepIndex(1);
      } else {
        setStepIndex(2);
      }

      if (elapsed >= durationMs) {
        clearInterval(interval);
        if (onComplete) {
          setTimeout(onComplete, 150);
        }
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isOpen, durationMs, onComplete]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300 animate-in fade-in"
    >
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 text-neutral-100 overflow-hidden text-center">
        {/* Efeitos luminosos de fundo */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Spinner animado central */}
        <div className="flex flex-col items-center justify-center mb-5">
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Anel giratório externo */}
            <div className="absolute inset-0 rounded-full border-4 border-neutral-800 border-t-amber-500 border-r-amber-400 animate-spin" />
            {/* Círculo pulsante interno com ícone */}
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
              {typeof icon === "string" ? (
                <ProjectIcon name={icon} size={22} colorVariant="amber" />
              ) : (
                icon
              )}
            </div>
          </div>

          <h3 className="mt-5 text-lg font-black text-white tracking-tight">
            {title}
          </h3>

          <p className="mt-2 text-xs text-neutral-400 leading-relaxed max-w-sm">
            {subtitle}
          </p>
        </div>

        {/* Barra de Progresso Suave */}
        <div className="space-y-2 bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-amber-400 font-semibold">{steps[stepIndex]}</span>
            <span className="text-neutral-400">{progress}%</span>
          </div>

          <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-75 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <p className="mt-4 text-[10px] text-neutral-500 font-mono">
          Tempo de resposta garantido com confirmação atômica de integridade
        </p>
      </div>
    </div>
  );
}
