import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonState = 'default' | 'hover' | 'active' | 'disabled' | 'error' | 'loading';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  simulatedState?: ButtonState;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  simulatedState,
  isLoading = false,
  isError = false,
  errorMessage,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const activeState = simulatedState || (isLoading ? 'loading' : isError ? 'error' : disabled ? 'disabled' : 'default');

  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-lg whitespace-nowrap cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
    md: 'text-sm px-4 py-2 gap-2 h-10',
    lg: 'text-base px-5 py-2.5 gap-2.5 h-12',
  };

  const variantStyles: Record<ButtonVariant, Record<string, string>> = {
    primary: {
      default: 'bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 focus-visible:ring-indigo-500 shadow-xs',
      hover: 'bg-indigo-500 text-white shadow-xs',
      active: 'bg-indigo-700 text-white shadow-inner',
      disabled: 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50 opacity-60',
      error: 'bg-rose-700 text-white border border-rose-500 focus-visible:ring-rose-500',
      loading: 'bg-indigo-600/80 text-white/80 cursor-wait',
    },
    secondary: {
      default: 'bg-slate-800 text-slate-200 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 focus-visible:ring-slate-400',
      hover: 'bg-slate-700 text-slate-100 border-slate-600',
      active: 'bg-slate-900 text-slate-300 border-slate-800',
      disabled: 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-60',
      error: 'bg-rose-950/60 text-rose-300 border border-rose-800',
      loading: 'bg-slate-800/80 text-slate-400 cursor-wait',
    },
    outline: {
      default: 'bg-transparent text-slate-200 border border-slate-700 hover:bg-slate-800/70 hover:text-white active:bg-slate-800 focus-visible:ring-indigo-500',
      hover: 'bg-slate-800/70 text-white border-slate-600',
      active: 'bg-slate-800 text-slate-300 border-slate-500',
      disabled: 'border-slate-800 text-slate-600 cursor-not-allowed opacity-50',
      error: 'border-rose-600 text-rose-400 bg-rose-950/20',
      loading: 'border-slate-700 text-slate-400 cursor-wait',
    },
    destructive: {
      default: 'bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 focus-visible:ring-rose-500 shadow-xs',
      hover: 'bg-rose-500 text-white',
      active: 'bg-rose-700 text-white shadow-inner',
      disabled: 'bg-rose-950/40 text-rose-800 border border-rose-900/50 cursor-not-allowed opacity-50',
      error: 'bg-rose-800 text-rose-100 ring-2 ring-rose-500',
      loading: 'bg-rose-600/80 text-white/80 cursor-wait',
    },
    ghost: {
      default: 'bg-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white active:bg-slate-800 focus-visible:ring-slate-400',
      hover: 'bg-slate-800/60 text-white',
      active: 'bg-slate-800 text-slate-300',
      disabled: 'text-slate-600 cursor-not-allowed opacity-40',
      error: 'text-rose-400 bg-rose-950/30',
      loading: 'text-slate-500 cursor-wait',
    },
  };

  const stateClass = variantStyles[variant][activeState] || variantStyles[variant].default;
  const isButtonDisabled = disabled || activeState === 'disabled' || activeState === 'loading';

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        disabled={isButtonDisabled}
        data-state={activeState}
        data-variant={variant}
        className={`${baseStyles} ${sizeStyles[size]} ${stateClass} ${className}`}
        {...props}
      >
        {activeState === 'loading' ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span className="truncate">{children}</span>
        {activeState !== 'loading' && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
      {activeState === 'error' && errorMessage && (
        <span className="text-[11px] font-medium text-rose-400 tracking-tight pl-0.5">
          {errorMessage}
        </span>
      )}
    </div>
  );
};

export default Button;
