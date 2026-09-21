import { useState, useEffect } from "react";
import { scheduleStyles } from "./ScheduleView.styles";
import CalendarView from "../../components/calendar/CalendarView";
import NewAppointmentModal from "../../components/calendar/NewAppointmentModal";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";

// Catálogo Padrão de Serviços caso não venha por props
const defaultServices = [
  { id: "s1", name: "Corte Degradê Navalhado", price: 55, durationMinutes: 60 },
  {
    id: "s2",
    name: "Barboterapia Tradicional",
    price: 45,
    durationMinutes: 45,
  },
  {
    id: "s3",
    name: "Combo VIP: Cabelo + Barba",
    price: 90,
    durationMinutes: 70,
  },
  {
    id: "s4",
    name: "Corte na Tesoura Clássico",
    price: 50,
    durationMinutes: 60,
  },
];

export default function ScheduleView({
  barbers = [],
  appointments = [],
  onUpdateAppointments,
  services = defaultServices,
  onAddService,
  onNavigateToCashier,
  onBack,
}) {
  // Filtra apenas barbeiros que não foram excluídos/inativados para a grade
  const activeBarbers = barbers.filter((b) => b.status !== "inactive");

  // Estado reativo da lista de agendamentos (atualizado em tempo real)
  const [currentAppointments, setCurrentAppointments] = useState(appointments);

  // Sincroniza se a prop externa mudar
  useEffect(() => {
    setCurrentAppointments(appointments);
  }, [appointments]);

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

  // 2. Salvar Edição do Agendamento
  const handleConfirmSaveEdit = () => {
    const selectedBarber = activeBarbers.find(
      (b) => b.id === editForm.barberId,
    ) ||
      activeBarbers[0] || { id: "barber-carlos", name: "Barbeiro" };
    const selectedService = services.find((s) => s.id === editForm.serviceId) ||
      services[0] || { durationMinutes: 40, price: 55, name: "Serviço" };

    const [startH, startM] = editForm.startTime.split(":").map(Number);
    const totalMinutes =
      startH * 60 + startM + (Number(selectedService.durationMinutes) || 40);
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    const newEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    const updatedAppt = {
      ...selectedAppointment,
      barberId: selectedBarber.id,
      barberName: selectedBarber.name,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      durationMinutes: Number(selectedService.durationMinutes) || 40,
      startTime: editForm.startTime,
      endTime: newEndTime,
      price: Number(editForm.price || selectedService.price),
      notes: editForm.notes,
      hasNotes: Boolean(editForm.notes),
    };

    const updatedList = currentAppointments.map((a) =>
      a.id === updatedAppt.id ? updatedAppt : a,
    );

    setCurrentAppointments(updatedList);
    if (onUpdateAppointments) {
      onUpdateAppointments(updatedList);
    }

    setSelectedAppointment(updatedAppt);
    setIsEditingAppointment(false);
    setIsConfirmEditModalOpen(false);
  };

  // 3. Salvar Novo Serviço Criado na Hora
  const handleSaveQuickService = () => {
    if (!quickServiceName.trim() || !quickServicePrice) {
      alert("Informe o nome e o preço do novo serviço.");
      return;
    }

    const newService = {
      id: `s-${Date.now()}`,
      name: quickServiceName.trim(),
      category: "Cabelo",
      durationMinutes: Number(quickServiceDuration),
      price: Number(quickServicePrice),
      commissionPercent: 50,
      onlineBooking: true,
      description: "Serviço cadastrado durante o agendamento.",
    };

    if (onAddService) onAddService(newService);

    setEditForm((prev) => ({
      ...prev,
      serviceId: newService.id,
      price: String(newService.price),
    }));

    setQuickServiceName("");
    setQuickServicePrice("");
    setIsQuickServiceModalOpen(false);
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
    setCurrentAppointments(updatedList);

    if (onUpdateAppointments) {
      onUpdateAppointments(updatedList);
    }

    setIsNewModalOpen(false);
  };

  // 5. Alterar Status (Ex: Iniciar Atendimento / Concluir)
  const handleStatusChange = (appointmentId, newStatus) => {
    const updatedList = currentAppointments.map((a) =>
      a.id === appointmentId ? { ...a, status: newStatus } : a,
    );

    setCurrentAppointments(updatedList);
    if (onUpdateAppointments) {
      onUpdateAppointments(updatedList);
    }

    if (selectedAppointment && selectedAppointment.id === appointmentId) {
      setSelectedAppointment((prev) => ({ ...prev, status: newStatus }));
    }
  };

  // 6. Confirmar Cancelamento
  const handleConfirmCancellation = () => {
    if (!appointmentToCancel) return;

    const updatedList = currentAppointments.map((a) =>
      a.id === appointmentToCancel.id ? { ...a, status: "cancelled" } : a,
    );

    setCurrentAppointments(updatedList);
    if (onUpdateAppointments) {
      onUpdateAppointments(updatedList);
    }

    setAppointmentToCancel(null);
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

    // Conflito com outro agendamento
    const hasConflict = currentAppointments.some((a) => {
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

    setCurrentAppointments(updatedList);
    if (onUpdateAppointments) {
      onUpdateAppointments(updatedList);
    }
  };

  const handleSlotClick = (barberId, time) => {
    setPrefilledBarberId(barberId);
    setPrefilledTime(time);
    setIsNewModalOpen(true);
  };

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
        barbers={activeBarbers}
        appointments={currentAppointments}
        startHour={8}
        endHour={19}
        minuteHeight={1.8}
        onSlotClick={handleSlotClick}
        onNewAppointmentClick={() => {
          setPrefilledBarberId(activeBarbers[0]?.id || "");
          setPrefilledTime("09:00");
          setIsNewModalOpen(true);
        }}
        onAppointmentClick={(appt) => handleOpenDetails(appt)}
        onOpenComanda={(id) => {
          if (onNavigateToCashier) onNavigateToCashier(id);
          else alert(`🧾 Abrindo Comanda #${id} no Caixa!`);
        }}
        onStatusChange={handleStatusChange}
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
                  <Button
                    variant="primary"
                    onClick={() => setIsConfirmEditModalOpen(true)}
                  >
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
                      Barbeiro:
                    </span>
                    <strong className="text-amber-400 text-sm flex items-center gap-1 mt-0.5">
                      <span>💈</span>
                      <span>{selectedAppointment.barberName}</span>
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                      Serviço:
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
        barbers={activeBarbers.length > 0 ? activeBarbers : barbers}
        services={services}
        prefilledBarberId={prefilledBarberId}
        prefilledTime={prefilledTime}
      />
    </div>
  );
}
