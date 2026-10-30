/**
 * src/components/notifications/PredictiveRecallNotificationsModal.jsx
 *
 * Modal/Painel que exibe a listagem de alertas preditivos de retorno na Navbar da Barbearia.
 * Permite ao gestor visualizar a contagem regressiva de cada cliente e disparar o WhatsApp diretamente.
 */

import React from "react";
import ProjectIcon from "../ui/ProjectIcon";
import Button from "../ui/Button";

export default function PredictiveRecallNotificationsModal({
  isOpen,
  onClose,
  reminders = [],
  onOpenWhatsAppModal,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-modal-title"
    >
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Cabeçalho */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ProjectIcon name="Bell" size={20} />
            </div>
            <div>
              <h2
                id="notifications-modal-title"
                className="text-base font-extrabold text-white flex items-center gap-2"
              >
                Lembretes Preditivos de Retorno
                {reminders.length > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                    {reminders.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Clientes na janela habitual de retorno configurada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800/60 transition-colors"
            aria-label="Fechar avisos"
          >
            <ProjectIcon name="X" size={18} />
          </button>
        </div>

        {/* Corpo da Lista */}
        <div className="p-5 overflow-y-auto space-y-3 divide-y divide-neutral-800/40">
          {reminders.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <ProjectIcon name="Check" size={24} />
              </div>
              <h3 className="text-sm font-bold text-white">Nenhum cliente na janela de retorno hoje</h3>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                Todos os seus clientes estão em dia ou ainda não atingiram o período habitual de corte.
              </p>
            </div>
          ) : (
            reminders.map((reminder) => {
              const isToday = reminder.daysRemaining === 0;
              const isTomorrow = reminder.daysRemaining === 1;
              const isOverdue = reminder.daysRemaining < 0;

              const badgeColor = isOverdue
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : isToday
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : isTomorrow
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-blue-500/10 border-blue-500/30 text-blue-400";

              const badgeText =
                reminder.tagText ||
                (isOverdue
                  ? `ATRASADO (${Math.abs(reminder.daysRemaining)}d)`
                  : isToday
                  ? "HOJE"
                  : isTomorrow
                  ? "FALTA 1 DIA"
                  : `FALTAM ${reminder.daysRemaining} DIAS`);

              return (
                <div
                  key={reminder.clientId}
                  className="pt-3 first:pt-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white truncate">
                        {reminder.clientName}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${badgeColor}`}
                      >
                        {badgeText}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {reminder.label}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-neutral-500 mt-1">
                      <span>Frequência: a cada {reminder.frequencyDays} dias</span>
                      <span>•</span>
                      <span>Barbeiro: {reminder.preferredBarber}</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onClose();
                      if (onOpenWhatsAppModal) {
                        onOpenWhatsAppModal(reminder);
                      }
                    }}
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                  >
                    <ProjectIcon name="Smartphone" size={14} />
                    <span>Lembrar</span>
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex justify-between items-center text-xs text-neutral-400">
          <span>O cálculo atualiza automaticamente a cada visita registrada</span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
