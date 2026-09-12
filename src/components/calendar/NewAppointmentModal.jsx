import { useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";

export default function NewAppointmentModal({
  isOpen = false,
  onClose,
  onSaveAppointment,
  barbers = [
    { id: "carlos", name: "Carlos Silva (Master Barber)" },
    { id: "marcos", name: "Marcos Vinicius (Degradê)" },
    { id: "tiago", name: "Tiago Santos (Barba & Navalha)" },
  ],
  services = [
    {
      id: "s1",
      name: "Corte Degradê Navalhado",
      price: 55,
      durationMinutes: 40,
    },
    {
      id: "s2",
      name: "Barboterapia Tradicional",
      price: 45,
      durationMinutes: 30,
    },
    {
      id: "s3",
      name: "Combo VIP: Cabelo + Barba",
      price: 90,
      durationMinutes: 70,
    },
    {
      id: "s4",
      name: "Design de Sobrancelha na Navalha",
      price: 25,
      durationMinutes: 15,
    },
  ],
}) {
  // Estados do Formulário
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedBarberId, setSelectedBarberId] = useState(
    barbers[0]?.id || "",
  );
  const [selectedServiceId, setSelectedServiceId] = useState(
    services[0]?.id || "",
  );
  const [bookingDate, setBookingDate] = useState(
    new Date().toISOString().split("T")[0],
  ); // Data de hoje
  const [bookingTime, setBookingTime] = useState("14:30");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});

  // Identifica o serviço escolhido para exibir preço e duração em tempo real
  const activeService =
    services.find((s) => s.id === selectedServiceId) || services[0];
  const activeBarber =
    barbers.find((b) => b.id === selectedBarberId) || barbers[0];

  const handleSave = () => {
    const errs = {};
    if (!clientName.trim()) errs.clientName = "Informe o nome do cliente.";
    if (!clientPhone || clientPhone.length < 14)
      errs.clientPhone = "Informe um WhatsApp válido.";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const newAppointment = {
      id: `apt-${Date.now()}`,
      clientName,
      clientPhone,
      barberId: selectedBarberId,
      barberName: activeBarber.name,
      serviceId: selectedServiceId,
      serviceName: activeService.name,
      price: activeService.price,
      durationMinutes: activeService.durationMinutes,
      date: bookingDate,
      startTime: bookingTime,
      status: "confirmed",
      notes,
    };

    if (onSaveAppointment) {
      onSaveAppointment(newAppointment);
    }

    // Limpa o formulário
    setClientName("");
    setClientPhone("");
    setNotes("");
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📅 Novo Agendamento de Atendimento"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} className="font-bold">
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
              if (errors.clientName) setErrors({ ...errors, clientName: null });
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
            helperText="Enviaremos confirmação e lembrete automático por este número."
          />
        </div>

        {/* 2. BARBEIRO E SERVIÇO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Profissional (Barbeiro)"
            value={selectedBarberId}
            onChange={(e) => setSelectedBarberId(e.target.value)}
            options={barbers.map((b) => ({ value: b.id, label: b.name }))}
          />

          <Select
            label="Serviço Solicitado"
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            options={services.map((s) => ({
              value: s.id,
              label: `${s.name} (R$ ${s.price},00)`,
            }))}
          />
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
              { value: "14:00", label: "14:00h" },
              { value: "14:30", label: "14:30h" },
              { value: "15:00", label: "15:00h" },
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
              ⏱️ {activeService?.durationMinutes} minutos
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
  );
}
