/**
 * src/utils/predictiveRecallEngine.js
 *
 * Motor de Cálculo Preditivo de Retorno de Clientes.
 * Calcula com precisão matemática a janela de lembrete (3 dias, 2 dias, 1 dia, Hoje ou Atrasado)
 * baseado na frequência habitual (frequency_days) e na última visita (last_visit / histórico).
 */

/**
 * Calcula a diferença em dias entre duas datas no horário local (desprezando timezone/horas).
 */
export function getDaysDifference(fromDate, toDate = new Date()) {
  if (!fromDate) return null;
  const start = new Date(fromDate);
  if (isNaN(start.getTime())) return null;

  // Zera horas para comparação estrita de calendário
  const d1 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const d2 = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());

  const diffTime = d2.getTime() - d1.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Avalia o status preditivo de um cliente individual.
 * Retorna null se não estiver na janela de alerta ou se estiver em risco/sem histórico.
 *
 * @param {Object} client Objeto do cliente
 * @param {Array} appointments Lista de agendamentos para fallback de última data
 * @returns {Object|null} Objeto com dados do lembrete ou null
 */
export function evaluateClientPredictiveRecall(client, appointments = []) {
  if (!client) return null;

  // Extrai a frequência habitual (default 18 dias conforme padrão da barbearia)
  const frequencyDays = Number(
    client.frequencyDays ??
    client.frequency_days ??
    client.technicalNotes?.frequency_days ??
    client.technical_notes?.frequency_days ??
    18
  );

  if (frequencyDays <= 0) return null;

  // Encontra a data da última visita
  let lastVisitDate = client.lastVisit || client.last_visit || null;

  // Se não tiver lastVisit direto no cadastro, busca o agendamento concluído mais recente
  if (!lastVisitDate && Array.isArray(appointments) && appointments.length > 0) {
    const clientPhone = String(client.phone || "").replace(/\D/g, "");
    const clientName = String(client.name || "").toLowerCase().trim();

    const clientAppointments = appointments.filter((apt) => {
      const aptPhone = String(apt.client_phone || apt.clientPhone || "").replace(/\D/g, "");
      const aptName = String(apt.client_name || apt.clientName || "").toLowerCase().trim();
      const isMatch = (clientPhone && aptPhone && clientPhone === aptPhone) || (clientName && aptName && clientName === aptName);
      return isMatch && apt.status !== "cancelled";
    });

    if (clientAppointments.length > 0) {
      // Ordena decrescente por data
      clientAppointments.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.start_time || a.startTime || "00:00"}`);
        const dateB = new Date(`${b.date}T${b.start_time || b.startTime || "00:00"}`);
        return dateB - dateA;
      });
      lastVisitDate = clientAppointments[0].date;
    }
  }

  // Se o cliente nunca compareceu, não há base para cálculo preditivo
  if (!lastVisitDate) return null;

  const daysSinceLastVisit = getDaysDifference(lastVisitDate);
  if (daysSinceLastVisit === null || daysSinceLastVisit < 0) return null;

  // Dias restantes até o dia habitual do retorno
  const daysRemaining = frequencyDays - daysSinceLastVisit;

  // Janela de Alerta solicitada pelo usuário:
  // Faltam 3 dias, 2 dias, 1 dia, ou 0 dias (Hoje).
  // Também acolhemos atrasos recentes (até 5 dias após o prazo).
  if (daysRemaining > 3) {
    return null; // Ainda não entrou na janela
  }

  let label = "";
  let urgency = "medium"; // 'low' | 'medium' | 'high' | 'overdue'

  if (daysRemaining === 3) {
    label = `Faltam 3 dias para ${client.name.split(" ")[0]} cortar o cabelo`;
    urgency = "low";
  } else if (daysRemaining === 2) {
    label = `Faltam 2 dias para ${client.name.split(" ")[0]} cortar o cabelo`;
    urgency = "medium";
  } else if (daysRemaining === 1) {
    label = `Falta 1 dia para ${client.name.split(" ")[0]} cortar o cabelo`;
    urgency = "high";
  } else if (daysRemaining === 0) {
    label = `Hoje ${client.name.split(" ")[0]} tem que cortar o cabelo`;
    urgency = "high";
  } else {
    // Dias negativos = atrasado
    const daysLate = Math.abs(daysRemaining);
    label = `${client.name.split(" ")[0]} deveria ter retornado há ${daysLate} dia${daysLate > 1 ? "s" : ""}`;
    urgency = "overdue";
  }

  return {
    clientId: client.id,
    clientName: client.name,
    clientPhone: client.phone,
    preferredBarber: client.preferredBarber || client.preferred_barber || "Seu Barbeiro",
    frequencyDays,
    daysSinceLastVisit,
    daysRemaining,
    lastVisitDate,
    label,
    urgency,
  };
}

/**
 * Varre a lista de clientes e retorna todos os que estão na janela de retorno preditivo.
 *
 * @param {Array} clients Lista de clientes
 * @param {Array} appointments Lista de agendamentos
 * @returns {Array} Lista de lembretes preditivos ativos
 */
export function getActivePredictiveRecallReminders(clients = [], appointments = []) {
  if (!Array.isArray(clients) || clients.length === 0) return [];

  const reminders = [];

  for (const client of clients) {
    // Ignora clientes com status at_risk/inativo se especificado
    if (client.status === "inactive") continue;

    const reminder = evaluateClientPredictiveRecall(client, appointments);
    if (reminder) {
      reminders.push(reminder);
    }
  }

  // Ordena por maior urgência (Hoje primeiro, depois 1 dia, 2 dias, 3 dias, depois atrasados)
  reminders.sort((a, b) => {
    // Prioridade: 0 (hoje), 1, 2, 3, negativos
    const scoreA = a.daysRemaining === 0 ? 0 : a.daysRemaining > 0 ? a.daysRemaining : 10 + Math.abs(a.daysRemaining);
    const scoreB = b.daysRemaining === 0 ? 0 : b.daysRemaining > 0 ? b.daysRemaining : 10 + Math.abs(b.daysRemaining);
    return scoreA - scoreB;
  });

  return reminders;
}
