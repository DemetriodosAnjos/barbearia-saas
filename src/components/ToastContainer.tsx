import React from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useBarbershop();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-amber-500/40 bg-[#12161f]/95 text-slate-100';
        let Icon = Info;
        let iconColor = 'text-amber-400';

        if (toast.type === 'success') {
          borderClass = 'border-emerald-500/40 bg-[#101915]/95 text-emerald-100';
          Icon = CheckCircle2;
          iconColor = 'text-emerald-400';
        } else if (toast.type === 'warning') {
          borderClass = 'border-rose-500/40 bg-[#1f1214]/95 text-rose-100';
          Icon = AlertTriangle;
          iconColor = 'text-rose-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-xl backdrop-blur-md transition-all duration-200 ${borderClass}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="text-xs font-medium leading-relaxed flex-1">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
              aria-label="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
