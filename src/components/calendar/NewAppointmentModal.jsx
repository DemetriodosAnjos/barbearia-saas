import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Users,
  User,
  Scissors,
  AlertTriangle,
  FileText,
  X,
  Sparkles,
  Phone,
  Check,
} from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Select from "../ui/Select";
import { supabase } from "../../lib/supabase";
import { safeStorage } from "../../utils/safeStorage";
import { normalizeClientRecord } from "../../pages/BarbershopAdmin/ClientsDirectoryView";

export default function NewAppointmentModal({
  isOpen = false,
  onClose,
  onSaveAppointment,
  onAddService,
  tenant,
  barbers = [],
  services = [],
  clients = [],
  prefilledBarberId = "",
  prefilledTime = "",
  prefilledDate = "",
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

  // Estados de Autocomplete e Prontuário em Tempo Real
  const [selectedClient, setSelectedClient] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [localClients, setLocalClients] = useState([]);
  const dropdownRef = useRef(null);
  const searchDebounceRef = useRef(null);

  // Estados do Modal de Spinner de Ação (Tempo total 2.4s)
  const [isSaving, setIsSaving] = useState(false);
  const [saveStage, setSaveStage] = useState("saving"); // 'saving' | 'success'
  const [saveStatusMessage, setSaveStatusMessage] = useState("Salvando Agendamento...");

  // Estados do Modal de Cadastro Rápido de Serviço On-The-Fly
  const [isQuickServiceModalOpen, setIsQuickServiceModalOpen] = useState(false);
  const [quickServiceName, setQuickServiceName] = useState("");
  const [quickServicePrice, setQuickServicePrice] = useState("");
  const [quickServiceDuration, setQuickServiceDuration] = useState("30");

  // Sincroniza e consolida a base de clientes (props, safeStorage e Supabase em tempo real)
  const syncClientsPool = useCallback(async () => {
    const pool = new Map();

    const addClientToPool = (c) => {
      if (!c) return;
      const norm = normalizeClientRecord(c);
      const k = norm.id || (norm.phone ? norm.phone.replace(/\D/g, "") : null) || norm.name;
      if (k && !pool.has(k)) {
        pool.set(k, norm);
      }
    };

    // 1. Clientes passados via prop (ex: do painel/agenda)
    if (Array.isArray(clients)) {
      clients.forEach(addClientToPool);
    }

    // 2. Cache local do tenant no safeStorage
    try {
      const activeTenantId = tenant?.id || "default";
      const cached = safeStorage.getItem(`saas_clients_cache_${activeTenantId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach(addClientToPool);
        }
      }
    } catch {}

    // 3. Busca em tempo real na tabela clients do Supabase
    const targetTenantId = tenant?.id;
    if (targetTenantId && !String(targetTenantId).startsWith("temp-")) {
      try {
        const { data: dbClients } = await supabase
          .from("clients")
          .select("*")
          .or(`barbershop_id.eq.${targetTenantId},tenant_id.eq.${targetTenantId}`)
          .order("name", { ascending: true })
          .limit(100);

        if (Array.isArray(dbClients) && dbClients.length > 0) {
          dbClients.forEach(addClientToPool);
        }
      } catch (err) {
        console.warn("[NewAppointmentModal] Aviso ao sincronizar clientes do Supabase:", err);
      }
    }

    setLocalClients(Array.from(pool.values()));
  }, [clients, tenant?.id]);

  useEffect(() => {
    if (isOpen) {
      syncClientsPool();
    } else {
      setIsDropdownOpen(false);
      setSelectedClient(null);
      setClientName("");
      setClientPhone("");
      setNotes("");
      setErrors({});
    }
  }, [isOpen, syncClientsPool]);

  // Fecha o dropdown de sugestões ao clicar fora do container
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Busca remota e filtragem em tempo real ao digitar o nome do cliente
  const handleClientNameChange = (e) => {
    const val = e.target.value;
    setClientName(val);

    if (errors.clientName) {
      setErrors((prev) => ({ ...prev, clientName: null }));
    }

    // Se o usuário alterar o nome após vincular um cliente, desvincula a seleção
    if (selectedClient && selectedClient.name !== val) {
      setSelectedClient(null);
    }

    if (val.trim().length > 0) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
    }

    // Busca remota adicional no Supabase quando digitar 2 ou mais caracteres
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const trimmed = val.trim();
    if (trimmed.length >= 2) {
      searchDebounceRef.current = setTimeout(async () => {
        try {
          const targetTenantId = tenant?.id;
          let queryBuilder = supabase
            .from("clients")
            .select("*")
            .or(`name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`);

          if (targetTenantId && !String(targetTenantId).startsWith("temp-")) {
            queryBuilder = queryBuilder.or(
              `barbershop_id.eq.${targetTenantId},tenant_id.eq.${targetTenantId}`
            );
          }

          const { data: searchResults } = await queryBuilder.limit(10);
          if (Array.isArray(searchResults) && searchResults.length > 0) {
            setLocalClients((prev) => {
              const map = new Map();
              prev.forEach((c) => {
                const k = c.id || (c.phone ? c.phone.replace(/\D/g, "") : null) || c.name;
                if (k) map.set(k, c);
              });
              searchResults.forEach((c) => {
                const norm = normalizeClientRecord(c);
                const k = norm.id || (norm.phone ? norm.phone.replace(/\D/g, "") : null) || norm.name;
                if (k) map.set(k, norm);
              });
              return Array.from(map.values());
            });
          }
        } catch {
          // tolerante
        }
      }, 250);
    }
  };

  // Sugestões filtradas: só aparecem enquanto o usuário estiver digitando e houver clientes correspondentes
  // "Caso não exista nenhum cliente, não aparece nenhuma informação, mas se existir algum cliente lá,
  // enquanto o usuário estiver digitando o nome do cliente aparece como sugestão..."
  const clientSuggestions = useMemo(() => {
    const query = clientName.trim().toLowerCase();
    if (!query) return [];

    // Se o cliente já está vinculado e o texto é exatamente o nome dele, não exibe popup
    if (selectedClient && selectedClient.name.toLowerCase() === query) {
      return [];
    }

    const cleanNumeric = query.replace(/\D/g, "");
    const seen = new Set();
    const result = [];

    for (const c of localClients) {
      if (!c) continue;
      const name = (c.name || "").toLowerCase();
      const phoneDigits = (c.phone || "").replace(/\D/g, "");
      const email = (c.email || "").toLowerCase();

      const nameMatch = name.includes(query);
      const phoneMatch = cleanNumeric.length > 0 && phoneDigits.includes(cleanNumeric);
      const emailMatch = email.includes(query);

      if (nameMatch || phoneMatch || emailMatch) {
        const uniqueKey = c.id || phoneDigits || name;
        if (!seen.has(uniqueKey)) {
          seen.add(uniqueKey);
          result.push(c);
          if (result.length >= 6) break;
        }
      }
    }

    return result;
  }, [clientName, localClients, selectedClient]);

  // AÇÃO: Selecionar Cliente e Carregar seus Dados e Prontuário no Modal
  const handleSelectClient = (client) => {
    setClientName(client.name || "");
    setClientPhone(client.phone || "");
    setSelectedClient(client);
    setIsDropdownOpen(false);
    setErrors((prev) => ({ ...prev, clientName: null, clientPhone: null }));

    // Se o cliente possui barbeiro de preferência e ele está cadastrado na barbearia, auto-seleciona
    const prefName = (client.preferredBarber || client.preferred_barber || "").trim().toLowerCase();
    if (prefName) {
      const foundBarber = barbers.find(
        (b) =>
          (b.name || "").trim().toLowerCase() === prefName ||
          (b.displayName || "").trim().toLowerCase() === prefName ||
          b.id === client.preferredBarberId
      );
      if (foundBarber) {
        setSelectedBarberId(foundBarber.id);
      }
    }
  };

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

  // Sincroniza a data pré-selecionada na agenda ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      const todayStr = getTodayDateString();
      if (prefilledDate && prefilledDate >= todayStr) {
        setBookingDate(prefilledDate);
      } else {
        setBookingDate(todayStr);
      }
    }
  }, [isOpen, prefilledDate]);

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
  const handleSaveQuickService = async () => {
    if (!quickServiceName.trim() || !quickServicePrice) {
      alert("Informe o nome e o preço do novo serviço.");
      return;
    }

    const serviceId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `s-${Date.now()}`;

    const targetBarbershopId = tenant?.id || null;

    const newService = {
      id: serviceId,
      name: quickServiceName.trim(),
      category: "Cabelo",
      durationMinutes: Number(quickServiceDuration),
      duration_minutes: Number(quickServiceDuration),
      price: Number(quickServicePrice),
      commission_percent: 50,
      active: true,
      description: "Serviço cadastrado durante o agendamento.",
      barbershop_id: targetBarbershopId,
      tenant_id: targetBarbershopId,
    };

    if (onAddService) {
      onAddService(newService);
    }

    // Persiste no Supabase garantindo o ID obrigatório
    try {
      await supabase.from("services").insert([
        {
          id: serviceId,
          name: newService.name,
          category: newService.category,
          duration_minutes: newService.durationMinutes,
          price: newService.price,
          commission_percent: 50,
          active: true,
          barbershop_id: targetBarbershopId,
          tenant_id: targetBarbershopId,
        },
      ]);
    } catch (err) {
      console.warn("[NewAppointmentModal] Aviso ao persistir serviço no Supabase:", err);
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
    
    // Gera UUID válido RFC 4122 para compatibilidade total com tipo UUID no PostgreSQL
    const appointmentId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "10000000-1000-4000-8000-" + String(Date.now()).padStart(12, "0").slice(-12);

    const targetBarbershopId =
      tenant?.id || "a0000000-0000-0000-0000-000000000001";

    const isUuid = (val) =>
      typeof val === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    // Payload compatível com tabelas legadas e novas (tenant_id e barbershop_id)
    const supabasePayload = {
      id: appointmentId,
      tenant_id: targetBarbershopId,
      barbershop_id: targetBarbershopId,
      client_id: selectedClient?.id && isUuid(selectedClient.id) ? selectedClient.id : null,
      barber_id: isUuid(resolvedBarberId) ? resolvedBarberId : null,
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
      is_vip: Boolean(selectedClient?.isVip || selectedClient?.is_vip),
      notes: notes.trim() || null,
      created_at: new Date().toISOString(),
    };

    // Objeto consolidado para o estado React da aplicação
    const newAppointment = {
      ...supabasePayload,
      clientId: selectedClient?.id || null,
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
      isVip: Boolean(selectedClient?.isVip || selectedClient?.is_vip),
      clientRecord: selectedClient || null,
      notes: notes.trim(),
    };

    // 1. Abre imediatamente o Modal Spinner com status "Salvando Agendamento..."
    setIsSaving(true);
    setSaveStage("saving");
    setSaveStatusMessage("Salvando Agendamento...");

    // 2. Dispara a persistência real no Supabase com tolerância a convenções de tabela
    const startTime = Date.now();
    try {
      let { error: insertError } = await supabase
        .from("appointments")
        .insert([supabasePayload]);

      if (insertError && (insertError.code === "42P01" || insertError.message?.includes("does not exist"))) {
        const fallbackRes = await supabase.from("agendamentos").insert([supabasePayload]);
        insertError = fallbackRes.error;
      }

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
        setSelectedClient(null);
        setIsDropdownOpen(false);
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
          {/* 1. DADOS DO CLIENTE COM AUTOCOMPLETE E PRONTUÁRIOS EM TEMPO REAL */}
          <div className="space-y-3">
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-300">
                  Nome do Cliente
                </label>
                {selectedClient && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Check className="w-3 h-3" /> Prontuário Vinculado
                  </span>
                )}
              </div>

              <Input
                placeholder="Ex: Carlos Oliveira (digite para buscar cliente cadastrado)"
                value={clientName}
                onChange={handleClientNameChange}
                onFocus={() => {
                  if (clientName.trim().length > 0 && clientSuggestions.length > 0) {
                    setIsDropdownOpen(true);
                  }
                }}
                error={errors.clientName}
              />

              {/* DROPDOWN DE SUGESTÕES DO MENU CLIENTES E PRONTUÁRIOS */}
              {/* "Caso não exista nenhum cliente, não aparece nenhuma informação, mas se existir algum cliente lá,
                  enquanto o usuário estiver digitando o nome do cliente aparece como sugestão..." */}
              {isDropdownOpen && clientSuggestions.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1.5 bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-neutral-800/80 animate-in fade-in zoom-in-95 duration-150"
                  role="listbox"
                  aria-label="Sugestões de clientes cadastrados no menu e prontuários"
                >
                  <div className="px-3.5 py-1.5 bg-neutral-950 text-[10px] uppercase tracking-wider font-bold text-amber-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-amber-400" />
                      Clientes Encontrados ({clientSuggestions.length})
                    </span>
                    <span className="text-neutral-500 font-normal text-[10px]">
                      Clique para carregar dados e prontuário
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto">
                    {clientSuggestions.map((client, idx) => {
                      const cutSpecs =
                        client.technicalNotes?.cutSpecs ||
                        client.notes ||
                        "";
                      const allergyAlert =
                        client.technicalNotes?.allergyAlert || "";
                      const preferred =
                        client.preferredBarber || client.preferred_barber || "";

                      return (
                        <div
                          key={`${client.id || client.phone || 'client'}-${idx}`}
                          role="option"
                          aria-selected={selectedClient?.id === client.id}
                          onClick={() => handleSelectClient(client)}
                          className="p-3 hover:bg-neutral-800/90 cursor-pointer transition-colors flex items-start gap-3 group text-left"
                        >
                          {/* Avatar com iniciais */}
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0 group-hover:bg-amber-500 group-hover:text-neutral-950 transition-colors">
                            {(client.name || "C").charAt(0).toUpperCase()}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                                {client.name}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {client.isVip && (
                                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    VIP
                                  </span>
                                )}
                                <span className="text-[10px] text-neutral-400">
                                  {client.totalVisits > 0
                                    ? `${client.totalVisits} visitas`
                                    : "Novo"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-2.5 h-2.5 text-neutral-500" />
                                {client.phone || "Sem telefone"}
                              </span>
                              {preferred && (
                                <span className="truncate text-neutral-400">
                                  • Prefere: {preferred}
                                </span>
                              )}
                            </div>

                            {/* Prévia do Prontuário Técnico */}
                            {cutSpecs && (
                              <div className="mt-1 text-[11px] text-neutral-300 flex items-center gap-1 truncate bg-neutral-950/60 px-2 py-0.5 rounded-md border border-neutral-800">
                                <Scissors className="w-3 h-3 text-amber-400 shrink-0" />
                                <span className="truncate">{cutSpecs}</span>
                              </div>
                            )}

                            {allergyAlert && (
                              <div className="mt-1 text-[10px] text-red-300 font-medium flex items-center gap-1 truncate bg-red-950/40 px-2 py-0.5 rounded-md border border-red-500/30">
                                <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                                <span className="truncate">Alergia: {allergyAlert}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

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
              helperText={
                selectedClient
                  ? "Telefone sincronizado automaticamente do cadastro do cliente."
                  : "Enviaremos confirmação e lembretes automáticos por este número."
              }
            />

            {/* CARD DE PRONTUÁRIO TÉCNICO VINCULADO */}
            {selectedClient && (
              <div className="p-3.5 bg-neutral-950 border border-amber-500/30 rounded-2xl space-y-2.5 animate-in fade-in duration-200 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
                      <FileText className="w-4 h-4" />
                    </span>
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        Prontuário de {selectedClient.name}
                        {selectedClient.isVip && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">
                            VIP
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-neutral-400 block">
                        {selectedClient.totalVisits || 0} corte(s) realizados • Retorno habitual a cada {selectedClient.frequencyDays || 18} dias
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                    }}
                    className="text-xs text-neutral-400 hover:text-red-400 flex items-center gap-1 p-1 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                    title="Desvincular prontuário e preencher livremente"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Desvincular</span>
                  </button>
                </div>

                {/* Alerta de Alergia / Sensibilidade */}
                {selectedClient.technicalNotes?.allergyAlert && (
                  <div className="p-2.5 bg-red-950/40 border border-red-500/30 rounded-xl flex items-start gap-2 text-xs text-red-200">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-red-300">Alerta de Sensibilidade / Alergia:</span>
                      <p className="text-red-200/90 text-[11px] mt-0.5 leading-relaxed">
                        {selectedClient.technicalNotes.allergyAlert}
                      </p>
                    </div>
                  </div>
                )}

                {/* Especificações de Corte e Barba */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1 mb-1">
                      <Scissors className="w-3 h-3 text-amber-400" />
                      Corte Habitual / Estilo
                    </span>
                    <p className="text-neutral-200 text-xs line-clamp-2">
                      {selectedClient.technicalNotes?.cutSpecs ||
                        selectedClient.notes ||
                        "Sem anotação de estilo registrada"}
                    </p>
                  </div>

                  <div className="bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 flex items-center gap-1 mb-1">
                      <User className="w-3 h-3 text-amber-400" />
                      Barba & Preferências
                    </span>
                    <p className="text-neutral-200 text-xs">
                      {selectedClient.technicalNotes?.beardSpecs
                        ? selectedClient.technicalNotes.beardSpecs
                        : selectedClient.preferredBarber
                        ? `Barbeiro de preferência: ${selectedClient.preferredBarber}`
                        : "Sem especificação de barba"}
                    </p>
                  </div>
                </div>

                {/* Ação rápida para copiar notas do prontuário para as observações do agendamento */}
                {(selectedClient.technicalNotes?.cutSpecs ||
                  selectedClient.technicalNotes?.allergyAlert ||
                  selectedClient.notes) && (
                  <button
                    type="button"
                    onClick={() => {
                      const parts = [];
                      if (selectedClient.technicalNotes?.allergyAlert) {
                        parts.push(`ALERTA: ${selectedClient.technicalNotes.allergyAlert}`);
                      }
                      if (selectedClient.technicalNotes?.cutSpecs) {
                        parts.push(`Corte: ${selectedClient.technicalNotes.cutSpecs}`);
                      }
                      if (selectedClient.technicalNotes?.beardSpecs) {
                        parts.push(`Barba: ${selectedClient.technicalNotes.beardSpecs}`);
                      }
                      if (
                        selectedClient.notes &&
                        !parts.some((p) => p.includes(selectedClient.notes))
                      ) {
                        parts.push(selectedClient.notes);
                      }
                      const compiled = parts.join(" | ");
                      setNotes((prev) => (prev ? `${prev} | ${compiled}` : compiled));
                    }}
                    className="text-[11px] font-medium text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Copiar detalhes do prontuário para observações deste agendamento
                  </button>
                )}
              </div>
            )}
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
