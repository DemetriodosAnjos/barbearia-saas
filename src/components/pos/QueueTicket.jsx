import { queueTicketStyles } from "./QueueTicket.styles";
import Button from "../ui/Button";

export default function QueueTicket({
  ticket = {
    id: "q-101",
    position: 1,
    clientName: "Bruno Henrique",
    serviceName: "Corte Degradê na Máquina",
    entryTimeAgo: "14 min atrás",
    estimatedWaitMinutes: 20,
    priority: "vip", // 'normal' | 'vip' | 'legal'
    status: "waiting", // 'waiting' | 'called' | 'absent'
    phone: "(11) 98765-4321",
  },
  onCall,
  onStartService,
  onNotifyWhatsapp,
  onMarkAbsent,
  className = "",
}) {
  const isCalled = ticket.status === "called";
  const currentStatusStyle =
    queueTicketStyles.states[ticket.status] || queueTicketStyles.states.waiting;

  return (
    <div
      className={`${queueTicketStyles.container} ${currentStatusStyle} ${className}`}
    >
      {/* 1. CABEÇALHO: Senha, Nome, Serviço e Prioridade */}
      <div className={queueTicketStyles.header}>
        <div className={queueTicketStyles.clientGroup}>
          <div
            className={
              isCalled
                ? queueTicketStyles.ticketNumberCalled
                : queueTicketStyles.ticketNumber
            }
          >
            #{String(ticket.position).padStart(2, "0")}
          </div>

          <div className={queueTicketStyles.clientInfo}>
            <h4 className={queueTicketStyles.clientName}>
              {ticket.clientName}
            </h4>
            <p className={queueTicketStyles.serviceRequested}>
              {ticket.serviceName}
            </p>
          </div>
        </div>

        {/* Badge de Prioridade */}
        <div>
          {ticket.priority === "vip" && (
            <span className={queueTicketStyles.priorityBadges.vip}>
              👑 Assinante VIP
            </span>
          )}
          {ticket.priority === "legal" && (
            <span className={queueTicketStyles.priorityBadges.legal}>
              ♿ Prioridade Legal
            </span>
          )}
          {ticket.priority === "normal" && (
            <span className={queueTicketStyles.priorityBadges.normal}>
              Normal
            </span>
          )}
        </div>
      </div>

      {/* 2. METADADOS: Espera Estimada e Tempo que Chegou */}
      <div className={queueTicketStyles.metaGroup}>
        <div className={queueTicketStyles.metaItem}>
          <span>⏱️</span>
          <span>
            Espera:{" "}
            <strong className={queueTicketStyles.highlightWait}>
              ~{ticket.estimatedWaitMinutes} min
            </strong>
          </span>
        </div>

        <span className="text-neutral-600">•</span>

        <div className={queueTicketStyles.metaItem}>
          <span className="text-neutral-400">
            Chegou: {ticket.entryTimeAgo}
          </span>
        </div>

        {isCalled && (
          <span className="ml-auto text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40">
            Chamado no Painel 📢
          </span>
        )}
      </div>

      {/* 3. RODAPÉ DE AÇÕES DA RECEPÇÃO */}
      <div className={queueTicketStyles.footer}>
        <div className={queueTicketStyles.actionButtonsGroup}>
          {/* Botão de WhatsApp */}
          <button
            type="button"
            onClick={() => onNotifyWhatsapp && onNotifyWhatsapp(ticket)}
            className={queueTicketStyles.btnWhatsapp}
            title="Enviar mensagem no WhatsApp do cliente"
            aria-label="WhatsApp"
          >
            💬
          </button>

          {/* Botão de Ausente */}
          <button
            type="button"
            onClick={() => onMarkAbsent && onMarkAbsent(ticket)}
            className={queueTicketStyles.btnAbsent}
            title="Mover para o fim da fila ou marcar como ausente"
            aria-label="Ausente"
          >
            Ausente
          </button>
        </div>

        {/* Ação Primária: Chamar ou Iniciar */}
        {ticket.status === "waiting" ? (
          <Button
            variant="secondary"
            onClick={() => onCall && onCall(ticket)}
            className="text-xs py-1.5 px-3"
          >
            📢 Chamar
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => onStartService && onStartService(ticket)}
            className="text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500"
          >
            💺 Iniciar na Cadeira
          </Button>
        )}
      </div>
    </div>
  );
}
