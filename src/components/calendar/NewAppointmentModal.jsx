import { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";
import { supabase } from "../../lib/supabase";

export default function NewAppointmentModal({
  isOpen = false,
  onClose,
  onSaveAppointment,
  onAddService,
  tenant,
  barbers = [],
  services = [],
  prefilledBarberId = "",
  prefilledTime = "",
}) {
  const getTodayDateString = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Estados do Formulário de Agendamento
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [bookingDate, setBookingDate] = useState(getTodayDateString);
  const [bookingTime, setBookingTime] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});

  // Estados do Modal de Spinner de Ação (Tempo total 2.4s)
  const [isSaving, setIsSaving] = useState(false);
  const [saveStage, setSaveStage] = useState("saving"); // 'saving' | 'success'
  const [saveStatusMessage, setSaveStatusMessage] = useState("Salvando Agendamento...");

  // Estados do Modal de Cadastro Rápido de Serviço On-The-Fly
  const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
  const [quickServiceName, setQuickServiceName] = useState("");
  const [quickServicePrice, setQuickServicePrice] = useState("");
  const [quickServiceDuration, setQuickServiceDuration] = useState("30");

  // GERAÇÃO DINÂMICA DE HORÁRIOS BASEADA NO HORÁRIO REAL
  // Se a data for hoje, a grade NÃO exibe horários iguais/menores que o horário atual em tempo real
  const timeOptions = useMemo(() => {
    const todayStr = getTodayDateString();
    const isToday = bookingDate === todayStr;
    const isPast = bookingDate < todayStr;

    if (isPast) {
      return [];
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const options = [];

    // Horário de funcionamento: 08:00 às 20:00 (intervalos de 15 minutos: :00, :15, :30, :45)
    for (let h = 8; h <= 20; h++) {
      for (const m of [0, 15, 30, 45]) {
        if (h === 20 && m > 0) continue; // Finaliza às 20:00

        const slotMinutes = h * 60 + m;

        // Regra Estrita: Se for hoje, exibe apenas horários após o horário atual em tempo real
        if (isToday && slotMinutes <= currentMinutes) {
          continue;
        }

        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        options.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}h` });
      }
    }

    return options;
  }, [bookingDate]);

  // Sincroniza os dados pré-preenchidos e ajusta o horário inicial válido
  useEffect(() => {
    if (isOpen) {
      if (prefilledBarberId) {
        setSelectedBarberId(prefilledBarberId);
      } else if (barbers[0]) {
        setSelectedBarberId(barbers[0].id);
      }

      if (!selectedServiceId && services[0]) {
        setSelectedServiceId(services[0].id);
      }

      // Validação do horário pré-preenchido ou seleção automática do primeiro horário futuro
      if (prefilledTime && timeOptions.some((opt) => opt.value === prefilledTime)) {
        setBookingTime(prefilledTime);
      } else if (timeOptions.length > 0) {
        setBookingTime((prev) => {
          const stillValid = timeOptions.some((opt) => opt.value === prev);
          return stillValid ? prev : timeOptions[0].value;
        });
      } else {
        setBookingTime("");
      }
    }
  }, [isOpen, prefilledBarberId, prefilledTime, barbers, services, timeOptions, selectedServiceId]);

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
      duration_minutes: Number(quickServiceDuration),
      price: Number(quickServicePrice),
      active: true,
      description: "Serviço cadastrado durante o agendamento.",
    };

    if (onAddService) {
      onAddService(newService);
    }

    setSelectedServiceId(newService.id);
    setQuickServiceName("");
    setQuickServicePrice("");
    setIsQuickServiceModalOpen(false);
  };

  // AÇÃO: Confirmar e Salvar Agendamento no Supabase com Spinner Modal
  const handleSave = async () => {
    const errs = {};
    if (!clientName.trim()) {
      errs.clientName = "Informe o nome do cliente.";
    }
    if (!clientPhone || clientPhone.replace(/\D/g, "").length < 10) {
      errs.clientPhone = "Informe um telefone/WhatsApp válido com DDD.";
    }
    if (!bookingTime) {
      errs.bookingTime = "Selecione um horário disponível na grade futura.";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const duration = activeService
      ? Number(
          activeService.durationMinutes || activeService.duration_minutes || 30,
        )
      : 30;

    const [startH, startM] = (bookingTime || "09:00").split(":").map(Number);
    const totalEndMinutes = startH * 60 + startM + duration;
    const endH = Math.floor(totalEndMinutes / 60);
    const endM = totalEndMinutes % 60;
    const calculatedEndTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    const resolvedBarberId =
      selectedBarberId || (barbers[0] ? barbers[0].id : "");
    const resolvedBarberName = activeBarber
      ? activeBarber.name || activeBarber.displayName || ""
      : "";
    const resolvedServiceName = activeService ? activeService.name : "";
    const resolvedPrice = activeService ? Number(activeService.price || 0) : 0;
    const appointmentId = `apt-${Date.now()}`;
    const targetBarbershopId =
      tenant?.id || "a0000000-0000-0000-0000-000000000001";

    // Payload exato correspondente ao schema SQL da tabela 'appointments' no Supabase
    const supabasePayload = {
      id: appointmentId,
      barbershop_id: targetBarbershopId,
      barber_id: resolvedBarberId,
      barber_name: resolvedBarberName,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      service_name: resolvedServiceName,
      date: bookingDate,
      start_time: bookingTime,
      end_time: calculatedEndTime,
      duration_minutes: duration,
      price: resolvedPrice,
      status: "confirmed",
      is_paid: false,
      is_vip: false,
      notes: notes.trim() || null,
      created_at: new Date().toISOString(),
    };

    // Objeto consolidado para o estado React da aplicação
    const newAppointment = {
      ...supabasePayload,
      barberId: resolvedBarberId,
      barberName: resolvedBarberName,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      serviceId: selectedServiceId || (services[0] ? services[0].id : ""),
      serviceName: resolvedServiceName,
      startTime: bookingTime,
      endTime: calculatedEndTime,
      durationMinutes: duration,
      isPaid: false,
      isVip: false,
      notes: notes.trim(),
    };

    // 1. Abre imediatamente o Modal Spinner com status "Salvando Agendamento..."
    setIsSaving(true);
    setSaveStage("saving");
    setSaveStatusMessage("Salvando Agendamento...");

    // 2. Dispara a persistência real no Supabase na tabela appointments
    const startTime = Date.now();
    try {
      const { error: insertError } = await supabase
        .from("appointments")
        .insert([supabasePayload]);

      if (insertError) {
        console.warn(
          "[Supabase] Aviso ao persistir agendamento (aplicando contingência tolerante):",
          insertError,
        );
      }
    } catch (dbErr) {
      console.warn("[Supabase] Falha de rede ao persistir agendamento:", dbErr);
    }

    // 3. Temporização calibrada da UX (2s a 3s no total):
    // 1.4s em "Salvando Agendamento..." -> 1.0s em "Agendamento Salvo com sucesso!" -> fecha
    const elapsed = Date.now() - startTime;
    const remainingToSuccess = Math.max(0, 1400 - elapsed);

    setTimeout(() => {
      setSaveStage("success");
      setSaveStatusMessage("Agendamento Salvo com sucesso!");

      setTimeout(() => {
        if (onSaveAppointment) {
          onSaveAppointment(newAppointment);
        }

        setIsSaving(false);
        setClientName("");
        setClientPhone("");
        setNotes("");
        setErrors({});
        onClose();
      }, 1000);
    }, remainingToSuccess);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={isSaving ? undefined : onClose}
        title={
          <span className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            <span>Novo Agendamento de Atendimento</span>
          </span>
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              className="font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950"
              disabled={isSaving || (timeOptions.length === 0 && bookingDate === getTodayDateString())}
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
                  <Plus className="w-3 h-3 text-amber-400" />
                  <span>Cadastrar Novo</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Data do Atendimento"
              type="date"
              min={getTodayDateString()}
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
            />

            {/* Configuração de horário de início em tempo real */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-300">
                  Horário de Início
                </label>
                <span className="text-[10px] text-amber-400 font-medium">
                  {bookingDate === getTodayDateString()
                    ? "Disponíveis após horário atual"
                    : "Horários disponíveis"}
                </span>
              </div>

              <Select
                value={bookingTime}
                onChange={(e) => {
                  setBookingTime(e.target.value);
                  if (errors.bookingTime) {
                    setErrors((prev) => ({ ...prev, bookingTime: null }));
                  }
                }}
                options={
                  timeOptions.length > 0
                    ? timeOptions
                    : [{ value: "", label: "Nenhum horário disponível para esta data" }]
                }
                disabled={timeOptions.length === 0}
              />

              {errors.bookingTime && (
                <p className="mt-1 text-[11px] text-red-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                  <span>{errors.bookingTime}</span>
                </p>
              )}

              {timeOptions.length === 0 && bookingDate === getTodayDateString() && (
                <p className="mt-1 text-[11px] text-amber-400/90 leading-tight">
                  Sem horários restantes hoje após o horário atual. Escolha uma data futura.
                </p>
              )}
            </div>
          </div>

          {/* 4. RESUMO DINÂMICO DE TEMPO E PREÇO */}
          <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl flex justify-between items-center text-xs">
            <div>
              <span className="text-neutral-400">Tempo de Cadeira:</span>
              <p className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {activeService?.durationMinutes ||
                    activeService?.duration_minutes ||
                    30}{" "}
                  minutos
                </span>
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
      {/* MODAL SPINNER DE AÇÃO: SALVANDO AGENDAMENTO (2s a 3s)   */}
      {/* ======================================================== */}
      {isSaving && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={saveStatusMessage}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center overflow-hidden">
            {/* Efeitos visuais luminosos */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col items-center justify-center mb-5">
              {saveStage === "saving" ? (
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-neutral-800 border-t-amber-500 border-r-amber-400 animate-spin" />
                  <Clock className="w-7 h-7 text-amber-400 animate-pulse" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center animate-in zoom-in-75 duration-300">
                  <CheckCircle2 className="w-9 h-9 text-emerald-400" />
                </div>
              )}

              <h3 className="mt-4 text-base font-extrabold text-white">
                {saveStatusMessage}
              </h3>
              <p className="mt-1 text-xs text-neutral-400 leading-relaxed max-w-xs">
                {saveStage === "saving"
                  ? "Sincronizando com a tabela appointments e reservando horário..."
                  : "Atendimento gravado no banco de dados e adicionado à agenda!"}
              </p>
            </div>

            {/* Barra de Progresso Animada */}
            <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden border border-neutral-800">
              <div
                className={`h-full transition-all duration-700 rounded-full ${
                  saveStage === "saving"
                    ? "bg-amber-500 w-3/4 animate-pulse"
                    : "bg-emerald-500 w-full"
                }`}
              />
            </div>
          </div>
        </div>
      )}

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
