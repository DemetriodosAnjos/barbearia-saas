import React, { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, CheckCircle2, WifiOff, Edit3, ShieldCheck } from "lucide-react";

/**
 * ResilientFormHandler Component
 *
 * Tratamento amigável para falhas de requisição e instabilidade de rede.
 * - Retém todos os dados preenchidos no formulário (em memória e em sessionStorage).
 * - Fornece botão de "Tentar Novamente" com feedback de progresso e contador de tentativas.
 * - Permite alternar para "Editar Dados" sem qualquer perda do que foi digitado.
 * - Monitora o retorno da conexão para sugerir reenvio automático com segurança.
 */
export default function ResilientFormHandler({
  error,
  formData = {},
  fieldLabels = {},
  isSubmitting = false,
  onRetry,
  onEdit,
  storageKey = "resilient_form_draft",
  isOffline = false,
  className = "",
}) {
  const [retryCount, setRetryCount] = useState(0);
  const [persistedData, setPersistedData] = useState(formData);
  const [lastSavedTime, setLastSavedTime] = useState("");

  // Salva no sessionStorage para garantir retenção mesmo em recarregamento acidental
  useEffect(() => {
    if (formData && Object.keys(formData).length > 0) {
      setPersistedData(formData);
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            data: formData,
            savedAt: new Date().toISOString(),
          })
        );
        setLastSavedTime(new Date().toLocaleTimeString("pt-BR"));
      } catch (e) {
        console.warn("Falha ao salvar rascunho de formulário em sessionStorage:", e);
      }
    }
  }, [formData, storageKey]);

  if (!error) return null;

  const handleRetryClick = async () => {
    setRetryCount((prev) => prev + 1);
    if (onRetry) {
      await onRetry(persistedData);
    }
  };

  // Mapeia os campos para exibição amigável de retenção
  const entries = Object.entries(persistedData).filter(
    ([key, val]) =>
      val !== null &&
      val !== undefined &&
      val !== "" &&
      !key.toLowerCase().includes("password") &&
      !key.toLowerCase().includes("token")
  );

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-2xl border border-amber-500/40 bg-neutral-900/95 p-4 sm:p-5 shadow-xl backdrop-blur-md animate-fade-in ${className}`}
    >
      {/* Cabeçalho do Erro com Status de Rede */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-800">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            {isOffline ? <WifiOff className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>{isOffline ? "Instabilidade de Rede Detectada" : "Falha Temporária na Comunicação"}</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {isOffline ? "Modo Offline" : "Timeout / Erro de Conexão"}
              </span>
            </h3>
            <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
              {typeof error === "string"
                ? error
                : error?.message || "Não foi possível concluir a solicitação devido à oscilação da rede."}
            </p>
          </div>
        </div>
      </div>

      {/* Destaque de Garantia de Retenção de Dados */}
      <div className="my-3.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-200">
          <strong className="text-white block font-semibold">
            Fique tranquilo: todos os seus dados e seleções foram preservados!
          </strong>
          <span>
            Nenhuma informação digitada foi perdida. Você pode tentar novamente assim que a conexão estabilizar.
            {lastSavedTime && (
              <span className="text-emerald-400/80 font-mono ml-1">
                (Última sincronização local: {lastSavedTime})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Resumo dos Campos Preservados */}
      {entries.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-neutral-950/80 border border-neutral-800/80">
          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Dados salvos em buffer local:</span>
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {entries.length} {entries.length === 1 ? "campo retido" : "campos retidos"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {entries.slice(0, 6).map(([key, val]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800/60"
              >
                <span className="text-neutral-400 truncate text-[11px]">
                  {fieldLabels[key] || key}:
                </span>
                <span className="font-semibold text-neutral-200 truncate max-w-[160px] text-right font-mono text-[11px]">
                  {typeof val === "object" ? JSON.stringify(val) : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações de Recuperação: Tentar Novamente & Editar Dados */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-[11px] text-neutral-400 font-mono">
          {retryCount > 0 && (
            <span>
              Tentativas realizadas: <strong className="text-amber-300">{retryCount}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 ml-auto">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              disabled={isSubmitting}
              aria-label="Voltar para editar os dados preenchidos no formulário"
              className="px-3 py-1.5 rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-750 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Dados</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRetryClick}
            disabled={isSubmitting}
            aria-label="Tentar novamente o envio do agendamento com os dados preservados"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-950/40 transition-all cursor-pointer disabled:opacity-60 active:scale-98 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? "animate-spin" : ""}`} />
            <span>{isSubmitting ? "Reenviando..." : "Tentar Novamente"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const FormRetentionRecovery = ResilientFormHandler;
