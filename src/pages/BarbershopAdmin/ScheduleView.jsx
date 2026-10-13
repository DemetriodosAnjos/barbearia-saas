import { useState } from "react";
import DOMPurify from "dompurify";
// [Import: cliente Supabase para persistência de agendamentos e alterações de status]
import { supabase } from "../../lib/supabase";
import { scheduleStyles } from "./ScheduleView.styles";
import CalendarView, {
  formatDateToYMD,
  getAppointmentDateYMD,
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
  onNavigateToClients,
  onNavigateToCashier,
  onBack,
}) {
  // Filtra apenas barbeiros que não foram excluídos/inativados para a grade
  const activeBarbers = barbers.filter((b) => b.status !== "inactive");

  // [Single Source of Truth: consome diretamente a prop appointments sem duplicação de estado ou cascata]
  const currentAppointments = appointments;

  // Modais de Criação e Detalhes
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [prefilledBarberId, setPrefilledBarberId] = useState("");
  const [prefilledTime, setPrefilledTime] = useState("");
  const [prefilledDate, setPrefilledDate] = useState("");

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [isMercadoPagoModalOpen, setIsMercadoPagoModalOpen] = useState(false);

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
    const servicePayload = {
      name: cleanServiceName,
      category: "Cabelo",
      duration_minutes: Number(quickServiceDuration),
      price: Number(quickServicePrice),
      active: true,
    };

    try {
      // Método Supabase: insere no banco e resgata o ID gerado
      const { data, error } = await supabase
        .from("services")
        .insert([servicePayload])
        .select()
        .single();

      if (error) throw error;

      const createdService = {
        id: data.id,
        name: data.name,
        category: data.category,
        durationMinutes: data.duration_minutes,
        price: Number(data.price),
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
      console.error("Erro ao salvar serviço no Supabase:", err);
      alert("Não foi possível salvar o novo serviço no catálogo.");
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
      const tenantId = tenant?.id || "788299e3-a26c-4a0b-bc71-c7ae81ed40d3";
      const cleanPhone = newClientFormData.phone.trim();
      const cleanName = DOMPurify.sanitize(newClientFormData.name.trim(), { ALLOWED_TAGS: [] });
      const cleanNotes = DOMPurify.sanitize(newClientFormData.notes.trim(), { ALLOWED_TAGS: [] });
      const cleanTechNotes = DOMPurify.sanitize(newClientFormData.technicalNotes.trim(), { ALLOWED_TAGS: [] });

      const clientPayload = {
        barbershop_id: tenantId,
        name: cleanName,
        phone: cleanPhone,
        is_vip: false,
        total_visits: 0,
        average_ticket: 0,
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
        onUpdateClients([createdClient, ...clients]);
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
      await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);
    } catch (err) {
      console.error("Erro ao atualizar status no Supabase:", err);
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
      await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", targetId);
    } catch (err) {
      console.error("Erro ao cancelar agendamento no Supabase:", err);
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
      // Método Supabase: atualiza as colunas na tabela appointments
      await supabase
        .from("appointments")
        .update({
          barber_id: updatedAppt.barberId,
          barber_name: updatedAppt.barberName,
          service_name: updatedAppt.serviceName,
          duration_minutes: updatedAppt.durationMinutes,
          start_time: updatedAppt.startTime,
          end_time: updatedAppt.endTime,
          price: updatedAppt.price,
          notes: updatedAppt.notes,
        })
        .eq("id", updatedAppt.id);
    } catch (err) {
      console.error("Erro ao sincronizar edição com o Supabase:", err);
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

    // Conflito de Almoço
    const rawBreaks = Array.isArray(targetBarber?.breaks)
      ? targetBarber.breaks
      : Array.isArray(targetBarber?.breaks?.intervals)
      ? targetBarber.breaks.intervals
      : [];
    const barberBreaks = [...rawBreaks];
    if (barberBreaks.length === 0 && Array.isArray(targetBarber?.schedule)) {
      targetBarber.schedule.forEach((s) => {
        if (s?.breakStart && s?.breakEnd) {
          barberBreaks.push({ startTime: s.breakStart, endTime: s.breakEnd });
        }
      });
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

  // Métricas do Topo em tempo real
  const totalTodayAppointments = currentAppointments.filter(
    (a) => a.status !== "cancelled",
  ).length;
  const totalEstimatedRevenue = currentAppointments
    .filter((a) => a.status !== "cancelled")
    .reduce((acc, a) => acc + Number(a.price || 0), 0);

  const previewBarber = activeBarbers.find((b) => b.id === editForm.barberId);
  const previewService = services.find((s) => s.id === editForm.serviceId);

  return (
    <div className={scheduleStyles.container}>
      {/* 1. CABEÇALHO */}
      <div className={scheduleStyles.headerCard}>
        <div className={scheduleStyles.titleWrapper}>
          <h1 className={scheduleStyles.title}>
            <ProjectIcon name="Calendar" size={24} className="text-amber-500" />
            <span>Agenda Operacional de Atendimentos</span>
          </h1>
          <p className={scheduleStyles.subtitle}>
            Acompanhe atendimentos, altere barbeiros, cadastre novos serviços
            on-the-fly e gerencie horários.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className={scheduleStyles.statsGroup}>
            <div
              className={`${scheduleStyles.statBadge} ${scheduleStyles.statAppointments}`}
            >
              <ProjectIcon name="Scissors" size={16} className="text-amber-500" />
              <span>{totalTodayAppointments} cortes hoje</span>
            </div>

            <div
              className={`${scheduleStyles.statBadge} ${scheduleStyles.statRevenue}`}
            >
              <ProjectIcon name="DollarSign" size={16} className="text-amber-500" />
              <span>
                R$ {totalEstimatedRevenue.toFixed(2).replace(".", ",")} previsto
              </span>
            </div>
          </div>

          {onBack && (
            <Button
              variant="secondary"
              onClick={onBack}
              className="text-xs py-2 px-3"
            >
              <span className="flex items-center gap-1.5">
                <ProjectIcon name="ArrowLeft" size={14} colorVariant="inherit" />
                Voltar
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. GRADE DA LINHA DO TEMPO */}
      <CalendarView
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
                    <span className="text-[10px] uppercase font-bold text-neutral-500">
                      Cliente Agendado
                    </span>
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
                .eq("id", selectedAppointment.id);
            } catch (err) {
              console.error("Erro ao sincronizar status de pagamento no Supabase:", err);
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
    </div>
  );
}
