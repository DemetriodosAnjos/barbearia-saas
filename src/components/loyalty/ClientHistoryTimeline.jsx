import { timelineStyles } from "./ClientHistoryTimeline.styles";
import Button from "../ui/Button";

export default function ClientHistoryTimeline({
  metrics = {
    totalVisits: 14,
    averageTicket: 84.5,
    frequencyDays: 18,
    preferredBarber: "Carlos Silva (85%)",
  },
  technicalNotes = {
    cutSpecs:
      "Lateral disfarçada no pente 1, tesoura desfiada no topo, risco fino na sobrancelha esquerda.",
    beardSpecs:
      "Barba alinhada com toalha quente, desenhada na navalha sem tirar comprimento.",
    allergyAlert:
      "Sensibilidade a lâmina no pescoço (usar pós-barba sem álcool).",
  },
  events = [],
  onAddTechnicalNote,
  className = "",
}) {
  return (
    <div className={`${timelineStyles.container} ${className}`}>
      {/* 1. MÉTRICAS DE ENGAJAMENTO (CARD RESUMO) */}
      <div className={timelineStyles.metricsGrid}>
        <div className={timelineStyles.metricBox}>
          <span className={timelineStyles.metricLabel}>Total Visitas</span>
          <span className={timelineStyles.metricValue}>
            {metrics.totalVisits} cortes
          </span>
        </div>

        <div className={timelineStyles.metricBox}>
          <span className={timelineStyles.metricLabel}>Ticket Médio</span>
          <span
            className={`${timelineStyles.metricValue} ${timelineStyles.metricHighlight}`}
          >
            R$ {Number(metrics.averageTicket).toFixed(2).replace(".", ",")}
          </span>
        </div>

        <div className={timelineStyles.metricBox}>
          <span className={timelineStyles.metricLabel}>Frequência</span>
          <span className={timelineStyles.metricValue}>
            A cada {metrics.frequencyDays} dias
          </span>
        </div>

        <div className={timelineStyles.metricBox}>
          <span className={timelineStyles.metricLabel}>Preferência</span>
          <span className="text-xs font-bold text-neutral-200 truncate mt-0.5">
            {metrics.preferredBarber}
          </span>
        </div>
      </div>

      {/* 2. FICHA TÉCNICA DO CLIENTE (PREFERÊNCIAS E ALERGIAS) */}
      <div className={timelineStyles.notesBox}>
        <div className={notesHeader}>
          <span>✂️ Ficha Técnica & Preferências</span>
          <button
            type="button"
            onClick={onAddTechnicalNote}
            className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer lowercase"
          >
            + Atualizar Nota
          </button>
        </div>

        {/* Alerta de Alergia em Destaque */}
        {technicalNotes.allergyAlert && (
          <div className={timelineStyles.allergyTag}>
            <span>⚠️</span>
            <span>{technicalNotes.allergyAlert}</span>
          </div>
        )}

        <div className="space-y-1">
          <p className={timelineStyles.notesText}>
            <strong className="text-neutral-200">Corte:</strong>{" "}
            {technicalNotes.cutSpecs}
          </p>
          <p className={timelineStyles.notesText}>
            <strong className="text-neutral-200">Barba:</strong>{" "}
            {technicalNotes.beardSpecs}
          </p>
        </div>
      </div>

      {/* 3. LINHA DO TEMPO CRONOLÓGICA (TIMELINE) */}
      <div className={timelineStyles.timelineWrapper}>
        <div className="flex items-center justify-between">
          <h4 className={timelineStyles.timelineTitle}>
            Histórico Cronológico de Atendimentos
          </h4>
          <span className="text-[10px] text-neutral-500">
            Últimos {events.length} registros
          </span>
        </div>

        <div className={timelineStyles.eventsList}>
          {events.map((ev) => {
            const isService = ev.type === "service";
            const isProduct = ev.type === "product";
            const isNoShow = ev.type === "no_show";

            const dotStyle = isService
              ? timelineStyles.dotService
              : isProduct
                ? timelineStyles.dotProduct
                : timelineStyles.dotNoShow;

            const icon = isService ? "✂️" : isProduct ? "🛍️" : "✕";

            return (
              <div key={ev.id} className={timelineStyles.eventNode}>
                {/* Ponto na Linha do Tempo */}
                <div className={`${timelineStyles.nodeDot} ${dotStyle}`}>
                  <span>{icon}</span>
                </div>

                {/* Card com Detalhes do Evento */}
                <div className={timelineStyles.eventCard}>
                  <div className={timelineStyles.eventHeader}>
                    <div>
                      <h5 className={timelineStyles.eventTitle}>{ev.title}</h5>
                      <div className={timelineStyles.eventMeta}>
                        {ev.barberName && <span>Por: {ev.barberName}</span>}
                        {ev.barberName && <span>•</span>}
                        <span className={timelineStyles.eventPrice}>
                          R${" "}
                          {Number(ev.totalPrice).toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                    </div>

                    <span className={timelineStyles.eventDate}>{ev.date}</span>
                  </div>

                  {/* Nota Técnica Registrada naquele atendimento */}
                  {ev.notes && (
                    <p className={timelineStyles.eventTechnicalNote}>
                      "{ev.notes}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const notesHeader =
  "flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider";
