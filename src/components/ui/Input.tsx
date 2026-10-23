import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputState = 'default' | 'hover' | 'focus' | 'filled' | 'disabled' | 'error';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  size?: InputSize;
  simulatedState?: InputState;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  success?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  errorMessage,
  size = 'md',
  simulatedState = 'default',
  prefixIcon,
  suffixIcon,
  success = false,
  disabled,
  className = '',
  id,
  value,
  placeholder,
  ...props
}) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  const activeState = disabled ? 'disabled' : simulatedState;

  const sizeContainerStyles: Record<InputSize, string> = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base',
  };

  const stateBorderClasses: Record<InputState, string> = {
    default: 'border-slate-700 bg-slate-900/80 text-slate-100 hover:border-slate-600 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20',
    hover: 'border-slate-500 bg-slate-900 text-slate-100 ring-1 ring-slate-500/30',
    focus: 'border-indigo-500 bg-slate-900 text-slate-100 ring-2 ring-indigo-500/30',
    filled: 'border-slate-600 bg-slate-900 text-slate-100',
    disabled: 'border-slate-800 bg-slate-950/60 text-slate-600 cursor-not-allowed select-none opacity-60',
    error: 'border-rose-500 bg-rose-950/10 text-slate-100 ring-1 ring-rose-500/30 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20',
  };

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className={`text-xs font-semibold tracking-wide flex items-center justify-between ${
            activeState === 'error' ? 'text-rose-400' : activeState === 'disabled' ? 'text-slate-600' : 'text-slate-300'
          }`}
        >
          <span>{label}</span>
          {activeState === 'disabled' && <span className="text-[11px] font-normal text-slate-500">(Desativado)</span>}
        </label>
      )}

      <div
        className={`flex items-center w-full px-3 rounded-lg border transition-all duration-150 relative ${sizeContainerStyles[size]} ${stateBorderClasses[activeState]}`}
      >
        {prefixIcon && <div className="shrink-0 mr-2 text-slate-400">{prefixIcon}</div>}

        <input
          id={inputId}
          disabled={activeState === 'disabled'}
          value={value}
          placeholder={placeholder}
          className="w-full h-full bg-transparent border-0 outline-none text-slate-100 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:text-slate-600 font-normal"
          {...props}
        />

        {activeState === 'error' ? (
          <div className="shrink-0 ml-2 text-rose-500 animate-pulse">
            <AlertCircle className="w-4 h-4" />
          </div>
        ) : success ? (
          <div className="shrink-0 ml-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        ) : (
          suffixIcon && <div className="shrink-0 ml-2 text-slate-400">{suffixIcon}</div>
        )}
      </div>

      {activeState === 'error' && (errorMessage || helperText) && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium pl-0.5">
          <span>{errorMessage || helperText}</span>
        </div>
      )}

      {activeState !== 'error' && helperText && (
        <p className="text-xs text-slate-500 pl-0.5">{helperText}</p>
      )}
    </div>
  );
};
