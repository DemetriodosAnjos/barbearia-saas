import { useState, useEffect, useRef } from "react";
import ProjectIcon from "../../components/ui/ProjectIcon";

/**
 * QALoadingSpinner.jsx
 *
 * Tela de carregamento e inicialização completa do QA Studio & Testing Workbench.
 * Garante que todas as 5 etapas sejam executadas e visualizadas ordenadamente com overlay:
 * 1. "Carregando dados...." (25%)
 * 2. "Preparando ambiente...." (50%)
 * 3. "Analisando arquivos e pastas do projeto...." (75%) - varredura de arquivos
 * 4. "Validando configurações de segurança e infraestrutura...." (90%)
 * 5. "Quase pronto! Montando bancada de testes...." (100%)
 */
const LOADING_MESSAGES = [
  {
    id: "data-loading",
    label: "Carregando dados....",
    sub: "Consultando banco de dados, credenciais, sessões ativas e variáveis de ambiente.",
    icon: "Zap",
    targetProgress: 25,
  },
  {
    id: "env-prep",
    label: "Preparando ambiente....",
    sub: "Configurando sandbox de testes, fixtures de validação e isolamento multi-tenant.",
    icon: "Settings",
    targetProgress: 50,
  },
  {
    id: "file-scan",
    label: "Analisando arquivos e pastas do projeto....",
    sub: "Mapeando diretórios /src, /supabase e indexando rotas, schemas, middlewares e regras WAF.",
    icon: "Folder",
    targetProgress: 75,
  },
  {
    id: "security-check",
    label: "Validando configurações de segurança e infraestrutura....",
    sub: "Verificando proteção RBAC, tokens JWT, rate limiting (HTTP 429) e políticas RLS.",
    icon: "Shield",
    targetProgress: 90,
  },
  {
    id: "workbench-ready",
    label: "Quase pronto! Montando bancada de testes....",
    sub: "Consolidando métricas das 5 Squads e carregando o QA Studio Workbench.",
    icon: "FlaskConical",
    targetProgress: 100,
  },
];

export default function QALoadingSpinner({
  title = "Inicializando QA Studio & Testing Workbench",
  onCancel,
  onComplete,
  onPhaseChange,
  phaseDurationMs = 500,
}) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(15);
  const [isCompleted, setIsCompleted] = useState(false);
  const hasTriggeredCompleteRef = useRef(false);

  const loadingMessages = LOADING_MESSAGES;

  // Dispara onPhaseChange quando a fase muda
  useEffect(() => {
    onPhaseChange?.(currentMessageIndex);
  }, [currentMessageIndex, onPhaseChange]);

  // Transição sequencial através de todas as 5 fases
  useEffect(() => {
    const totalPhases = loadingMessages.length;
    let timer;

    if (currentMessageIndex < totalPhases - 1) {
      timer = setTimeout(() => {
        setCurrentMessageIndex((prev) => prev + 1);
        const nextProgress = loadingMessages[currentMessageIndex + 1]?.targetProgress || 90;
        setProgress(nextProgress);
      }, phaseDurationMs);
    } else {
      // Última fase: avança para 100% e conclui
      setProgress(100);
      setIsCompleted(true);
      timer = setTimeout(() => {
        if (!hasTriggeredCompleteRef.current) {
          hasTriggeredCompleteRef.current = true;
          onComplete?.();
        }
      }, 450);
    }

    return () => clearTimeout(timer);
  }, [currentMessageIndex, phaseDurationMs, loadingMessages, onComplete]);

  // Animação de progresso suave contínuo
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const target = loadingMessages[currentMessageIndex]?.targetProgress || 100;
        if (prev < target) {
          return Math.min(target, prev + 2);
        }
        return prev;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [currentMessageIndex, loadingMessages]);

  const activeMsg = loadingMessages[currentMessageIndex] || loadingMessages[0];

  const handleSkipOrEnter = () => {
    if (!hasTriggeredCompleteRef.current) {
      hasTriggeredCompleteRef.current = true;
      onComplete?.();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-all duration-300 animate-fade-in"
    >
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center space-y-6">
        {/* Glows de ambientação no fundo */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Spinner central com halo pulsante */}
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          {/* Anel de rotação externo rápido */}
          <div className="absolute inset-0 rounded-full border-4 border-neutral-800 border-t-amber-500 border-r-amber-400 animate-spin" />
          {/* Anel intermediário invertido */}
          <div className="absolute inset-2 rounded-full border-2 border-neutral-800 border-b-purple-500 border-l-purple-400 animate-spin [animation-direction:reverse] [animation-duration:3s]" />
          {/* Núcleo com ícone dinâmico da fase */}
          <div className="w-12 h-12 rounded-2xl bg-neutral-950 border border-neutral-700/80 flex items-center justify-center text-2xl shadow-inner animate-pulse">
            <ProjectIcon name={activeMsg.icon} size={24} className="text-amber-400" />
          </div>
        </div>

        {/* Título e Mensagem Rotativa */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{title}</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight animate-fade-in transition-all">
            {activeMsg.label}
          </h3>

          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed min-h-[38px] flex items-center justify-center">
            {activeMsg.sub}
          </p>
        </div>

        {/* Barra de Progresso Animada */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center text-xs font-mono text-neutral-400 px-1">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <ProjectIcon name="Zap" size={14} className="text-amber-400" />
              <span>Etapa {currentMessageIndex + 1} de {loadingMessages.length}</span>
            </span>
            <span className="font-bold text-amber-400">{Math.min(progress, 100)}%</span>
          </div>

          <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden p-0.5 border border-neutral-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-300 ease-out shadow-sm shadow-amber-500/50"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Lista visual resumida dos passos com status verde de conclusão */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-3.5 space-y-1.5 text-left">
          {loadingMessages.map((msg, idx) => {
            const stepCompleted = idx < currentMessageIndex || (idx === currentMessageIndex && isCompleted);
            const isCurrent = idx === currentMessageIndex && !isCompleted;

            return (
              <div
                key={msg.id}
                className={`flex items-center gap-2.5 text-xs transition-colors p-1.5 rounded-lg ${
                  isCurrent
                    ? "bg-neutral-800/80 text-amber-300 font-bold border border-amber-500/30"
                    : stepCompleted
                    ? "text-emerald-400 font-medium"
                    : "text-neutral-600"
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 ${
                  stepCompleted
                    ? "bg-emerald-500/20 text-emerald-400 font-bold"
                    : isCurrent
                    ? "bg-amber-500/20 text-amber-400 font-bold"
                    : "text-neutral-700"
                }`}>
                  {stepCompleted ? (
                    <ProjectIcon name="Check" size={10} className="text-emerald-400" />
                  ) : isCurrent ? (
                    <ProjectIcon name="Play" size={8} className="text-amber-400 fill-amber-400" />
                  ) : (
                    <ProjectIcon name="Circle" size={8} className="text-neutral-700" />
                  )}
                </span>
                <span className="truncate">{msg.label}</span>
                {stepCompleted && (
                  <span className="ml-auto text-[10px] font-mono text-emerald-500/80">Concluído</span>
                )}
                {isCurrent && (
                  <span className="ml-auto text-[10px] font-mono text-amber-400 animate-pulse">Processando...</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Ações: Entrar imediatamente ou cancelar */}
        <div className="flex items-center justify-between pt-2 px-1 text-xs">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="text-neutral-500 hover:text-neutral-300 underline cursor-pointer transition-colors inline-flex items-center gap-1"
            >
              <ProjectIcon name="ArrowLeft" size={12} className="inline" />
              <span>Voltar ao Início</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={handleSkipOrEnter}
            className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer transition-colors flex items-center gap-1 hover:underline ml-auto"
          >
            <span>{isCompleted ? "Entrar no QA Studio" : "Pular Introdução"}</span>
            <ProjectIcon name="ArrowRight" size={14} className="text-amber-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
