import { useState, useMemo, useEffect } from "react";
import DOMPurify from "dompurify";
import {
  TrendingUp,
  DollarSign,
  Users,
  Scissors,
  Calendar,
  ChevronDown,
} from "lucide-react";
// [Import: cliente Supabase para persistência de agendamentos e alterações de status]
import { supabase } from "../../lib/supabase";
import { scheduleStyles } from "./ScheduleView.styles";
import CalendarView, {
  formatDateToYMD,
  getAppointmentDateYMD,
  parseYMDToLocalDate,
} from "../../components/calendar/CalendarView";
import NewAppointmentModal from "../../components/calendar/NewAppointmentModal";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import ProjectIcon from "../../components/ui/ProjectIcon";
import { SafeHtml } from "../../components/ui/SafeHtml";
import MercadoPagoCheckoutModal from "../../components/payments/MercadoPagoCheckoutModal";
import { safeStorage } from "../../utils/safeStorage";
import { useClientsCount } from "../../hooks/useClientsCount";

// Helper para verificar se uma data (YYYY-MM-DD) pertence ao período ativo (Dia, Semana ou Mês)
export const isDateInPeriod = (targetDateYMD, referenceDate, viewMode) => {
  if (!targetDateYMD || !referenceDate) return false;
  const cleanDateYMD = String(targetDateYMD).slice(0, 10);

  if (viewMode === "day") {
    const refYMD = formatDateToYMD(referenceDate);
    return cleanDateYMD === refYMD;
  }

  if (viewMode === "week") {
    const startOfWeek = new Date(referenceDate);
    const dayIndex = startOfWeek.getDay(); // 0 = Domingo
    startOfWeek.setDate(startOfWeek.getDate() - dayIndex);
    const weekYMDs = new Set();
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekYMDs.add(formatDateToYMD(d));
    }
    return weekYMDs.has(cleanDateYMD);
  }

  if (viewMode === "month") {
    const year = referenceDate.getFullYear();
    const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
    const monthPrefix = `${year}-${month}`;
    return cleanDateYMD.startsWith(monthPrefix);
  }

  return true;
};

// [Função componente: consome serviços reais sem catálogo fictício de fallback]
export default function ScheduleView({
  tenant,
  user,
  barbers = [],
  appointments = [],
  onUpdateAppointments,
  services = [],
  onAddService,
  clients = [],
  onUpdateClients,
  onUpdateClient,
  comandas = [],
  onNavigateToClients,
  onNavigateToCashier,
  onBack,
  openNewAppointmentTrigger = 0,
}) {
  // Filtra apenas barbeiros que não foram excluídos/inativados para a grade
  const activeBarbers = barbers.filter((b) => b.status !== "inactive");
  const activeTenantId = tenant?.id || user?.user_metadata?.barbershop_id || user?.id;
  const { count: clientsCount } = useClientsCount(activeTenantId, clients, { user });

  // [Single Source of Truth: consome diretamente a prop appointments sem duplicação de estado ou cascata]
  const currentAppointments = appointments;

  // Modais de Criação e Detalhes
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [prefilledBarberId, setPrefilledBarberId] = useState("");
  const [prefilledTime, setPrefilledTime] = useState("");
  const [prefilledDate, setPrefilledDate] = useState("");

  // Abre o modal de novo agendamento via botão de ação rápida externo (ex: Bottom Navigation)
  useEffect(() => {
    if (openNewAppointmentTrigger > 0) {
      setIsNewModalOpen(true);
    }
  }, [openNewAppointmentTrigger]);

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [isMercadoPagoModalOpen, setIsMercadoPagoModalOpen] = useState(false);

  // Estado do card "Previsão atual" como Accordion/Dropdown expansível (aberto por padrão)
  const [isPrevisaoExpanded, setIsPrevisaoExpanded] = useState(true);

  // Estados de navegação temporal sincronizados com a Agenda de Atendimentos (Dia, Semana, Mês)
  const [viewMode, setViewMode] = useState("day"); // 'day' | 'week' | 'month'
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Estados para Prontuário Técnico e Cadastro de Cliente a partir do Card
  const [selectedClientForRecord, setSelectedClientForRecord] = useState(null);
  const [clientRecordNotes, setClientRecordNotes] = useState("");
  const [isSavingRecordNotes, setIsSavingRecordNotes] = useState(false);

  const [appointmentToSaveAsClient, setAppointmentToSaveAsClient] = useState(null);
  const [newClientFormData, setNewClientFormData] = useState({
    name: "",
    phone: "",
    notes: "",
    technicalNotes: "",
  });
  const [isSavingNewClient, setIsSavingNewClient] = useState(false);
  const [saveClientFeedback, setSaveClientFeedback] = useState("");

  // Estados do Modo Edição
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);
  const [editForm, setEditForm] = useState({
    barberId: "",
    serviceId: "",
    startTime: "09:00",
    price: "55",
    notes: "",
  });

  const [isConfirmEditModalOpen, setIsConfirmEditModalOpen] = useState(false);

  // Modal de Serviço Rápido On-The-Fly
  const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
  const [quickServiceName, setQuickServiceName] = useState("");
  const [quickServicePrice, setQuickServicePrice] = useState("");
  const [quickServiceDuration, setQuickServiceDuration] = useState("30");

  // Modal de Edição Rápida de Cliente em Atendimento (Nome e Telefone com foco automático e sincronização em cascata)
  const [isQuickEditClientOpen, setIsQuickEditClientOpen] = useState(false);
  const [quickEditClientForm, setQuickEditClientForm] = useState({
    name: "",
    phone: "",
    originalName: "",
    originalPhone: "",
  });
  const [isSavingQuickEditClient, setIsSavingQuickEditClient] = useState(false);
  const [quickEditClientError, setQuickEditClientError] = useState("");

  const handleOpenQuickEditClient = (appt) => {
    if (!appt) return;
    setQuickEditClientError("");
    setQuickEditClientForm({
      name: appt.clientName || appt.client_name || "",
      phone: appt.clientPhone || appt.client_phone || "",
      originalName: appt.clientName || appt.client_name || "",
      originalPhone: appt.clientPhone || appt.client_phone || "",
    });
    setIsQuickEditClientOpen(true);
  };

  const handleSaveQuickEditClient = async () => {
    const trimmedName = (quickEditClientForm.name || "").trim();
    if (!trimmedName) {
      setQuickEditClientError("O nome do cliente é obrigatório.");
      return;
    }
    const cleanPhone = (quickEditClientForm.phone || "").trim();
    setIsSavingQuickEditClient(true);
    setQuickEditClientError("");

    try {
      const sanitizedName = DOMPurify.sanitize(trimmedName, { ALLOWED_TAGS: [] });
      const sanitizedPhone = DOMPurify.sanitize(cleanPhone, { ALLOWED_TAGS: [] });
      const oldPhone = quickEditClientForm.originalPhone;
      const oldName = quickEditClientForm.originalName;

      // 1. Atualiza selectedAppointment imediatamente no modal atual
      const updatedSelected = {
        ...selectedAppointment,
        clientName: sanitizedName,
        clientPhone: sanitizedPhone,
        client_name: sanitizedName,
        client_phone: sanitizedPhone,
      };
      setSelectedAppointment(updatedSelected);

      // 2. Propaga para todos os agendamentos na grade (agenda)
      const cleanDigitsOldPhone = (oldPhone || "").replace(/\D/g, "");
      const cleanDigitsNewPhone = (sanitizedPhone || "").replace(/\D/g, "");
      const cleanOldName = (oldName || "").trim().toLowerCase();

      const updatedAppts = currentAppointments.map((appt) => {
        const aPhone = (appt.clientPhone || appt.client_phone || "").replace(/\D/g, "");
        const aName = (appt.clientName || appt.client_name || "").trim().toLowerCase();
        const matches =
          (cleanDigitsOldPhone && aPhone === cleanDigitsOldPhone) ||
          (cleanDigitsNewPhone && aPhone === cleanDigitsNewPhone) ||
          (cleanOldName && aName === cleanOldName) ||
          appt.id === selectedAppointment.id;

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

      if (onUpdateAppointments) {
        onUpdateAppointments(updatedAppts);
      }

      // 3. Atualiza ou insere na base de clientes (Supabase + local cache)
      const existingClient = clients.find((c) => {
        const cPhone = (c.phone || "").replace(/\D/g, "");
        const cName = (c.name || "").trim().toLowerCase();
        return (
          (cleanDigitsOldPhone && cPhone === cleanDigitsOldPhone) ||
          (cleanDigitsNewPhone && cPhone === cleanDigitsNewPhone) ||
          (cleanOldName && cName === cleanOldName)
        );
      });

      const updatedClientRecord = existingClient
        ? {
            ...existingClient,
            name: sanitizedName,
            phone: sanitizedPhone,
          }
        : {
            id: `cli-${Date.now()}`,
            name: sanitizedName,
            phone: sanitizedPhone,
            barbershop_id: tenant?.id,
            status: "active",
            frequency_days: 18,
            frequencyDays: 18,
            total_spent: 0,
            totalSpent: 0,
            total_visits: 1,
            totalVisits: 1,
            preferred_barber: selectedAppointment?.barberName || "Barbeiro Geral",
            preferredBarber: selectedAppointment?.barberName || "Barbeiro Geral",
          };

      const updatedClientsList = existingClient
        ? clients.map((c) => (c.id === existingClient.id ? updatedClientRecord : c))
        : [
            updatedClientRecord,
            ...clients.filter(
              (c) =>
                c.id !== updatedClientRecord.id &&
                (!updatedClientRecord.phone || c.phone !== updatedClientRecord.phone)
            ),
          ];

      if (onUpdateClients) {
        onUpdateClients(updatedClientsList);
      }

      if (onUpdateClient) {
        onUpdateClient(updatedClientRecord, {
          syncAppointments: true,
          oldPhone,
          oldName,
        });
      }

      try {
        const activeTenantId = tenant?.id || user?.user_metadata?.barbershop_id || user?.id;
        if (activeTenantId) {
          safeStorage.setItem(`saas_clients_cache_${activeTenantId}`, JSON.stringify(updatedClientsList));
        }
        safeStorage.removeItem("saas_clients_cache");
        safeStorage.removeItem("barbearia_saas_clients_v2");
      } catch {}

      // 4. Persiste no Supabase
      try {
        if (
          selectedAppointment.id &&
          !String(selectedAppointment.id).startsWith("mock-") &&
          !String(selectedAppointment.id).startsWith("temp-") &&
          !String(selectedAppointment.id).startsWith("apt-")
        ) {
          await supabase
            .from("appointments")
            .update({
              client_name: sanitizedName,
              client_phone: sanitizedPhone,
            })
            .eq("id", selectedAppointment.id);
        }

        if (
          existingClient?.id &&
          !String(existingClient.id).startsWith("cli-mock") &&
          !String(existingClient.id).startsWith("temp-")
        ) {
          await supabase
            .from("clients")
            .update({
              name: sanitizedName,
              phone: sanitizedPhone,
            })
            .eq("id", existingClient.id);
        } else if (tenant?.id) {
          await supabase
            .from("clients")
            .upsert(
              [
                {
                  tenant_id: tenant.id,
                  barbershop_id: tenant.id,
                  name: sanitizedName,
                  phone: sanitizedPhone,
                  status: "active",
                  frequency_days: 18,
                  preferred_barber: selectedAppointment?.barberName || "Barbeiro Geral",
                },
              ],
              { onConflict: "barbershop_id,phone" }
            );
        }
      } catch (dbErr) {
        console.warn("Aviso na persistência Supabase (contingência local ativa):", dbErr);
      }

      setIsQuickEditClientOpen(false);
    } catch (err) {
      console.error("Erro ao salvar cliente na edição rápida:", err);
      setQuickEditClientError("Ocorreu um erro ao salvar o cliente.");
    } finally {
      setIsSavingQuickEditClient(false);
    }
  };

  // 1. Abertura do Modal de Detalhes
  const handleOpenDetails = (appt) => {
    setSelectedAppointment(appt);
    setIsEditingAppointment(false);
    setEditForm({
      barberId: appt.barberId,
      serviceId: appt.serviceId || (services[0] ? services[0].id : "s1"),
      startTime: appt.startTime,
      price: String(appt.price || 0),
      notes: appt.notes || "",
    });
  };

  // [Função assíncrona: grava o novo serviço na tabela services do Supabase e o seleciona na hora]
  const handleSaveQuickService = async () => {
    if (!quickServiceName.trim() || !quickServicePrice) {
      alert("Informe o nome e o preço do novo serviço.");
      return;
    }

    const cleanServiceName = DOMPurify.sanitize(quickServiceName.trim(), { ALLOWED_TAGS: [] });
    const serviceId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `s-${Date.now()}`;

    const targetBarbershopId =
      tenant?.id || user?.user_metadata?.barbershop_id || user?.id || null;

    const servicePayload = {
      id: serviceId,
      name: cleanServiceName,
      category: "Cabelo",
      duration_minutes: Number(quickServiceDuration),
      price: Number(quickServicePrice),
      commission_percent: 50,
      active: true,
      barbershop_id: targetBarbershopId,
      tenant_id: targetBarbershopId,
    };

    try {
      // Método Supabase: insere no banco com ID explícito
      const { data, error } = await supabase
        .from("services")
        .insert([servicePayload])
        .select()
        .single();

      if (error) {
        console.warn("Aviso ao salvar serviço no Supabase (aplicando contingência):", error);
      }

      const createdService = {
        id: data?.id || serviceId,
        name: data?.name || cleanServiceName,
        category: data?.category || "Cabelo",
        durationMinutes: data?.duration_minutes || Number(quickServiceDuration),
        price: Number(data?.price || quickServicePrice),
        active: true,
      };

      if (onAddService) onAddService(createdService);

      setEditForm((prev) => ({
        ...prev,
        serviceId: createdService.id,
        price: String(createdService.price),
      }));

      setQuickServiceName("");
      setQuickServicePrice("");
      setIsQuickServiceModalOpen(false);
    } catch (err) {
      console.warn("Aviso ao salvar serviço no Supabase (contingência local ativa):", err);
      // Fallback local resiliente
      const fallbackService = {
        id: serviceId,
        name: cleanServiceName,
        category: "Cabelo",
        durationMinutes: Number(quickServiceDuration),
        price: Number(quickServicePrice),
        active: true,
      };
      if (onAddService) onAddService(fallbackService);
      setEditForm((prev) => ({
        ...prev,
        serviceId: fallbackService.id,
        price: String(fallbackService.price),
      }));
      setQuickServiceName("");
      setQuickServicePrice("");
      setIsQuickServiceModalOpen(false);
    }
  };

  // 3b. Gestão de Prontuário Técnico e Ações de Cliente a partir do Card
  const handleOpenClientRecord = (client, appt) => {
    setSelectedClientForRecord({
      ...client,
      appointmentContext: appt,
    });
    setClientRecordNotes(
      client.technicalNotes || client.technical_notes || client.notes || ""
    );
  };

  const handleSaveClientFromAppointment = (appt) => {
    setAppointmentToSaveAsClient(appt);
    setNewClientFormData({
      name: appt.clientName || appt.client_name || "",
      phone: appt.clientPhone || appt.client_phone || "",
      notes: appt.notes || "",
      technicalNotes: `Cadastrado via Agenda. Serviço inicial: ${appt.serviceName || appt.service_name || "Corte"}.`,
    });
    setSaveClientFeedback("");
  };

  const handleConfirmSaveNewClient = async () => {
    if (!newClientFormData.name.trim() || !newClientFormData.phone.trim()) {
      alert("Informe o nome e o WhatsApp do cliente.");
      return;
    }

    setIsSavingNewClient(true);
    try {
      const activeTenantId = tenant?.id || user?.user_metadata?.barbershop_id || user?.user_metadata?.tenant_id || user?.id;
      if (!activeTenantId) {
        alert("Aviso de segurança: Identificador da barbearia não encontrado. Faça login novamente.");
        setIsSavingNewClient(false);
        return;
      }
      const cleanPhone = newClientFormData.phone.trim();
      const cleanName = DOMPurify.sanitize(newClientFormData.name.trim(), { ALLOWED_TAGS: [] });
      const cleanNotes = DOMPurify.sanitize(newClientFormData.notes.trim(), { ALLOWED_TAGS: [] });
      const cleanTechNotes = DOMPurify.sanitize(newClientFormData.technicalNotes.trim(), { ALLOWED_TAGS: [] });

      const clientPayload = {
        tenant_id: activeTenantId,
        barbershop_id: activeTenantId,
        name: cleanName,
        phone: cleanPhone,
        notes: cleanNotes || cleanTechNotes,
        frequency_days: 18,
        total_spent: 0,
        total_visits: 0,
        average_ticket: 0,
        preferred_barber: "Barbeiro Geral",
        status: "active",
        is_vip: false,
        technical_notes: {
          notes: cleanNotes || cleanTechNotes,
          cutSpecs: cleanTechNotes || cleanNotes,
          frequency_days: 18,
          last_visit: formatDateToYMD(new Date()),
        },
      };

      const { data, error } = await supabase
        .from("clients")
        .insert([clientPayload])
        .select()
        .single();

      if (error) {
        console.warn("Aviso ao salvar no Supabase (utilizando fallback local):", error);
      }

      const createdClient = data || {
        id: `cli-${Date.now()}`,
        ...clientPayload,
        created_at: new Date().toISOString(),
      };

      if (onUpdateClients) {
        onUpdateClients([
          createdClient,
          ...clients.filter(
            (c) =>
              c.id !== createdClient.id &&
              (!createdClient.phone || c.phone !== createdClient.phone)
          ),
        ]);
      }

      setSaveClientFeedback(`Cliente ${cleanName} cadastrado com sucesso!`);
      setTimeout(() => {
        setAppointmentToSaveAsClient(null);
        setSaveClientFeedback("");
      }, 1200);
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
      alert("Não foi possível salvar o cliente no banco.");
    } finally {
      setIsSavingNewClient(false);
    }
  };

  const handleSaveClientRecordNotes = async () => {
    if (!selectedClientForRecord) return;
    setIsSavingRecordNotes(true);
    try {
      const cleanNotes = DOMPurify.sanitize(clientRecordNotes.trim(), { ALLOWED_TAGS: [] });
      const clientId = selectedClientForRecord.id;

      if (clientId && !String(clientId).startsWith("cli-mock")) {
        const existingTechNotes =
          typeof selectedClientForRecord?.technical_notes === "object" && selectedClientForRecord.technical_notes
            ? selectedClientForRecord.technical_notes
            : typeof selectedClientForRecord?.technicalNotes === "object" && selectedClientForRecord.technicalNotes
            ? selectedClientForRecord.technicalNotes
            : {};

        await supabase
          .from("clients")
          .update({
            technical_notes: {
              ...existingTechNotes,
              notes: cleanNotes,
              cutSpecs: cleanNotes,
            },
          })
          .eq("id", clientId);
      }

      const updatedClients = clients.map((c) =>
        c.id === clientId
          ? { ...c, notes: cleanNotes, technicalNotes: cleanNotes, technical_notes: cleanNotes }
          : c
      );

      if (onUpdateClients) {
        onUpdateClients(updatedClients);
      }

      setSelectedClientForRecord((prev) =>
        prev ? { ...prev, notes: cleanNotes, technicalNotes: cleanNotes } : null
      );
      alert("Prontuário técnico atualizado com sucesso!");
    } catch (err) {
      console.error("Erro ao atualizar prontuário:", err);
    } finally {
      setIsSavingRecordNotes(false);
    }
  };

  // 4. Salvar Novo Agendamento (Refatorado e Blindado)
  const handleSaveNewAppointment = (newAppt) => {
    let computedEndTime = newAppt.endTime;

    if (!computedEndTime && newAppt.startTime) {
      const [startH, startM] = newAppt.startTime.split(":").map(Number);
      const totalMinutes =
        startH * 60 + startM + (Number(newAppt.durationMinutes) || 40);
      const endH = Math.floor(totalMinutes / 60);
      const endM = totalMinutes % 60;
      computedEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    }

    const appointmentToAdd = {
      id: newAppt.id || `apt-${Date.now()}`,
      ...newAppt,
      endTime: computedEndTime || "10:00",
      isPaid: Boolean(newAppt.isPaid),
      isVip: Boolean(newAppt.isVip),
      status: newAppt.status || "confirmed",
      hasNotes: Boolean(newAppt.notes),
    };

    const updatedList = [...currentAppointments, appointmentToAdd];

    if (onUpdateAppointments) {
      onUpdateAppointments(updatedList);
    }

    setIsNewModalOpen(false);
  };

  // [Função assíncrona: atualiza status no estado e na tabela appointments do Supabase]
  const handleStatusChange = async (appointmentId, newStatus) => {
    const updatedList = currentAppointments.map((a) =>
      a.id === appointmentId ? { ...a, status: newStatus } : a,
    );

    if (onUpdateAppointments) {
      onUpdateAppointments(updatedList);
    }

    if (selectedAppointment && selectedAppointment.id === appointmentId) {
      setSelectedAppointment((prev) => ({ ...prev, status: newStatus }));
    }

    try {
      let { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);

      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) {
        await supabase
          .from("agendamentos")
          .update({ status: newStatus })
          .eq("id", appointmentId);
      }
    } catch (err) {
      console.warn("Aviso ao atualizar status no Supabase:", err);
    }
  };

  // [Função assíncrona: cancela o agendamento no estado e no banco liberando a vaga]
  const handleConfirmCancellation = async () => {
    if (!appointmentToCancel) return;

    const targetId = appointmentToCancel.id;
    const updatedList = currentAppointments.map((a) =>
      a.id === targetId ? { ...a, status: "cancelled" } : a,
    );

    if (onUpdateAppointments) {
      onUpdateAppointments(updatedList);
    }

    setAppointmentToCancel(null);

    try {
      let { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", targetId);

      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) {
        await supabase
          .from("agendamentos")
          .update({ status: "cancelled" })
          .eq("id", targetId);
      }
    } catch (err) {
      console.warn("Aviso ao cancelar agendamento no Supabase:", err);
    }
  };

  // [Função assíncrona: salva edição do atendimento e persiste no Supabase de forma limpa e unificada]
  const handleConfirmSaveEdit = async () => {
    const selectedBarber =
      activeBarbers.find((b) => b.id === editForm.barberId) || activeBarbers[0];
    const selectedService =
      services.find((s) => s.id === editForm.serviceId) || services[0];

    const [startH, startM] = editForm.startTime.split(":").map(Number);
    const duration = Number(
      selectedService?.durationMinutes ||
        selectedService?.duration_minutes ||
        30,
    );
    const totalMinutes = startH * 60 + startM + duration;
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    const newEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    const updatedAppt = {
      ...selectedAppointment,
      barberId: selectedBarber?.id || "",
      barberName: DOMPurify.sanitize(selectedBarber?.name || "Barbeiro", { ALLOWED_TAGS: [] }),
      serviceId: selectedService?.id || "",
      serviceName: DOMPurify.sanitize(selectedService?.name || "Serviço", { ALLOWED_TAGS: [] }),
      durationMinutes: duration,
      startTime: editForm.startTime,
      endTime: newEndTime,
      price: Number(editForm.price || selectedService?.price || 0),
      notes: DOMPurify.sanitize(editForm.notes || "", { ALLOWED_TAGS: ["b", "i", "strong", "em"] }),
      hasNotes: Boolean(editForm.notes?.trim()),
    };

    const updatedList = currentAppointments.map((a) =>
      a.id === updatedAppt.id ? updatedAppt : a,
    );

    if (onUpdateAppointments) {
      onUpdateAppointments(updatedList);
    }

    setSelectedAppointment(updatedAppt);
    setIsEditingAppointment(false);
    setIsConfirmEditModalOpen(false);

    try {
      const editPayload = {
        barber_id: updatedAppt.barberId,
        barber_name: updatedAppt.barberName,
        service_name: updatedAppt.serviceName,
        duration_minutes: updatedAppt.durationMinutes,
        start_time: updatedAppt.startTime,
        end_time: updatedAppt.endTime,
        price: updatedAppt.price,
        notes: updatedAppt.notes,
      };

      let { error } = await supabase
        .from("appointments")
        .update(editPayload)
        .eq("id", updatedAppt.id);

      if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) {
        await supabase
          .from("agendamentos")
          .update(editPayload)
          .eq("id", updatedAppt.id);
      }
    } catch (err) {
      console.warn("Aviso ao sincronizar edição com o Supabase:", err);
    }
  };

  // 7. Arrastar e Soltar (Drag & Drop)
  const handleDropAppointment = (
    draggedAppt,
    targetBarberId,
    targetStartTime,
  ) => {
    const timeToMins = (tStr) => {
      const [h, m] = tStr.split(":").map(Number);
      return h * 60 + m;
    };

    const newStartMins = timeToMins(targetStartTime);
    const newEndMins =
      newStartMins + (Number(draggedAppt.durationMinutes) || 40);
    const endH = Math.floor(newEndMins / 60);
    const endM = newEndMins % 60;
    const targetEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    const targetBarber = activeBarbers.find((b) => b.id === targetBarberId);
    const targetBarberName = targetBarber ? targetBarber.name : "Barbeiro";

    // Conflito de Almoço isolado por dia do agendamento (sem duplicação semanal)
    const apptDateYMD = getAppointmentDateYMD(draggedAppt);
    const apptDate = parseYMDToLocalDate(apptDateYMD);
    const dayKeys = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
    const targetDayKey = dayKeys[apptDate.getDay()];

    let daySpecificBreaks = null;
    if (targetBarber?.breaks && typeof targetBarber.breaks === "object" && !Array.isArray(targetBarber.breaks)) {
      if (Array.isArray(targetBarber.breaks[targetDayKey])) {
        daySpecificBreaks = targetBarber.breaks[targetDayKey];
      } else if (Array.isArray(targetBarber.breaks[apptDate.getDay()])) {
        daySpecificBreaks = targetBarber.breaks[apptDate.getDay()];
      }
    }

    const rawBreaks = Array.isArray(daySpecificBreaks)
      ? daySpecificBreaks
      : Array.isArray(targetBarber?.breaks) && targetBarber.breaks.length > 0
      ? targetBarber.breaks
      : Array.isArray(targetBarber?.breaks?.intervals)
      ? targetBarber.breaks.intervals
      : [];

    const barberBreaks = [];
    const seenDropBreaks = new Set();

    rawBreaks.forEach((b) => {
      const s = (b?.startTime || b?.start_time || b?.breakStart || "").trim();
      const e = (b?.endTime || b?.end_time || b?.breakEnd || "").trim();
      if (s && e && !seenDropBreaks.has(`${s}-${e}`)) {
        seenDropBreaks.add(`${s}-${e}`);
        barberBreaks.push({ startTime: s, endTime: e });
      }
    });

    if (barberBreaks.length === 0 && Array.isArray(targetBarber?.schedule)) {
      const daySched =
        targetBarber.schedule.find((s) => {
          if (!s || typeof s !== "object") return false;
          const sDay = String(s.dayId || s.day || s.id || "").toLowerCase().trim();
          return (
            sDay === targetDayKey ||
            (targetDayKey === "dom" && (sDay.includes("dom") || sDay === "sun")) ||
            (targetDayKey === "seg" && (sDay.includes("seg") || sDay === "mon")) ||
            (targetDayKey === "ter" && (sDay.includes("ter") || sDay === "tue")) ||
            (targetDayKey === "qua" && (sDay.includes("qua") || sDay === "wed")) ||
            (targetDayKey === "qui" && (sDay.includes("qui") || sDay === "thu")) ||
            (targetDayKey === "sex" && (sDay.includes("sex") || sDay === "fri")) ||
            (targetDayKey === "sab" && (sDay.includes("sab") || sDay.includes("sáb") || sDay === "sat"))
          );
        }) || (targetBarber.schedule.length === 7 ? targetBarber.schedule[apptDate.getDay() === 0 ? 6 : apptDate.getDay() - 1] : null);

      if (daySched?.breakStart && daySched?.breakEnd && daySched?.active !== false) {
        barberBreaks.push({ startTime: daySched.breakStart, endTime: daySched.breakEnd });
      }
    }

    const hasLunchConflict = barberBreaks.some((brk) => {
      const bStart = timeToMins(brk.startTime || brk.start_time || brk.breakStart);
      const bEnd = timeToMins(brk.endTime || brk.end_time || brk.breakEnd);
      return newStartMins < bEnd && newEndMins > bStart;
    });

    if (hasLunchConflict) {
      alert(
        `CONFLITO COM ALMOÇO:\n\n${targetBarberName} está em intervalo de almoço neste horário.`,
      );
      return;
    }

    // Conflito com outro agendamento na mesma data
    const draggedDateYMD = getAppointmentDateYMD(draggedAppt);
    const hasConflict = currentAppointments.some((a) => {
      if (a.id === draggedAppt.id) return false;
      if ((a.barberId || a.barber_id) !== targetBarberId) return false;
      if (a.status === "cancelled") return false;
      if (getAppointmentDateYMD(a) !== draggedDateYMD) return false;

      const aStart = timeToMins(a.startTime || a.start_time || "00:00");
      const aEnd = timeToMins(a.endTime || a.end_time || "00:00");
      return newStartMins < aEnd && newEndMins > aStart;
    });

    if (hasConflict) {
      alert(
        `CONFLITO DE HORÁRIO:\n\n${targetBarberName} já possui atendimento marcado neste horário.`,
      );
      return;
    }

    const updatedList = currentAppointments.map((a) =>
      a.id === draggedAppt.id
        ? {
            ...a,
            barberId: targetBarberId,
            barberName: targetBarberName,
            startTime: targetStartTime,
            endTime: targetEndTime,
          }
        : a,
    );

    if (onUpdateAppointments) {
      onUpdateAppointments(updatedList);
    }

    try {
      if (draggedAppt.id && !String(draggedAppt.id).startsWith("mock-") && !String(draggedAppt.id).startsWith("temp-")) {
        supabase
          .from("appointments")
          .update({
            barber_id: targetBarberId,
            start_time: targetStartTime,
            end_time: targetEndTime,
          })
          .eq("id", draggedAppt.id)
          .then(({ error }) => {
            if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) {
              supabase.from("agendamentos").update({
                barber_id: targetBarberId,
                start_time: targetStartTime,
                end_time: targetEndTime,
              }).eq("id", draggedAppt.id);
            }
          });
      }
    } catch (err) {
      console.warn("Aviso ao reagendar no Supabase:", err);
    }
  };

  const getNextAvailableTimeSlot = () => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    let nextM = Math.ceil((m + 5) / 15) * 15;
    let nextH = h;
    if (nextM >= 60) {
      nextH += 1;
      nextM = 0;
    }
    if (nextH < 8) return "08:00";
    if (nextH >= 20) return "08:00";
    return `${String(nextH).padStart(2, "0")}:${String(nextM).padStart(2, "0")}`;
  };

  const handleSlotClick = (barberId, time, dateObj) => {
    setPrefilledBarberId(barberId);
    setPrefilledTime(time);
    setPrefilledDate(dateObj ? formatDateToYMD(dateObj) : "");
    setIsNewModalOpen(true);
  };

  const handleFinishAppointment = (appt) => {
    handleStatusChange(appt.id, "completed");
    setSelectedAppointment(null);
    if (appt.isPaid) {
      alert(
        `ATENDIMENTO CONCLUÍDO!\n\n• Cliente: ${appt.clientName}\n• Quitado e finalizado com sucesso!`,
      );
    } else {
      alert(
        `ATENDIMENTO CONCLUÍDO (PAGAMENTO PENDENTE):\n\n• Cliente: ${appt.clientName}\n• Valor: R$ ${Number(appt.price).toFixed(2)}\n• Encaminhe o cliente para o caixa.`,
      );
    }
  };

  // =========================================================================
  // CÁLCULO REATIVO DOS 3 BIG NUMBERS DA PREVISÃO ATUAL (REGRAS DE NEGÓCIO)
  // =========================================================================

  // 1. Clientes: Puxa a quantidade total de clientes cadastrados no sistema através do hook unificado useClientsCount
  const totalClientsCount = clientsCount;

  // Atendimentos ativos dentro do período selecionado na agenda (Dia, Semana ou Mês)
  const periodAppointments = useMemo(() => {
    return currentAppointments.filter((a) => {
      if (a.status === "cancelled" || a.status === "cancelado") return false;
      const apptDate = getAppointmentDateYMD(a);
      return isDateInPeriod(apptDate, currentDate, viewMode);
    });
  }, [currentAppointments, currentDate, viewMode]);

  // 2. Serviços: Exibe a quantidade de serviços realizados com base no filtro temporal ativo (Dia, Semana ou Mês)
  const periodServicesCount = useMemo(() => {
    return periodAppointments.reduce((count, a) => {
      if (Array.isArray(a.services) && a.services.length > 0) {
        return count + a.services.length;
      }
      return count + 1;
    }, 0);
  }, [periodAppointments]);

  // 3. Preço / Faturamento: Exibe a soma total dos preços das comandas e serviços com base no filtro temporal ativo
  const totalPeriodRevenue = useMemo(() => {
    // 3.1. Soma dos preços dos agendamentos no período
    const apptsTotal = periodAppointments.reduce(
      (sum, a) => sum + Number(a.price || 0),
      0
    );

    // 3.2. Soma das comandas ativas no período (evitando duplicar agendamentos já computados)
    const apptIdsSet = new Set(periodAppointments.map((a) => a.id));
    const extraComandasTotal = (comandas || []).reduce((sum, cmd) => {
      if (cmd.status === "cancelled" || cmd.status === "cancelado") return sum;
      if (apptIdsSet.has(cmd.id) || (cmd.appointmentId && apptIdsSet.has(cmd.appointmentId))) {
        return sum;
      }
      const cmdDate = cmd.date || (cmd.createdAt ? String(cmd.createdAt).slice(0, 10) : "");
      if (!cmdDate || !isDateInPeriod(cmdDate, currentDate, viewMode)) {
        return sum;
      }
      const sSum = (cmd.services || []).reduce((acc, s) => acc + Number(s.price || 0), 0);
      const pSum = (cmd.products || []).reduce(
        (acc, p) =>
          acc +
          Number(
            p.total ||
              Number(p.quantity || 1) * Number(p.unitPrice || p.price || 0),
          ),
        0,
      );
      const cmdTotal = Number(cmd.totalPrice || cmd.total || (sSum + pSum) || 0);
      return sum + cmdTotal;
    }, 0);

    return apptsTotal + extraComandasTotal;
  }, [periodAppointments, comandas, currentDate, viewMode]);

  // Rótulos descritivos do intervalo selecionado
  const periodLabel = useMemo(() => {
    if (viewMode === "day") {
      const isToday = formatDateToYMD(currentDate) === formatDateToYMD(new Date());
      return isToday ? "Hoje" : currentDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    }
    if (viewMode === "week") {
      return "Nesta semana";
    }
    return "Neste mês";
  }, [viewMode, currentDate]);

  const periodServicesLabel = useMemo(() => {
    if (viewMode === "day") {
      const isToday = formatDateToYMD(currentDate) === formatDateToYMD(new Date());
      return isToday
        ? "Realizados hoje"
        : `Em ${currentDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
    }
    if (viewMode === "week") {
      return "Realizados na semana";
    }
    return "Realizados no mês";
  }, [viewMode, currentDate]);

  const formattedRevenue = useMemo(() => {
    return `R$ ${totalPeriodRevenue.toFixed(2).replace(".", ",")}`;
  }, [totalPeriodRevenue]);

  const previewBarber = activeBarbers.find((b) => b.id === editForm.barberId);
  const previewService = services.find((s) => s.id === editForm.serviceId);

  return (
    <div className={scheduleStyles.container}>
      {/* 1. CARD "PREVISÃO ATUAL" (EXPANSÍVEL / DROPDOWN COM 3 BIG NUMBERS) */}
      <div
        className={scheduleStyles.headerCard}
        data-previsao-card="true"
        data-schedule-accordion="true"
      >
        {/* Cabeçalho do Dropdown */}
        <button
          type="button"
          onClick={() => setIsPrevisaoExpanded((prev) => !prev)}
          aria-expanded={isPrevisaoExpanded}
          aria-label={
            isPrevisaoExpanded
              ? "Recolher detalhes da Previsão atual"
              : "Expandir detalhes da Previsão atual"
          }
          className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none select-none group"
          data-previsao-trigger="true"
          data-accordion-trigger="true"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
              <DollarSign className="w-5 h-5 text-amber-500" />
            </div>
            <h1 className={scheduleStyles.title}>
              <span>Previsão atual</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            {onBack && (
              <Button
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onBack();
                }}
                className="text-xs py-1.5 px-2.5 sm:py-2 sm:px-3"
              >
                <span className="flex items-center gap-1.5">
                  <ProjectIcon name="ArrowLeft" size={14} colorVariant="inherit" />
                  <span className="hidden sm:inline">Voltar</span>
                </span>
              </Button>
            )}

            <div
              className={`p-1.5 rounded-lg text-neutral-400 group-hover:text-white group-hover:bg-neutral-800/60 transition-all duration-300 ${
                isPrevisaoExpanded ? "rotate-180 text-amber-400" : "rotate-0"
              }`}
              data-chevron-indicator="true"
            >
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </button>

        {/* Linha Divisória interna e os 3 Big Numbers */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isPrevisaoExpanded
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0 pointer-events-none"
          }`}
          data-previsao-content="true"
          data-accordion-content="true"
        >
          <div className="overflow-hidden">
            {/* Linha Divisória interna: Separando o cabeçalho dos blocos de métricas */}
            <div className="border-t border-neutral-800/80 mt-3.5 pt-3.5 sm:pt-4">
              <div className={scheduleStyles.bigNumbersGrid}>
                {/* 1. Big Number: Clientes */}
                <div
                  className={scheduleStyles.bigNumberCard}
                  data-bignumber-clients="true"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Clientes
                    </span>
                    <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                      {totalClientsCount}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Cadastrados no sistema
                  </p>
                </div>

                {/* 2. Big Number: Serviços */}
                <div
                  className={scheduleStyles.bigNumberCard}
                  data-bignumber-services="true"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Serviços
                    </span>
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Scissors className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                      {periodServicesCount}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-400/90 font-medium mt-1">
                    {periodServicesLabel} ({periodServicesCount === 1 ? "1 serviço" : `${periodServicesCount} serviços`})
                  </p>
                </div>

                {/* 3. Big Number: Preço / Faturamento */}
                <div
                  className={scheduleStyles.bigNumberCard}
                  data-bignumber-revenue="true"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Preço
                    </span>
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
                      {formattedRevenue}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-400/90 font-medium mt-1">
                    Faturamento previsto ({periodLabel.toLowerCase()})
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. GRADE DA LINHA DO TEMPO: Agenda de Atendimentos */}
      <CalendarView
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        barbers={activeBarbers}
        appointments={currentAppointments}
        startHour={8}
        endHour={21}
        minuteHeight={1.8}
        onSlotClick={handleSlotClick}
        onNewAppointmentClick={(dateObj) => {
          setPrefilledBarberId(activeBarbers[0]?.id || "");
          setPrefilledTime(getNextAvailableTimeSlot());
          setPrefilledDate(dateObj ? formatDateToYMD(dateObj) : "");
          setIsNewModalOpen(true);
        }}
        onAppointmentClick={(appt) => handleOpenDetails(appt)}
        onOpenComanda={(id) => {
          if (onNavigateToCashier) onNavigateToCashier(id);
          else alert(`Abrindo Comanda #${id} no Caixa!`);
        }}
        onStatusChange={handleStatusChange}
        onCancelAppointment={(id) => {
          const target = currentAppointments.find((a) => a.id === id);
          if (target) setAppointmentToCancel(target);
        }}
        clients={clients}
        onSaveClient={handleSaveClientFromAppointment}
        onOpenClientRecord={handleOpenClientRecord}
        onDropAppointment={handleDropAppointment}
      />

      {/* MODAL 1: DETALHES & EDIÇÃO */}
      <Modal
        isOpen={!!selectedAppointment}
        onClose={() => {
          setSelectedAppointment(null);
          setIsEditingAppointment(false);
        }}
        title={
          isEditingAppointment
            ? `Editar Atendimento: ${selectedAppointment?.clientName}`
            : "Detalhes do Atendimento"
        }
        footer={
          selectedAppointment && (
            <div className="w-full flex items-center justify-end gap-2.5">
              {isEditingAppointment ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditingAppointment(false)}
                    className="text-xs"
                  >
                    Cancelar Edição
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setIsConfirmEditModalOpen(true)}
                    className="text-xs"
                  >
                    Salvar Alterações
                  </Button>
                </>
              ) : (
                <>
                  {/* CardInfo #06: BOTÃO 'Pagar' e 'Abrir no Caixa' */}
                  {onNavigateToCashier && selectedAppointment.status !== "cancelled" && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedAppointment(null);
                        onNavigateToCashier();
                      }}
                      className="text-xs font-bold"
                    >
                      Abrir no Caixa
                    </Button>
                  )}

                  {!selectedAppointment.isPaid && selectedAppointment.status !== "cancelled" && (
                    <Button
                      variant="success"
                      onClick={() => setIsMercadoPagoModalOpen(true)}
                      className="text-xs font-bold"
                    >
                      Pagar
                    </Button>
                  )}

                  {/* BOTÃO PRIMÁRIO: Iniciar Atendimento (Extrema direita, Âmbar) */}
                  {(selectedAppointment.status === "waiting" ||
                    selectedAppointment.status === "confirmed") && (
                    <Button
                      variant="primary"
                      onClick={() => {
                        handleStatusChange(
                          selectedAppointment.id,
                          "in_progress",
                        );
                        setSelectedAppointment(null);
                      }}
                      className="text-xs font-bold"
                    >
                      Iniciar Atendimento
                    </Button>
                  )}

                  {selectedAppointment.status === "in_progress" && (
                    <Button
                      variant="primary"
                      onClick={() =>
                        handleFinishAppointment(selectedAppointment)
                      }
                      className="text-xs font-bold"
                    >
                      {selectedAppointment.isPaid
                        ? "Finalizar Atendimento"
                        : "Finalizar o Atendimento"}
                    </Button>
                  )}
                </>
              )}
            </div>
          )
        }
      >
        {selectedAppointment && (
          <div className="space-y-4 text-left">
            {!isEditingAppointment ? (
              <div className="space-y-4">
                {/* CardInfo #01: Título 'Cliente Agendado', Nome, Telefone, Tag Status e Link 'Cancelar horário' */}
                <div className="relative p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-neutral-500">
                        Cliente Agendado
                      </span>
                      {selectedAppointment.status !== "completed" &&
                        selectedAppointment.status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() => handleOpenQuickEditClient(selectedAppointment)}
                            className="text-xs font-semibold text-amber-400 hover:text-amber-300 dark:text-amber-400 dark:hover:text-amber-300 [html:not(.dark)_&]:text-[#059669] [html:not(.dark)_&]:hover:text-[#047857] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded px-1"
                            title="Editar nome e telefone do cliente agendado"
                          >
                            Editar
                          </button>
                        )}
                    </div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
                      <SafeHtml html={selectedAppointment.clientName} />
                      {selectedAppointment.isVip && (
                        <span className="text-amber-400 text-xs flex items-center gap-1">
                          <ProjectIcon name="Star" size={12} className="text-amber-400 fill-amber-400" />
                          VIP
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">
                      <SafeHtml html={selectedAppointment.clientPhone || "Telefone não informado"} />
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge status={selectedAppointment.status} />
                    {selectedAppointment.status !== "cancelled" &&
                      selectedAppointment.status !== "completed" && (
                        <button
                          type="button"
                          onClick={() => {
                            setAppointmentToCancel(selectedAppointment);
                            setSelectedAppointment(null);
                          }}
                          className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                        >
                          Cancelar horário
                        </button>
                      )}
                  </div>
                </div>

                {/* CardInfo #02: Barbeiro (Nome em Branco) e Serviço (Descrição), com link Editar */}
                <div className="relative p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-2xl text-xs">
                  {selectedAppointment.status !== "completed" &&
                    selectedAppointment.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => setIsEditingAppointment(true)}
                        className="absolute top-3 right-3 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                        title="Editar profissional ou serviço"
                      >
                        Editar
                      </button>
                    )}
                  <div className="grid grid-cols-2 gap-3 pr-12">
                    <div>
                      <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                        Barbeiro:
                      </span>
                      <strong className="text-white text-sm block mt-0.5">
                        <SafeHtml html={selectedAppointment.barberName} />
                      </strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                        Serviço:
                      </span>
                      <strong className="text-white text-sm block mt-0.5">
                        <SafeHtml html={selectedAppointment.serviceName} />
                      </strong>
                    </div>
                  </div>
                </div>

                {/* CardInfo #03: Horário de cadeira e Valor a cobrar, com link Editar */}
                <div className="relative p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-2xl text-xs">
                  {selectedAppointment.status !== "completed" &&
                    selectedAppointment.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => setIsEditingAppointment(true)}
                        className="absolute top-3 right-3 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                        title="Editar horário ou valor"
                      >
                        Editar
                      </button>
                    )}
                  <div className="grid grid-cols-2 gap-3 pr-12">
                    <div>
                      <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                        Horários de Cadeira:
                      </span>
                      <span className="text-white font-mono font-bold block mt-0.5">
                        {selectedAppointment.startTime} às{" "}
                        {selectedAppointment.endTime} (
                        {selectedAppointment.durationMinutes} min)
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                        Valor a Cobrar:
                      </span>
                      <span className="text-emerald-400 font-black font-mono text-base block mt-0.5">
                        R${" "}
                        {Number(selectedAppointment.price || 0)
                          .toFixed(2)
                          .replace(".", ",")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl flex justify-between items-center text-xs">
                  <span className="text-neutral-400">Status do Pagamento:</span>
                  <span
                    className={
                      selectedAppointment.isPaid
                        ? "text-emerald-400 font-bold flex items-center gap-1"
                        : "text-amber-400 font-bold flex items-center gap-1"
                    }
                  >
                    {selectedAppointment.isPaid ? (
                      <>
                        <ProjectIcon name="Check" size={13} colorVariant="inherit" />
                        Pago no Caixa
                      </>
                    ) : (
                      <>
                        <ProjectIcon name="AlertTriangle" size={13} colorVariant="inherit" />
                        Pendente
                      </>
                    )}
                  </span>
                </div>

                {selectedAppointment.notes && (
                  <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-amber-400 block">
                      Observações do Atendimento:
                    </span>
                    <div className="text-neutral-300">
                      <SafeHtml html={selectedAppointment.notes} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <Select
                  label="Profissional Responsável"
                  value={editForm.barberId}
                  onChange={(e) =>
                    setEditForm({ ...editForm, barberId: e.target.value })
                  }
                  options={activeBarbers.map((b) => ({
                    value: b.id,
                    label: `${b.name} (${b.role})`,
                  }))}
                />

                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-300">
                      Serviço Solicitado
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsQuickServiceModalOpen(true)}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>+</span> Cadastrar Novo Serviço
                    </button>
                  </div>

                  <Select
                    value={editForm.serviceId}
                    onChange={(e) => {
                      const serv = services.find(
                        (s) => s.id === e.target.value,
                      );
                      setEditForm({
                        ...editForm,
                        serviceId: e.target.value,
                        price: serv ? String(serv.price) : editForm.price,
                      });
                    }}
                    options={services.map((s) => ({
                      value: s.id,
                      label: `${s.name} (${s.durationMinutes} min - R$ ${s.price})`,
                    }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Horário de Início"
                    type="time"
                    value={editForm.startTime}
                    onChange={(e) =>
                      setEditForm({ ...editForm, startTime: e.target.value })
                    }
                  />

                  <Input
                    label="Valor a Cobrar (R$)"
                    type="number"
                    value={editForm.price}
                    onChange={(e) =>
                      setEditForm({ ...editForm, price: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL CONFIRMAR ALTERAÇÃO */}
      <Modal
        isOpen={isConfirmEditModalOpen}
        size="sm"
        onClose={() => setIsConfirmEditModalOpen(false)}
        title="Confirmar Alterações no Agendamento"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsConfirmEditModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConfirmSaveEdit}>
              Sim, pode alterar!
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-left text-xs text-neutral-300">
          <p>
            Deseja salvar as alterações de{" "}
            <strong>{selectedAppointment?.clientName}</strong>?
          </p>
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1">
            <p>
              Profissional:{" "}
              <strong className="text-amber-400">{previewBarber?.name}</strong>
            </p>
            <p>
              Serviço:{" "}
              <strong className="text-white">{previewService?.name}</strong>
            </p>
            <p>
              Novo Valor:{" "}
              <strong className="text-emerald-400">
                R$ {Number(editForm.price).toFixed(2)}
              </strong>
            </p>
          </div>
        </div>
      </Modal>

      {/* MODAL SERVIÇO ON-THE-FLY */}
      <Modal
        isOpen={isQuickServiceModalOpen}
        size="sm"
        onClose={() => setIsQuickServiceModalOpen(false)}
        title="Cadastrar Novo Serviço"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsQuickServiceModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveQuickService}>
              Salvar e Selecionar
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-left">
          <Input
            label="Nome do Serviço"
            placeholder="Ex: Hidratação Ouro"
            value={quickServiceName}
            onChange={(e) => setQuickServiceName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço (R$)"
              type="number"
              value={quickServicePrice}
              onChange={(e) => setQuickServicePrice(e.target.value)}
            />
            <Select
              label="Duração"
              value={quickServiceDuration}
              onChange={(e) => setQuickServiceDuration(e.target.value)}
              options={[
                { value: "30", label: "30 min" },
                { value: "45", label: "45 min" },
                { value: "60", label: "1h" },
              ]}
            />
          </div>
        </div>
      </Modal>

      {/* MODAL CANCELAMENTO */}
      <Modal
        isOpen={!!appointmentToCancel}
        size="sm"
        onClose={() => setAppointmentToCancel(null)}
        title="Cancelar Atendimento"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setAppointmentToCancel(null)}
            >
              Não, manter
            </Button>
            <Button variant="danger" onClick={handleConfirmCancellation}>
              Sim, pode cancelar!
            </Button>
          </>
        }
      >
        <div className="text-xs text-neutral-300">
          Tem certeza de que deseja cancelar o atendimento de{" "}
          <strong>{appointmentToCancel?.clientName}</strong>? O horário será
          liberado na agenda.
        </div>
      </Modal>

      {/* MODAL NOVO AGENDAMENTO (CORRIGIDO: VARIÁVEIS CONECTADAS) */}
      <NewAppointmentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSaveAppointment={handleSaveNewAppointment}
        tenant={tenant}
        barbers={activeBarbers.length > 0 ? activeBarbers : barbers}
        services={services}
        clients={clients}
        prefilledBarberId={prefilledBarberId}
        prefilledTime={prefilledTime}
        prefilledDate={prefilledDate}
      />

      {/* MODAL MERCADO PAGO CHECKOUT (PIX / CARTÃO CRÉDITO & DÉBITO) */}
      {selectedAppointment && (
        <MercadoPagoCheckoutModal
          isOpen={isMercadoPagoModalOpen}
          onClose={() => setIsMercadoPagoModalOpen(false)}
          appointment={selectedAppointment}
          tenant={tenant}
          user={user}
          onPaymentSuccess={(paymentInfo) => {
            const updatedAppt = {
              ...selectedAppointment,
              isPaid: true,
              status: "completed",
            };
            const updatedList = currentAppointments.map((a) =>
              a.id === selectedAppointment.id ? updatedAppt : a
            );
            if (onUpdateAppointments) {
              onUpdateAppointments(updatedList);
            }
            setSelectedAppointment(updatedAppt);
            setIsMercadoPagoModalOpen(false);
            try {
              supabase
                .from("appointments")
                .update({ is_paid: true, status: "completed" })
                .eq("id", selectedAppointment.id)
                .then(({ error }) => {
                  if (error && (error.code === "42P01" || error.message?.includes("does not exist"))) {
                    supabase.from("agendamentos").update({ is_paid: true, status: "completed" }).eq("id", selectedAppointment.id);
                  }
                });
            } catch (err) {
              console.warn("Aviso ao sincronizar status de pagamento no Supabase:", err);
            }
          }}
        />
      )}

      {/* MODAL 5: PRONTUÁRIO TÉCNICO & PREFERÊNCIAS DE CORTE (DIRETO DO CARD) */}
      <Modal
        isOpen={!!selectedClientForRecord}
        size="lg"
        onClose={() => setSelectedClientForRecord(null)}
        title={`Prontuário & Ficha Técnica: ${selectedClientForRecord?.name || ""}`}
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            {onNavigateToClients && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedClientForRecord(null);
                  onNavigateToClients();
                }}
                className="text-xs text-amber-400 hover:text-amber-300 py-1.5 px-2.5"
              >
                Abrir Módulo de Clientes Completo
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="secondary"
                onClick={() => setSelectedClientForRecord(null)}
              >
                Fechar
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveClientRecordNotes}
                disabled={isSavingRecordNotes}
                className="bg-amber-600 hover:bg-amber-500 font-bold"
              >
                {isSavingRecordNotes ? "Salvando..." : "Salvar Prontuário"}
              </Button>
            </div>
          </div>
        }
      >
        {selectedClientForRecord && (
          <div className="space-y-4 text-left text-xs">
            {/* Cartão de Resumo do Cliente */}
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-neutral-400 block font-bold uppercase">Telefone</span>
                <span className="text-neutral-100 font-mono font-medium">{selectedClientForRecord.phone || "Não informado"}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block font-bold uppercase">Total de Visitas</span>
                <span className="text-amber-400 font-bold text-sm">{selectedClientForRecord.total_cuts || selectedClientForRecord.totalVisits || 1} cortes</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block font-bold uppercase">LTV (Total Pago)</span>
                <span className="text-emerald-400 font-bold text-sm">
                  R$ {Number(selectedClientForRecord.total_spent || selectedClientForRecord.totalSpent || 0).toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block font-bold uppercase">Status</span>
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                  {selectedClientForRecord.is_vip ? "VIP / Fidelizado" : "Cliente Ativo"}
                </span>
              </div>
            </div>

            {/* Editor de Anotações Técnicas de Corte */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-200 block">
                Ficha Técnica de Preferências (Lâmina, Pentes, Estilo e Observações):
              </label>
              <textarea
                rows={4}
                value={clientRecordNotes}
                onChange={(e) => setClientRecordNotes(e.target.value)}
                placeholder="Ex: Degradê navalhado alto (fade), tesoura no topo sem tirar comprimento. Não passar navalha na testa. Acabamento da barba com toalha quente."
                className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
              />
              <span className="text-[10px] text-neutral-500 block">
                Essas notas ficam salvas no prontuário do cliente e serão consultadas em todos os atendimentos futuros.
              </span>
            </div>

            {/* Histórico Recente de Agendamentos */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <span className="text-xs font-bold text-neutral-300 block">
                Histórico de Atendimentos na Barbearia:
              </span>
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {currentAppointments
                  .filter((a) => {
                    const cleanApptPhone = (a.clientPhone || a.client_phone || "").replace(/\D/g, "");
                    const cleanCliPhone = (selectedClientForRecord.phone || "").replace(/\D/g, "");
                    const cleanApptName = (a.clientName || a.client_name || "").trim().toLowerCase();
                    const cleanCliName = (selectedClientForRecord.name || "").trim().toLowerCase();
                    return (cleanApptPhone && cleanCliPhone && cleanApptPhone === cleanCliPhone) ||
                           (cleanApptName && cleanCliName && cleanApptName === cleanCliName);
                  })
                  .map((pastAppt) => (
                    <div
                      key={pastAppt.id}
                      className="p-2 bg-neutral-900 border border-neutral-800/80 rounded-lg flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <span className="font-bold text-neutral-200">{pastAppt.serviceName || "Serviço"}</span>
                        <span className="text-neutral-400 ml-2">({pastAppt.date || pastAppt.bookingDate || "Hoje"} às {pastAppt.startTime || "00:00"})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">R$ {Number(pastAppt.price || 0).toFixed(2)}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${pastAppt.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-800 text-neutral-400"}`}>
                          {pastAppt.status === "completed" ? "Concluído" : pastAppt.status}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 6: CADASTRAR NOVO CLIENTE A PARTIR DA AGENDA */}
      <Modal
        isOpen={!!appointmentToSaveAsClient}
        size="md"
        onClose={() => setAppointmentToSaveAsClient(null)}
        title="Salvar Cliente no Diretório"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              onClick={() => setAppointmentToSaveAsClient(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmSaveNewClient}
              disabled={isSavingNewClient}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold"
            >
              {isSavingNewClient ? "Cadastrando..." : "Confirmar Cadastro"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-left text-xs">
          {saveClientFeedback && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold">
              {saveClientFeedback}
            </div>
          )}

          <p className="text-neutral-300">
            Confirme os dados para registrar <strong>{appointmentToSaveAsClient?.clientName}</strong> como cliente oficial da barbearia:
          </p>

          <Input
            label="Nome Completo do Cliente"
            value={newClientFormData.name}
            onChange={(e) =>
              setNewClientFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Nome do cliente"
          />

          <Input
            label="WhatsApp com DDD"
            value={newClientFormData.phone}
            onChange={(e) =>
              setNewClientFormData((prev) => ({ ...prev, phone: e.target.value }))
            }
            placeholder="(41) 99999-9999"
          />

          <div className="space-y-1">
            <label className="text-xs font-bold text-neutral-300 block">
              Prontuário Inicial / Preferências de Corte:
            </label>
            <textarea
              rows={3}
              value={newClientFormData.technicalNotes}
              onChange={(e) =>
                setNewClientFormData((prev) => ({ ...prev, technicalNotes: e.target.value }))
              }
              placeholder="Ex: Pente 2 na lateral, disfarçado na navalha, corte clássico na tesoura."
              className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 7: EDIÇÃO RÁPIDA DE CLIENTE EM ATENDIMENTO (COMPACTO E SOBREPOSTO) */}
      <Modal
        isOpen={isQuickEditClientOpen}
        size="sm"
        onClose={() => setIsQuickEditClientOpen(false)}
        title="Editar Dados do Cliente"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="secondary"
              onClick={() => setIsQuickEditClientOpen(false)}
              disabled={isSavingQuickEditClient}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveQuickEditClient}
              disabled={isSavingQuickEditClient}
              className="bg-amber-600 hover:bg-amber-500 font-bold dark:bg-amber-600 dark:hover:bg-amber-500 [html:not(.dark)_&]:bg-[#059669] [html:not(.dark)_&]:hover:bg-[#047857]"
            >
              {isSavingQuickEditClient ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-left text-xs">
          <p className="text-neutral-400 [html:not(.dark)_&]:text-zinc-600">
            Atualize o nome e WhatsApp do cliente. As alterações são sincronizadas imediatamente na agenda atual e no banco de dados:
          </p>

          {quickEditClientError && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-semibold">
              {quickEditClientError}
            </div>
          )}

          <div className="space-y-3">
            <Input
              label="Nome do Cliente *"
              value={quickEditClientForm.name}
              onChange={(e) =>
                setQuickEditClientForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Ex: João da Silva"
              autoFocus
              required
            />

            <Input
              label="Celular / WhatsApp com DDD *"
              value={quickEditClientForm.phone}
              onChange={(e) =>
                setQuickEditClientForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              mask="phone"
              placeholder="(00) 00000-0000"
              required
            />
          </div>

          <p className="text-[11px] text-neutral-500 dark:text-neutral-500 [html:not(.dark)_&]:text-zinc-500">
            Foco automático no nome. Edita com agilidade sem perder o contexto do atendimento atual.
          </p>
        </div>
      </Modal>
    </div>
  );
}
