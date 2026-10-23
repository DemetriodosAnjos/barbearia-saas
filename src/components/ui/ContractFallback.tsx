/**
 * src/components/ui/ContractFallback.tsx
 *
 * Componentes de Fallback Visual para Dados Ausentes, Parciais ou Corrompidos (UI/UX Resilience).
 * Fornece estados visuais amigáveis que preservam a integridade estética do sistema
 * e orientam o usuário caso ocorra divergência de contrato na API ou falhas de dados.
 * Herda a Paleta Oficial Âmbar Nobre do projeto.
 */

import React, { useState } from "react";
import { 
  AlertTriangle, 
  RotateCcw, 
  ChevronDown, 
  ChevronRight, 
  Info, 
  FolderOpen, 
  ShieldAlert 
} from "lucide-react";

// ============================================================================
// 1. FALLBACK DE DADOS CORROMPIDOS / ALTERAÇÃO DE CONTRATO NA API
// ============================================================================

export interface DataCorruptedFallbackProps {
  entityName?: string;
  message?: string;
  errors?: Array<{ field?: string; message: string; receivedValue?: unknown }>;
  onRetry?: () => void;
  className?: string;
}

export const DataCorruptedFallback: React.FC<DataCorruptedFallbackProps> = ({
  entityName = "Dados",
  message = "Os dados recebidos do servidor divergiram do contrato esperado pelo sistema.",
  errors = [],
  onRetry,
  className = "",
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`w-full p-5 bg-neutral-900/90 border border-amber-500/30 rounded-2xl shadow-xl text-left select-none space-y-4 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Instabilidade no Contrato de {entityName}</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                Fallback Ativo
              </span>
            </h4>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed max-w-xl">
              {message} Para garantir a estabilidade da interface, valores seguros de contingência foram carregados.
            </p>
          </div>
        </div>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>
        )}
      </div>

      {errors.length > 0 && (
        <div className="pt-2 border-t border-neutral-800">
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="text-[11px] font-mono text-neutral-400 hover:text-amber-400 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-1">
              {showTechnicalDetails ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ocultar</span>
                </>
              ) : (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                  <span>Visualizar</span>
                </>
              )}
            </span>
            <span>Detalhes Técnicos do Schema ({errors.length} divergências)</span>
          </button>

          {showTechnicalDetails && (
            <div className="mt-2 p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] font-mono space-y-1.5 max-h-48 overflow-y-auto">
              {errors.map((err, idx) => (
                <div key={idx} className="flex items-start gap-2 text-neutral-300">
                  <span className="text-amber-500 font-bold">•</span>
                  <span className="text-neutral-400">
                    Campo <strong className="text-amber-300">{err.field || "raiz"}</strong>:
                  </span>
                  <span>{err.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. AVISO DE DADOS PARCIAIS (NON-BLOCKING NOTICE)
// ============================================================================

export interface PartialDataNoticeProps {
  entityName?: string;
  totalItems?: number;
  recoveredItems?: number;
  droppedItems?: number;
  onRefresh?: () => void;
}

export const PartialDataNotice: React.FC<PartialDataNoticeProps> = ({
  entityName = "Registros",
  totalItems = 0,
  recoveredItems = 0,
  droppedItems = 0,
  onRefresh,
}) => {
  return (
    <div
      role="status"
      className="w-full px-4 py-2.5 bg-amber-950/30 border border-amber-500/20 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200"
    >
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 text-amber-500 shrink-0" />
        <span>
          <strong>Aviso de Contrato:</strong> Exibindo <strong>{recoveredItems}</strong> de{" "}
          <strong>{totalItems}</strong> {entityName}. {droppedItems > 0 && `(${droppedItems} item(ns) com schema divergente omitido(s)).`}
        </span>
      </div>

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          className="text-[11px] font-bold text-amber-400 hover:text-white underline cursor-pointer flex items-center gap-1"
        >
          <span>Sincronizar novamente</span>
          <RotateCcw className="w-3 h-3 text-amber-400" />
        </button>
      )}
    </div>
  );
};

// ============================================================================
// 3. FALLBACK DE DADOS VAZIOS (CLEAN EMPTY STATE)
// ============================================================================

export interface EmptyDataFallbackProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyDataFallback: React.FC<EmptyDataFallbackProps> = ({
  title = "Nenhum registro encontrado",
  description = "Ainda não existem dados cadastrados ou sincronizados nesta seção.",
  icon,
  actionLabel,
  onAction,
  className = "",
}) => {
  return (
    <div
      className={`w-full p-8 border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/50 flex flex-col items-center justify-center text-center select-none space-y-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 text-amber-500 flex items-center justify-center shadow-inner">
        {icon || <FolderOpen className="w-6 h-6 text-amber-500" />}
      </div>
      <div>
        <h4 className="text-sm font-bold text-neutral-200">{title}</h4>
        <p className="text-xs text-neutral-400 max-w-sm mt-1 leading-relaxed">
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl border border-neutral-700 transition-all cursor-pointer shadow-xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// ============================================================================
// 4. FALLBACK PARA ERROS DE RENDERIZAÇÃO EM COMPONENTES (CRASH BOUNDARY)
// ============================================================================

export interface ComponentCrashFallbackProps {
  componentName?: string;
  error?: Error | null;
  onReset?: () => void;
  className?: string;
}

export const ComponentCrashFallback: React.FC<ComponentCrashFallbackProps> = ({
  componentName = "Módulo",
  error,
  onReset,
  className = "",
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      role="alert"
      className={`w-full p-5 bg-red-950/20 border border-red-500/30 rounded-2xl text-left select-none space-y-4 shadow-xl ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-red-200 flex items-center gap-2">
              <span>Falha Isolada: {componentName}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold uppercase">
                Error Boundary Ativo
              </span>
            </h4>
            <p className="text-xs text-neutral-300 mt-1 leading-relaxed max-w-xl">
              Uma exceção imprevista foi contida neste componente para evitar que a aplicação inteira caia.
              O restante do sistema permanece funcionando normalmente.
            </p>
          </div>
        </div>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <span>Restaurar Componente</span>
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {error && (
        <div className="pt-2 border-t border-red-900/40">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] font-mono text-neutral-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-1">
              {expanded ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Ocultar</span>
                </>
              ) : (
                <>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>Ver</span>
                </>
              )}
            </span>
            <span>Diagnóstico do Erro ({error.name || "Error"})</span>
          </button>

          {expanded && (
            <div className="mt-2 p-3 bg-neutral-950 rounded-xl border border-red-900/40 text-[11px] font-mono text-red-300/90 overflow-x-auto">
              <p className="font-bold text-red-400">{error.message}</p>
              {error.stack && (
                <pre className="text-[10px] text-neutral-400 mt-1.5 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {error.stack}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default {
  DataCorruptedFallback,
  PartialDataNotice,
  EmptyDataFallback,
  ComponentCrashFallback,
};
