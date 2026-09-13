import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";

export default function NewAppointmentModal({
  isOpen = false,
  onClose,
  onSaveAppointment,
  onAddService, // 👈 Recebe a função para salvar na fonte única central
  barbers = [],
  services = [],
  prefilledBarberId = "",
  prefilledTime = "",
}) {
  // Estados do Formulário de Agendamento
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [bookingDate, setBookingDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [bookingTime, setBookingTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});

  // Estados do Modal de Cadastro Rápido de Serviço On-The-Fly
  const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
  const [quickServiceName, setQuickServiceName] = useState("");
  const [quickServicePrice, setQuickServicePrice] = useState("");
  const [quickServiceDuration, setQuickServiceDuration] = useState("30");

  // Sincroniza os dados pré-preenchidos ao abrir o modal (ex: clique no slot da agenda)
  useEffect(() => {
    if (isOpen) {
      if (prefilledBarberId) setSelectedBarberId(prefilledBarberId);
      else if (barbers[0]) setSelectedBarberId(barbers[0].id);

      if (prefilledTime) setBookingTime(prefilledTime);

      if (!selectedServiceId && services[0]) {
        setSelectedServiceId(services[0].id);
      }
    }
  }, [isOpen, prefilledBarberId, prefilledTime, barbers, services]);

  // Identifica o serviço e o barbeiro ativos para cálculo dinâmico
  const activeService =
    services.find((s) => s.id === selectedServiceId) || services[0];
  const activeBarber =
    barbers.find((b) => b.id === selectedBarberId) || barbers[0];

  // AÇÃO: Salvar Novo Serviço Criado na Hora
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

    // 1. Salva no Catálogo Central do Salão
    if (onAddService) {
      onAddService(newService);
    }

    // 2. Já seleciona o novo serviço automaticamente no agendamento!
    setSelectedServiceId(newService.id);

    // 3. Limpa e fecha a janelinha
    setQuickServiceName("");
    setQuickServicePrice("");
    setIsQuickServiceModalOpen(false);
  };

  // AÇÃO: Confirmar Agendamento
  const handleSave = () => {
    const errs = {};
    if (!clientName.trim()) errs.clientName = "Informe o nome do cliente.";
    if (!clientPhone || clientPhone.length < 14)
      errs.clientPhone = "Informe um WhatsApp válido com DDD.";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const newAppointment = {
      id: `apt-${Date.now()}`,
      clientName,
      clientPhone,
      barberId:
        selectedBarberId || (barbers[0] ? barbers[0].id : "barber-carlos"),
      barberName: activeBarber ? activeBarber.name : "Barbeiro",
      serviceId: selectedServiceId || (services[0] ? services[0].id : "s1"),
      serviceName: activeService ? activeService.name : "Corte",
      price: activeService ? activeService.price : 50,
      durationMinutes: activeService ? activeService.durationMinutes : 30,
      date: bookingDate,
      startTime: bookingTime,
      status: "confirmed",
      notes,
    };

    if (onSaveAppointment) {
      onSaveAppointment(newAppointment);
    }

    setClientName("");
    setClientPhone("");
    setNotes("");
    setErrors({});
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="📅 Novo Agendamento de Atendimento"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              className="font-bold"
            >
              Confirmar e Agendar
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          {/* 1. DADOS DO CLIENTE */}
          <div className="space-y-3">
            <Input
              label="Nome do Cliente"
              placeholder="Ex: Rodrigo Faro"
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                if (errors.clientName)
                  setErrors({ ...errors, clientName: null });
              }}
              error={errors.clientName}
            />

            <Input
              label="WhatsApp do Cliente"
              mask="phone"
              placeholder="(11) 99999-9999"
              value={clientPhone}
              onChange={(e) => {
                setClientPhone(e.target.value);
                if (errors.clientPhone)
                  setErrors({ ...errors, clientPhone: null });
              }}
              error={errors.clientPhone}
              helperText="Enviaremos confirmação e lembretes automáticos por este número."
            />
          </div>

          {/* 2. BARBEIRO E SERVIÇO COM CADASTRO ON-THE-FLY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Profissional (Barbeiro)"
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              options={barbers.map((b) => ({ value: b.id, label: b.name }))}
            />

            {/* CAMPO DE SERVIÇO COM O BOTÃO "+ CADASTRAR NOVO SERVIÇO" */}
            <div className="space-y-1 text-left">
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
                  <span>+</span> Cadastrar Novo
                </button>
              </div>

              <Select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                options={services.map((s) => ({
                  value: s.id,
                  label: `${s.name} (R$ ${s.price},00)`,
                }))}
              />
            </div>
          </div>

          {/* 3. DATA E HORÁRIO */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data do Atendimento"
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
            />

            <Select
              label="Horário de Início"
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
              options={[
                { value: "08:30", label: "08:30h" },
                { value: "09:00", label: "09:00h" },
                { value: "09:30", label: "09:30h" },
                { value: "10:00", label: "10:00h" },
                { value: "10:30", label: "10:30h" },
                { value: "11:00", label: "11:00h" },
                { value: "11:30", label: "11:30h" },
                { value: "14:00", label: "14:00h" },
                { value: "14:30", label: "14:30h" },
                { value: "15:00", label: "15:00h" },
                { value: "15:30", label: "15:30h" },
                { value: "16:00", label: "16:00h" },
                { value: "17:00", label: "17:00h" },
                { value: "18:00", label: "18:00h" },
              ]}
            />
          </div>

          {/* 4. RESUMO DINÂMICO DE TEMPO E PREÇO */}
          <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl flex justify-between items-center text-xs">
            <div>
              <span className="text-neutral-400">Tempo de Cadeira:</span>
              <p className="font-bold text-white">
                ⏱️ {activeService?.durationMinutes || 30} minutos
              </p>
            </div>
            <div className="text-right">
              <span className="text-neutral-400">Valor a Cobrar:</span>
              <p className="text-base font-black text-amber-500 font-mono">
                R${" "}
                {Number(activeService?.price || 0)
                  .toFixed(2)
                  .replace(".", ",")}
              </p>
            </div>
          </div>

          {/* 5. OBSERVAÇÕES OPCIONAIS */}
          <Input
            label="Observações / Preferências (Opcional)"
            placeholder="Ex: Cliente tem alergia a lâmina, prefere corte na tesoura..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* SUB-MODAL: CADASTRO RÁPIDO DE SERVIÇO ON-THE-FLY        */}
      {/* ======================================================== */}
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
            O novo corte será registrado no catálogo do salão e selecionado
            neste agendamento.
          </p>

          <Input
            label="Nome do Serviço"
            placeholder="Ex: Corte Kids / Infantil"
            value={quickServiceName}
            onChange={(e) => setQuickServiceName(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço de Venda (R$)"
              type="number"
              placeholder="40.00"
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
    </>
  );
}
