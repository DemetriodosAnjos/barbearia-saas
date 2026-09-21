import { queueTicketStyles } from "./QueueTicket.styles";
import Button from "../ui/Button";

export default function QueueTicket({
  // [Remoção do mock fixo de Bruno Henrique, inicializando com objeto vazio]
  ticket = {},
  onCall,
  onStartService,
  onNotifyWhatsapp,
  onMarkAbsent,
  className = "",
}) {
  // [Defesa: não renderiza se o ticket for nulo ou sem identificador válido]
  if (!ticket || (!ticket.id && !ticket.client_name && !ticket.clientName))
    return null;

  // [Normalização defensiva de variáveis suportando snake_case do Supabase e camelCase]
  const position = ticket.position ?? 1;
  const clientName =
    ticket.clientName || ticket.client_name || "Cliente sem Nome";
  const serviceName =
    ticket.serviceName || ticket.service_name || "Atendimento Geral";
  const priority = ticket.priority || "normal";
  const status = ticket.status || "waiting";
  const estimatedWaitMinutes =
    ticket.estimatedWaitMinutes || ticket.estimated_wait_minutes || 15;
  const entryTimeAgo =
    ticket.entryTimeAgo || ticket.entry_time_ago || "Recém-chegado";

  // [Variáveis de controle visual de status de chamada da fila]
  const isCalled = status === "called";
  const currentStatusStyle =
    queueTicketStyles.states[status] || queueTicketStyles.states.waiting;

  return (
    <div
      className={`${queueTicketStyles.container} ${currentStatusStyle} ${className}`}
    >
      {/* 1. CABEÇALHO: Senha, Nome, Serviço e Prioridade */}
      <div className={queueTicketStyles.header}>
        <div className={queueTicketStyles.clientGroup}>
          {/* [Formatação dinâmica do número da senha com zeros à esquerda] */}
          <div
            className={
              isCalled
                ? queueTicketStyles.ticketNumberCalled
                : queueTicketStyles.ticketNumber
            }
          >
            #{String(position).padStart(2, "0")}
          </div>

          <div className={queueTicketStyles.clientInfo}>
            {/* [Exibição do nome e serviço reais solicitados pelo cliente] */}
            <h4 className={queueTicketStyles.clientName}>{clientName}</h4>
            <p className={queueTicketStyles.serviceRequested}>{serviceName}</p>
          </div>
        </div>

        {/* [Renderização condicional do selo de prioridade real da fila] */}
        <div>
          {priority === "vip" && (
            <span className={queueTicketStyles.priorityBadges.vip}>
              👑 Assinante VIP
            </span>
          )}
          {priority === "legal" && (
            <span className={queueTicketStyles.priorityBadges.legal}>
              ♿ Prioridade Legal
            </span>
          )}
          {priority === "normal" && (
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
          {/* [Exibição do tempo estimado de espera calculado pelo sistema] */}
          <span>
            Espera:{" "}
            <strong className={queueTicketStyles.highlightWait}>
              ~{estimatedWaitMinutes} min
            </strong>
          </span>
        </div>

        <span className="text-neutral-600">•</span>

        <div className={queueTicketStyles.metaItem}>
          {/* [Horário ou tempo relativo real desde a emissão da senha] */}
          <span className="text-neutral-400">Chegou: {entryTimeAgo}</span>
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

        {/* [Ação Primária: Chamar ou Iniciar na Cadeira conforme o status real] */}
        {status === "waiting" ? (
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
