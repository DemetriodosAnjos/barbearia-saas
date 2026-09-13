import { useState } from "react";
import { teamStyles } from "./BarbersTeamView.styles";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Avatar from "../../components/ui/Avatar";
import TagInput from "../../components/ui/TagInput";
import WorkShiftSelector from "../../components/services/WorkShiftSelector";
import Alert from "../../components/ui/Alert";

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

const initialBarbers = [
  {
    id: "barber-carlos",
    name: "Carlos Silva",
    displayName: "Carlos Navalha",
    role: "Master Barber",
    email: "carlos@vintageclub.com",
    phone: "(11) 98765-4321",
    pixKey: "carlos.silva.pix@gmail.com",
    serviceCommission: 50,
    productCommission: 10,
    status: "active", // active | vacation | inactive
    rating: 4.9,
    reviewCount: 168,
    specialties: ["Degradê Navalhado", "Barboterapia", "Tesoura"],
    notes:
      "Profissional referência da casa. Prefere produtos com efeito matte e tem preferência por atender no início da tarde.",
    schedule: defaultWeeklySchedule,
  },
  {
    id: "barber-marcos",
    name: "Marcos Vinicius",
    displayName: "Marquinhos",
    role: "Especialista Degradê & Químicas",
    email: "marcos@vintageclub.com",
    phone: "(11) 97654-3210",
    pixKey: "123.456.789-00",
    serviceCommission: 50,
    productCommission: 15,
    status: "active",
    rating: 4.8,
    reviewCount: 94,
    specialties: ["Pigmentação", "Platinado / Nevou", "Desenhos"],
    notes: "Especialista nas químicas e platinados de sexta e sábado.",
    schedule: defaultWeeklySchedule,
  },
  {
    id: "barber-tiago",
    name: "Tiago Santos",
    displayName: "Tiago Barbeiro",
    role: "Barbeiro Tradicional",
    email: "tiago@vintageclub.com",
    phone: "(11) 91234-5678",
    pixKey: "tiago.barber@hotmail.com",
    serviceCommission: 45,
    productCommission: 10,
    status: "vacation", // De férias
    rating: 4.7,
    reviewCount: 82,
    specialties: ["Corte Clássico", "Barba Alinhada", "Sobrancelha"],
    notes: "Em férias no momento. Retorno previsto para o dia 25 do mês.",
    schedule: defaultWeeklySchedule,
  },
];

export default function BarbersTeamView({ onBack }) {
  const [barbers, setBarbers] = useState(initialBarbers);
  const [maxPlanChairs] = useState(6);

  // 1. Estados da Modal "+ Novo Barbeiro"
  const [isNewBarberModalOpen, setIsNewBarberModalOpen] = useState(false);
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
  const [newBarberErrors, setNewBarberErrors] = useState({});

  // 2. Estados da Modal de DETALHES & EDIÇÃO DO BARBEIRO
  const [selectedBarberForDetails, setSelectedBarberForDetails] =
    useState(null);
  const [isEditMode, setIsEditMode] = useState(false); // false = Leitura, true = Editando
  const [editFormData, setEditFormData] = useState({});

  // 3. Estados da Modal de Escala de Trabalho
  const [barberForScheduleEdit, setBarberForScheduleEdit] = useState(null);
  const [tempSchedule, setTempSchedule] = useState([]);

  // Cadeiras ativas no plano (barbeiros inativos liberam vaga!)
  const activeChairsCount = barbers.filter(
    (b) => b.status !== "inactive",
  ).length;

  // ========================================================
  // AÇÕES DO MODAL DE DETALHES / EDIÇÃO
  // ========================================================
  const handleOpenDetails = (barber) => {
    setSelectedBarberForDetails(barber);
    setIsEditMode(false);
    setEditFormData({ ...barber });
  };

  const handleSaveEditBarber = () => {
    setBarbers((prev) =>
      prev.map((b) => (b.id === editFormData.id ? { ...editFormData } : b)),
    );
    setSelectedBarberForDetails({ ...editFormData });
    setIsEditMode(false);
    alert(
      `✅ Dados do profissional "${editFormData.name}" atualizados com sucesso!`,
    );
  };

  // Alterar Status diretamente no Detalhes (Ativo | Férias | Inativo)
  const handleChangeStatus = (barberId, newStatus) => {
    setBarbers((prev) =>
      prev.map((b) => (b.id === barberId ? { ...b, status: newStatus } : b)),
    );
    if (selectedBarberForDetails && selectedBarberForDetails.id === barberId) {
      setSelectedBarberForDetails((prev) => ({ ...prev, status: newStatus }));
      setEditFormData((prev) => ({ ...prev, status: newStatus }));
    }
  };

  // Salvar Novo Barbeiro
  const handleSaveNewBarber = () => {
    const errs = {};
    if (!newBarberForm.name.trim()) errs.name = "Informe o nome completo.";
    if (!newBarberForm.displayName.trim())
      errs.displayName = "Informe o apelido de exibição.";
    if (!newBarberForm.phone || newBarberForm.phone.length < 14)
      errs.phone = "Informe o WhatsApp com DDD.";

    if (Object.keys(errs).length > 0) {
      setNewBarberErrors(errs);
      return;
    }

    const created = {
      id: `barber-${Date.now()}`,
      name: newBarberForm.name,
      displayName: newBarberForm.displayName,
      role: newBarberForm.role,
      email:
        newBarberForm.email ||
        `${newBarberForm.displayName.toLowerCase().replace(/\s+/g, "")}@vintageclub.com`,
      phone: newBarberForm.phone,
      pixKey: newBarberForm.pixKey || newBarberForm.phone,
      serviceCommission: Number(newBarberForm.serviceCommission || 50),
      productCommission: Number(newBarberForm.productCommission || 10),
      notes: newBarberForm.notes || "",
      status: "active",
      rating: 5.0,
      reviewCount: 1,
      specialties: newBarberForm.specialties,
      schedule: defaultWeeklySchedule,
    };

    setBarbers((prev) => [...prev, created]);
    setIsNewBarberModalOpen(false);
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
    setNewBarberErrors({});
    alert(`💈 Barbeiro "${created.name}" incluído na equipe com sucesso!`);
  };

  // Salvar Escala de Trabalho
  const handleSaveBarberSchedule = () => {
    if (!barberForScheduleEdit) return;
    setBarbers((prev) =>
      prev.map((b) =>
        b.id === barberForScheduleEdit.id
          ? { ...b, schedule: tempSchedule }
          : b,
      ),
    );
    alert(
      `✅ Escala e almoço de ${barberForScheduleEdit.name} salvos com sucesso!`,
    );
    setBarberForScheduleEdit(null);
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
            Clique no card do barbeiro para ver a ficha completa, editar dados
            ou consultar observações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className={teamStyles.capacityBadge}>
            <span>🪑</span>
            <span>
              {activeChairsCount} de {maxPlanChairs} cadeiras ocupadas
            </span>
          </div>

          <Button
            variant="primary"
            onClick={() => setIsNewBarberModalOpen(true)}
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

      {/* 2. GRADE DE CARDS DOS BARBEIROS (CLICÁVEIS!) */}
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
              {/* Topo do Card */}
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

                {/* Selo dos 3 Estados (Ativo / Férias / Inativo) */}
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

              {/* Avaliação e Contato */}
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  ★ {barber.rating}{" "}
                  <span className="text-neutral-500 font-normal">
                    ({barber.reviewCount})
                  </span>
                </span>
                <span className="font-mono text-[11px]">{barber.phone}</span>
              </div>

              {/* Comissões */}
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

              {/* Especialidades */}
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

              {/* Rodapé do Card */}
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
      {/* MODAL 1: DETALHES (READ-ONLY) E EDIÇÃO DO PROFISSIONAL   */}
      {/* ======================================================== */}
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
            {/* ==================================================== */}
            {/* MODO 1: VISUALIZAÇÃO (LEITURA / NÃO EDITÁVEL)        */}
            {/* ==================================================== */}
            {!isEditMode ? (
              <div className="space-y-4">
                {/* 1. STATUS ESTÁTICO (NÃO CLICÁVEL) */}
                <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                      Status Operacional
                    </span>
                    <p className="text-xs text-neutral-400">
                      Situação atual de trabalho na barbearia
                    </p>
                  </div>

                  {/* Badge Estático conforme o status */}
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

                {/* Dados Pessoais */}
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
                      Nome de Exibição (Na Cadeira):
                    </span>
                    <strong className="text-amber-400 text-sm">
                      "{selectedBarberForDetails.displayName}"
                    </strong>
                  </div>
                </div>

                {/* Contato, Chave Pix e Cargo */}
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
                      Chave PIX (Comissões):
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

                {/* Comissões */}
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

                {/* Especialidades */}
                <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-2xl space-y-1.5 text-xs">
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">
                    Especialidades de Atendimento:
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

                {/* Observações Internas */}
                <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-1 text-xs">
                  <span className="text-amber-400 font-bold block text-[10px] uppercase tracking-wider">
                    📝 Observações Internas da Barbearia (Privado do Dono)
                  </span>
                  <p className="text-neutral-300 leading-relaxed italic">
                    {selectedBarberForDetails.notes ||
                      "Nenhuma observação cadastrada para este profissional."}
                  </p>
                </div>
              </div>
            ) : (
              /* ==================================================== */
              /* MODO 2: EDIÇÃO (AQUI OS BOTÕES DE STATUS SÃO CLICÁVEIS) */
              /* ==================================================== */
              <div className="space-y-4">
                {/* 1. SELETOR CLICÁVEL DE STATUS (APENAS EM MODO EDIÇÃO) */}
                <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-neutral-300">
                      Alterar Status Operacional
                    </label>
                    <span className="text-[10px] text-neutral-500">
                      Inativos liberam vaga de cadeira no plano
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditFormData({ ...editFormData, status: "active" })
                      }
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        editFormData.status === "active"
                          ? "bg-emerald-600 text-white border-emerald-500 shadow-md scale-[1.02]"
                          : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
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
                          ? "bg-amber-600 text-white border-amber-500 shadow-md scale-[1.02]"
                          : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
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
                          ? "bg-red-600 text-white border-red-500 shadow-md scale-[1.02]"
                          : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-red-300"
                      }`}
                    >
                      Inativo (Desligado)
                    </button>
                  </div>
                </div>

                {/* Campos Editáveis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Nome de Exibição (Apelido na Cadeira)"
                    value={editFormData.displayName}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        displayName: e.target.value,
                      })
                    }
                  />
                  <Input
                    label="WhatsApp do Barbeiro"
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
                    label="Chave PIX (Para repasse de comissões)"
                    value={editFormData.pixKey}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        pixKey: e.target.value,
                      })
                    }
                  />
                  <Select
                    label="Cargo / Nível"
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
                      {
                        value: "Barbeiro Júnior / Aprendiz",
                        label: "Barbeiro Júnior",
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

                {/* Especialidades com TagInput */}
                <TagInput
                  label="Especialidades de Atendimento"
                  tags={editFormData.specialties || []}
                  onChange={(newTags) =>
                    setEditFormData({ ...editFormData, specialties: newTags })
                  }
                  placeholder="Adicionar especialidade + TAB"
                />

                {/* Observações Internas */}
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-neutral-300">
                    Observações Internas (Privado do Dono)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Anotações sobre contrato, folgas ou histórico do profissional..."
                    value={editFormData.notes || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        notes: e.target.value,
                      })
                    }
                    className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: CONFIGURAR ESCALA & ALMOÇO DO BARBEIRO         */}
      {/* ======================================================== */}
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
          <Alert variant="info" title="Configuração Individual de Turnos">
            Os horários definidos aqui serão respeitados na linha do tempo da{" "}
            <strong>Agenda</strong>. Durante o intervalo de almoço, o sistema
            bloqueará agendamentos automaticamente para este profissional.
          </Alert>

          <WorkShiftSelector
            schedule={tempSchedule}
            onChange={setTempSchedule}
          />
        </div>
      </Modal>
    </div>
  );
}
