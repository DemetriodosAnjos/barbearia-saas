import React from "react";

/**
 * SkeletonCard Component
 *
 * Fornece feedback visual imediato durante requisições de alta latência (>1200ms)
 * ou carregamento de catálogos e listas. Suporta variantes para serviços, barbeiros e agendamentos.
 */
export default function SkeletonCard({
  variant = "service", // 'service' | 'barber' | 'appointment' | 'metric'
  count = 1,
  className = "",
}) {
  const items = Array.from({ length: count });

  if (variant === "barber") {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 ${className}`}>
        {items.map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800/80 space-y-3 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-neutral-800 shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 bg-neutral-800 rounded w-3/4" />
                <div className="h-3 bg-neutral-800/60 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-1 pt-1">
              <div className="h-2.5 bg-neutral-800/40 rounded w-full" />
              <div className="h-2.5 bg-neutral-800/40 rounded w-5/6" />
            </div>
            <div className="h-8 bg-neutral-800/60 rounded-lg w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "appointment") {
    return (
      <div className={`space-y-2.5 ${className}`}>
        {items.map((_, i) => (
          <div
            key={i}
            className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800/80 flex items-center justify-between gap-4 animate-pulse"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 rounded-lg bg-neutral-800 shrink-0" />
              <div className="space-y-1.5 flex-1 max-w-md">
                <div className="h-3.5 bg-neutral-800 rounded w-2/3" />
                <div className="h-2.5 bg-neutral-800/60 rounded w-1/3" />
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="h-5 bg-neutral-800/60 rounded w-16" />
              <div className="h-7 bg-neutral-800 rounded-lg w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "metric") {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${className}`}>
        {items.map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800/80 space-y-2 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 bg-neutral-800/60 rounded w-1/2" />
              <div className="w-4 h-4 rounded bg-neutral-800/60" />
            </div>
            <div className="h-7 bg-neutral-800 rounded w-3/4" />
            <div className="h-2.5 bg-neutral-800/40 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  // Padrão: Variante 'service'
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
      {items.map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800/80 space-y-3 animate-pulse"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5 flex-1">
              <div className="h-4 bg-neutral-800 rounded w-3/4" />
              <div className="h-3 bg-neutral-800/60 rounded w-1/3" />
            </div>
            <div className="h-5 bg-neutral-800 rounded w-14 shrink-0" />
          </div>
          <div className="h-2.5 bg-neutral-800/40 rounded w-full" />
          <div className="h-2.5 bg-neutral-800/40 rounded w-4/5" />
          <div className="flex items-center justify-between pt-1">
            <div className="h-3 bg-neutral-800/60 rounded w-20" />
            <div className="h-8 bg-neutral-800 rounded-lg w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
