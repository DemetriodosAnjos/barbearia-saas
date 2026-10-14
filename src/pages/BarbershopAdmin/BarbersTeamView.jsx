import { useState, useMemo } from "react";
import DOMPurify from "dompurify";
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
import { SafeHtml } from "../../components/ui/SafeHtml";
import WorkShiftSelector from "../../components/services/WorkShiftSelector";
import { validateSchema, SCHEMAS, ALLOWED_BARBER_ROLES } from "../../utils/inputValidator";
import { masks } from "../../utils/masks";
import PlanLimitModal, {
  getPlanMaxBarbers,
  resolveTenantPlanKey,
} from "../../components/team/PlanLimitModal";
import {
  Scissors,
  Armchair,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  FileText,
  Check,
  Star,
  Clock,
  User,
  AlertTriangle,
  Edit3,
  Key,
  Plus,
  Search,
  ArrowUpAZ,
  ArrowDownZA,
  ChevronDown,
  Copy,
  CheckSquare,
} from "lucide-react";

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

const generateUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const isValidUUID = (str) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || "");

export default function BarbersTeamView({
  barbers = [], // Recebe via props
  onUpdateBarbers, // Atualiza o estado global
  maxPlanChairs,
  onBack,
  tenant,
  onOpenPlansModal,
  onNavigateToSupport,
}) {
  // ========================================================
  // REGRAS E LIMITES DE PLANOS (TRIAL, STARTER, PRO, ENTERPRISE)
  // ========================================================
  const currentPlanKey = resolveTenantPlanKey(tenant);
  const planMaxBarbers = getPlanMaxBarbers(tenant);
  const totalChairs = maxPlanChairs || planMaxBarbers;

  // Estado do Modal de Bloqueio por Limite do Plano
  const [isPlanLimitModalOpen, setIsPlanLimitModalOpen] = useState(false);

  // ========================================================
  // ESTADOS DO MODAL "+ NOVO BARBEIRO" (COM 2 ABAS)
  // ========================================================
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
    pixType: "cpf",
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

  // ========================================================
  // ESTADOS DO REDESIGN (BUSCA, ORDENAÇÃO, SELEÇÃO E PIX)
  // ========================================================
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("asc"); // 'asc' | 'desc'
  const [selectedBarberIds, setSelectedBarberIds] = useState([]);
  const [copiedPixBarberId, setCopiedPixBarberId] = useState(null);
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState(null);

  // Helper para gerar iniciais do profissional (ex: Carlos Eduardo -> CE)
  const getInitials = (name = "") => {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "BP";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Helper de label amigável para tipo de chave Pix
  const getPixTypeLabel = (type) => {
    switch (type) {
      case "cpf":
        return "CPF";
      case "email":
        return "E-mail";
      case "phone":
        return "Telefone";
      case "random":
        return "Aleatória";
      default:
        return "PIX";
    }
  };

  // Filtro em tempo real por caractere digitado e ordenação Crescente / Decrescente
  const filteredAndSortedBarbers = useMemo(() => {
    let result = [...barbers];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter((b) => {
        const name = (b.name || "").toLowerCase();
        const disp = (b.displayName || b.display_name || "").toLowerCase();
        const role = (b.role || "").toLowerCase();
        const phone = (b.phone || "").replace(/\D/g, "");
        const searchDigits = term.replace(/\D/g, "");

        if (name.includes(term) || disp.includes(term) || role.includes(term)) {
          return true;
        }

        // Checa por iniciais (ex: digitou "c" ou "ce", encontra Carlos Eduardo)
        const initials = getInitials(b.name).toLowerCase();
        if (initials.includes(term) || initials.startsWith(term)) {
          return true;
        }

        const words = name.split(/\s+/);
        if (words.some((w) => w.startsWith(term))) {
          return true;
        }

        if (searchDigits && phone.includes(searchDigits)) {
          return true;
        }

        return false;
      });
    }

    result.sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      if (sortOrder === "asc") {
        return nameA.localeCompare(nameB, "pt-BR");
      } else {
        return nameB.localeCompare(nameA, "pt-BR");
      }
    });

    return result;
  }, [barbers, searchTerm, sortOrder]);

  // Controle de seleção em massa (Checkbox do Header e itens)
  const isAllSelected =
    filteredAndSortedBarbers.length > 0 &&
    filteredAndSortedBarbers.every((b) => selectedBarberIds.includes(b.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedBarberIds([]);
    } else {
      setSelectedBarberIds(filteredAndSortedBarbers.map((b) => b.id));
    }
  };

  const handleToggleSelectBarber = (barberId) => {
    setSelectedBarberIds((prev) =>
      prev.includes(barberId)
        ? prev.filter((id) => id !== barberId)
        : [...prev, barberId]
    );
  };

  // Alteração ágil de status com Chevron Down
  const handleQuickStatusChange = async (barberId, newStatus) => {
    setOpenStatusDropdownId(null);
    try {
      const { error } = await supabase
        .from("barbers")
        .update({ status: newStatus })
        .eq("id", barberId);

      if (error) {
        console.error("Erro ao atualizar status no Supabase:", error);
      }

      const updated = barbers.map((b) =>
        b.id === barberId ? { ...b, status: newStatus } : b
      );
      if (onUpdateBarbers) {
        onUpdateBarbers(updated);
      }
    } catch (err) {
      console.error("Falha ao trocar status:", err);
    }
  };

  // Alteração de status em massa para itens selecionados
  const handleBulkChangeStatus = async (newStatus) => {
    if (selectedBarberIds.length === 0) return;
    try {
      const { error } = await supabase
        .from("barbers")
        .update({ status: newStatus })
        .in("id", selectedBarberIds);

      if (error) {
        console.error("Erro ao atualizar status em massa:", error);
      }

      const updated = barbers.map((b) =>
        selectedBarberIds.includes(b.id) ? { ...b, status: newStatus } : b
      );
      if (onUpdateBarbers) {
        onUpdateBarbers(updated);
      }
      setSelectedBarberIds([]);
    } catch (err) {
      console.error("Falha ao atualizar status em massa:", err);
    }
  };

  // Cópia da Chave Pix com feedback visual
  const handleCopyPixKey = (barber) => {
    const key = barber.pixKey || barber.pix_key;
    if (!key) return;
    try {
      navigator.clipboard.writeText(key);
      setCopiedPixBarberId(barber.id);
      setTimeout(() => {
        setCopiedPixBarberId((curr) => (curr === barber.id ? null : curr));
      }, 2000);
    } catch (err) {
      console.error("Erro ao copiar Pix:", err);
    }
  };

  // Abertura direta do modal de edição de dados
  const handleOpenEditBarber = (barber) => {
    setSelectedBarberForDetails(barber);
    setIsEditMode(true);
    setEditFormData({
      ...barber,
      pixType: barber.pix_type || barber.pixType || "cpf",
      pixKey: barber.pix_key || barber.pixKey || "",
    });
  };

  // Abrir Modal de Cadastro Zerado (com validação estrita de limite por plano)
  const handleOpenNewBarberModal = () => {
    // Se a barbearia atingiu ou ultrapassou o limite de profissionais do plano, exibe o Modal de Limite do Plano
    if (barbers.length >= planMaxBarbers) {
      setIsPlanLimitModalOpen(true);
      return;
    }

    setNewBarberActiveTab("dados");
    setNewBarberForm({
      name: "",
      displayName: "",
      email: "",
      phone: "",
      role: "Barbeiro Profissional",
      serviceCommission: "50",
      productCommission: "10",
      pixType: "cpf",
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
    // Validação estrita de limite de plano contra concorrência ou tentativa de bypass
    if (barbers.length >= planMaxBarbers) {
      setIsNewBarberModalOpen(false);
      setIsPlanLimitModalOpen(true);
      return;
    }

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

    // Mapeamento e validação estrita da role para evitar escalada de privilégios (ex: role: 'admin')
    const normalizedRole = (newBarberForm.role || "").toLowerCase().includes("assistente")
      ? "assistant"
      : (newBarberForm.role || "").toLowerCase().includes("recep")
      ? "receptionist"
      : "barber";

    // Validação estrita de schema de membro da equipe
    const memberValidation = validateSchema(
      {
        name: DOMPurify.sanitize(newBarberForm.name.trim(), { ALLOWED_TAGS: [] }),
        display_name: DOMPurify.sanitize(newBarberForm.displayName.trim(), { ALLOWED_TAGS: [] }),
        role: normalizedRole,
        specialties: (newBarberForm.specialties || []).map((s) => DOMPurify.sanitize(s, { ALLOWED_TAGS: [] })),
      },
      SCHEMAS.barberMember,
      { rejectUnknown: true }
    );

    if (!memberValidation.isValid) {
      setNewBarberErrors({ form: memberValidation.errors[0] });
      setIsSavingBarber(false);
      return;
    }

    // [Payload sanitizado com tipos e limites validados]
    const dbPayload = {
      name: memberValidation.sanitized.name,
      display_name: memberValidation.sanitized.display_name,
      role: memberValidation.sanitized.role, // Estritamente 'barber', 'assistant' ou 'receptionist'
      email: newBarberForm.email?.trim() ? DOMPurify.sanitize(newBarberForm.email.trim(), { ALLOWED_TAGS: [] }) : null,
      phone: DOMPurify.sanitize(newBarberForm.phone.trim(), { ALLOWED_TAGS: [] }),
      pix_type: newBarberForm.pixType || "cpf",
      pix_key: newBarberForm.pixKey?.trim() ? DOMPurify.sanitize(newBarberForm.pixKey.trim(), { ALLOWED_TAGS: [] }) : null,
      service_commission: Math.min(100, Math.max(0, Number(newBarberForm.serviceCommission || 50))),
      product_commission: Math.min(100, Math.max(0, Number(newBarberForm.productCommission || 10))),
      notes: DOMPurify.sanitize((newBarberForm.notes?.trim() || "").slice(0, 500), { ALLOWED_TAGS: ["b", "i", "strong", "em"] }),
      status: "active",
      rating: 5.0,
      review_count: 0,
      specialties: memberValidation.sanitized.specialties,
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
        pixType: data.pix_type || newBarberForm.pixType || "cpf",
        pixKey: data.pix_key || "",
      };

      const updatedTeam = [...barbers, created];

      if (onUpdateBarbers) {
        onUpdateBarbers(updatedTeam);
      }

      setIsNewBarberModalOpen(false);
    } catch (err) {
      console.error("Erro ao cadastrar barbeiro no Supabase:", err);
      setNewBarberErrors({
        form: "Não foi possível salvar o barbeiro no banco de dados. Verifique a conexão.",
      });
    } finally {
      setIsSavingBarber(false);
    }
  };

  // Detalhes & Edição
  const handleOpenDetails = (barber) => {
    setSelectedBarberForDetails(barber);
    setIsEditMode(false);
    setEditFormData({
      ...barber,
      pixType: barber.pix_type || barber.pixType || "cpf",
      pixKey: barber.pix_key || barber.pixKey || "",
    });
  };

  // [Função assíncrona: atualiza os dados do profissional na tabela 'barbers' do Supabase]
  const handleSaveEditBarber = async () => {
    if (!editFormData?.id) return;
    setIsSavingBarber(true);

    const updatePayload = {
      display_name: DOMPurify.sanitize((editFormData.displayName || editFormData.name || "").trim(), { ALLOWED_TAGS: [] }),
      phone: DOMPurify.sanitize((editFormData.phone || "").trim(), { ALLOWED_TAGS: [] }),
      pix_type: editFormData.pixType || "cpf",
      pix_key: editFormData.pixKey ? DOMPurify.sanitize(editFormData.pixKey.trim(), { ALLOWED_TAGS: [] }) : null,
      role: editFormData.role,
      service_commission: Number(editFormData.serviceCommission || 50),
      product_commission: Number(editFormData.productCommission || 10),
      status: editFormData.status || "active",
      specialties: (editFormData.specialties || []).map((s) => DOMPurify.sanitize(s, { ALLOWED_TAGS: [] })),
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
      {/* ======================================================== */}
      {/* COMPONENTE 1: HEADER (TOPO)                               */}
      {/* ======================================================== */}
      <div className={teamStyles.headerCard}>
        <div className={teamStyles.titleWrapper}>
          <h1 className={teamStyles.title}>
            <Scissors className="w-5 h-5 text-amber-500 inline-block mr-2" />
            <span>Equipe de Barbeiros & Profissionais</span>
          </h1>
          <p className={teamStyles.subtitle}>
            Cadastre os membros da equipe, comissões individuais, especialidades
            e escalas semanais de trabalho.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className={teamStyles.capacityBadge}>
            <Armchair className="w-3.5 h-3.5 text-amber-500 inline-block mr-1.5" />
            <span>
              {activeChairsCount} de {totalChairs} {totalChairs === 1 ? "Cadeira ocupada" : "Cadeiras ocupadas"}
            </span>
          </div>

          {/* Botão Novo com ícone Plus da biblioteca Lucide */}
          <Button
            variant="primary"
            onClick={handleOpenNewBarberModal}
            className="text-xs py-2.5 px-4 font-bold shadow-md bg-amber-600 hover:bg-amber-500 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Barbeiro</span>
          </Button>

          {onBack && (
            <Button
              variant="secondary"
              onClick={onBack}
              className="text-xs py-2 px-3 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* COMPONENTE 2: BARRA DE PESQUISA & ORDENAÇÃO (NOVO)        */}
      {/* ======================================================== */}
      <div className={teamStyles.filterBar}>
        {/* Barra de pesquisa (ícone search - Biblioteca Lucide) */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar profissional por nome ou inicial..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/50 transition-all font-sans"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 p-1 text-xs cursor-pointer"
              title="Limpar pesquisa"
            >
              ✕
            </button>
          )}
        </div>

        {/* Texto: Ordenar por: Radio button (icone) Crescente / Radio button (icone) Decrescente */}
        <div className="flex items-center gap-3 shrink-0 text-xs flex-wrap">
          <span className="text-neutral-400 font-semibold whitespace-nowrap">
            Ordenar por:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSortOrder("asc")}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                sortOrder === "asc"
                  ? "bg-amber-500/10 border-amber-500/50 text-amber-300 shadow-sm"
                  : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700"
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  sortOrder === "asc" ? "border-amber-400" : "border-neutral-600"
                }`}
              >
                {sortOrder === "asc" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                )}
              </span>
              <ArrowUpAZ className="w-3.5 h-3.5 text-amber-400" />
              <span>Crescente</span>
            </button>

            <button
              type="button"
              onClick={() => setSortOrder("desc")}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                sortOrder === "desc"
                  ? "bg-amber-500/10 border-amber-500/50 text-amber-300 shadow-sm"
                  : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700"
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                  sortOrder === "desc" ? "border-amber-400" : "border-neutral-600"
                }`}
              >
                {sortOrder === "desc" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                )}
              </span>
              <ArrowDownZA className="w-3.5 h-3.5 text-amber-400" />
              <span>Decrescente</span>
            </button>
          </div>
        </div>
      </div>

      {/* BARRA DE AÇÕES EM MASSA (quando houver seleção via checkbox) */}
      {selectedBarberIds.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between flex-wrap gap-3 text-xs text-amber-300 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold">
            <CheckSquare className="w-4 h-4 text-amber-400" />
            <span>{selectedBarberIds.length} profissional(is) selecionado(s)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkChangeStatus("active")}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-semibold transition-colors cursor-pointer"
            >
              Marcar como Ativos
            </button>
            <button
              type="button"
              onClick={() => handleBulkChangeStatus("inactive")}
              className="px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 font-semibold transition-colors cursor-pointer"
            >
              Marcar como Inativos
            </button>
            <button
              type="button"
              onClick={() => setSelectedBarberIds([])}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors cursor-pointer"
            >
              Desmarcar todos
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* COMPONENTE 3: BARRA DE TÍTULO (HEADER INLINE)             */}
      {/* Checkbox + Profissional + Telefone + Status + Chave Pix + Ação */}
      {/* ======================================================== */}
      <div className={teamStyles.tableHeader}>
        {/* Checkbox + Profissional */}
        <div className="col-span-4 flex items-center gap-3">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={handleToggleSelectAll}
            className="w-4 h-4 rounded bg-neutral-950 border-neutral-700 text-amber-500 focus:ring-amber-500/40 cursor-pointer accent-amber-500"
            title="Selecionar todos da lista"
          />
          <span className="text-neutral-300">Profissional</span>
        </div>

        {/* Telefone */}
        <div className="col-span-2 text-left">
          <span>Telefone</span>
        </div>

        {/* Status */}
        <div className="col-span-2 text-left">
          <span>Status</span>
        </div>

        {/* Chave Pix */}
        <div className="col-span-2 text-left">
          <span>Chave Pix</span>
        </div>

        {/* Ação */}
        <div className="col-span-2 text-right pr-2">
          <span>Ação</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* COMPONENTE 4: LISTA DE PROFISSIONAIS (INLINE)            */}
      {/* Checkbox + Avatar + Nome + Telefone + Status + Pix + Ações */}
      {/* ======================================================== */}
      <div className={teamStyles.tableList}>
        {filteredAndSortedBarbers.length === 0 ? (
          <div className="p-8 bg-neutral-900 border border-neutral-800 rounded-2xl text-center space-y-2">
            <User className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-sm font-semibold text-neutral-300">
              Nenhum profissional encontrado
            </p>
            <p className="text-xs text-neutral-500">
              {searchTerm
                ? `Nenhum resultado corresponde a "${searchTerm}". Tente outro termo.`
                : "Cadastre o primeiro membro da sua equipe clicando em Novo Barbeiro."}
            </p>
          </div>
        ) : (
          filteredAndSortedBarbers.map((barber) => {
            const isInactive = barber.status === "inactive";
            const isVacation = barber.status === "vacation";
            const isSelected = selectedBarberIds.includes(barber.id);
            const initials = getInitials(barber.name);
            const pixKeyVal = barber.pixKey || barber.pix_key;
            const pixType = barber.pixType || barber.pix_type || "cpf";
            const isCopied = copiedPixBarberId === barber.id;
            const isDropdownOpen = openStatusDropdownId === barber.id;

            return (
              <div
                key={barber.id}
                className={`${teamStyles.tableRow} ${
                  isSelected ? "bg-amber-500/5 border-amber-500/40" : ""
                } ${isInactive ? "opacity-60" : ""}`}
              >
                {/* 1. CHECKBOX + AVATAR (CE) CARLOS EDUARDO */}
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelectBarber(barber.id)}
                    className="w-4 h-4 rounded bg-neutral-950 border-neutral-700 text-amber-500 focus:ring-amber-500/40 cursor-pointer accent-amber-500 shrink-0"
                    title={`Selecionar ${barber.name}`}
                  />

                  {/* Avatar com foto ou iniciais em destaque estilizado */}
                  <div className="relative shrink-0">
                    {barber.avatar ? (
                      <img
                        src={barber.avatar}
                        alt={barber.name}
                        className="w-10 h-10 rounded-full object-cover border border-neutral-700 shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black text-xs flex items-center justify-center shadow-inner">
                        {initials}
                      </div>
                    )}
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-neutral-900 ${
                        isInactive
                          ? "bg-red-500"
                          : isVacation
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                    />
                  </div>

                  {/* Nome e Cargo / Especialidade */}
                  <div className="min-w-0 truncate">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-white text-sm truncate">
                        <SafeHtml html={barber.name} />
                      </span>
                      {barber.notes && (
                        <FileText
                          className="w-3 h-3 text-amber-400 shrink-0"
                          title="Possui observações internas"
                        />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate">
                      <SafeHtml
                        html={
                          barber.displayName
                            ? `"${barber.displayName}" • ${barber.role}`
                            : barber.role
                        }
                      />
                    </p>
                  </div>
                </div>

                {/* 2. TELEFONE */}
                <div className="col-span-2 text-left font-mono text-xs text-neutral-300 truncate">
                  {barber.phone || "Não informado"}
                </div>

                {/* 3. STATUS + CHEVRON DOWN */}
                <div className="col-span-2 text-left relative">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenStatusDropdownId(isDropdownOpen ? null : barber.id)
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                      isInactive
                        ? "bg-red-950/40 text-red-400 border-red-800/60 hover:bg-red-950/60"
                        : isVacation
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                    }`}
                    title="Clique para alterar status"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isInactive
                          ? "bg-red-400"
                          : isVacation
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                    />
                    <span>
                      {isInactive
                        ? "Inativo"
                        : isVacation
                        ? "Férias"
                        : "Ativo"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                  </button>

                  {/* Dropdown rápido de troca de status */}
                  {isDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setOpenStatusDropdownId(null)}
                      />
                      <div className="absolute left-0 top-full mt-1.5 z-30 w-36 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl p-1 text-xs space-y-0.5 animate-in fade-in">
                        <button
                          type="button"
                          onClick={() => handleQuickStatusChange(barber.id, "active")}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-neutral-900 text-emerald-400 font-semibold cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Ativo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickStatusChange(barber.id, "vacation")}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-neutral-900 text-amber-400 font-semibold cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>Férias / Folga</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickStatusChange(barber.id, "inactive")}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-neutral-900 text-red-400 font-semibold cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                          <span>Inativo</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* 4. CHAVE PIX + ÍCONE COPIAR */}
                <div className="col-span-2 text-left">
                  {pixKeyVal ? (
                    <div className="flex items-center gap-1.5 max-w-full">
                      <div className="truncate min-w-0" title={`${getPixTypeLabel(pixType)}: ${pixKeyVal}`}>
                        <span className="text-[10px] uppercase font-bold text-neutral-500 mr-1">
                          {getPixTypeLabel(pixType)}
                        </span>
                        <span className="font-mono text-emerald-400 font-medium text-[11px] truncate inline-block max-w-[100px]">
                          {pixKeyVal}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyPixKey(barber)}
                        className={`p-1 rounded-md transition-colors cursor-pointer shrink-0 ${
                          isCopied
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "text-neutral-400 hover:text-amber-400 hover:bg-neutral-800"
                        }`}
                        title={isCopied ? "Copiado!" : "Copiar Chave Pix"}
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-neutral-500 text-[11px]">
                      <span>Não cadastrado</span>
                      <Copy className="w-3.5 h-3.5 text-neutral-600 opacity-60 cursor-not-allowed" />
                    </div>
                  )}
                </div>

                {/* 5. AÇÕES (EDITAR + FICHA DO PROFISSIONAL + ESCALA) */}
                <div className="col-span-2 flex items-center justify-end gap-1.5 pr-1">
                  {/* Ícone Editar: carrega a tela de editar dados */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditBarber(barber)}
                    className="p-2 rounded-xl text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 border border-transparent hover:border-neutral-700 transition-all cursor-pointer"
                    title="Editar Dados do Profissional"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Ícone Ficha do Profissional: carrega detalhes */}
                  <button
                    type="button"
                    onClick={() => handleOpenDetails(barber)}
                    className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 border border-transparent hover:border-neutral-700 transition-all cursor-pointer"
                    title="Ficha do Profissional"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  {/* Atalho Escala Semanal */}
                  <button
                    type="button"
                    onClick={() => {
                      setBarberForScheduleEdit(barber);
                      setTempSchedule(barber.schedule || defaultWeeklySchedule);
                    }}
                    className="p-2 rounded-xl text-neutral-400 hover:text-amber-300 hover:bg-neutral-800 border border-transparent hover:border-neutral-700 transition-all cursor-pointer"
                    title="Escala e Horários de Trabalho"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: CADASTRAR NOVO BARBEIRO (COM 2 ABAS!)          */}
      {/* ======================================================== */}
      <Modal
        isOpen={isNewBarberModalOpen}
        size="xl" // Espaçoso para caber a escala confortavelmente!
        onClose={() => setIsNewBarberModalOpen(false)}
        title="Cadastrar Novo Barbeiro na Equipe"
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
                  <span className="flex items-center gap-1.5">
                    <span>Avançar para Escala de Horários</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => setNewBarberActiveTab("dados")}
                >
                  <span className="flex items-center gap-1.5">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar para Dados</span>
                  </span>
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
              <User className="w-4 h-4 text-inherit" />
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
              <Clock className="w-4 h-4 text-inherit" />
              <span>Aba 2: Escala de Horários & Almoço</span>
            </button>
          </div>

          {/* ==================================================== */}
          {/* ABA 1: DADOS DO PROFISSIONAL & COMISSÕES            */}
          {/* ==================================================== */}
          {newBarberActiveTab === "dados" && (
            <div className="space-y-4 pt-1">
              {newBarberErrors.form && (
                <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{newBarberErrors.form}</span>
                </div>
              )}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:col-span-2">
                  <Select
                    label="Tipo de Chave PIX"
                    value={newBarberForm.pixType || "cpf"}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setNewBarberForm((prev) => ({
                        ...prev,
                        pixType: newType,
                        pixKey: "",
                      }));
                    }}
                    options={[
                      { value: "cpf", label: "CPF" },
                      { value: "phone", label: "Celular / WhatsApp" },
                      { value: "email", label: "E-mail" },
                      { value: "random", label: "Chave Aleatória (EVP)" },
                    ]}
                  />

                  <Input
                    label="Chave PIX (Para repasse de comissões)"
                    placeholder={
                      newBarberForm.pixType === "cpf"
                        ? "000.000.000-00"
                        : newBarberForm.pixType === "phone"
                        ? "(00) 00000-0000"
                        : newBarberForm.pixType === "email"
                        ? "barbeiro@exemplo.com"
                        : "Cole sua chave aleatória gerada no banco"
                    }
                    value={newBarberForm.pixKey}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (newBarberForm.pixType === "cpf") {
                        val = masks.cpf(val);
                      } else if (newBarberForm.pixType === "phone") {
                        val = masks.phone(val);
                      } else if (newBarberForm.pixType === "email") {
                        val = val.trim().toLowerCase();
                      }
                      setNewBarberForm((prev) => ({
                        ...prev,
                        pixKey: val,
                      }));
                    }}
                  />
                </div>
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
              <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs text-neutral-400 leading-relaxed flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  Defina os dias de trabalho, expediente e horário de almoço
                  individual para este barbeiro. O sistema bloqueará agendamentos
                  automaticamente no intervalo de almoço.
                </span>
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
            ? `Editando Dados: ${selectedBarberForDetails?.name}`
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
                <span className="flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar Dados</span>
                </span>
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
                      ? "Ativo (Trabalhando Normalmente)"
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
                      Chave PIX (Repasse):
                    </span>
                    <span className="text-emerald-400 font-mono font-bold text-xs flex items-center gap-1.5 flex-wrap mt-0.5">
                      {selectedBarberForDetails.pixKey || selectedBarberForDetails.pix_key ? (
                        <>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold uppercase">
                            {selectedBarberForDetails.pixType || selectedBarberForDetails.pix_type || "PIX"}
                          </span>
                          <span>{selectedBarberForDetails.pixKey || selectedBarberForDetails.pix_key}</span>
                        </>
                      ) : (
                        <span className="text-neutral-500 italic font-normal text-xs">Não cadastrada</span>
                      )}
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
                    <span className="text-amber-400 font-bold flex items-center gap-1.5 text-[10px] uppercase">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>Observações Internas:</span>
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
                      <span className="flex items-center justify-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Ativo</span>
                      </span>
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
                  <Select
                    label="Tipo de Chave PIX"
                    value={editFormData.pixType || "cpf"}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setEditFormData((prev) => ({
                        ...prev,
                        pixType: newType,
                        pixKey: "",
                      }));
                    }}
                    options={[
                      { value: "cpf", label: "CPF" },
                      { value: "phone", label: "Celular / WhatsApp" },
                      { value: "email", label: "E-mail" },
                      { value: "random", label: "Chave Aleatória (EVP)" },
                    ]}
                  />

                  <Input
                    label="Chave PIX (Para repasse de comissões)"
                    placeholder={
                      editFormData.pixType === "cpf"
                        ? "000.000.000-00"
                        : editFormData.pixType === "phone"
                        ? "(00) 00000-0000"
                        : editFormData.pixType === "email"
                        ? "barbeiro@exemplo.com"
                        : "Cole a chave aleatória fornecida"
                    }
                    value={editFormData.pixKey || ""}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (editFormData.pixType === "cpf") {
                        val = masks.cpf(val);
                      } else if (editFormData.pixType === "phone") {
                        val = masks.phone(val);
                      } else if (editFormData.pixType === "email") {
                        val = val.trim().toLowerCase();
                      }
                      setEditFormData((prev) => ({
                        ...prev,
                        pixKey: val,
                      }));
                    }}
                  />
                </div>
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
        title={`Escala & Horário de Almoço: ${barberForScheduleEdit?.name}`}
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

      {/* MODAL DE BLOQUEIO DE LIMITE POR PLANO (TRIAL, STARTER, PRO, ENTERPRISE) */}
      <PlanLimitModal
        isOpen={isPlanLimitModalOpen}
        onClose={() => setIsPlanLimitModalOpen(false)}
        tenant={tenant}
        onOpenPlansModal={onOpenPlansModal}
        onNavigateToSupport={onNavigateToSupport}
      />
    </div>
  );
}
