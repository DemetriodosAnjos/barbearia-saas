import { timelineStyles } from "./ClientHistoryTimeline.styles";

export default function ClientHistoryTimeline({
  metrics = {},
  technicalNotes = {},
  events = [],
  onAddTechnicalNote,
  className = "",
}) {
  // Variáveis: normalização defensiva das métricas com base zero/neutro
  const totalVisits = Number(
    metrics.totalVisits || metrics.total_visits || events.length || 0,
  );
  const averageTicket = Number(
    metrics.averageTicket || metrics.average_ticket || 0,
  );
  const frequencyDays = metrics.frequencyDays || metrics.frequency_days || null;
  const preferredBarber =
    metrics.preferredBarber || metrics.preferred_barber || "—";

  // Objeto: extração segura das notas técnicas reais do cliente
  const cutSpecs = technicalNotes.cutSpecs || technicalNotes.cut_specs;
  const beardSpecs = technicalNotes.beardSpecs || technicalNotes.beard_specs;
  const allergyAlert =
    technicalNotes.allergyAlert || technicalNotes.allergy_alert;
  const hasAnyNotes = Boolean(cutSpecs || beardSpecs || allergyAlert);

  return (
    <div className={`${timelineStyles.container} ${className}`}>
      {/* 1. MÉTRICAS DE ENGAJAMENTO REAIS */}
      <div className={timelineStyles.metricsGrid}>
        <div className={timelineStyles.metricBox}>
          <span className={timelineStyles.metricLabel}>Total Visitas</span>
          <span className={timelineStyles.metricValue}>
            {totalVisits} {totalVisits === 1 ? "corte" : "cortes"}
          </span>
        </div>

        <div className={timelineStyles.metricBox}>
          <span className={timelineStyles.metricLabel}>Ticket Médio</span>
          <span
            className={`${timelineStyles.metricValue} ${timelineStyles.metricHighlight}`}
          >
            R$ {averageTicket.toFixed(2).replace(".", ",")}
          </span>
        </div>

        <div className={timelineStyles.metricBox}>
          <span className={timelineStyles.metricLabel}>Frequência</span>
          <span className={timelineStyles.metricValue}>
            {frequencyDays ? `A cada ${frequencyDays} dias` : "Primeiro ciclo"}
          </span>
        </div>

        <div className={timelineStyles.metricBox}>
          <span className={timelineStyles.metricLabel}>Preferência</span>
          <span className="text-xs font-bold text-neutral-200 truncate mt-0.5">
            {preferredBarber}
          </span>
        </div>
      </div>

      {/* 2. FICHA TÉCNICA DO CLIENTE COM SUPORTE A EMPTY STATE */}
      <div className={timelineStyles.notesBox}>
        <div className={notesHeader}>
          <span>✂️ Ficha Técnica & Preferências</span>
          <button
            type="button"
            onClick={onAddTechnicalNote}
            className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer lowercase"
          >
            {hasAnyNotes ? "Editar Ficha" : "+ Cadastrar Ficha"}
          </button>
        </div>

        {/* Alerta de Alergia em Destaque (Aparece somente se o cliente tiver alergia real registrada) */}
        {allergyAlert && (
          <div className={timelineStyles.allergyTag}>
            <span>⚠️</span>
            <span>{allergyAlert}</span>
          </div>
        )}

        {hasAnyNotes ? (
          <div className="space-y-1">
            {cutSpecs && (
              <p className={timelineStyles.notesText}>
                <strong className="text-neutral-200">Corte:</strong> {cutSpecs}
              </p>
            )}
            {beardSpecs && (
              <p className={timelineStyles.notesText}>
                <strong className="text-neutral-200">Barba:</strong>{" "}
                {beardSpecs}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-neutral-500 italic py-1">
            Nenhuma preferência ou nota técnica registrada para este cliente.
          </p>
        )}
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
          {events.length === 0 && (
            <div className="py-8 text-center text-xs text-neutral-500">
              Nenhum histórico anterior registrado para este cliente.
            </div>
          )}
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
                <div className={timelineStyles.eventsList}>
                  {events.length === 0 && (
                    <div className="py-8 text-center text-xs text-neutral-500">
                      Nenhum histórico anterior registrado para este cliente.
                    </div>
                  )}

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
                        <div
                          className={`${timelineStyles.nodeDot} ${dotStyle}`}
                        >
                          <span>{icon}</span>
                        </div>

                        {/* Card com Detalhes do Evento */}
                        <div className={timelineStyles.eventCard}>
                          <div className={timelineStyles.eventHeader}>
                            <div>
                              {/* Título do Atendimento + Badge de Falta se for No-Show */}
                              <div className="flex items-center gap-2">
                                <h5 className={timelineStyles.eventTitle}>
                                  {ev.title}
                                </h5>
                                {isNoShow && (
                                  <span className="text-[10px] font-bold text-red-400 bg-red-950/50 border border-red-800/60 px-1.5 py-0.5 rounded">
                                    Falta / Não Compareceu
                                  </span>
                                )}
                              </div>

                              {/* Profissional e Valor */}
                              <div className={timelineStyles.eventMeta}>
                                {ev.barberName && (
                                  <span>Por: {ev.barberName}</span>
                                )}
                                {ev.barberName && <span>•</span>}
                                <span className={timelineStyles.eventPrice}>
                                  R${" "}
                                  {Number(ev.totalPrice || ev.price || 0)
                                    .toFixed(2)
                                    .replace(".", ",")}
                                </span>
                              </div>
                            </div>

                            <span className={timelineStyles.eventDate}>
                              {ev.date}
                            </span>
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
            );
          })}
        </div>
      </div>
    </div>
  );
}

const notesHeader =
  "flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider";
