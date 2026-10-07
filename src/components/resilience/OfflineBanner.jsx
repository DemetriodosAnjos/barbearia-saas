import React, { useState } from "react";
import { useNetworkResilience } from "./useNetworkResilience";

/**
 * OfflineBanner Component
 *
 * Indicador discreto e elegante de estado de conexão.
 * Acionado ao perder a rede ou desconectar o WebSocket do Supabase Realtime.
 * Permite reconexão manual e simulação de cenários de instabilidade de rede.
 */
export default function OfflineBanner({
  resilienceState = null,
  showSimulator = true,
  className = "",
}) {
  const internalResilience = useNetworkResilience();
  const resilience = resilienceState || internalResilience;

  const {
    isOffline,
    isReconnecting,
    reconnectAttempts,
    latencyMs,
    isHighLatency,
    simulatedMode,
    attemptReconnect,
    setSimulatedState,
  } = resilience;

  const [isDismissed, setIsDismissed] = useState(false);
  const [showSimulatorControls, setShowSimulatorControls] = useState(false);

  // Se a rede estiver 100% normal e latência baixa, o banner fica discreto e silencioso
  if (!isOffline && !isHighLatency && simulatedMode === "NORMAL" && !showSimulatorControls) {
    if (!showSimulator) return null;
    return (
      <div className={`flex items-center justify-end px-3 py-1 bg-neutral-900/60 border-b border-neutral-800/60 text-[11px] text-neutral-400 font-mono ${className}`}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Realtime Ativo</span>
            <span className="text-neutral-500">({latencyMs}ms)</span>
          </span>
          {showSimulator && (
            <button
              type="button"
              onClick={() => setShowSimulatorControls(true)}
              className="text-neutral-400 hover:text-white underline cursor-pointer text-[10px]"
              title="Testar resiliência com simulação de offline e latência"
            >
              Simular Rede
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isDismissed && !isOffline) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className={`w-full z-40 transition-all duration-300 ${className}`}
    >
      <div
        className={`px-3 py-2 border-b text-xs flex flex-wrap items-center justify-between gap-2.5 backdrop-blur-md shadow-sm ${
          isOffline
            ? "bg-amber-950/90 border-amber-500/40 text-amber-200"
            : isHighLatency
            ? "bg-neutral-900/95 border-amber-500/30 text-neutral-200"
            : "bg-neutral-900/95 border-neutral-800 text-neutral-300"
        }`}
      >
        {/* Lado Esquerdo: Mensagem e Ícone */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isOffline
                ? "bg-amber-400 animate-ping"
                : isHighLatency
                ? "bg-amber-500 animate-pulse"
                : "bg-emerald-400"
            }`}
          />

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <strong className="font-semibold text-white tracking-tight">
              {isOffline
                ? "Modo Offline / Reconectando..."
                : isHighLatency
                ? "Alta Latência Detectada"
                : "Conexão Restabelecida"}
            </strong>

            <span className="text-[11px] text-neutral-300">
              {isOffline
                ? "Sem conexão com o Supabase Realtime • Seus dados estão seguros e salvos localmente"
                : isHighLatency
                ? `Tempo de resposta elevado (${latencyMs}ms) • Skeletons e cache ativo ativados`
                : "Sincronização em tempo real 100% operacional"}
            </span>

            {reconnectAttempts > 0 && isOffline && (
              <span className="text-[10px] text-amber-300 font-mono">
                (Tentativa {reconnectAttempts})
              </span>
            )}
          </div>
        </div>

        {/* Lado Direito: Ações & Controles de Simulação */}
        <div className="flex items-center gap-2 shrink-0">
          {isOffline && (
            <button
              type="button"
              onClick={attemptReconnect}
              disabled={isReconnecting}
              aria-label="Tentar reconectar com o servidor agora"
              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:outline-none"
            >
              {isReconnecting ? (
                <>
                  <span className="w-3 h-3 border-2 border-neutral-950/30 border-t-neutral-950 rounded-full animate-spin" />
                  <span>Reconectando...</span>
                </>
              ) : (
                <>
                  <span>↻</span>
                  <span>Tentar Reconectar</span>
                </>
              )}
            </button>
          )}

          {/* Botões de Simulação de Condições de Rede */}
          <div className="flex items-center gap-1 bg-neutral-950/80 p-0.5 rounded border border-neutral-800 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setSimulatedState("NORMAL")}
              aria-pressed={simulatedMode === "NORMAL" && !isOffline}
              aria-label="Restaurar modo normal de rede"
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-amber-400 focus-visible:outline-none ${
                simulatedMode === "NORMAL" && !isOffline
                  ? "bg-emerald-500/20 text-emerald-300 font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Restaurar estado normal de rede"
            >
              Normal
            </button>

            <button
              type="button"
              onClick={() => setSimulatedState("HIGH_LATENCY")}
              aria-pressed={simulatedMode === "HIGH_LATENCY"}
              aria-label="Simular alta latência de rede"
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-amber-400 focus-visible:outline-none ${
                simulatedMode === "HIGH_LATENCY"
                  ? "bg-amber-500/30 text-amber-300 font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Simular rede 3G instável com 2500ms de latência"
            >
              Alta Latência
            </button>

            <button
              type="button"
              onClick={() => setSimulatedState("OFFLINE")}
              aria-pressed={simulatedMode === "OFFLINE"}
              aria-label="Simular desconexão offline"
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-amber-400 focus-visible:outline-none ${
                simulatedMode === "OFFLINE"
                  ? "bg-rose-500/30 text-rose-300 font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
              title="Simular queda total de conexão e WebSocket desconectado"
            >
              Offline
            </button>
          </div>

          {!isOffline && (
            <button
              type="button"
              onClick={() => {
                setIsDismissed(true);
                setShowSimulatorControls(false);
              }}
              aria-label="Ocultar aviso de rede"
              className="text-neutral-400 hover:text-white px-1.5 py-0.5 text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
              title="Ocultar aviso"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
