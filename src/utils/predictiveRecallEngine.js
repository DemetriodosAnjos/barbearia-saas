/**
 * src/utils/predictiveRecallEngine.js
 *
 * Motor Unificado de Cálculo Preditivo de Retorno de Clientes.
 * Calcula com precisão matemática e sem distorções de timezone a janela de lembrete
 * (Faltam X dias, Falta 1 dia, Hoje ou Atrasado) baseando-se na frequência habitual (frequency_days)
 * e na última visita real (last_visit / histórico estrito de agendamentos).
 *
 * Utilizado de forma unificada no Sininho da Navbar, Modal de Notificações
 * e na Tabela e Modais de "Clientes e Prontuários".
 */

/**
 * Converte qualquer entrada de data (YYYY-MM-DD, ISO ou Date) para Date local puro (sem shift de timezone).
 */
export function parseLocalDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  }
  if (typeof dateInput === "string") {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(
        parseInt(match[1], 10),
        parseInt(match[2], 10) - 1,
        parseInt(match[3], 10)
      );
    }
    const parsed = new Date(dateInput);
    if (!isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }
  return null;
}

/**
 * Calcula a diferença em dias corridos entre duas datas no horário local (desprezando timezone/horas).
 */
export function getDaysDifference(fromDate, toDate = new Date()) {
  const d1 = parseLocalDate(fromDate);
  const d2 = parseLocalDate(toDate);
  if (!d1 || !d2) return null;

  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Localiza os agendamentos estritamente pertencentes a um determinado cliente.
 * Previne falsas colisões por telefones genéricos/placeholder (ex.: 11999999999) compartilhados em cadastros de teste.
 */
export function findClientAppointments(client, appointments = []) {
  if (!client || !Array.isArray(appointments) || appointments.length === 0) return [];
  const cleanClientId = client.id ? String(client.id) : null;
  const clientName = String(client.name || "").toLowerCase().trim();
  const rawPhone = String(client.phone || "").replace(/\D/g, "");
  const isGenericPhone =
    !rawPhone ||
    ["00000000000", "11999999999", "99999999999", "12345678901"].includes(rawPhone) ||
    rawPhone.length < 10;

  return appointments.filter((apt) => {
    if (!apt || apt.status === "cancelled" || apt.status === "cancelado") return false;

    // 1. Vínculo primário por ID do cliente
    const aptClientId = apt.clientId || apt.client_id;
    if (cleanClientId && aptClientId && String(aptClientId) === cleanClientId) {
      return true;
    }

    // 2. Vínculo por nome completo exato
    const aptName = String(apt.clientName || apt.client_name || "").toLowerCase().trim();
    if (clientName && aptName && clientName === aptName) {
      return true;
    }

    // 3. Vínculo por telefone somente se o telefone for real/único e os primeiros nomes coincidirem
    const aptPhone = String(apt.clientPhone || apt.client_phone || "").replace(/\D/g, "");
    if (!isGenericPhone && rawPhone && aptPhone === rawPhone) {
      if (clientName && aptName && clientName.length > 2 && aptName.length > 2) {
        const clientFirst = clientName.split(" ")[0];
        const aptFirst = aptName.split(" ")[0];
        if (clientFirst !== aptFirst) return false;
      }
      return true;
    }

    return false;
  });
}

/**
 * Identifica a data da última visita de um cliente (seja da coluna last_visit do banco ou do agendamento mais recente).
 */
export function getClientLastVisit(client, appointments = []) {
  if (!client) return null;

  // 1. Data explícita na coluna last_visit ou lastVisit
  const directDate =
    client.lastVisit ||
    client.last_visit ||
    client.lastVisitDate ||
    client.technicalNotes?.last_visit ||
    client.technical_notes?.last_visit;

  if (directDate && typeof directDate === "string" && directDate !== "Recém-cadastrado") {
    const d = parseLocalDate(directDate);
    if (d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }

  // 2. Fallback pelo histórico de agendamentos reais estritamente vinculados ao cliente
  const clientAppts = findClientAppointments(client, appointments);
  if (clientAppts.length > 0) {
    const sorted = [...clientAppts].sort((a, b) => {
      const dateA = a.date || (a.startTime && a.startTime.slice(0, 10)) || "";
      const dateB = b.date || (b.startTime && b.startTime.slice(0, 10)) || "";
      return dateB.localeCompare(dateA);
    });
    const newest = sorted[0];
    const newestDate = newest.date || (newest.startTime && newest.startTime.slice(0, 10));
    if (newestDate) return newestDate.slice(0, 10);
  }

  return null;
}

/**
 * Avalia o status preditivo de um cliente individual.
 * Retorna um objeto padronizado com os dados do ciclo de retorno, badges e mensagens.
 *
 * @param {Object} client Objeto do cliente
 * @param {Array} appointments Lista de agendamentos
 * @returns {Object} Dados unificados do recall
 */
export function evaluateClientPredictiveRecall(client, appointments = []) {
  if (!client) return null;

  // Extrai a frequência habitual (default 18 dias)
  const frequencyDays = Number(
    client.frequencyDays ??
    client.frequency_days ??
    client.technicalNotes?.frequency_days ??
    client.technical_notes?.frequency_days ??
    18
  );

  const isReminderEnabled = Boolean(
    client.reminderEnabled ??
    client.reminder_enabled ??
    client.technicalNotes?.reminder_enabled ??
    client.technical_notes?.reminder_enabled ??
    true
  );

  const rawLeadDays = Number(
    client.alertLeadDays ??
    client.alert_lead_days ??
    client.technicalNotes?.alert_lead_days ??
    client.technical_notes?.alert_lead_days ??
    3
  );
  const alertLeadDays = rawLeadDays > 0 ? rawLeadDays : 3;

  const lastVisitDate = getClientLastVisit(client, appointments);

  // Se o cliente nunca compareceu (sem last_visit e sem agendamentos passados), não há base para cálculo
  if (!lastVisitDate) {
    return {
      clientId: client.id,
      clientName: client.name || "Cliente",
      clientPhone: client.phone || "",
      preferredBarber: client.preferredBarber || client.preferred_barber || "Seu Barbeiro",
      frequencyDays: frequencyDays > 0 ? frequencyDays : 18,
      reminderEnabled: isReminderEnabled,
      alertLeadDays,
      hasVisit: false,
      lastVisitDate: null,
      daysSinceLastVisit: null,
      daysRemaining: null,
      isWithinAlertWindow: false,
      statusCategory: "none",
      urgency: "none",
      tagText: null,
      shortTag: null,
      label: null,
      badgeClass: "",
    };
  }

  const daysSinceLastVisit = getDaysDifference(lastVisitDate);
  const safeDaysSince = daysSinceLastVisit !== null && daysSinceLastVisit >= 0 ? daysSinceLastVisit : 0;
  const safeFreq = frequencyDays > 0 ? frequencyDays : 18;
  const daysRemaining = safeFreq - safeDaysSince;

  // Janela de Alerta personalizada:
  // Faltando X dias (dias restantes <= alertLeadDays) e lembrete ativo
  const isWithinAlertWindow = isReminderEnabled && daysRemaining <= alertLeadDays;

  let label = "";
  let tagText = "";
  let shortTag = "";
  let badgeClass = "";
  let urgency = "medium"; // 'low' | 'medium' | 'high' | 'overdue'
  let statusCategory = "upcoming"; // 'upcoming' | 'today' | 'expired'

  const clientFirstName = (client.name || "Cliente").split(" ")[0];

  if (daysRemaining > 0) {
    statusCategory = "upcoming";
    if (daysRemaining === 1) {
      label = `Falta 1 dia para ${clientFirstName} cortar o cabelo`;
      tagText = "FALTA 1 DIA";
      shortTag = "Falta 1d";
      urgency = "medium";
      badgeClass = "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse";
    } else {
      label = `Faltam ${daysRemaining} dias para ${clientFirstName} cortar o cabelo`;
      tagText = `FALTAM ${daysRemaining} DIAS`;
      shortTag = `Faltam ${daysRemaining}d`;
      urgency = "low";
      badgeClass = "bg-blue-500/20 text-blue-300 border-blue-500/40";
    }
  } else if (daysRemaining === 0) {
    statusCategory = "today";
    label = `Hoje é o dia do retorno de ${clientFirstName}`;
    tagText = "HOJE";
    shortTag = "Hoje";
    urgency = "high";
    badgeClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse";
  } else {
    // Dias negativos = a contagem zerou e o prazo expirou: entra como ATRASADO
    statusCategory = "expired";
    const daysLate = Math.abs(daysRemaining);
    label = `Tempo expirado para o retorno de ${clientFirstName} (há ${daysLate} dia${daysLate > 1 ? "s" : ""})`;
    tagText = `ATRASADO (${daysLate}d)`;
    shortTag = `Atrasado (${daysLate}d)`;
    urgency = "overdue";
    badgeClass = "bg-red-500/20 text-red-300 border-red-500/40";
  }

  return {
    clientId: client.id,
    clientName: client.name || "Cliente",
    clientPhone: client.phone || "",
    preferredBarber: client.preferredBarber || client.preferred_barber || "Seu Barbeiro",
    frequencyDays: safeFreq,
    reminderEnabled: isReminderEnabled,
    alertLeadDays,
    hasVisit: true,
    lastVisitDate,
    daysSinceLastVisit: safeDaysSince,
    daysRemaining,
    isWithinAlertWindow,
    statusCategory,
    urgency,
    tagText,
    shortTag,
    label,
    badgeClass,
  };
}

/**
 * Varre a lista de clientes e retorna todos os que estão ativamente na janela de alerta.
 *
 * @param {Array} clients Lista de clientes
 * @param {Array} appointments Lista de agendamentos
 * @returns {Array} Lista de lembretes preditivos ativos
 */
export function getActivePredictiveRecallReminders(clients = [], appointments = []) {
  if (!Array.isArray(clients) || clients.length === 0) return [];

  const reminders = [];

  for (const client of clients) {
    if (!client) continue;
    if (client.status === "inactive" || client.status === "at_risk") continue;

    const reminder = evaluateClientPredictiveRecall(client, appointments);
    if (reminder && reminder.hasVisit && reminder.isWithinAlertWindow) {
      reminders.push(reminder);
    }
  }

  // Ordena por maior relevância: Hoje (0) primeiro, depois 1 dia, 2 dias, 3 dias, depois atrasados
  reminders.sort((a, b) => {
    const scoreA =
      a.daysRemaining === 0 ? 0 : a.daysRemaining > 0 ? a.daysRemaining : 100 + Math.abs(a.daysRemaining);
    const scoreB =
      b.daysRemaining === 0 ? 0 : b.daysRemaining > 0 ? b.daysRemaining : 100 + Math.abs(b.daysRemaining);
    return scoreA - scoreB;
  });

  return reminders;
}
