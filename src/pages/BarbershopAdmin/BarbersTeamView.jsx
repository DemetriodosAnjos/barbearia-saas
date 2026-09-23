import { useState } from "react";
// [Import: cliente Supabase para persistência real de barbeiros no banco de dados]
import { supabase } from "../../lib/supabase";
import { teamStyles } from "./BarbersTeamView.styles";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
// [Remoção do import Badge que nunca era utilizado no arquivo]
import Modal from "../../components/ui/Modal";
import Avatar from "../../components/ui/Avatar";
import TagInput from "../../components/ui/TagInput";
import WorkShiftSelector from "../../components/services/WorkShiftSelector";

// Escala padrão para inicialização
const defaultWeeklySchedule = [
  {
    dayId: "seg",
    label: "Segunda-feira",
    active: true,
    start: "09:00",
    end: "19:00",
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    dayId: "ter",
    label: "Terça-feira",
    active: true,
    start: "09:00",
    end: "19:00",
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    dayId: "qua",
    label: "Quarta-feira",
    active: true,
    start: "09:00",
    end: "19:00",
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    dayId: "qui",
    label: "Quinta-feira",
    active: true,
    start: "09:00",
    end: "20:00",
    breakStart: "12:30",
    breakEnd: "13:30",
  },
  {
    dayId: "sex",
    label: "Sexta-feira",
    active: true,
    start: "09:00",
    end: "20:00",
    breakStart: "12:30",
    breakEnd: "13:30",
  },
  {
    dayId: "sab",
    label: "Sábado",
    active: true,
    start: "08:30",
    end: "18:00",
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    dayId: "dom",
    label: "Domingo",
    active: false,
    start: "09:00",
    end: "14:00",
    breakStart: "",
    breakEnd: "",
  },
];

export default function BarbersTeamView({
  barbers = [], // 👈 Recebe via props
  onUpdateBarbers, // 👈 Atualiza o estado global
  maxPlanChairs = 6,
  onBack,
}) {
  // ========================================================
  // ESTADOS DO MODAL "+ NOVO BARBEIRO" (COM 2 ABAS)
  // ========================================================

  // Se não passar por props, garante o valor padrão:
  const totalChairs = maxPlanChairs || 6;

  // Modais e formulários...
  const [isNewBarberModalOpen, setIsNewBarberModalOpen] = useState(false);
  const [newBarberActiveTab, setNewBarberActiveTab] = useState("dados"); // 'dados' | 'escala'
  // [Novo estado: feedback visual durante inserção e atualização no Supabase]
  const [isSavingBarber, setIsSavingBarber] = useState(false);

  const [newBarberForm, setNewBarberForm] = useState({
    name: "",
    displayName: "",
    email: "",
    phone: "",
    role: "Barbeiro Profissional",
    serviceCommission: "50",
    productCommission: "10",
    pixKey: "",
    notes: "",
    specialties: ["Degradê Navalhado", "Barboterapia"],
  });

  const [newBarberSchedule, setNewBarberSchedule] = useState(
    defaultWeeklySchedule,
  );

  const [newBarberErrors, setNewBarberErrors] = useState({});

  // Estados do Modal de Detalhes & Edição
  const [selectedBarberForDetails, setSelectedBarberForDetails] =
    useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Estados do Modal de Escala Individual
  const [barberForScheduleEdit, setBarberForScheduleEdit] = useState(null);
  const [tempSchedule, setTempSchedule] = useState([]);

  const activeChairsCount = barbers.filter(
    (b) => b.status !== "inactive",
  ).length;

  // Abrir Modal de Cadastro Zerado
  const handleOpenNewBarberModal = () => {
    setNewBarberActiveTab("dados");
    setNewBarberForm({
      name: "",
      displayName: "",
      email: "",
      phone: "",
      role: "Barbeiro Profissional",
      serviceCommission: "50",
      productCommission: "10",
      pixKey: "",
      notes: "",
      specialties: ["Degradê Navalhado", "Barboterapia"],
    });
    setNewBarberSchedule(defaultWeeklySchedule);
    setNewBarberErrors({});
    setIsNewBarberModalOpen(true);
  };

  // [Função assíncrona: insere o novo barbeiro diretamente na tabela 'barbers' do Supabase]
  const handleSaveNewBarber = async () => {
    const errs = {};
    if (!newBarberForm.name.trim())
      errs.name = "Informe o nome completo do documento.";
    if (!newBarberForm.displayName.trim())
      errs.displayName = "Informe o apelido / nome de exibição.";
    if (!newBarberForm.phone || newBarberForm.phone.length < 14)
      errs.phone = "Informe o WhatsApp com DDD.";

    if (Object.keys(errs).length > 0) {
      setNewBarberErrors(errs);
      setNewBarberActiveTab("dados");
      return;
    }

    setIsSavingBarber(true);

    // [Payload com suporte a colunas snake_case do Postgres e camelCase do React]
    const dbPayload = {
      name: newBarberForm.name.trim(),
      display_name: newBarberForm.displayName.trim(),
      role: newBarberForm.role,
      email: newBarberForm.email?.trim() || null,
      phone: newBarberForm.phone.trim(),
      pix_key: newBarberForm.pixKey?.trim() || null,
      service_commission: Number(newBarberForm.serviceCommission || 50),
      product_commission: Number(newBarberForm.productCommission || 10),
      notes: newBarberForm.notes?.trim() || "",
      status: "active",
      rating: 5.0,
      review_count: 0,
      specialties: newBarberForm.specialties || [],
      schedule: newBarberSchedule,
    };

    try {
      // Método Supabase: insere no banco e retorna o registro criado com id oficial
      const { data, error } = await supabase
        .from("barbers")
        .insert([dbPayload])
        .select()
        .single();

      if (error) throw error;

      const created = {
        ...data,
        displayName: data.display_name || data.name,
        serviceCommission: data.service_commission ?? 50,
        productCommission: data.product_commission ?? 10,
        pixKey: data.pix_key || "",
      };

      const updatedTeam = [...barbers, created];

      if (onUpdateBarbers) {
        onUpdateBarbers(updatedTeam);
      }

      setIsNewBarberModalOpen(false);
    } catch (err) {
      console.error("Erro ao cadastrar barbeiro no Supabase:", err);
      alert(
        "Não foi possível salvar o barbeiro no banco de dados. Verifique a conexão.",
      );
    } finally {
      setIsSavingBarber(false);
    }
  };

  // Detalhes & Edição
  const handleOpenDetails = (barber) => {
    setSelectedBarberForDetails(barber);
    setIsEditMode(false);
    setEditFormData({ ...barber });
  };

  // [Função assíncrona: atualiza os dados do profissional na tabela 'barbers' do Supabase]
  const handleSaveEditBarber = async () => {
    if (!editFormData?.id) return;
    setIsSavingBarber(true);

    const updatePayload = {
      display_name: editFormData.displayName || editFormData.name,
      phone: editFormData.phone,
      pix_key: editFormData.pixKey || null,
      role: editFormData.role,
      service_commission: Number(editFormData.serviceCommission || 50),
      product_commission: Number(editFormData.productCommission || 10),
      status: editFormData.status || "active",
      specialties: editFormData.specialties || [],
    };

    try {
      const { error } = await supabase
        .from("barbers")
        .update(updatePayload)
        .eq("id", editFormData.id);

      if (error) throw error;

      const updatedTeam = barbers.map((b) =>
        b.id === editFormData.id ? { ...b, ...editFormData } : b,
      );

      if (onUpdateBarbers) {
        onUpdateBarbers(updatedTeam);
      }

      setSelectedBarberForDetails({ ...editFormData });
      setIsEditMode(false);
    } catch (err) {
      console.error("Erro ao atualizar barbeiro no Supabase:", err);
      alert("Erro ao salvar alterações no banco de dados.");
    } finally {
      setIsSavingBarber(false);
    }
  };

  // [Função assíncrona: persiste a escala semanal e horários de intervalo do barbeiro]
  const handleSaveBarberSchedule = async () => {
    if (!barberForScheduleEdit?.id) return;
    setIsSavingBarber(true);

    try {
      const { error } = await supabase
        .from("barbers")
        .update({ schedule: tempSchedule })
        .eq("id", barberForScheduleEdit.id);

      if (error) throw error;

      const updatedTeam = barbers.map((b) =>
        b.id === barberForScheduleEdit.id
          ? { ...b, schedule: tempSchedule }
          : b,
      );

      if (onUpdateBarbers) {
        onUpdateBarbers(updatedTeam);
      }

      setBarberForScheduleEdit(null);
    } catch (err) {
      console.error("Erro ao salvar escala no Supabase:", err);
      alert("Erro ao sincronizar escala com o banco de dados.");
    } finally {
      setIsSavingBarber(false);
    }
  };

  return (
    <div className={teamStyles.container}>
      {/* 1. CABEÇALHO */}
      <div className={teamStyles.headerCard}>
        <div className={teamStyles.titleWrapper}>
          <h1 className={teamStyles.title}>
            <span>💈</span>
            <span>Equipe de Barbeiros & Profissionais</span>
          </h1>
          <p className={teamStyles.subtitle}>
            Cadastre os membros da equipe, comissões individuais, especialidades
            e escalas semanais de trabalho.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className={teamStyles.capacityBadge}>
            <span>🪑</span>
            <span>
              {activeChairsCount} de {totalChairs} cadeiras ocupadas
            </span>
          </div>

          <Button
            variant="primary"
            onClick={handleOpenNewBarberModal}
            className="text-xs py-2.5 px-4 font-bold shadow-md bg-amber-600 hover:bg-amber-500"
          >
            <span>+</span> Novo Barbeiro
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

      {/* 2. GRADE DE CARDS DOS BARBEIROS */}
      <div className={teamStyles.teamGrid}>
        {barbers.map((barber) => {
          const isInactive = barber.status === "inactive";
          const isVacation = barber.status === "vacation";

          return (
            <div
              key={barber.id}
              onClick={() => handleOpenDetails(barber)}
              className={`
                ${teamStyles.barberCard} cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:border-amber-500/60
                ${isInactive ? "opacity-40 bg-neutral-950 border-neutral-900" : isVacation ? "opacity-75 bg-neutral-900/60 border-neutral-800" : ""}
              `}
            >
              <div className={teamStyles.cardHeader}>
                <div className={teamStyles.profileInfo}>
                  <Avatar
                    name={barber.name}
                    size="lg"
                    status={
                      isInactive
                        ? "offline"
                        : isVacation
                          ? "on_break"
                          : "available"
                    }
                  />
                  <div className={teamStyles.nameWrapper}>
                    <h3 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                      <span>{barber.name}</span>
                      {barber.notes && (
                        <span title="Possui observações internas">📝</span>
                      )}
                    </h3>
                    <p className={teamStyles.barberRole}>
                      "{barber.displayName}" • {barber.role}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                    isInactive
                      ? "bg-red-950/40 text-red-400 border-red-800/60"
                      : isVacation
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  }`}
                >
                  {isInactive
                    ? "Inativo (Desligado)"
                    : isVacation
                      ? "Férias / Folga"
                      : "✓ Ativo"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  ★ {barber.rating}{" "}
                  <span className="text-neutral-500 font-normal">
                    ({barber.reviewCount})
                  </span>
                </span>
                <span className="font-mono text-[11px]">{barber.phone}</span>
              </div>

              <div className={teamStyles.commissionBox}>
                <div className={teamStyles.commissionItem}>
                  <span className={teamStyles.commissionLabel}>
                    Comissão Serviços
                  </span>
                  <span className={teamStyles.commissionValue}>
                    {barber.serviceCommission}%
                  </span>
                </div>
                <div className="h-6 w-px bg-neutral-800" />
                <div className={teamStyles.commissionItem}>
                  <span className={teamStyles.commissionLabel}>
                    Comissão Produtos
                  </span>
                  <span className={teamStyles.commissionValue}>
                    {barber.productCommission}%
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
                  Especialidades:
                </span>
                <div className="flex flex-wrap gap-1">
                  {barber.specialties.map((spec, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-300"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className={teamStyles.actionsFooter}
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="secondary"
                  onClick={() => {
                    setBarberForScheduleEdit(barber);
                    setTempSchedule(barber.schedule || defaultWeeklySchedule);
                  }}
                  className="w-full text-xs py-2 flex items-center justify-center gap-1.5"
                >
                  <span>⏰</span>
                  <span>Escala & Horários</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: CADASTRAR NOVO BARBEIRO (COM 2 ABAS!)          */}
      {/* ======================================================== */}
      <Modal
        isOpen={isNewBarberModalOpen}
        size="xl" // Espaçoso para caber a escala confortavelmente!
        onClose={() => setIsNewBarberModalOpen(false)}
        title="💈 Cadastrar Novo Barbeiro na Equipe"
        footer={
          <div className="w-full flex items-center justify-between gap-3">
            <span className="text-[11px] text-neutral-500">
              {newBarberActiveTab === "dados"
                ? "Configure os dados e comissões antes de salvar."
                : "Defina a escala semanal e os intervalos de almoço."}
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setIsNewBarberModalOpen(false)}
              >
                Cancelar
              </Button>

              {newBarberActiveTab === "dados" ? (
                <Button
                  variant="primary"
                  onClick={() => setNewBarberActiveTab("escala")}
                  className="bg-amber-600 hover:bg-amber-500"
                >
                  Avançar para Escala de Horários ➔
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => setNewBarberActiveTab("dados")}
                >
                  ← Voltar para Dados
                </Button>
              )}

              {/* [Botão conectado ao estado assíncrono de salvamento no Supabase] */}
              <Button
                variant="primary"
                isLoading={isSavingBarber}
                onClick={handleSaveNewBarber}
                className="bg-emerald-600 hover:bg-emerald-500 font-bold"
              >
                Salvar e Incluir Barbeiro
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-left max-h-[75vh] overflow-y-auto pr-1">
          {/* BARRA SELETORA DAS 2 ABAS DO MODAL */}
          <div className="flex items-center gap-2 p-1.5 bg-neutral-950 border border-neutral-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setNewBarberActiveTab("dados")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                newBarberActiveTab === "dados"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-950/50"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>👤</span>
              <span>Aba 1: Dados & Comissões</span>
            </button>

            <button
              type="button"
              onClick={() => setNewBarberActiveTab("escala")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                newBarberActiveTab === "escala"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-950/50"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>⏰</span>
              <span>Aba 2: Escala de Horários & Almoço</span>
            </button>
          </div>

          {/* ==================================================== */}
          {/* ABA 1: DADOS DO PROFISSIONAL & COMISSÕES            */}
          {/* ==================================================== */}
          {newBarberActiveTab === "dados" && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Nome Completo (Documento)"
                  placeholder="Ex: Carlos Eduardo Santos"
                  value={newBarberForm.name}
                  onChange={(e) => {
                    setNewBarberForm({
                      ...newBarberForm,
                      name: e.target.value,
                    });
                    if (newBarberErrors.name)
                      setNewBarberErrors((prev) => ({ ...prev, name: null }));
                  }}
                  error={newBarberErrors.name}
                />

                <Input
                  label="Nome de Exibição (Apelido na Cadeira)"
                  placeholder="Ex: Carlos Navalha"
                  value={newBarberForm.displayName}
                  onChange={(e) => {
                    setNewBarberForm({
                      ...newBarberForm,
                      displayName: e.target.value,
                    });
                    if (newBarberErrors.displayName)
                      setNewBarberErrors((prev) => ({
                        ...prev,
                        displayName: null,
                      }));
                  }}
                  error={newBarberErrors.displayName}
                  helperText="Como o cliente verá no agendamento online."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="WhatsApp do Barbeiro"
                  mask="phone"
                  placeholder="(11) 99999-9999"
                  value={newBarberForm.phone}
                  onChange={(e) => {
                    setNewBarberForm({
                      ...newBarberForm,
                      phone: e.target.value,
                    });
                    if (newBarberErrors.phone)
                      setNewBarberErrors((prev) => ({ ...prev, phone: null }));
                  }}
                  error={newBarberErrors.phone}
                />

                <Input
                  label="Chave PIX (Para repasse de comissões)"
                  placeholder="CPF, E-mail ou Telefone"
                  value={newBarberForm.pixKey}
                  onChange={(e) =>
                    setNewBarberForm({
                      ...newBarberForm,
                      pixKey: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select
                  label="Cargo / Nível"
                  value={newBarberForm.role}
                  onChange={(e) =>
                    setNewBarberForm({ ...newBarberForm, role: e.target.value })
                  }
                  options={[
                    {
                      value: "Barbeiro Profissional",
                      label: "Barbeiro Profissional",
                    },
                    { value: "Master Barber", label: "Master Barber" },
                    {
                      value: "Especialista em Degradê",
                      label: "Especialista em Degradê",
                    },
                    {
                      value: "Barbeiro Tradicional",
                      label: "Barbeiro Tradicional",
                    },
                    {
                      value: "Barbeiro Júnior / Aprendiz",
                      label: "Barbeiro Júnior",
                    },
                  ]}
                />

                <Input
                  label="Comissão Serviços (%)"
                  type="number"
                  value={newBarberForm.serviceCommission}
                  onChange={(e) =>
                    setNewBarberForm({
                      ...newBarberForm,
                      serviceCommission: e.target.value,
                    })
                  }
                  helperText="Ex: 50 para 50%"
                />

                <Input
                  label="Comissão Produtos (%)"
                  type="number"
                  value={newBarberForm.productCommission}
                  onChange={(e) =>
                    setNewBarberForm({
                      ...newBarberForm,
                      productCommission: e.target.value,
                    })
                  }
                  helperText="Ex: 10 para 10%"
                />
              </div>

              <TagInput
                label="Especialidades de Atendimento"
                tags={newBarberForm.specialties}
                onChange={(newTags) =>
                  setNewBarberForm({ ...newBarberForm, specialties: newTags })
                }
                placeholder="Adicionar especialidade + TAB"
                suggestions={[
                  "Degradê Navalhado",
                  "Barboterapia",
                  "Platinado / Nevou",
                  "Tesoura Clássica",
                  "Sobrancelha",
                  "Pigmentação",
                  "Corte Infantil",
                ]}
              />

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-neutral-300">
                  Observações Internas (Opcional - Privado do Dono)
                </label>
                <textarea
                  rows={2}
                  placeholder="Anotações sobre contrato, preferências de folga ou detalhes do profissional..."
                  value={newBarberForm.notes}
                  onChange={(e) =>
                    setNewBarberForm({
                      ...newBarberForm,
                      notes: e.target.value,
                    })
                  }
                  className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* ABA 2: ESCALA DE HORÁRIOS & ALMOÇO DO NOVO BARBEIRO */}
          {/* ==================================================== */}
          {newBarberActiveTab === "escala" && (
            <div className="space-y-4 pt-1">
              <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs text-neutral-400 leading-relaxed">
                ⏰ Defina os dias de trabalho, expediente e horário de almoço
                individual para este barbeiro. O sistema bloqueará agendamentos
                automaticamente no intervalo de almoço.
              </div>

              {/* Componente WorkShiftSelector integrado na Aba 2 */}
              <WorkShiftSelector
                schedule={newBarberSchedule}
                onChange={setNewBarberSchedule}
              />
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL DE DETALHES & EDIÇÃO */}
      <Modal
        isOpen={!!selectedBarberForDetails}
        size="lg"
        onClose={() => {
          setSelectedBarberForDetails(null);
          setIsEditMode(false);
        }}
        title={
          isEditMode
            ? `✏️ Editando Dados: ${selectedBarberForDetails?.name}`
            : `Ficha do Profissional: ${selectedBarberForDetails?.name}`
        }
        footer={
          isEditMode ? (
            <>
              <Button variant="secondary" onClick={() => setIsEditMode(false)}>
                Cancelar Edição
              </Button>
              <Button variant="primary" onClick={handleSaveEditBarber}>
                Salvar Alterações
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => setSelectedBarberForDetails(null)}
              >
                Fechar
              </Button>
              <Button variant="primary" onClick={() => setIsEditMode(true)}>
                ✏️ Editar Dados
              </Button>
            </>
          )
        }
      >
        {selectedBarberForDetails && (
          <div className="space-y-4 text-left max-h-[75vh] overflow-y-auto pr-1">
            {!isEditMode ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                      Status Operacional
                    </span>
                    <p className="text-xs text-neutral-400">
                      Situação atual de trabalho na barbearia
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-xl border select-none ${
                      selectedBarberForDetails.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : selectedBarberForDetails.status === "vacation"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : "bg-red-950/40 text-red-400 border-red-800/60"
                    }`}
                  >
                    {selectedBarberForDetails.status === "active"
                      ? "✓ Ativo (Trabalhando Normalmente)"
                      : selectedBarberForDetails.status === "vacation"
                        ? "Férias / Folga"
                        : "Inativo (Desligado)"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-neutral-950/70 border border-neutral-800 rounded-2xl text-xs">
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                      Nome Completo:
                    </span>
                    <strong className="text-white text-sm">
                      {selectedBarberForDetails.name}
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                      Nome de Exibição:
                    </span>
                    <strong className="text-amber-400 text-sm">
                      "{selectedBarberForDetails.displayName}"
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-neutral-950/70 border border-neutral-800 rounded-2xl text-xs">
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                      WhatsApp:
                    </span>
                    <span className="text-white font-mono">
                      {selectedBarberForDetails.phone}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                      Chave PIX:
                    </span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {selectedBarberForDetails.pixKey}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                      Cargo:
                    </span>
                    <span className="text-neutral-300">
                      {selectedBarberForDetails.role}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-2xl text-xs">
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                      Comissão em Serviços:
                    </span>
                    <span className="text-emerald-400 font-black font-mono text-base">
                      {selectedBarberForDetails.serviceCommission}%
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                      Comissão em Produtos:
                    </span>
                    <span className="text-emerald-400 font-black font-mono text-base">
                      {selectedBarberForDetails.productCommission}%
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-2xl space-y-1.5 text-xs">
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                    Especialidades:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedBarberForDetails.specialties.map((spec, i) => (
                      <span
                        key={i}
                        className="text-xs font-bold px-2.5 py-1 rounded-lg bg-neutral-800 text-amber-300 border border-neutral-700"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedBarberForDetails.notes && (
                  <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-1 text-xs">
                    <span className="text-amber-400 font-bold block text-[10px] uppercase">
                      📝 Observações Internas:
                    </span>
                    <p className="text-neutral-300 italic">
                      {selectedBarberForDetails.notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                  <label className="text-xs font-bold text-neutral-300">
                    Alterar Status Operacional
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditFormData({ ...editFormData, status: "active" })
                      }
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        editFormData.status === "active"
                          ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
                          : "bg-neutral-900 text-neutral-400 border-neutral-800"
                      }`}
                    >
                      ✓ Ativo
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditFormData({ ...editFormData, status: "vacation" })
                      }
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        editFormData.status === "vacation"
                          ? "bg-amber-600 text-white border-amber-500 shadow-md"
                          : "bg-neutral-900 text-neutral-400 border-neutral-800"
                      }`}
                    >
                      Férias / Folga
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditFormData({ ...editFormData, status: "inactive" })
                      }
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        editFormData.status === "inactive"
                          ? "bg-red-600 text-white border-red-500 shadow-md"
                          : "bg-neutral-900 text-neutral-400 border-neutral-800"
                      }`}
                    >
                      Inativo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Nome de Exibição"
                    value={editFormData.displayName}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        displayName: e.target.value,
                      })
                    }
                  />
                  <Input
                    label="WhatsApp"
                    mask="phone"
                    value={editFormData.phone}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Chave PIX"
                    value={editFormData.pixKey}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        pixKey: e.target.value,
                      })
                    }
                  />
                  <Select
                    label="Cargo"
                    value={editFormData.role}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, role: e.target.value })
                    }
                    options={[
                      {
                        value: "Barbeiro Profissional",
                        label: "Barbeiro Profissional",
                      },
                      { value: "Master Barber", label: "Master Barber" },
                      {
                        value: "Especialista em Degradê",
                        label: "Especialista em Degradê",
                      },
                      {
                        value: "Barbeiro Tradicional",
                        label: "Barbeiro Tradicional",
                      },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Comissão Serviços (%)"
                    type="number"
                    value={editFormData.serviceCommission}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        serviceCommission: Number(e.target.value),
                      })
                    }
                  />
                  <Input
                    label="Comissão Produtos (%)"
                    type="number"
                    value={editFormData.productCommission}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        productCommission: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <TagInput
                  label="Especialidades"
                  tags={editFormData.specialties || []}
                  onChange={(newTags) =>
                    setEditFormData({ ...editFormData, specialties: newTags })
                  }
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL DE ESCALA RÁPIDA */}
      <Modal
        isOpen={!!barberForScheduleEdit}
        size="xl"
        onClose={() => setBarberForScheduleEdit(null)}
        title={`⏰ Escala & Horário de Almoço: ${barberForScheduleEdit?.name}`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setBarberForScheduleEdit(null)}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveBarberSchedule}>
              Salvar Escala do Barbeiro
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          <WorkShiftSelector
            schedule={tempSchedule}
            onChange={setTempSchedule}
          />
        </div>
      </Modal>
    </div>
  );
}
