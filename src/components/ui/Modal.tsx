import React, { useEffect } from 'react';
import { X, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';

export type ModalVariant = 'default' | 'destructive' | 'info' | 'success';
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  variant?: ModalVariant;
  size?: ModalSize;
  children?: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  primaryActionLoading?: boolean;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  hideHeaderClose?: boolean;
  inlinePreview?: boolean; // For Storybook / visual regression runner without fixed portals
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  variant = 'default',
  size = 'md',
  children,
  primaryActionLabel = 'Confirmar',
  onPrimaryAction,
  primaryActionLoading = false,
  secondaryActionLabel = 'Cancelar',
  onSecondaryAction,
  hideHeaderClose = false,
  inlinePreview = false,
}) => {
  useEffect(() => {
    if (!isOpen || inlinePreview) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, inlinePreview]);

  if (!isOpen) return null;

  const sizeClasses: Record<ModalSize, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  };

  const variantIcons: Record<ModalVariant, React.ReactNode> = {
    default: null,
    destructive: <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-400 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
  };

  const modalBody = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className={`w-full ${sizeClasses[size]} bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 animate-in fade-in zoom-in-95`}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-slate-800/80 bg-slate-900/50">
        <div className="flex items-center gap-3">
          {variantIcons[variant]}
          <div>
            <h3 id="modal-title" className="text-base font-semibold text-slate-100 leading-snug">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>
            )}
          </div>
        </div>
        {!hideHeaderClose && (
          <button
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content Area */}
      {children && <div className="p-5 text-sm text-slate-300 space-y-4">{children}</div>}

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-5 py-4 bg-slate-950/60 border-t border-slate-800/80">
        {secondaryActionLabel && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSecondaryAction || onClose}
          >
            {secondaryActionLabel}
          </Button>
        )}
        {primaryActionLabel && (
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            size="sm"
            isLoading={primaryActionLoading}
            onClick={onPrimaryAction || onClose}
          >
            {primaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );

  if (inlinePreview) {
    return (
      <div className="w-full flex justify-center p-4 bg-slate-950/70 rounded-xl border border-slate-800/60">
        {modalBody}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      {modalBody}
    </div>
  );
};
