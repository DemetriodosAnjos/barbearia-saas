import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
// [Import: cliente Supabase para cadastro e sincronização real de clientes]
import { supabase } from "../../lib/supabase";
import { safeStorage } from "../../utils/safeStorage";
import { clientsStyles } from "./ClientsDirectoryView.styles";
import StatCard from "../../components/dashboard/StatCard";
import Table from "../../components/ui/Table";
import SearchInput from "../../components/ui/SearchInput";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Alert from "../../components/ui/Alert";
import { SafeHtml } from "../../components/ui/SafeHtml";
import ClientHistoryTimeline from "../../components/loyalty/ClientHistoryTimeline";
import { validateSchema, SCHEMAS } from "../../utils/inputValidator";
import { buildClientBookingUrl } from "../../utils/publicBookingUrl";
import {
  Users,
  ArrowLeft,
  Star,
  Scissors,
  Bell,
  FileText,
  Calendar,
  Smartphone,
  Lightbulb,
} from "lucide-react";

// Normalização defensiva dos registros da tabela clients (suporta snake_case e camelCase)
export function normalizeClientRecord(c) {
  if (!c || typeof c !== "object") return {};

  const techNotes =
    typeof c.technical_notes === "object" && c.technical_notes !== null
      ? c.technical_notes
      : typeof c.technicalNotes === "object" && c.technicalNotes !== null
      ? c.technicalNotes
      : {};

  const totalSpent = Number(
    c.totalSpent ??
      c.total_spent ??
      techNotes.total_spent ??
      (Number(c.average_ticket || 0) * Number(c.total_visits || c.totalVisits || 0))
  );
  const totalVisits = Number(
    c.totalVisits ?? c.total_visits ?? c.total_cuts ?? techNotes.total_visits ?? 0
  );
  const frequencyDays = Number(
    c.frequencyDays ?? c.frequency_days ?? techNotes.frequency_days ?? 18
  );
  const isVip = Boolean(c.isVip ?? c.is_vip ?? techNotes.is_vip);
  const rawLastVisit =
    c.lastVisitDate ||
    c.last_visit ||
    c.lastVisit ||
    techNotes.last_visit ||
    "";

  let daysSinceLastVisit = Number(c.daysSinceLastVisit ?? techNotes.days_since_last_visit ?? 0);
  if (!daysSinceLastVisit && rawLastVisit) {
    try {
      const visitDate = new Date(rawLastVisit);
      if (!Number.isNaN(visitDate.getTime())) {
        const diffMs = Date.now() - visitDate.getTime();
        daysSinceLastVisit = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    } catch {
      daysSinceLastVisit = 0;
    }
  }

  const rawStatus =
    c.status ||
    techNotes.status ||
    (daysSinceLastVisit > 40 ? "at_risk" : isVip ? "vip" : "active");
  const preferredBarber =
    c.preferredBarber ||
    c.preferred_barber ||
    techNotes.preferred_barber ||
    "Barbeiro Geral";

  const cpf = c.cpf || techNotes.cpf || "";
  const birthDate = c.birthDate || c.birth_date || techNotes.birth_date || "";
  const notes =
    c.notes ||
    techNotes.notes ||
    (typeof c.technical_notes === "string" ? c.technical_notes : "");

  return {
    ...c,
    id: c.id,
    barbershop_id: c.barbershop_id,
    name: c.name || "Cliente sem Nome",
    phone: c.phone || "",
    email: c.email || "",
    cpf,
    birthDate,
    birth_date: birthDate,
    isVip,
    is_vip: isVip,
    status: rawStatus,
    frequencyDays: frequencyDays > 0 ? frequencyDays : 18,
    frequency_days: frequencyDays > 0 ? frequencyDays : 18,
    totalVisits: Number.isFinite(totalVisits) ? totalVisits : 0,
    total_visits: Number.isFinite(totalVisits) ? totalVisits : 0,
    totalSpent: Number.isFinite(totalSpent) ? totalSpent : 0,
    average_ticket: Number(c.average_ticket || (totalVisits > 0 ? totalSpent / totalVisits : 0)),
    lastVisitDate: rawLastVisit
      ? typeof rawLastVisit === "string"
        ? rawLastVisit.slice(0, 10)
        : "Recém-cadastrado"
      : "Recém-cadastrado",
    daysSinceLastVisit: Number.isFinite(daysSinceLastVisit) ? daysSinceLastVisit : 0,
    preferredBarber,
    preferred_barber: preferredBarber,
    notes,
    technical_notes: techNotes,
    technicalNotes: {
      cutSpecs: techNotes.cutSpecs || notes || "Primeiro atendimento na barbearia.",
      beardSpecs: techNotes.beardSpecs || "",
      allergyAlert: techNotes.allergyAlert || "",
      ...techNotes,
    },
  };
}

// [Função componente: recebe clientsList real e callback de atualização do dashboard]
export default function ClientsDirectoryView({
  clientsList = [],
  onUpdateClients,
  onUpdateClient,
  onNavigateToBooking,
  onBack,
  tenant,
  barbers = [],
  appointments = [],
  onUpdateAppointments,
}) {
  // [Estado: inicializado com a lista normalizada da barbearia ou do cache local seguro]
  const [clients, setClients] = useState(() => {
    if (Array.isArray(clientsList) && clientsList.length > 0) {
      return clientsList.map(normalizeClientRecord);
    }
    try {
      const cached = safeStorage.getItem("saas_clients_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeClientRecord);
        }
      }
    } catch {}
    return [];
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isSavingClient, setIsSavingClient] = useState(false);

  // [Efeito de sincronização: atualiza a lista interna sempre que a prop clientsList for informada com itens]
  useEffect(() => {
    if (Array.isArray(clientsList) && clientsList.length > 0) {
      setClients(clientsList.map(normalizeClientRecord));
    }
  }, [clientsList]);

  // Modal de Prontuário Técnico
  const [selectedClientForRecord, setSelectedClientForRecord] = useState(null);

  // Modal de Edição Completa de Cliente (Nome, Telefone, Total Gasto R$, Barbeiro Preferido e Frequência Habitual)
  const [editingClient, setEditingClient] = useState(null);
  const [fullEditForm, setFullEditForm] = useState({
    name: "",
    phone: "",
    email: "",
    cpf: "",
    totalSpent: "0,00",
    frequencyDays: "18",
    preferredBarber: "",
    notes: "",
  });
  const [isSavingFullEdit, setIsSavingFullEdit] = useState(false);
  const [fullEditError, setFullEditError] = useState("");

  const handleOpenFullEditClient = (client) => {
    if (!client) return;
    setFullEditError("");
    const rawSpent = Number(client.totalSpent ?? client.total_spent ?? 0);
    const safeSpent = Number.isFinite(rawSpent) ? rawSpent : 0;
    const rawFreq = Number(client.frequencyDays ?? client.frequency_days ?? 18);
    const safeFreq = rawFreq > 0 ? rawFreq : 18;

    const defaultBarber =
      client.preferredBarber ||
      client.preferred_barber ||
      (barbers && barbers.length > 0 ? barbers[0].name : "Barbeiro Geral");

    setFullEditForm({
      name: client.name || "",
      phone: client.phone || "",
      email: client.email || "",
      cpf: client.cpf || "",
      totalSpent: safeSpent.toFixed(2).replace(".", ","),
      frequencyDays: String(safeFreq),
      preferredBarber: defaultBarber,
      notes: client.notes || client.technicalNotes?.cutSpecs || "",
    });
    setEditingClient(client);
  };

  const handleSaveFullEditClient = async () => {
    if (!editingClient) return;
    const trimmedName = (fullEditForm.name || "").trim();
    if (!trimmedName) {
      setFullEditError("O nome do cliente é obrigatório.");
      return;
    }
    const cleanPhone = (fullEditForm.phone || "").trim();
    if (!cleanPhone) {
      setFullEditError("O telefone/WhatsApp do cliente é obrigatório.");
      return;
    }

    setIsSavingFullEdit(true);
    setFullEditError("");

    try {
      const sanitizedName = DOMPurify.sanitize(trimmedName, { ALLOWED_TAGS: [] });
      const sanitizedPhone = DOMPurify.sanitize(cleanPhone, { ALLOWED_TAGS: [] });
      const sanitizedEmail = DOMPurify.sanitize((fullEditForm.email || "").trim(), { ALLOWED_TAGS: [] });
      const sanitizedCpf = DOMPurify.sanitize((fullEditForm.cpf || "").trim(), { ALLOWED_TAGS: [] });
      const sanitizedNotes = DOMPurify.sanitize((fullEditForm.notes || "").trim(), { ALLOWED_TAGS: [] });
      const selectedBarber = fullEditForm.preferredBarber || "Barbeiro Geral";

      // Parse de Total Gasto (R$) com suporte a formato livre digitado pelo gestor
      const cleanSpentStr = String(fullEditForm.totalSpent || "0")
        .replace(/R\$/g, "")
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      const parsedSpent = parseFloat(cleanSpentStr);
      const safeSpent = Number.isFinite(parsedSpent) ? Math.max(0, parsedSpent) : 0;

      // Parse de Frequência Habitual (validado entre 1 e 365 dias)
      const parsedFreq = parseInt(fullEditForm.frequencyDays, 10);
      const safeFreq = Number.isFinite(parsedFreq)
        ? Math.min(365, Math.max(1, parsedFreq))
        : 18;

      const oldPhone = editingClient.phone;
      const oldName = editingClient.name;

      const existingTechNotes =
        typeof editingClient.technical_notes === "object" && editingClient.technical_notes
          ? editingClient.technical_notes
          : typeof editingClient.technicalNotes === "object" && editingClient.technicalNotes
          ? editingClient.technicalNotes
          : {};

      const updatedRecord = normalizeClientRecord({
        ...editingClient,
        name: sanitizedName,
        phone: sanitizedPhone,
        email: sanitizedEmail,
        cpf: sanitizedCpf,
        totalSpent: safeSpent,
        total_spent: safeSpent,
        frequencyDays: safeFreq,
        frequency_days: safeFreq,
        preferredBarber: selectedBarber,
        preferred_barber: selectedBarber,
        notes: sanitizedNotes,
        technical_notes: {
          ...existingTechNotes,
          total_spent: safeSpent,
          frequency_days: safeFreq,
          preferred_barber: selectedBarber,
          notes: sanitizedNotes,
          cutSpecs: sanitizedNotes || existingTechNotes.cutSpecs,
        },
        technicalNotes: {
          ...existingTechNotes,
          cutSpecs: sanitizedNotes || existingTechNotes.cutSpecs,
        },
      });

      // 1. Atualiza lista de clientes local
      const updatedList = clients.map((c) =>
        c.id === editingClient.id ? updatedRecord : c
      );
      setClients(updatedList);

      if (onUpdateClients) {
        onUpdateClients(updatedList);
      }

      // 2. Persistência em cache local
      try {
        safeStorage.setItem("saas_clients_cache", JSON.stringify(updatedList));
        safeStorage.setItem("barbearia_saas_clients_v2", JSON.stringify(updatedList));
      } catch {}

      // 3. Sincroniza em cascata nos agendamentos ativos na Agenda
      const cleanDigitsOldPhone = (oldPhone || "").replace(/\D/g, "");
      const cleanDigitsNewPhone = (sanitizedPhone || "").replace(/\D/g, "");
      const cleanOldName = (oldName || "").trim().toLowerCase();

      if (onUpdateAppointments && Array.isArray(appointments) && appointments.length > 0) {
        const updatedAppts = appointments.map((appt) => {
          const aPhone = (appt.clientPhone || appt.client_phone || "").replace(/\D/g, "");
          const aName = (appt.clientName || appt.client_name || "").trim().toLowerCase();
          const matches =
            (cleanDigitsOldPhone && aPhone === cleanDigitsOldPhone) ||
            (cleanDigitsNewPhone && aPhone === cleanDigitsNewPhone) ||
            (cleanOldName && aName === cleanOldName) ||
            (editingClient.id && (appt.clientId === editingClient.id || appt.client_id === editingClient.id));

          if (matches) {
            return {
              ...appt,
              clientName: sanitizedName,
              clientPhone: sanitizedPhone,
              client_name: sanitizedName,
              client_phone: sanitizedPhone,
            };
          }
          return appt;
        });
        onUpdateAppointments(updatedAppts);
      }

      // 4. Se houver handler central onUpdateClient
      if (onUpdateClient) {
        onUpdateClient(updatedRecord, {
          syncAppointments: true,
          oldPhone,
          oldName,
        });
      }

      // 5. Persistência no Supabase
      try {
        if (
          editingClient.id &&
          !String(editingClient.id).startsWith("cli-mock") &&
          !String(editingClient.id).startsWith("temp-")
        ) {
          await supabase
            .from("clients")
            .update({
              name: sanitizedName,
              phone: sanitizedPhone,
              email: sanitizedEmail,
              cpf: sanitizedCpf,
              total_spent: safeSpent,
              frequency_days: safeFreq,
              preferred_barber: selectedBarber,
              notes: sanitizedNotes,
              technical_notes: updatedRecord.technical_notes,
            })
            .eq("id", editingClient.id);
        }
      } catch (dbErr) {
        console.warn("Aviso na atualização do cliente no Supabase:", dbErr);
      }

      setEditingClient(null);
    } catch (err) {
      console.error("Erro ao salvar cadastro do cliente:", err);
      setFullEditError("Erro ao salvar os dados do cliente.");
    } finally {
      setIsSavingFullEdit(false);
    }
  };

  // Modal de Cadastro de Novo Cliente
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: "",
    phone: "",
    email: "",
    cpf: "",
    birthDate: "",
    frequencyDays: "18", // Padrão 18 dias
    notes: "",
  });
  const [formErrors, setFormErrors] = useState({});

  // ========================================================
  // ESTADOS DO LEMBRETE PREDITIVO DE RETORNO (NOVO!)
  // ========================================================
  const [recallModalClient, setRecallModalClient] = useState(null);
  const [customMessage, setCustomMessage] = useState("");

  // 1. Identifica os clientes na janela de ouro de retorno (faltam 3 dias ou menos)
  const recallDueClients = clients.filter((c) => {
    if (c.status === "at_risk") return false;
    const daysRemaining = c.frequencyDays - (c.daysSinceLastVisit || 0);
    return daysRemaining <= 3 && daysRemaining >= 0;
  });

  // 2. Abre o Modal de Lembrete Preditivo montando a mensagem personalizada do Barbeiro
  const handleOpenRecallModal = (client) => {
    setRecallModalClient(client);

    const barberFirstName =
      client.preferredBarber.split(" ")[0] || "Seu Barbeiro";
    const clientFirstName = client.name.split(" ")[0];
    const daysRemaining = Math.max(
      1,
      client.frequencyDays - (client.daysSinceLastVisit || 0),
    );

    // [Link dinâmico e seguro: aponta para a URL pública real preservando subpastas do GitHub Pages (/barbearia-saas/)]
    const customLink = buildClientBookingUrl({
      barber: client.preferredBarber || "geral",
      clientName: client.name,
      clientPhone: client.phone,
    });

    // Mensagem humanizada pronta com o link funcional
    const prebuiltMsg =
      `Fala ${clientFirstName}, aqui é o ${barberFirstName}! Tudo bem por aí?\n\n` +
      `Vi aqui na minha agenda que faltam apenas ${daysRemaining} dias para fechar seu prazo habitual de ${client.frequencyDays} dias de corte e barba.\n\n` +
      `O que acha de já deixar seu horário garantido na minha cadeira para não ficar sem vaga?\n\n` +
      `Escolha seu horário aqui: ${customLink}\n\n` +
      `Te espero na cadeira!`;

    setCustomMessage(prebuiltMsg);
  };

  // [Função assíncrona: atualiza a frequência habitual no banco e no estado do dashboard]
  const handleUpdateClientFrequency = async (clientId, newFrequency) => {
    const freqNum = Number(newFrequency);

    const updated = clients.map((c) =>
      c.id === clientId ? { ...c, frequencyDays: freqNum, frequency_days: freqNum } : c,
    );
    setClients(updated);

    try {
      safeStorage.setItem("saas_clients_cache", JSON.stringify(updated));
    } catch {}

    if (onUpdateClients) {
      onUpdateClients(updated);
    }

    if (recallModalClient && recallModalClient.id === clientId) {
      setRecallModalClient((prev) => ({
        ...prev,
        frequencyDays: freqNum,
        frequency_days: freqNum,
      }));
    }

    try {
      const existingClient = clients.find((c) => c.id === clientId);
      const existingTechNotes =
        typeof existingClient?.technical_notes === "object" && existingClient?.technical_notes !== null
          ? existingClient.technical_notes
          : typeof existingClient?.technicalNotes === "object" && existingClient?.technicalNotes !== null
          ? existingClient.technicalNotes
          : {};

      await supabase
        .from("clients")
        .update({
          frequency_days: freqNum,
          technical_notes: {
            ...existingTechNotes,
            frequency_days: freqNum,
          },
        })
        .eq("id", clientId);
    } catch (err) {
      console.warn("Aviso ao atualizar frequência no Supabase (mantido no cache local):", err);
    }
  };

  // [Função assíncrona: remove um cliente do banco de dados com confirmação]
  const handleDeleteClient = async (client) => {
    if (!client?.id) return;
    if (
      !window.confirm(
        `Tem certeza que deseja remover o cliente "${client.name}" do cadastro?`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", client.id);

      if (error) console.warn("Aviso ao excluir cliente do Supabase:", error);

      const updated = clients.filter((c) => c.id !== client.id);
      setClients(updated);

      try {
        safeStorage.setItem("saas_clients_cache", JSON.stringify(updated));
      } catch {}

      if (onUpdateClients) {
        onUpdateClients(updated);
      }
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);
      alert(`Erro ao excluir cliente: ${err?.message || "Tente novamente."}`);
    }
  };

  // 4. Disparo Direto no WhatsApp
  const handleSendWhatsAppRecall = () => {
    if (!recallModalClient) return;

    const phoneClean = recallModalClient.phone.replace(/\D/g, "");
    const encodedMsg = encodeURIComponent(customMessage);

    window.open(`https://wa.me/55${phoneClean}?text=${encodedMsg}`, "_blank");
    setRecallModalClient(null);
  };

  // [Função assíncrona: insere o novo cliente com retenção garantida no Supabase e no cache local seguro]
  const handleSaveNewClient = async () => {
    const errs = {};
    if (!newClientForm.name.trim()) errs.name = "Informe o nome completo.";
    if (!newClientForm.phone || newClientForm.phone.length < 14) {
      errs.phone = "Informe o WhatsApp com DDD.";
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setIsSavingClient(true);

    const rawClientData = {
      name: DOMPurify.sanitize(newClientForm.name.trim(), { ALLOWED_TAGS: [] }),
      phone: DOMPurify.sanitize(newClientForm.phone.trim(), { ALLOWED_TAGS: [] }),
      email: newClientForm.email?.trim() ? DOMPurify.sanitize(newClientForm.email.trim(), { ALLOWED_TAGS: [] }) : "",
      cpf: DOMPurify.sanitize(newClientForm.cpf?.trim() || "", { ALLOWED_TAGS: [] }),
      birth_date: newClientForm.birthDate || "",
      frequency_days: Number(newClientForm.frequencyDays || 18),
      notes: DOMPurify.sanitize(newClientForm.notes?.trim() || "", { ALLOWED_TAGS: ["b", "i", "strong", "em", "p", "span"] }),
    };

    const validation = validateSchema(rawClientData, SCHEMAS.clientDirectory, {
      rejectUnknown: true,
    });

    if (!validation.isValid) {
      setFormErrors({ name: validation.errors[0] });
      setIsSavingClient(false);
      return;
    }

    const cleanName = validation.sanitized.name;
    const cleanPhone = validation.sanitized.phone;
    const cleanEmail = validation.sanitized.email || null;
    const cleanCpf = validation.sanitized.cpf || null;
    const cleanBirthDate = validation.sanitized.birth_date || null;
    const cleanNotes = validation.sanitized.notes || "";
    const cleanFrequency = Number(validation.sanitized.frequency_days || 18);

    const techNotes = {
      cpf: cleanCpf,
      birth_date: cleanBirthDate,
      frequency_days: cleanFrequency,
      status: "active",
      notes: cleanNotes,
      cutSpecs: cleanNotes || "Primeiro atendimento na barbearia.",
      beardSpecs: "",
      allergyAlert: "",
      preferred_barber: "Barbeiro Geral",
    };

    const resolvedBarbershopId =
      tenant?.id ||
      (typeof tenant === "string" ? tenant : null) ||
      "788299e3-a26c-4a0b-bc71-c7ae81ed40d3";

    const generatedId = `cli-${Date.now()}`;

    // Payload de dados completo (compatível tanto com colunas individuais quanto com technical_notes JSONB)
    const fullClientPayload = {
      id: generatedId,
      barbershop_id: resolvedBarbershopId,
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      cpf: cleanCpf,
      birth_date: cleanBirthDate,
      notes: cleanNotes,
      frequency_days: cleanFrequency,
      is_vip: false,
      total_visits: 0,
      total_spent: 0,
      average_ticket: 0,
      preferred_barber: "Barbeiro Geral",
      status: "active",
      technical_notes: techNotes,
    };

    let savedRecord = null;

    try {
      // 1. Tenta inserção com o payload completo no Supabase
      const { data, error } = await supabase
        .from("clients")
        .insert([fullClientPayload])
        .select()
        .single();

      if (!error && data) {
        savedRecord = data;
      } else if (error) {
        console.warn("Tentando salvar com payload reduzido devido a divergência no schema do Supabase:", error.message);

        // 2. Se a tabela no Supabase não tiver colunas extras (como cpf, birth_date, etc.), tenta com colunas essenciais
        const minimalPayload = {
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          is_vip: false,
          total_visits: 0,
          average_ticket: 0,
          technical_notes: techNotes,
        };
        // Inclui barbershop_id se não foi a causa do erro de FK
        if (!error.message?.includes("barbershop_id")) {
          minimalPayload.barbershop_id = resolvedBarbershopId;
        }

        const fallbackRes = await supabase
          .from("clients")
          .insert([minimalPayload])
          .select()
          .single();

        if (!fallbackRes.error && fallbackRes.data) {
          savedRecord = fallbackRes.data;
        } else {
          console.warn("Aviso ao salvar no Supabase (cliente será mantido no cache local seguro):", fallbackRes.error?.message);
        }
      }
    } catch (err) {
      console.warn("Supabase indisponível no momento. Salvando no cache local seguro:", err);
    }

    // Normaliza o objeto para o estado React
    const created = normalizeClientRecord({
      ...(savedRecord || fullClientPayload),
      id: savedRecord?.id || generatedId,
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      cpf: cleanCpf,
      birthDate: cleanBirthDate,
      birth_date: cleanBirthDate,
      notes: cleanNotes,
      frequencyDays: cleanFrequency,
      frequency_days: cleanFrequency,
      technical_notes: techNotes,
    });

    const updated = [created, ...clients.filter((c) => c.id !== created.id && c.phone !== created.phone)];
    setClients(updated);

    // Persiste imediatamente no cache local seguro para reter o registro mesmo após F5
    try {
      safeStorage.setItem("saas_clients_cache", JSON.stringify(updated));
    } catch {}

    if (onUpdateClients) {
      onUpdateClients(updated);
    }

    setIsNewClientModalOpen(false);
    setSearchTerm("");
    setStatusFilter("all");

    setNewClientForm({
      name: "",
      phone: "",
      email: "",
      cpf: "",
      birthDate: "",
      frequencyDays: "18",
      notes: "",
    });
    setFormErrors({});
    setIsSavingClient(false);
  };

  // Filtros e Métricas Robustas da Carteira
  const totalClients = clients.length;
  const vipClientsCount = clients.filter((c) => c.isVip).length;
  const atRiskCount = clients.filter((c) => c.status === "at_risk").length;

  const totalSpentGlobal = clients.reduce((acc, c) => {
    const val = Number(c.totalSpent ?? c.total_spent ?? 0);
    return acc + (Number.isFinite(val) ? val : 0);
  }, 0);

  const totalVisitsGlobal = clients.reduce((acc, c) => {
    const val = Number(c.totalVisits ?? c.total_cuts ?? 0);
    return acc + (Number.isFinite(val) ? val : 0);
  }, 0);

  // Ticket médio: total faturado dividido por atendimentos realizados (ou por cliente)
  const averageTicketGlobal =
    totalVisitsGlobal > 0
      ? totalSpentGlobal / totalVisitsGlobal
      : totalClients > 0
        ? totalSpentGlobal / totalClients
        : 0;

  const filteredClients = clients.filter((client) => {
    const nameStr = (client.name || "").toLowerCase();
    const phoneStr = client.phone || "";
    const cpfStr = client.cpf || "";
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch =
      nameStr.includes(searchLower) ||
      phoneStr.includes(searchTerm) ||
      cpfStr.includes(searchTerm);

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "vip"
          ? client.isVip
          : statusFilter === "at_risk"
            ? client.status === "at_risk"
            : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className={clientsStyles.container}>
      {/* 1. CABEÇALHO */}
      <div className={clientsStyles.headerCard}>
        <div className={clientsStyles.titleWrapper}>
          <h1 className={clientsStyles.title}>
            <Users className="w-5 h-5 text-amber-500 inline-block mr-2" />
            <span>Clientes & Prontuários Técnicos</span>
          </h1>
          <p className={clientsStyles.subtitle}>
            Base ativa de clientes, inteligência preditiva de retorno, alerta de
            alergias e retenção no WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <Button
            variant="primary"
            onClick={() => setIsNewClientModalOpen(true)}
            className="text-xs py-2.5 px-4 font-bold shadow-md bg-amber-600 hover:bg-amber-500 shrink-0"
          >
            <span>+</span> Novo Cliente
          </Button>

          {onBack && (
            <Button
              variant="secondary"
              onClick={onBack}
              className="text-xs py-2 px-3"
            >
              <span className="flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. O ALERTA PREDITIVO DE RETORNO NO TOPO */}
      {recallDueClients.length > 0 && (
        <Alert
          variant="warning"
          title={`Oportunidade de Receita: ${recallDueClients.length} clientes na janela ideal de retorno!`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
            <span className="text-xs text-neutral-300">
              Os clientes{" "}
              <strong>{recallDueClients.map((c) => c.name).join(" e ")}</strong>{" "}
              costumam cortar cabelo a cada 15-18 dias e faltam apenas 3 dias
              para a volta ideal!
            </span>
            <Button
              variant="primary"
              onClick={() => handleOpenRecallModal(recallDueClients[0])}
              className="text-xs py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold shrink-0 self-start sm:self-auto"
            >
              Disparar Lembrete WhatsApp
            </Button>
          </div>
        </Alert>
      )}

      {/* 3. OS 4 KPIS DA CARTEIRA */}
      <div className={clientsStyles.kpiGrid}>
        <StatCard
          title="Base de Clientes"
          value={`${totalClients} cadastrados`}
          icon="Users"
          theme="blue"
          delta={{
            value: "+12 este mês",
            isPositive: true,
            comparisonText: "crescimento da base",
          }}
        />

        <StatCard
          title="Clientes VIP / Recorrentes"
          value={`${vipClientsCount} fiéis`}
          icon="Crown"
          theme="gold"
          delta={{
            value: "Voltam < 20 dias",
            isPositive: true,
            comparisonText: "receita garantida",
          }}
        />

        <StatCard
          title="Ticket Médio da Carteira"
          value={`R$ ${averageTicketGlobal.toFixed(2).replace(".", ",")}`}
          icon="DollarSign"
          theme="green"
          delta={{
            value: "Por atendimento",
            isPositive: null,
            comparisonText: "gasto médio por visita",
          }}
        />

        <StatCard
          title="Em Risco de Perda (Churn)"
          value={`${atRiskCount} ausentes`}
          icon="AlertTriangle"
          theme="purple"
          delta={{
            value: "> 40 dias sem vir",
            isPositive: false,
            comparisonText: "precisa de contato",
          }}
        />
      </div>

      {/* 4. TABELA DE CLIENTES */}
      <div className={clientsStyles.tableSection}>
        <div className={clientsStyles.filterBar}>
          <div className="max-w-md w-full">
            <SearchInput
              placeholder="Buscar cliente por nome, telefone ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={() => setSearchTerm("")}
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-500 font-bold hidden sm:inline">
              Filtrar:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="all">Todos os Clientes</option>
              <option value="vip">Apenas Clientes VIP</option>
              <option value="at_risk">Em Risco de Perda (&gt; 40 dias)</option>
            </select>
          </div>
        </div>

        <Table
          data={filteredClients}
          keyField="id"
          selectable={false}
          columns={[
            {
              key: "name",
              label: "Cliente",
              sortable: true,
              render: (row) => {
                const daysRemaining =
                  row.frequencyDays - (row.daysSinceLastVisit || 0);
                const isDueRecall = daysRemaining <= 3 && daysRemaining >= 0;

                return (
                  <div className="flex items-center gap-3">
                    <Avatar name={row.name} size="sm" isVip={row.isVip} />
                    <div>
                      <p className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span>{row.name}</span>
                        {row.isVip && (
                          <span className="flex items-center gap-0.5 text-amber-400 text-[10px] font-bold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>VIP</span>
                          </span>
                        )}
                        {isDueRecall && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            Faltam {daysRemaining}d
                          </span>
                        )}
                      </p>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {row.phone}
                      </span>
                    </div>
                  </div>
                );
              },
            },
            {
              key: "lastVisitDate",
              label: "Última Visita",
              sortable: true,
              render: (row) => (
                <div className="flex flex-col">
                  <span className="font-mono text-xs text-neutral-200">
                    {row.lastVisitDate}
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    há {row.daysSinceLastVisit} dias
                  </span>
                </div>
              ),
            },
            {
              key: "frequencyDays",
              label: "Frequência Habitual",
              render: (row) => (
                <span className="text-xs text-neutral-300 font-medium">
                  A cada{" "}
                  <strong className="text-amber-400 font-bold">
                    {row.frequencyDays} dias
                  </strong>
                </span>
              ),
            },
            {
              key: "preferredBarber",
              label: "Barbeiro",
              render: (row) => (
                <span className="text-xs text-neutral-200 font-medium flex items-center gap-1">
                  <Scissors className="w-3.5 h-3.5 text-amber-500" />
                  <span>{row.preferredBarber}</span>
                </span>
              ),
            },
            {
              key: "totalSpent",
              label: "Total Gasto",
              sortable: true,
              render: (row) => {
                const spent = Number(row.totalSpent ?? row.total_spent ?? 0);
                const safeSpent = Number.isFinite(spent) ? spent : 0;
                return (
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    R$ {safeSpent.toFixed(2).replace(".", ",")}
                  </span>
                );
              },
            },
            {
              key: "notes",
              label: "Prontuário & Notas",
              render: (row) => (
                <div className="max-w-[200px] truncate text-[11px] text-neutral-300">
                  <SafeHtml html={row.notes || row.technicalNotes?.cutSpecs || "—"} />
                </div>
              ),
            },
          ]}
          actions={[
            // AÇÃO DE LEMBRETE PREDITIVO (SINO)
            {
              label: "Disparar Lembrete Preditivo de Retorno",
              icon: "Bell",
              onClick: (row) => handleOpenRecallModal(row),
            },
            // AÇÃO DE EDIÇÃO CADASTRAL COMPLETA (LÁPIS/EDIT3)
            {
              label: "Editar Cadastro Completo do Cliente",
              icon: "Edit3",
              iconSize: 16,
              className:
                "w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white dark:hover:text-amber-400 [html:not(.dark)_&]:hover:text-emerald-700 hover:bg-neutral-800 dark:hover:bg-neutral-800 [html:not(.dark)_&]:hover:bg-zinc-100 transition-colors cursor-pointer",
              onClick: (row) => handleOpenFullEditClient(row),
            },
            // AÇÃO DE PRONTUÁRIO & FICHA TÉCNICA (ARQUIVO)
            {
              label: "Abrir Prontuário & Ficha Técnica",
              icon: "FileText",
              onClick: (row) => setSelectedClientForRecord(row),
            },
            {
              label: "Agendar Horário na Agenda",
              icon: "Calendar",
              onClick: (row) => {
                if (onNavigateToBooking) onNavigateToBooking(row);
                else
                  alert(
                    `Abrindo a Agenda com o cliente "${row.name}" pré-selecionado!`,
                  );
              },
            },
            {
              label: "Excluir Cliente",
              icon: "Trash2",
              isDanger: true,
              onClick: (row) => handleDeleteClient(row),
            },
          ]}
        />
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: DISPARO DO LEMBRETE PREDITIVO (WHATSAPP DO BARBEIRO) */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!recallModalClient}
        size="lg"
        onClose={() => setRecallModalClient(null)}
        title={`Lembrete Preditivo de Retorno: ${recallModalClient?.name}`}
        footer={
          <div className="w-full flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              onClick={() => setRecallModalClient(null)}
            >
              Cancelar
            </Button>

            <Button
              variant="primary"
              onClick={handleSendWhatsAppRecall}
              className="text-xs py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 font-extrabold shadow-lg flex items-center gap-2"
            >
              <Smartphone className="w-4 h-4 text-inherit" />
              <span>Enviar no WhatsApp do Cliente</span>
            </Button>
          </div>
        }
      >
        {recallModalClient && (
          <div className="space-y-4 text-left">
            {/* Resumo da Frequência e Janela */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-neutral-950 border border-neutral-800 rounded-2xl text-xs">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                  Último Corte:
                </span>
                <strong className="text-white text-sm">
                  {recallModalClient.lastVisitDate}
                </strong>
                <span className="text-[10px] text-neutral-400 block">
                  há {recallModalClient.daysSinceLastVisit} dias
                </span>
              </div>

              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                  Frequência Habitual:
                </span>
                <div className="flex items-center gap-1 mt-1">
                  <select
                    value={recallModalClient.frequencyDays}
                    onChange={(e) =>
                      handleUpdateClientFrequency(
                        recallModalClient.id,
                        e.target.value,
                      )
                    }
                    className="bg-neutral-900 border border-neutral-700 text-amber-400 font-bold text-xs p-1 rounded-lg outline-none cursor-pointer"
                  >
                    <option value="15">A cada 15 dias</option>
                    <option value="18">A cada 18 dias</option>
                    <option value="20">A cada 20 dias</option>
                    <option value="25">A cada 25 dias</option>
                    <option value="30">A cada 30 dias</option>
                  </select>
                </div>
              </div>

              <div>
                <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                  Barbeiro Designado:
                </span>
                <strong className="text-amber-400 text-sm flex items-center gap-1.5 mt-0.5">
                  <Scissors className="w-3.5 h-3.5 text-amber-500" />
                  <span>{recallModalClient.preferredBarber}</span>
                </strong>
              </div>
            </div>

            {/* Editor da Mensagem Humanizada */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300 flex items-center justify-between">
                <span>Mensagem Pessoal Pronta (Em nome do Barbeiro):</span>
                <span className="text-[10px] text-neutral-500">
                  Preview seguro com SafeHtml
                </span>
              </label>
              <textarea
                rows={4}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
              />
              <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-300">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                  Pré-visualização da Mensagem:
                </span>
                <SafeHtml html={customMessage} />
              </div>
            </div>

            <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                O link anexado na mensagem já abre a agenda com o barbeiro{" "}
                <strong>{recallModalClient.preferredBarber}</strong>{" "}
                selecionado!
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: PRONTUÁRIO TÉCNICO COMPLETO */}
      <Modal
        isOpen={!!selectedClientForRecord}
        size="xl"
        onClose={() => setSelectedClientForRecord(null)}
        title={`Prontuário & Ficha Técnica: ${selectedClientForRecord?.name}`}
        footer={
          <div className="w-full flex items-center justify-between gap-3">
            <span className="text-xs text-neutral-400">
              Cliente cadastrado • {selectedClientForRecord?.totalVisits}{" "}
              atendimentos registrados
            </span>
            <Button
              variant="secondary"
              onClick={() => setSelectedClientForRecord(null)}
            >
              Fechar Prontuário
            </Button>
          </div>
        }
      >
        {selectedClientForRecord && (
          <div className="space-y-4">
            <ClientHistoryTimeline
              metrics={{
                totalVisits: Number(selectedClientForRecord.totalVisits ?? selectedClientForRecord.total_cuts ?? 0),
                averageTicket: (() => {
                  const spent = Number(selectedClientForRecord.totalSpent ?? selectedClientForRecord.total_spent ?? 0);
                  const visits = Number(selectedClientForRecord.totalVisits ?? selectedClientForRecord.total_cuts ?? 0);
                  const avg = visits > 0 ? spent / visits : spent;
                  return Number.isFinite(avg) ? avg : 0;
                })(),
                frequencyDays: Number(selectedClientForRecord.frequencyDays ?? selectedClientForRecord.frequency_days ?? 18),
                preferredBarber: selectedClientForRecord.preferredBarber || selectedClientForRecord.preferred_barber || "Barbeiro Geral",
              }}
              technicalNotes={
                typeof selectedClientForRecord.technicalNotes === "object"
                  ? selectedClientForRecord.technicalNotes
                  : { cutSpecs: String(selectedClientForRecord.technicalNotes || selectedClientForRecord.notes || "Sem observações registradas.") }
              }
              events={selectedClientForRecord.historyEvents || []}
              onAddTechnicalNote={() =>
                alert(
                  `Adicionar nota técnica para ${selectedClientForRecord.name}`,
                )
              }
            />
          </div>
        )}
      </Modal>

      {/* MODAL 3: CADASTRAR NOVO CLIENTE */}
      <Modal
        isOpen={isNewClientModalOpen}
        size="md"
        onClose={() => setIsNewClientModalOpen(false)}
        title="Cadastrar Novo Cliente"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsNewClientModalOpen(false)}
            >
              Cancelar
            </Button>
            {/* [Botão conectado ao estado assíncrono de salvamento no Supabase] */}
            <Button
              variant="primary"
              isLoading={isSavingClient}
              onClick={handleSaveNewClient}
            >
              Salvar Cliente na Base
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          <Input
            label="Nome Completo do Cliente *"
            placeholder="Ex: Matheus Oliveira"
            value={newClientForm.name}
            onChange={(e) => {
              setNewClientForm({ ...newClientForm, name: e.target.value });
              if (formErrors.name) setFormErrors({ ...formErrors, name: null });
            }}
            error={formErrors.name}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="WhatsApp / Celular *"
              mask="phone"
              placeholder="(11) 99999-9999"
              value={newClientForm.phone}
              onChange={(e) => {
                setNewClientForm({ ...newClientForm, phone: e.target.value });
                if (formErrors.phone)
                  setFormErrors({ ...formErrors, phone: null });
              }}
              error={formErrors.phone}
            />

            {/* NOVO: PARAMETRIZAÇÃO DA FREQUÊNCIA NO CADASTRO */}
            <Select
              label="Frequência Habitual de Retorno"
              value={newClientForm.frequencyDays}
              onChange={(e) =>
                setNewClientForm({
                  ...newClientForm,
                  frequencyDays: e.target.value,
                })
              }
              options={[
                { value: "15", label: "A cada 15 dias (Barba & Corte)" },
                { value: "18", label: "A cada 18 dias (Padrão)" },
                { value: "20", label: "A cada 20 dias" },
                { value: "25", label: "A cada 25 dias" },
                { value: "30", label: "A cada 30 dias (Mensal)" },
              ]}
              helperText="Usado para o disparo do lembrete automático."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="E-mail (Opcional)"
              type="email"
              placeholder="cliente@email.com"
              value={newClientForm.email}
              onChange={(e) =>
                setNewClientForm({ ...newClientForm, email: e.target.value })
              }
            />

            <Input
              label="CPF (Opcional)"
              mask="cpf"
              placeholder="000.000.000-00"
              value={newClientForm.cpf}
              onChange={(e) =>
                setNewClientForm({ ...newClientForm, cpf: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Data de Nascimento (Opcional)"
              type="date"
              value={newClientForm.birthDate}
              onChange={(e) =>
                setNewClientForm({
                  ...newClientForm,
                  birthDate: e.target.value,
                })
              }
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-xs font-bold text-neutral-300">
              Preferências Iniciais de Corte (Ficha Técnica)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Prefere degradê navalhado médio, tem sensibilidade a lâmina..."
              value={newClientForm.notes}
              onChange={(e) =>
                setNewClientForm({ ...newClientForm, notes: e.target.value })
              }
              className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: EDIÇÃO CADASTRAL COMPLETA DE CLIENTE            */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!editingClient}
        size="lg"
        onClose={() => setEditingClient(null)}
        title={`Editar Cadastro de Cliente: ${editingClient?.name || ""}`}
        footer={
          <div className="w-full flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              onClick={() => setEditingClient(null)}
              disabled={isSavingFullEdit}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveFullEditClient}
              disabled={isSavingFullEdit}
              className="bg-amber-600 hover:bg-amber-500 font-bold dark:bg-amber-600 dark:hover:bg-amber-500 [html:not(.dark)_&]:bg-[#059669] [html:not(.dark)_&]:hover:bg-[#047857]"
            >
              {isSavingFullEdit ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        }
      >
        {editingClient && (
          <div className="space-y-4 text-left text-xs">
            <p className="text-neutral-400 [html:not(.dark)_&]:text-zinc-600">
              Altere os dados cadastrais, métricas financeiras e preferências do cliente com sincronização imediata no Supabase e na agenda de atendimentos.
            </p>

            {fullEditError && (
              <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-semibold">
                {fullEditError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <Input
                label="Nome Completo *"
                value={fullEditForm.name}
                onChange={(e) =>
                  setFullEditForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ex: Carlos Eduardo Silveira"
                required
              />

              <Input
                label="WhatsApp / Celular com DDD *"
                value={fullEditForm.phone}
                onChange={(e) =>
                  setFullEditForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                mask="phone"
                placeholder="(00) 00000-0000"
                required
              />

              <Input
                label="Total Gasto (R$ - Saldo Acumulado)"
                value={fullEditForm.totalSpent}
                onChange={(e) =>
                  setFullEditForm((prev) => ({ ...prev, totalSpent: e.target.value }))
                }
                placeholder="0,00"
                helperText="Campo financeiro livre para ajuste manual pelo gestor"
              />

              <Select
                label="Barbeiro Preferido"
                value={fullEditForm.preferredBarber}
                onChange={(e) =>
                  setFullEditForm((prev) => ({ ...prev, preferredBarber: e.target.value }))
                }
                options={[
                  ...(barbers && barbers.length > 0
                    ? barbers.map((b) => ({
                        value: b.name,
                        label: `${b.name} (${b.role || "Barbeiro"})`,
                      }))
                    : [
                        { value: "Barbeiro Geral", label: "Barbeiro Geral" },
                        { value: "Carlos Gestor", label: "Carlos Gestor" },
                        { value: "Marcos Navalha", label: "Marcos Navalha" },
                      ]),
                ]}
              />

              <Input
                label="Frequência Habitual (em dias)"
                type="number"
                min="1"
                max="365"
                value={fullEditForm.frequencyDays}
                onChange={(e) =>
                  setFullEditForm((prev) => ({ ...prev, frequencyDays: e.target.value }))
                }
                placeholder="18"
                helperText="Intervalo habitual entre atendimentos (usado no lembrete preditivo)"
              />

              <Input
                label="CPF do Cliente (Opcional)"
                value={fullEditForm.cpf}
                onChange={(e) =>
                  setFullEditForm((prev) => ({ ...prev, cpf: e.target.value }))
                }
                mask="cpf"
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-300 [html:not(.dark)_&]:text-zinc-800 block">
                Prontuário Técnico / Ficha de Corte:
              </label>
              <textarea
                rows={3}
                value={fullEditForm.notes}
                onChange={(e) =>
                  setFullEditForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Ex: Fade alto na navalha, tesoura no topo sem diminuir muito. Alergia a álcool pós-barba."
                className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-amber-500 leading-relaxed font-sans [html:not(.dark)_&]:bg-zinc-50 [html:not(.dark)_&]:border-zinc-300 [html:not(.dark)_&]:text-zinc-900"
              />
              <span className="text-[10px] text-neutral-500 [html:not(.dark)_&]:text-zinc-500">
                Observações de estilo, lâmina, pente e cuidados técnicos consultados em atendimentos futuros.
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
