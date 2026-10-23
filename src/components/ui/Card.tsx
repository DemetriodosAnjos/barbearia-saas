import React from 'react';
import { AlertCircle } from 'lucide-react';

export type CardVariant = 'default' | 'elevated' | 'interactive' | 'bordered';
export type CardState = 'default' | 'hover' | 'active' | 'disabled' | 'error';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  simulatedState?: CardState;
  title?: string;
  subtitle?: string;
  category?: string;
  timestamp?: string;
  author?: string;
  errorMessage?: string;
  headerAction?: React.ReactNode;
  footerContent?: React.ReactNode;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  simulatedState = 'default',
  title,
  subtitle,
  category,
  timestamp,
  author,
  errorMessage,
  headerAction,
  footerContent,
  children,
  className = '',
  onClick,
  ...props
}) => {
  const isInteractive = variant === 'interactive' || Boolean(onClick);

  const baseStyles = 'rounded-xl border transition-all duration-150 p-5 flex flex-col justify-between overflow-hidden relative';

  const variantStyles: Record<CardVariant, Record<CardState, string>> = {
    default: {
      default: 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-xs',
      hover: 'bg-slate-900 border-slate-700 text-slate-100 shadow-xs',
      active: 'bg-slate-900/95 border-slate-700 text-slate-100',
      disabled: 'bg-slate-950/60 border-slate-850 text-slate-600 opacity-60 pointer-events-none',
      error: 'bg-rose-950/20 border-rose-800 text-slate-100 ring-1 ring-rose-600/30',
    },
    elevated: {
      default: 'bg-slate-900 border-slate-800/80 shadow-md shadow-slate-950/50 text-slate-100',
      hover: 'bg-slate-850 border-slate-700 shadow-lg text-slate-100',
      active: 'bg-slate-900 border-slate-700 shadow-sm text-slate-100',
      disabled: 'bg-slate-950 border-slate-900 text-slate-600 opacity-60 shadow-none pointer-events-none',
      error: 'bg-rose-950/25 border-rose-700 text-slate-100 ring-1 ring-rose-500/40 shadow-rose-950/20',
    },
    interactive: {
      default: 'bg-slate-900/90 border-slate-800 text-slate-100 cursor-pointer hover:border-indigo-500/60 hover:bg-slate-850 active:bg-slate-800 transition-colors',
      hover: 'bg-slate-850 border-indigo-500 text-slate-100 ring-1 ring-indigo-500/30',
      active: 'bg-slate-800 border-indigo-600 text-slate-100 scale-[0.99]',
      disabled: 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-50',
      error: 'bg-rose-950/20 border-rose-500 text-slate-100 ring-1 ring-rose-500/40',
    },
    bordered: {
      default: 'bg-transparent border-slate-800 text-slate-200',
      hover: 'bg-slate-900/40 border-slate-700 text-slate-100',
      active: 'bg-slate-900/70 border-slate-600 text-slate-100',
      disabled: 'border-slate-900 text-slate-600 opacity-50 pointer-events-none',
      error: 'border-rose-600 bg-rose-950/10 text-slate-100',
    },
  };

  const stateClass = variantStyles[variant][simulatedState] || variantStyles[variant].default;

  return (
    <div
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive && simulatedState !== 'disabled' ? 0 : undefined}
      onClick={simulatedState !== 'disabled' ? onClick : undefined}
      className={`${baseStyles} ${stateClass} ${className}`}
      {...props}
    >
      <div>
        {/* Unboxed Metadata (Zero-Pill Discipline) */}
        {(category || timestamp || author) && (
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 font-medium">
            {category && <span className="text-indigo-400">{category}</span>}
            {category && timestamp && <span aria-hidden="true" className="text-slate-600">·</span>}
            {timestamp && <span className="font-mono tabular-nums">{timestamp}</span>}
            {author && (timestamp || category) && <span aria-hidden="true" className="text-slate-600">·</span>}
            {author && <span>{author}</span>}
          </div>
        )}

        {/* Title & Action */}
        {(title || headerAction) && (
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              {title && (
                <h4 className="text-base font-semibold text-slate-100 tracking-tight leading-snug">
                  {title}
                </h4>
              )}
              {subtitle && (
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{subtitle}</p>
              )}
            </div>
            {headerAction && <div className="shrink-0">{headerAction}</div>}
          </div>
        )}

        {/* Card Body */}
        {children && <div className="text-sm text-slate-300 mt-2">{children}</div>}

        {/* Error notification if in error state */}
        {simulatedState === 'error' && (
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-rose-900/40 text-xs text-rose-400 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage || 'Falha de validação ou integridade no componente'}</span>
          </div>
        )}
      </div>

      {/* Footer Area */}
      {footerContent && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          {footerContent}
        </div>
      )}
    </div>
  );
};
