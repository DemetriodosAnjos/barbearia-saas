import { useState } from "react";
import { scheduleStyles } from "./ScheduleView.styles";
import CalendarView from "../../components/calendar/CalendarView";
import NewAppointmentModal from "../../components/calendar/NewAppointmentModal";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";

// Barbeiros da Barbearia
const initialBarbers = [
  {
    id: "barber-carlos",
    name: "Carlos Silva",
    role: "Master Barber",
    avatar: "CS",
    breaks: [{ startTime: "12:00", endTime: "13:00", label: "Almoço Carlos" }],
  },
  {
    id: "barber-marcos",
    name: "Marcos Vinicius",
    role: "Especialista Degradê",
    avatar: "MV",
    breaks: [{ startTime: "13:00", endTime: "14:00", label: "Almoço Marcos" }],
  },
  {
    id: "barber-tiago",
    name: "Tiago Santos",
    role: "Barba & Navalha",
    avatar: "TS",
    breaks: [{ startTime: "12:30", endTime: "13:30", label: "Almoço Tiago" }],
  },
];

const initialAppointments = [
  {
    id: "apt-1",
    barberId: "barber-carlos",
    barberName: "Carlos Silva",
    clientName: "Rodrigo Faro",
    clientPhone: "(11) 98765-4321",
    serviceId: "s1",
    serviceName: "Corte Degradê Navalhado",
    startTime: "09:00",
    endTime: "10:00",
    durationMinutes: 60,
    price: 55,
    status: "confirmed",
    isPaid: true,
    isVip: true,
    hasNotes: false,
    notes: "",
  },
  {
    id: "apt-2",
    barberId: "barber-carlos",
    barberName: "Carlos Silva",
    clientName: "Guilherme Boulos",
    clientPhone: "(11) 97654-3210",
    serviceId: "s2",
    serviceName: "Barboterapia Tradicional",
    startTime: "10:15",
    endTime: "11:00",
    durationMinutes: 45,
    price: 45,
    status: "in_progress",
    isPaid: false,
    isDelayed: false,
    hasNotes: true,
    notes: "Pele sensível no pescoço. Usar toalha bem quente.",
  },
  {
    id: "apt-3",
    barberId: "barber-carlos",
    barberName: "Carlos Silva",
    clientName: "Thiago Ventura",
    clientPhone: "(11) 99887-7665",
    serviceId: "s3",
    serviceName: "Combo VIP: Cabelo + Barba",
    startTime: "11:00",
    endTime: "12:00",
    durationMinutes: 60,
    price: 90,
    status: "in_progress",
    isPaid: true,
    isVip: true,
    hasNotes: true,
    notes: "Prefere café expresso sem açúcar.",
  },
  {
    id: "apt-4",
    barberId: "barber-marcos",
    barberName: "Marcos Vinicius",
    clientName: "Lucas Lima",
    clientPhone: "(11) 91122-3344",
    serviceId: "s4",
    serviceName: "Corte na Tesoura Clássico",
    startTime: "08:30",
    endTime: "09:30",
    durationMinutes: 60,
    price: 50,
    status: "confirmed",
    isPaid: false,
    isVip: false,
    notes: "",
  },
];

export default function ScheduleView({
  services = [],
  onAddService,
  onNavigateToCashier,
  onBack,
}) {
  const [barbers] = useState(initialBarbers);
  const [appointments, setAppointments] = useState(initialAppointments);

  // Modais de Criação e Detalhes
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [prefilledBarberId, setPrefilledBarberId] = useState("");
  const [prefilledTime, setPrefilledTime] = useState("");

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);

  // Estados do Modo Edição
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);
  const [editForm, setEditForm] = useState({
    barberId: "",
    serviceId: "",
    startTime: "09:00",
    price: "55",
    notes: "",
  });

  // Modal de Confirmação de Alteração
  const [isConfirmEditModalOpen, setIsConfirmEditModalOpen] = useState(false);

  // Modal de Cadastro Rápido de Serviço On-the-Fly
  const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
  const [quickServiceName, setQuickServiceName] = useState("");
  const [quickServicePrice, setQuickServicePrice] = useState("");
  const [quickServiceDuration, setQuickServiceDuration] = useState("30");

  // Abertura do Modal de Detalhes
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

  // Clique no botão "Salvar Alterações" -> Abre confirmação
  const handleRequestSaveEdit = () => {
    setIsConfirmEditModalOpen(true);
  };

  // Confirmação final no modal "Sim, pode alterar!"
  const handleConfirmSaveEdit = () => {
    const selectedBarber =
      barbers.find((b) => b.id === editForm.barberId) || barbers[0];
    const selectedService = services.find((s) => s.id === editForm.serviceId) ||
      services[0] || { durationMinutes: 40, price: 55, name: "Serviço" };

    const [startH, startM] = editForm.startTime.split(":").map(Number);
    const totalMinutes =
      startH * 60 + startM + (selectedService.durationMinutes || 40);
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    const newEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    const updatedAppt = {
      ...selectedAppointment,
      barberId: selectedBarber.id,
      barberName: selectedBarber.name,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      durationMinutes: selectedService.durationMinutes,
      startTime: editForm.startTime,
      endTime: newEndTime,
      price: Number(editForm.price || selectedService.price),
      notes: editForm.notes,
      hasNotes: Boolean(editForm.notes),
    };

    setAppointments((prev) =>
      prev.map((a) => (a.id === updatedAppt.id ? updatedAppt : a)),
    );

    setSelectedAppointment(updatedAppt);
    setIsEditingAppointment(false);
    setIsConfirmEditModalOpen(false);
  };

  // 👇 CADASTRO RÁPIDO DE SERVIÇO CORRIGIDO E LIMPO
  const handleSaveQuickService = () => {
    if (!quickServiceName.trim() || !quickServicePrice) {
      alert("Informe o nome e o preço do novo serviço.");
      return;
    }

    const newService = {
      id: `s-${Date.now()}`,
      name: quickServiceName.trim(),
      price: Number(quickServicePrice),
      durationMinutes: Number(quickServiceDuration),
      commissionPercent: 50,
      onlineBooking: true,
      description: "Serviço cadastrado durante o agendamento.",
    };

    // 1. Salva na Fonte Única Central (BarbershopDashboard)
    if (onAddService) {
      onAddService(newService);
    }

    // 2. Já seleciona ele automaticamente no agendamento em edição
    setEditForm((prev) => ({
      ...prev,
      serviceId: newService.id,
      price: String(newService.price),
    }));

    // 3. Limpa e fecha a modal
    setQuickServiceName("");
    setQuickServicePrice("");
    setIsQuickServiceModalOpen(false);
  };

  // Clique no Horário Vazio
  const handleSlotClick = (barberId, time) => {
    setPrefilledBarberId(barberId);
    setPrefilledTime(time);
    setIsNewModalOpen(true);
  };

  // Salvar Novo Agendamento
  const handleSaveNewAppointment = (newAppt) => {
    const [startH, startM] = newAppt.startTime.split(":").map(Number);
    const totalMinutes = startH * 60 + startM + newAppt.durationMinutes;
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    const computedEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    const appointmentToAdd = {
      ...newAppt,
      endTime: computedEndTime,
      isPaid: false,
      isVip: false,
      hasNotes: Boolean(newAppt.notes),
    };

    setAppointments((prev) => [...prev, appointmentToAdd]);
    setIsNewModalOpen(false);
  };

  // Alterar Status
  const handleStatusChange = (appointmentId, newStatus) => {
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId ? { ...a, status: newStatus } : a,
      ),
    );
    if (selectedAppointment && selectedAppointment.id === appointmentId) {
      setSelectedAppointment((prev) => ({ ...prev, status: newStatus }));
    }
  };

  // Finalizar Atendimento
  const handleFinishAppointment = (appt) => {
    handleStatusChange(appt.id, "completed");
    setSelectedAppointment(null);
    if (appt.isPaid) {
      alert(
        `✅ ATENDIMENTO CONCLUÍDO!\n\n• Cliente: ${appt.clientName}\n• Quitado e finalizado com sucesso!`,
      );
    } else {
      alert(
        `🧾 ATENDIMENTO CONCLUÍDO (PAGAMENTO PENDENTE):\n\n• Cliente: ${appt.clientName}\n• Valor: R$ ${Number(appt.price).toFixed(2)}\n• Encaminhe o cliente para o caixa.`,
      );
    }
  };

  // Confirmar Cancelamento
  const handleConfirmCancellation = () => {
    if (!appointmentToCancel) return;
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentToCancel.id ? { ...a, status: "cancelled" } : a,
      ),
    );
    setAppointmentToCancel(null);
  };

  // Drag & Drop
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
    const newEndMins = newStartMins + draggedAppt.durationMinutes;
    const endH = Math.floor(newEndMins / 60);
    const endM = newEndMins % 60;
    const targetEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    const targetBarber = barbers.find((b) => b.id === targetBarberId);
    const targetBarberName = targetBarber ? targetBarber.name : "Barbeiro";

    // Conflito de Almoço
    const barberBreaks = targetBarber?.breaks || [];
    const hasLunchConflict = barberBreaks.some((brk) => {
      const bStart = timeToMins(brk.startTime);
      const bEnd = timeToMins(brk.endTime);
      return newStartMins < bEnd && newEndMins > bStart;
    });

    if (hasLunchConflict) {
      alert(
        `⚠️ CONFLITO COM ALMOÇO:\n\n${targetBarberName} está em intervalo de almoço neste horário.`,
      );
      return;
    }

    // Conflito de Horário
    const hasConflict = appointments.some((a) => {
      if (a.id === draggedAppt.id) return false;
      if (a.barberId !== targetBarberId) return false;
      if (a.status === "cancelled") return false;

      const aStart = timeToMins(a.startTime);
      const aEnd = timeToMins(a.endTime);
      return newStartMins < aEnd && newEndMins > aStart;
    });

    if (hasConflict) {
      alert(
        `⚠️ CONFLITO DE HORÁRIO:\n\n${targetBarberName} já possui atendimento marcado neste horário.`,
      );
      return;
    }

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === draggedAppt.id
          ? {
              ...a,
              barberId: targetBarberId,
              barberName: targetBarberName,
              startTime: targetStartTime,
              endTime: targetEndTime,
            }
          : a,
      ),
    );
  };

  const totalTodayAppointments = appointments.filter(
    (a) => a.status !== "cancelled",
  ).length;
  const totalEstimatedRevenue = appointments
    .filter((a) => a.status !== "cancelled")
    .reduce((acc, a) => acc + Number(a.price || 0), 0);

  const previewBarber = barbers.find((b) => b.id === editForm.barberId);
  const previewService = services.find((s) => s.id === editForm.serviceId);

  return (
    <div className={scheduleStyles.container}>
      {/* 1. CABEÇALHO */}
      <div className={scheduleStyles.headerCard}>
        <div className={scheduleStyles.titleWrapper}>
          <h1 className={scheduleStyles.title}>
            <span>📅</span>
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
              <span>✂️</span>
              <span>{totalTodayAppointments} cortes hoje</span>
            </div>

            <div
              className={`${scheduleStyles.statBadge} ${scheduleStyles.statRevenue}`}
            >
              <span>💰</span>
              <span>
                R$ {totalEstimatedRevenue.toFixed(2).replace(".", ",")} previsto
              </span>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={() => {
              setPrefilledBarberId(barbers[0]?.id || "");
              setPrefilledTime("09:00");
              setIsNewModalOpen(true);
            }}
            className="text-xs py-2.5 px-4 font-bold shadow-md bg-amber-600 hover:bg-amber-500 shrink-0"
          >
            <span>+</span> Novo Agendamento
          </Button>

          {onBack && (
            <Button
              variant="secondary"
              onClick={onBack}
              className="text-xs py-2 px-3"
            >
              ← Voltar
            </Button>
          )}
        </div>
      </div>

      {/* 2. GRADE DA LINHA DO TEMPO */}
      <CalendarView
        barbers={barbers}
        appointments={appointments}
        startHour={8}
        endHour={19}
        minuteHeight={1.8}
        onSlotClick={handleSlotClick}
        onNewAppointmentClick={() => setIsNewModalOpen(true)}
        onAppointmentClick={(appt) => handleOpenDetails(appt)}
        onOpenComanda={(id) => {
          if (onNavigateToCashier) onNavigateToCashier(id);
          else alert(`🧾 Abrindo Comanda #${id} no Caixa!`);
        }}
        onStatusChange={handleStatusChange}
        onDropAppointment={handleDropAppointment}
      />

      {/* MODAL 1: DETALHES & EDIÇÃO COMPLETA DO AGENDAMENTO */}
      <Modal
        isOpen={!!selectedAppointment}
        onClose={() => {
          setSelectedAppointment(null);
          setIsEditingAppointment(false);
        }}
        title={
          isEditingAppointment
            ? `✏️ Editar Atendimento: ${selectedAppointment?.clientName}`
            : `Detalhes do Atendimento #${selectedAppointment?.id}`
        }
        footer={
          selectedAppointment && (
            <div className="w-full flex flex-wrap items-center justify-between gap-3">
              {isEditingAppointment ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditingAppointment(false)}
                  >
                    Cancelar Edição
                  </Button>
                  <Button variant="primary" onClick={handleRequestSaveEdit}>
                    Salvar Alterações
                  </Button>
                </>
              ) : (
                <>
                  {selectedAppointment.status !== "cancelled" &&
                    selectedAppointment.status !== "completed" && (
                      <Button
                        variant="danger"
                        onClick={() => {
                          setAppointmentToCancel(selectedAppointment);
                          setSelectedAppointment(null);
                        }}
                        className="text-xs py-2 px-3"
                      >
                        Cancelar Horário
                      </Button>
                    )}

                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedAppointment(null)}
                      className="text-xs py-2 px-3"
                    >
                      Fechar
                    </Button>

                    {selectedAppointment.status !== "completed" &&
                      selectedAppointment.status !== "cancelled" && (
                        <Button
                          variant="secondary"
                          onClick={() => setIsEditingAppointment(true)}
                          className="text-xs py-2 px-3 text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
                        >
                          ✏️ Editar
                        </Button>
                      )}

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
                        className="text-xs py-2 px-4 bg-purple-600 hover:bg-purple-500 font-bold"
                      >
                        ✂️ Iniciar Atendimento
                      </Button>
                    )}

                    {selectedAppointment.status === "in_progress" && (
                      <Button
                        variant="primary"
                        onClick={() =>
                          handleFinishAppointment(selectedAppointment)
                        }
                        className={`text-xs py-2 px-4 font-bold shadow-md ${
                          selectedAppointment.isPaid
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : "bg-amber-600 hover:bg-amber-500 text-white"
                        }`}
                      >
                        {selectedAppointment.isPaid
                          ? "✓ Finalizar Atendimento"
                          : "🧾 Finalizar o Atendimento"}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        }
      >
        {selectedAppointment && (
          <div className="space-y-4 text-left">
            {!isEditingAppointment ? (
              /* MODO LEITURA */
              <div className="space-y-4">
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500">
                      Cliente Agendado
                    </span>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{selectedAppointment.clientName}</span>
                      {selectedAppointment.isVip && (
                        <span className="text-amber-400 text-xs">★ VIP</span>
                      )}
                    </h3>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">
                      {selectedAppointment.clientPhone ||
                        "Telefone não informado"}
                    </p>
                  </div>
                  <Badge status={selectedAppointment.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-2xl text-xs">
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                      Barbeiro Designado:
                    </span>
                    <strong className="text-amber-400 text-sm flex items-center gap-1.5 mt-0.5">
                      <span>💈</span>
                      <span>{selectedAppointment.barberName}</span>
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                      Serviço Solicitado:
                    </span>
                    <strong className="text-white text-sm block mt-0.5">
                      {selectedAppointment.serviceName}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-2xl text-xs">
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                      Horário de Cadeira:
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

                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl flex justify-between items-center text-xs">
                  <span className="text-neutral-400">Status do Pagamento:</span>
                  <span
                    className={
                      selectedAppointment.isPaid
                        ? "text-emerald-400 font-bold"
                        : "text-amber-400 font-bold"
                    }
                  >
                    {selectedAppointment.isPaid
                      ? "✓ Pago no Caixa"
                      : "⚠️ Pendente"}
                  </span>
                </div>

                {selectedAppointment.notes && (
                  <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs space-y-1">
                    <span className="text-amber-400 font-bold text-[10px] uppercase">
                      Observações:
                    </span>
                    <p className="text-neutral-300 italic">
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* MODO EDIÇÃO */
              <div className="space-y-4">
                <Select
                  label="Profissional Responsável (Permitir Troca)"
                  value={editForm.barberId}
                  onChange={(e) =>
                    setEditForm({ ...editForm, barberId: e.target.value })
                  }
                  options={barbers.map((b) => ({
                    value: b.id,
                    label: `${b.name} (${b.role})`,
                  }))}
                  helperText="Ao alterar o profissional, o card migrará para a coluna dele."
                />

                {/* CAMPO DE SERVIÇO COM CADASTRO ON-THE-FLY */}
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-300">
                      Serviço Solicitado
                    </label>

                    <button
                      type="button"
                      onClick={() => setIsQuickServiceModalOpen(true)}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Cadastrar um novo serviço diretamente no catálogo"
                    >
                      <span>+</span>
                      <span>Cadastrar Novo Serviço</span>
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
                      label: `${s.name} (${s.durationMinutes} min - Padrão R$ ${s.price})`,
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
                    helperText="Customizável com desconto ou acréscimo."
                  />
                </div>

                <Input
                  label="Observações do Atendimento"
                  placeholder="Ex: Cliente tem alergia a lâmina, corte na tesoura..."
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm({ ...editForm, notes: e.target.value })
                  }
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL 2: CONFIRMAÇÃO DE ALTERAÇÃO */}
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
        <div className="space-y-3 text-left">
          <p className="text-xs text-neutral-200 leading-relaxed">
            Tem certeza de que deseja realizar essas alterações no agendamento
            de{" "}
            <strong className="text-white">
              {selectedAppointment?.clientName}
            </strong>
            ?
          </p>

          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs space-y-1.5 text-neutral-300">
            <div className="flex justify-between">
              <span className="text-neutral-500">Profissional:</span>
              <strong className="text-amber-400">{previewBarber?.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Serviço:</span>
              <strong className="text-white">{previewService?.name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Horário:</span>
              <span className="font-mono text-white font-bold">
                {editForm.startTime}h
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Novo Valor:</span>
              <span className="font-mono text-emerald-400 font-bold">
                R$ {Number(editForm.price).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: CADASTRO RÁPIDO DE SERVIÇO ON-THE-FLY */}
      <Modal
        isOpen={isQuickServiceModalOpen}
        size="sm"
        onClose={() => setIsQuickServiceModalOpen(false)}
        title="Cadastrar Novo Serviço no Catálogo"
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
        <div className="space-y-4 text-left">
          <p className="text-xs text-neutral-400">
            O serviço será incluído no catálogo do salão e selecionado neste
            agendamento.
          </p>

          <Input
            label="Nome do Serviço"
            placeholder="Ex: Hidratação de Barba Express"
            value={quickServiceName}
            onChange={(e) => setQuickServiceName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço de Venda (R$)"
              type="number"
              placeholder="35.00"
              value={quickServicePrice}
              onChange={(e) => setQuickServicePrice(e.target.value)}
            />

            <Select
              label="Duração Estimada"
              value={quickServiceDuration}
              onChange={(e) => setQuickServiceDuration(e.target.value)}
              options={[
                { value: "15", label: "15 min" },
                { value: "30", label: "30 min (Padrão)" },
                { value: "45", label: "45 min" },
                { value: "60", label: "1 hora" },
              ]}
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 4: CONFIRMAÇÃO DE CANCELAMENTO */}
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
              Não, manter horário
            </Button>
            <Button variant="danger" onClick={handleConfirmCancellation}>
              Sim, pode cancelar!
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-left">
          <p className="text-xs text-neutral-200 leading-relaxed">
            Tem certeza de que deseja cancelar o atendimento de{" "}
            <strong className="text-white">
              {appointmentToCancel?.clientName}
            </strong>
            ?
          </p>
          <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-xl text-xs text-red-300">
            O horário das{" "}
            <strong>
              {appointmentToCancel?.startTime} às {appointmentToCancel?.endTime}
            </strong>{" "}
            será liberado na grade do barbeiro.
          </div>
        </div>
      </Modal>

      {/* MODAL 5: NOVO AGENDAMENTO */}
      <NewAppointmentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSaveAppointment={handleSaveNewAppointment}
        barbers={barbers}
        services={services}
        onAddService={onAddService}
        prefilledBarberId={prefilledBarberId}
        prefilledTime={prefilledTime}
      />
    </div>
  );
}
