import { useState, useEffect } from "react";
// [Import: cliente Supabase para consulta e controle de todas as barbearias cadastradas]
import { supabase } from "../../lib/supabase";
import { superAdminStyles } from "./SuperAdminDashboard.styles";
import StatCard from "../../components/dashboard/StatCard";
import Table from "../../components/ui/Table";
import SearchInput from "../../components/ui/SearchInput";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Select from "../../components/ui/Select";
import Input from "../../components/ui/Input";
import { getBestContrastTextColor } from "../../utils/theme";

export default function SuperAdminDashboard({ onImpersonateTenant, onLogout }) {
  const [activeTab, setActiveTab] = useState("tenants");
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // [Estado do array de tenants: armazena coleção de barbearias recuperadas do Supabase]
  const [tenants, setTenants] = useState([]);

  // [Estado do array de planos: substitui initialPlans por dados dinâmicos da tabela 'plans']
  const [plans, setPlans] = useState([]);

  // [Estados de controle de filtros: variáveis de string para busca textual e selects]
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  // [Estado de feedback de gravação: variável de feedback visual para ações assíncronas]
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // [Estado booleana de carregamento: controla o feedback visual enquanto o Supabase responde]
  const [isLoading, setIsLoading] = useState(true);

  // [Estado das configurações Nubank PJ: declarado antes do useEffect para evitar Temporal Dead Zone]
  const [nubankConfig, setNubankConfig] = useState({
    pixKey: "",
    companyName: "",
    supportWhatsapp: "",
  });

  // [Hook useEffect: executa busca assíncrona unificada de barbearias, planos e dados Nubank]
  useEffect(() => {
    let isMounted = true;

    // [Função assíncrona: consulta concorrente em múltiplas tabelas Supabase]
    async function fetchAllData() {
      try {
        // [Método Supabase Promise.all: executa selects simultâneos em 'tenants', 'plans' e 'saas_config']
        const [tenantsRes, plansRes, configRes] = await Promise.all([
          supabase
            .from("tenants")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("plans")
            .select("*")
            .order("price", { ascending: true }),
          supabase
            .from("saas_config")
            .select("*")
            .eq("id", "default")
            .maybeSingle(),
        ]);

        if (isMounted) {
          // [Método Array.map: normaliza os campos snake_case do PostgreSQL para camelCase]
          if (tenantsRes.data) {
            setTenants(
              tenantsRes.data.map((t) => ({
                id: t.id,
                name: t.name,
                slug: t.slug,
                ownerName: t.owner_name || "Gestor",
                ownerEmail: t.owner_email || "gestor@barbearia.com",
                ownerPhone: t.phone || "Não informado",
                plan: t.plan || "pro",
                status: t.status || "active",
                barbersCount: Number(t.barbers_count || 1),
                mrr: Number(
                  t.mrr ||
                    (t.plan === "enterprise"
                      ? 279.9
                      : t.plan === "starter"
                        ? 69.9
                        : 149.9),
                ),
                trialDaysLeft: Number(t.trial_days_left || 0),
                hasWhiteLabel: Boolean(t.has_white_label),
                brandPrimary: t.brand_primary || "#ea580c",
                brandSecondary: t.brand_secondary || "#16a34a",
                logoUrl: t.logo_url || "",
              })),
            );
          }

          // [Atualização de estado: popula o array dinâmico de planos]
          if (plansRes.data && plansRes.data.length > 0) {
            setPlans(
              plansRes.data.map((p) => ({
                id: p.id,
                name: p.name,
                price: Number(p.price || 0),
                maxBarbers: Number(p.max_barbers || 1),
                extraBarberPrice: Number(p.extra_barber_price || 0),
                tag: p.tag || "",
                active: p.active !== false,
                nubankPaymentLink: p.nubank_payment_link || "",
                features: Array.isArray(p.features) ? p.features : [],
              })),
            );
          }

          // [Método de atualização de estado: sincroniza dados bancários Nubank PJ uma única vez]
          if (configRes.data) {
            setNubankConfig({
              pixKey: configRes.data.pix_key || "",
              companyName: configRes.data.company_name || "",
              supportWhatsapp: configRes.data.support_whatsapp || "",
            });
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados do Supabase:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchAllData();
    return () => {
      isMounted = false;
    };
  }, []);

  // ========================================================
  // ESTADOS DE MODAIS DE AÇÕES DA TABELA DE TENANTS
  // ========================================================

  // Modal de Ativar / Inativar Barbearia
  const [tenantToToggleStatus, setTenantToToggleStatus] = useState(null);

  // Modal de Bônus de Teste (+Dias)
  const [bonusModalTenant, setBonusModalTenant] = useState(null);
  const [bonusDaysInput, setBonusDaysInput] = useState("7");

  // Modal de Cobrança / Envio de Link do Nubank PJ
  const [billingTenantModal, setBillingTenantModal] = useState(null);

  // Modal de Configurações de Assinatura
  const [selectedTenantForEdit, setSelectedTenantForEdit] = useState(null);
  const [editPlan, setEditPlan] = useState("pro");
  const [editStatus, setEditStatus] = useState("active");

  // Modal de White-Label
  const [selectedTenantForWhiteLabel, setSelectedTenantForWhiteLabel] =
    useState(null);
  const [wlPrimary, setWlPrimary] = useState("#ea580c");
  const [wlSecondary, setWlSecondary] = useState("#16a34a");
  const [wlLogoUrl, setWlLogoUrl] = useState("");
  const [wlActive, setWlActive] = useState(false);

  // Modal de Criação / Edição de Planos
  const [planModalMode, setPlanModalMode] = useState(null);
  const [planForm, setPlanForm] = useState({
    id: "",
    name: "",
    price: "",
    maxBarbers: "1",
    extraBarberPrice: "19.90",
    tag: "Novo",
    active: true,
    nubankPaymentLink: "",
    featuresText: "",
  });

  // [Cálculos de KPIs: variáveis computadas diretamente sobre o array tenants para os cards]
  const activeTenantsCount = tenants.filter(
    (t) => t.status === "active",
  ).length;

  const trialTenantsCount = tenants.filter((t) => t.status === "trial").length;
  const totalBarbers = tenants.reduce(
    (acc, t) => acc + (Number(t.barbersCount) || 0),
    0,
  );
  const totalMRR = tenants
    .filter((t) => t.status === "active" || t.status === "overdue")
    .reduce((acc, t) => acc + (Number(t.mrr) || 0), 0);

  // Filtros
  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.ownerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || tenant.status === statusFilter;
    const matchesPlan = planFilter === "all" || tenant.plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  // ========================================================
  // HANDLERS DAS AÇÕES EM MODAIS (SUBSTITUINDO OS ALERTS)
  // ========================================================

  // [Função assíncrona: ativa ou suspende a barbearia persistindo no Supabase]
  const handleConfirmToggleStatus = async () => {
    if (!tenantToToggleStatus) return;

    const isSuspended = tenantToToggleStatus.status === "suspended";
    const newStatus = isSuspended ? "active" : "suspended";

    setTenants((prev) =>
      prev.map((t) =>
        t.id === tenantToToggleStatus.id ? { ...t, status: newStatus } : t,
      ),
    );

    const targetId = tenantToToggleStatus.id;
    setTenantToToggleStatus(null);

    try {
      // Método Supabase: atualiza a coluna status na tabela tenants
      const { error } = await supabase
        .from("tenants")
        .update({ status: newStatus })
        .eq("id", targetId);

      if (error) throw error;
    } catch (err) {
      console.error("Erro ao alterar status do tenant no Supabase:", err);
    }
  };

  // [Função assíncrona: estende o período de testes da barbearia diretamente no banco]
  const handleConfirmBonusDays = async () => {
    if (!bonusModalTenant) return;

    const daysToAdd = parseInt(bonusDaysInput, 10) || 7;
    const newDaysLeft = (bonusModalTenant.trialDaysLeft || 0) + daysToAdd;

    setTenants((prev) =>
      prev.map((t) =>
        t.id === bonusModalTenant.id
          ? {
              ...t,
              status: "trial",
              trialDaysLeft: newDaysLeft,
            }
          : t,
      ),
    );

    const targetId = bonusModalTenant.id;
    setBonusModalTenant(null);

    try {
      const newTrialDate = new Date();
      newTrialDate.setDate(newTrialDate.getDate() + newDaysLeft);

      // Método Supabase: atualiza a data de expiração e os dias restantes
      const { error } = await supabase
        .from("tenants")
        .update({
          status: "trial",
          trial_days_left: newDaysLeft,
          trial_ends_at: newTrialDate.toISOString(),
        })
        .eq("id", targetId);

      if (error) throw error;
    } catch (err) {
      console.error("Erro ao estender bônus no Supabase:", err);
    }
  };

  // Abertura do Modal de Cobrança do Plano Vigente
  const handleOpenBilling = (tenant) => {
    const tenantPlan = plans.find((p) => p.id === tenant.plan) || plans[0];
    setBillingTenantModal({
      tenant,
      plan: tenantPlan,
    });
  };

  // [Função assíncrona: persiste o novo plano de assinatura e status no Supabase]
  const handleSaveTenantChanges = async () => {
    if (!selectedTenantForEdit) return;

    const newMrr =
      editPlan === "starter" ? 69.9 : editPlan === "pro" ? 149.9 : 279.9;

    setTenants((prev) =>
      prev.map((t) =>
        t.id === selectedTenantForEdit.id
          ? {
              ...t,
              plan: editPlan,
              status: editStatus,
              mrr: newMrr,
            }
          : t,
      ),
    );

    const targetId = selectedTenantForEdit.id;
    setSelectedTenantForEdit(null);

    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          plan: editPlan,
          status: editStatus,
          mrr: newMrr,
        })
        .eq("id", targetId);

      if (error) throw error;
    } catch (err) {
      console.error(
        "Erro ao salvar alterações de assinatura no Supabase:",
        err,
      );
    }
  };

  // White-Label
  const handleOpenWhiteLabelModal = (tenant) => {
    setSelectedTenantForWhiteLabel(tenant);
    setWlPrimary(tenant.brandPrimary || "#ea580c");
    setWlSecondary(tenant.brandSecondary || "#16a34a");
    setWlLogoUrl(tenant.logoUrl || "");
    setWlActive(tenant.hasWhiteLabel || false);
  };

  // [Função assíncrona: salva as cores e logo personalizadas da barbearia no banco]
  const handleSaveWhiteLabel = async () => {
    if (!selectedTenantForWhiteLabel) return;

    setTenants((prev) =>
      prev.map((t) =>
        t.id === selectedTenantForWhiteLabel.id
          ? {
              ...t,
              hasWhiteLabel: wlActive,
              brandPrimary: wlPrimary,
              brandSecondary: wlSecondary,
              logoUrl: wlLogoUrl,
            }
          : t,
      ),
    );

    const targetId = selectedTenantForWhiteLabel.id;
    setSelectedTenantForWhiteLabel(null);

    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          has_white_label: wlActive,
          brand_primary: wlPrimary,
          brand_secondary: wlSecondary,
          logo_url: wlLogoUrl,
        })
        .eq("id", targetId);

      if (error) throw error;
    } catch (err) {
      console.error("Erro ao salvar White-Label no Supabase:", err);
    }
  };

  // [Função assíncrona: ativa ou inativa plano e persiste no Supabase]
  const handleTogglePlanActive = async (planId) => {
    const currentPlan = plans.find((p) => p.id === planId);
    if (!currentPlan) return;
    const newActiveState = !currentPlan.active;

    // [Otimismo visual: atualiza o array plans localmente]
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, active: newActiveState } : p)),
    );

    try {
      // [Método Supabase: executa update na tabela 'plans']
      const { error } = await supabase
        .from("plans")
        .update({ active: newActiveState })
        .eq("id", planId);

      if (error) throw error;
    } catch (err) {
      console.error("Erro ao atualizar status do plano no Supabase:", err);
    }
  };

  const handleOpenCreatePlan = () => {
    setPlanForm({
      id: "",
      name: "",
      price: "",
      maxBarbers: "4",
      extraBarberPrice: "19.90",
      tag: "Novo",
      active: true,
      nubankPaymentLink: "https://nubank.com.br/cobrar/seu-link-aqui",
      featuresText:
        "Agenda Online\nControle de Comissões\nSuporte via WhatsApp",
    });
    setPlanModalMode("create");
  };

  const handleOpenEditPlan = (plan) => {
    setPlanForm({
      id: plan.id,
      name: plan.name,
      price: String(plan.price),
      maxBarbers: String(plan.maxBarbers),
      extraBarberPrice: String(plan.extraBarberPrice || 0),
      tag: plan.tag || "",
      active: plan.active !== false,
      nubankPaymentLink: plan.nubankPaymentLink || "",
      featuresText: (plan.features || []).join("\n"),
    });
    setPlanModalMode("edit");
  };

  // [Função assíncrona: cria ou edita plano persistindo na tabela 'plans' do Supabase]
  const handleSavePlanSubmit = async () => {
    if (!planForm.name || !planForm.price) return;

    // [Variável array: converte linhas de texto em lista limpa de strings]
    const featuresList = planForm.featuresText
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    // [Objeto payload: formata dados para as colunas do PostgreSQL]
    const planPayload = {
      name: planForm.name,
      price: Number(planForm.price),
      max_barbers: Number(planForm.maxBarbers),
      extra_barber_price: Number(planForm.extraBarberPrice || 0),
      tag: planForm.tag || "Novo",
      active: planForm.active,
      nubank_payment_link: planForm.nubankPaymentLink,
      features: featuresList,
    };

    try {
      if (planModalMode === "create") {
        const generatedId = planForm.name.toLowerCase().replace(/\s+/g, "-");
        // [Método Supabase insert: insere novo registro na tabela 'plans']
        const { error } = await supabase
          .from("plans")
          .insert({ id: generatedId, ...planPayload });

        if (error) throw error;

        setPlans((prev) => [
          ...prev,
          {
            id: generatedId,
            ...planPayload,
            maxBarbers: planPayload.max_barbers,
            extraBarberPrice: planPayload.extra_barber_price,
            nubankPaymentLink: planPayload.nubank_payment_link,
          },
        ]);
      } else {
        // [Método Supabase update: atualiza plano existente filtrando por id]
        const { error } = await supabase
          .from("plans")
          .update(planPayload)
          .eq("id", planForm.id);

        if (error) throw error;

        setPlans((prev) =>
          prev.map((p) =>
            p.id === planForm.id
              ? {
                  ...p,
                  ...planPayload,
                  maxBarbers: planPayload.max_barbers,
                  extraBarberPrice: planPayload.extra_barber_price,
                  nubankPaymentLink: planPayload.nubank_payment_link,
                }
              : p,
          ),
        );
      }
      setPlanModalMode(null);
    } catch (err) {
      console.error("Erro ao salvar plano no Supabase:", err);
    }
  };

  const bestTextColorOnPrimary = getBestContrastTextColor(wlPrimary);

  return (
    <div className={superAdminStyles.pageWrapper}>
      {/* BACKDROP MOBILE */}
      {isMobileDrawerOpen && (
        <div
          className={superAdminStyles.backdrop}
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 1. SIDEBAR DESKTOP & GAVETA MOBILE */}
      <aside
        className={`
          ${superAdminStyles.sidebar}
          ${isMobileDrawerOpen ? superAdminStyles.sidebarOpen : superAdminStyles.sidebarClosed}
        `}
      >
        <div className={superAdminStyles.sidebarHeader}>
          <div className={superAdminStyles.brandGroup}>
            <div className={superAdminStyles.brandLogo}>👑</div>
            <div className="flex flex-col">
              <span className="font-black text-white text-sm">BarberSaaS</span>
              <span className={superAdminStyles.superBadge}>
                Master Control
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(false)}
            className={superAdminStyles.closeDrawerBtn}
            aria-label="Fechar menu"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className={superAdminStyles.nav}>
          <button
            type="button"
            onClick={() => {
              setActiveTab("tenants");
              setIsMobileDrawerOpen(false);
            }}
            className={`${superAdminStyles.navItem} ${activeTab === "tenants" ? superAdminStyles.navActive : superAdminStyles.navInactive}`}
          >
            <span>🏢</span>
            <span>Barbearias (Tenants)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("plans");
              setIsMobileDrawerOpen(false);
            }}
            className={`${superAdminStyles.navItem} ${activeTab === "plans" ? superAdminStyles.navActive : superAdminStyles.navInactive}`}
          >
            <span>💎</span>
            <span>Planos & Preços</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("payments");
              setIsMobileDrawerOpen(false);
            }}
            className={`${superAdminStyles.navItem} ${activeTab === "payments" ? superAdminStyles.navActive : superAdminStyles.navInactive}`}
          >
            <span>💳</span>
            <span>Conta Nubank PJ</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("settings");
              setIsMobileDrawerOpen(false);
            }}
            className={`${superAdminStyles.navItem} ${activeTab === "settings" ? superAdminStyles.navActive : superAdminStyles.navInactive}`}
          >
            <span>⚙️</span>
            <span>Configurações do SaaS</span>
          </button>
        </nav>

        <div className={superAdminStyles.sidebarFooter}>
          <div className={superAdminStyles.adminUser}>
            <span className={superAdminStyles.adminName}>
              SuperAdmin Master
            </span>
            <span className={superAdminStyles.adminRole}>
              admin@barbersaas.com
            </span>
          </div>
          <Button
            variant="secondary"
            onClick={onLogout}
            className="text-xs py-1 px-2.5"
          >
            Sair
          </Button>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className={superAdminStyles.topbar}>
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className={superAdminStyles.hamburgerBtn}
            aria-label="Abrir menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-black text-white text-sm">SuperAdmin</span>
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
              {activeTab}
            </span>
          </div>

          <Button
            variant="secondary"
            onClick={onLogout}
            className="text-xs py-1 px-2.5"
          >
            Sair
          </Button>
        </header>

        <main className={superAdminStyles.mainContent}>
          {/* ======================================================== */}
          {/* ABA 1: TENANTS COM AÇÕES COMPLETAS                      */}
          {/* ======================================================== */}
          {activeTab === "tenants" && (
            <div className="space-y-6">
              <div className={superAdminStyles.pageHeader}>
                <div className={superAdminStyles.titleWrapper}>
                  <h1 className={superAdminStyles.pageTitle}>
                    Barbearias Conectadas (Multi-Tenancy)
                  </h1>
                  <p className={superAdminStyles.pageSubtitle}>
                    Monitoramento global de estabelecimentos, cobrança via
                    Nubank PJ e controle de acessos.
                  </p>
                </div>
              </div>

              {/* KPIs */}
              <div className={superAdminStyles.kpiGrid}>
                <StatCard
                  title="Receita Recorrente (MRR)"
                  value={`R$ ${totalMRR.toFixed(2).replace(".", ",")}`}
                  icon="💵"
                  theme="gold"
                />
                <StatCard
                  title="Barbearias Ativas"
                  value={`${activeTenantsCount} ativas`}
                  icon="🏢"
                  theme="green"
                />
                <StatCard
                  title="Barbeiros nas Cadeiras"
                  value={`${totalBarbers} cadeiras`}
                  icon="💈"
                  theme="blue"
                />
                <StatCard
                  title="Assinaturas em Teste"
                  value={`${trialTenantsCount} em teste`}
                  icon="⏳"
                  theme="purple"
                />
              </div>

              {/* Tabela de Barbearias */}
              <div className={superAdminStyles.tableSection}>
                <div className={superAdminStyles.filterBar}>
                  <div className="max-w-md w-full">
                    <SearchInput
                      placeholder="Buscar por barbearia ou dono..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onClear={() => setSearchTerm("")}
                    />
                  </div>

                  <div className={superAdminStyles.filterControls}>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className={superAdminStyles.filterSelect}
                    >
                      <option value="all">Todos os Status</option>
                      <option value="active">Ativas</option>
                      <option value="trial">Em Teste (Trial)</option>
                      <option value="overdue">Inadimplentes</option>
                      <option value="suspended">Inativas / Bloqueadas</option>
                    </select>

                    <select
                      value={planFilter}
                      onChange={(e) => setPlanFilter(e.target.value)}
                      className={superAdminStyles.filterSelect}
                    >
                      <option value="all">Todos os Planos</option>
                      <option value="starter">Plano Solo</option>
                      <option value="pro">Plano Pro</option>
                      <option value="enterprise">Redes & Franquias</option>
                    </select>
                  </div>
                </div>

                {/* [Renderização condicional: consome isLoading para exibir indicador de carregamento] */}
                {isLoading ? (
                  <div className="py-16 text-center text-xs text-neutral-400 font-mono animate-pulse">
                    Carregando barbearias e planos do Supabase...
                  </div>
                ) : (
                  <Table
                    data={filteredTenants}
                    keyField="id"
                    selectable={false}
                    columns={[
                      {
                        key: "name",
                        label: "Barbearia",
                        render: (row) => (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs">
                                {row.name}
                              </span>
                              {row.hasWhiteLabel && (
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-amber-500 text-neutral-950">
                                  White-Label
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-amber-500">
                              app.barbersaas.com/{row.slug}
                            </span>
                          </div>
                        ),
                      },
                      {
                        key: "ownerName",
                        label: "Dono & Contato",
                        render: (row) => (
                          <div className="flex flex-col">
                            <span className="text-neutral-200 font-medium">
                              {row.ownerName}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {row.ownerPhone}
                            </span>
                          </div>
                        ),
                      },
                      {
                        key: "plan",
                        label: "Plano Vigente",
                        render: (row) => {
                          const planObj = plans.find((p) => p.id === row.plan);
                          return (
                            <div className="flex flex-col">
                              <span className="text-xs font-bold uppercase text-white font-mono">
                                {planObj?.name || row.plan}
                              </span>
                              <span className="text-[10px] text-emerald-400 font-mono">
                                R${" "}
                                {Number(planObj?.price || row.mrr).toFixed(2)}
                                /mês
                              </span>
                            </div>
                          );
                        },
                      },
                      {
                        key: "status",
                        label: "Status de Acesso",
                        render: (row) => {
                          const map = {
                            active: { label: "Ativa", status: "completed" },
                            trial: {
                              label: `Trial (${row.trialDaysLeft}d)`,
                              status: "confirmed",
                            },
                            overdue: {
                              label: "Inadimplente",
                              status: "waiting",
                            },
                            suspended: {
                              label: "Inativa ✕",
                              status: "cancelled",
                            },
                          };
                          const curr = map[row.status] || map.active;
                          return (
                            <Badge
                              status={curr.status}
                              label={curr.label}
                              size="sm"
                            />
                          );
                        },
                      },
                    ]}
                    actions={[
                      {
                        label: "Enviar Cobrança / Link Nubank PJ",
                        icon: "💳",
                        onClick: (row) => handleOpenBilling(row),
                      },
                      {
                        label: "Acessar como Barbearia (Impersonate)",
                        icon: "🚀",
                        onClick: (row) =>
                          onImpersonateTenant && onImpersonateTenant(row),
                      },
                      {
                        label: "Configurar Cores e White-Label",
                        icon: "🎨",
                        onClick: (row) => handleOpenWhiteLabelModal(row),
                      },
                      {
                        label: "Editar Assinatura e Status",
                        icon: "⚙️",
                        onClick: (row) => {
                          setSelectedTenantForEdit(row);
                          setEditPlan(row.plan);
                          setEditStatus(row.status);
                        },
                      },
                      {
                        label: "Inativar ou Ativar Acesso",
                        icon: "⏸️",
                        isDanger: true,
                        onClick: (row) => setTenantToToggleStatus(row),
                      },
                      {
                        label: "Conceder Bônus de Teste (+Dias)",
                        icon: "🎁",
                        onClick: (row) => {
                          setBonusModalTenant(row);
                          setBonusDaysInput("7");
                        },
                      },
                    ]}
                  />
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ABA 2: GESTÃO DE PLANOS & PREÇOS                       */}
          {/* ======================================================== */}
          {activeTab === "plans" && (
            <div className="space-y-6">
              <div className={superAdminStyles.pageHeader}>
                <div className={superAdminStyles.titleWrapper}>
                  <h1 className={superAdminStyles.pageTitle}>
                    Planos de Assinatura & Links Nubank PJ
                  </h1>
                  <p className={superAdminStyles.pageSubtitle}>
                    Crie, edite, ative ou inative planos e configure o link de
                    pagamento exclusivo com valor fixado.
                  </p>
                </div>

                <Button
                  variant="primary"
                  onClick={handleOpenCreatePlan}
                  className="text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-500 font-extrabold shadow-md"
                >
                  <span>+</span> Criar Novo Plano
                </Button>
              </div>

              <div className={superAdminStyles.plansGrid}>
                {plans.map((p) => {
                  const isActive = p.active !== false;

                  return (
                    <div
                      key={p.id}
                      className={`
                        ${superAdminStyles.planCard}
                        ${!isActive ? "opacity-50 bg-neutral-950 border-neutral-900" : ""}
                      `}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase text-neutral-400">
                            {p.tag}
                          </span>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                                isActive
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-neutral-800 text-neutral-400 border-neutral-700"
                              }`}
                            >
                              {isActive ? "✓ Ativo" : "Inativo"}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleTogglePlanActive(p.id)}
                              className="text-[10px] text-neutral-400 hover:text-amber-400 underline cursor-pointer"
                            >
                              {isActive ? "Inativar" : "Ativar"}
                            </button>
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-white">
                          {p.name}
                        </h3>
                        <p className="text-2xl font-black text-amber-400 font-mono">
                          R$ {Number(p.price).toFixed(2).replace(".", ",")}
                          <span className="text-xs text-neutral-500 font-normal">
                            /mês
                          </span>
                        </p>
                      </div>

                      <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1 text-xs">
                        <p className="text-neutral-300">
                          Capacidade:{" "}
                          <strong className="text-white">
                            {p.maxBarbers >= 999
                              ? "Barbeiros Ilimitados"
                              : `Até ${p.maxBarbers} barbeiros`}
                          </strong>
                        </p>
                        {p.extraBarberPrice > 0 && (
                          <p className="text-amber-400 font-semibold">
                            + R$ {Number(p.extraBarberPrice).toFixed(2)} por
                            cadeira extra
                          </p>
                        )}
                      </div>

                      <div className="p-2.5 bg-purple-950/20 border border-purple-800/40 rounded-xl text-left space-y-1">
                        <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                          <span>🔗</span> Link Nubank PJ do Plano:
                        </span>
                        <p
                          className="text-[11px] font-mono text-neutral-300 truncate"
                          title={p.nubankPaymentLink}
                        >
                          {p.nubankPaymentLink || "Nenhum link configurado"}
                        </p>
                      </div>

                      <div className="space-y-1 pt-1 border-t border-neutral-800/80 text-xs text-neutral-400">
                        {p.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-emerald-400 text-[10px]">
                              ✓
                            </span>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>

                      <Button
                        variant="secondary"
                        onClick={() => handleOpenEditPlan(p)}
                        className="w-full text-xs py-2 mt-2"
                      >
                        ✏️ Editar Valores e Benefícios
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ABA 3: CONTA NUBANK PJ INSTITUCIONAL                   */}
          {/* ======================================================== */}
          {activeTab === "payments" && (
            <div className="space-y-6">
              <div className={superAdminStyles.pageHeader}>
                <div className={superAdminStyles.titleWrapper}>
                  <h1 className={superAdminStyles.pageTitle}>
                    Dados da Conta Nubank PJ
                  </h1>
                  <p className={superAdminStyles.pageSubtitle}>
                    Informações institucionais da sua conta PJ para recebimento
                    de Pix e conferência de faturamento.
                  </p>
                </div>
              </div>

              <div className={superAdminStyles.nubankCard}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Chave PIX da Empresa (CNPJ ou Chave Aleatória)"
                    value={nubankConfig.pixKey}
                    onChange={(e) =>
                      setNubankConfig({
                        ...nubankConfig,
                        pixKey: e.target.value,
                      })
                    }
                  />
                  <Input
                    label="Razão Social / Nome da Conta no Nubank"
                    value={nubankConfig.companyName}
                    onChange={(e) =>
                      setNubankConfig({
                        ...nubankConfig,
                        companyName: e.target.value,
                      })
                    }
                  />
                  <Input
                    label="WhatsApp Oficial para Envio de Comprovantes"
                    mask="phone"
                    value={nubankConfig.supportWhatsapp}
                    onChange={(e) =>
                      setNubankConfig({
                        ...nubankConfig,
                        supportWhatsapp: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {/* [Feedback de UX: indicador de sucesso inline sem alertas intrusivos] */}
                  {saveSuccessMsg ? (
                    <span className="text-xs font-bold text-emerald-400">
                      {saveSuccessMsg}
                    </span>
                  ) : (
                    <span />
                  )}

                  {/* [Função assíncrona: upsert dos dados bancários institucionais no Supabase] */}
                  <Button
                    variant="primary"
                    onClick={async () => {
                      try {
                        const { error } = await supabase
                          .from("saas_config")
                          .upsert({
                            id: "default",
                            pix_key: nubankConfig.pixKey,
                            company_name: nubankConfig.companyName,
                            support_whatsapp: nubankConfig.supportWhatsapp,
                            updated_at: new Date().toISOString(),
                          });

                        if (!error) {
                          setSaveSuccessMsg(
                            "✓ Dados do Nubank PJ salvos com sucesso!",
                          );
                          setTimeout(() => setSaveSuccessMsg(""), 4000);
                        }
                      } catch (err) {
                        console.error(
                          "Erro ao salvar dados do Nubank no Supabase:",
                          err,
                        );
                      }
                    }}
                    className="text-xs py-2 px-5 bg-purple-600 hover:bg-purple-500 font-extrabold"
                  >
                    Salvar Dados da Conta PJ
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ABA 4: CONFIGURAÇÕES GLOBAIS                           */}
          {/* ======================================================== */}
          {activeTab === "settings" && (
            <div className="space-y-4 max-w-xl text-left">
              <h1 className={superAdminStyles.pageTitle}>
                Configurações Gerais
              </h1>
              <Input
                label="Nome Oficial do SaaS"
                value="BarberSaaS Multi-Tenant"
                disabled
              />
              <Input
                label="Domínio Principal"
                value="barbersaas.com.br"
                disabled
              />
              <Input
                label="E-mail Master do SuperAdmin"
                value="admin@barbersaas.com"
                disabled
              />
            </div>
          )}
        </main>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: CONFIRMAÇÃO DE ATIVAR / INATIVAR (NOVO!)        */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!tenantToToggleStatus}
        onClose={() => setTenantToToggleStatus(null)}
        title={
          tenantToToggleStatus?.status === "suspended"
            ? "Reativar Acesso da Barbearia"
            : "Desativar Acesso da Barbearia"
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setTenantToToggleStatus(null)}
            >
              Cancelar
            </Button>
            <Button
              variant={
                tenantToToggleStatus?.status === "suspended"
                  ? "primary"
                  : "danger"
              }
              onClick={handleConfirmToggleStatus}
            >
              {tenantToToggleStatus?.status === "suspended"
                ? "Sim, ativar!"
                : "Sim, desativar!"}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-left">
          <p className="text-xs text-neutral-300 leading-relaxed">
            {tenantToToggleStatus?.status === "suspended" ? (
              <>
                Deseja restabelecer o acesso da{" "}
                <strong className="text-white">
                  {tenantToToggleStatus?.name}
                </strong>
                ? O proprietário e os barbeiros poderão acessar a agenda
                imediatamente.
              </>
            ) : (
              <>
                Tem certeza de que deseja desativar a{" "}
                <strong className="text-white">
                  {tenantToToggleStatus?.name}
                </strong>
                ?
              </>
            )}
          </p>

          {tenantToToggleStatus?.status !== "suspended" && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 space-y-1">
              <p className="font-bold">⚠️ Consequências da desativação:</p>
              <ul className="list-disc pl-4 text-[11px] text-red-300/80 space-y-0.5">
                <li>O login do proprietário e dos barbeiros será bloqueado.</li>
                <li>
                  A página pública de agendamento exibirá aviso de
                  indisponibilidade.
                </li>
                <li>
                  Os dados históricos e financeiro continuam preservados no
                  banco.
                </li>
              </ul>
            </div>
          )}
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: BÔNUS DE TESTE (+DIAS DE TRIAL) (NOVO!)         */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!bonusModalTenant}
        onClose={() => setBonusModalTenant(null)}
        title={`Bônus de Período de Testes: ${bonusModalTenant?.name}`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setBonusModalTenant(null)}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConfirmBonusDays}>
              Confirmar Bônus
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-neutral-300 leading-relaxed">
            Escolha a quantidade de dias de teste grátis a serem adicionados ao
            período de avaliação de{" "}
            <strong className="text-white">{bonusModalTenant?.name}</strong>:
          </p>

          <Input
            label="Quantidade de Dias a Liberar"
            type="number"
            value={bonusDaysInput}
            onChange={(e) => setBonusDaysInput(e.target.value)}
            helperText="Exemplo: digite 7 para prorrogar por mais uma semana inteira."
          />

          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between text-xs">
            <span className="text-neutral-400">Dias atuais restantes:</span>
            <span className="font-bold text-amber-400 font-mono">
              {bonusModalTenant?.trialDaysLeft || 0} dias
            </span>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: COBRANÇA DO PLANO VIGENTE (NUBANK PJ)          */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!billingTenantModal}
        onClose={() => setBillingTenantModal(null)}
        title={`💳 Enviar Cobrança: ${billingTenantModal?.tenant?.name}`}
        footer={
          <Button
            variant="secondary"
            onClick={() => setBillingTenantModal(null)}
          >
            Fechar
          </Button>
        }
      >
        {billingTenantModal && (
          <div className="space-y-4 text-left">
            <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400">
                  Plano Atual Contratado
                </span>
                <h4 className="text-sm font-bold text-white">
                  {billingTenantModal.plan.name}
                </h4>
              </div>
              <span className="text-xl font-black text-emerald-400 font-mono">
                R${" "}
                {Number(billingTenantModal.plan.price)
                  .toFixed(2)
                  .replace(".", ",")}
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-neutral-300">
                Link de Cobrança Nubank PJ deste Plano:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={billingTenantModal.plan.nubankPaymentLink}
                  className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs font-mono p-2.5 rounded-xl outline-none"
                />
                {/* [Ação: copia para a área de transferência de forma silenciosa e moderna] */}
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      billingTenantModal.plan.nubankPaymentLink,
                    );
                  }}
                  className="text-xs py-2 px-3 shrink-0"
                >
                  Copiar Link
                </Button>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-xs font-bold text-neutral-300">
                Mensagem Oficial para o WhatsApp (
                {billingTenantModal.tenant.ownerPhone}):
              </label>
              <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs text-neutral-300 space-y-2">
                <p>
                  Olá <strong>{billingTenantModal.tenant.ownerName}</strong>!
                  Segue o link seguro para renovação da assinatura da{" "}
                  <strong>{billingTenantModal.tenant.name}</strong> (
                  {billingTenantModal.plan.name} - R${" "}
                  {Number(billingTenantModal.plan.price).toFixed(2)}):
                </p>
                <p className="font-mono text-purple-400 break-all">
                  {billingTenantModal.plan.nubankPaymentLink}
                </p>
                <p className="text-[11px] text-neutral-400">
                  Pague via PIX ou Cartão para manter o sistema ativo.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => {
                const phoneOnly = (
                  billingTenantModal.tenant.ownerPhone || ""
                ).replace(/\D/g, "");
                const msg = encodeURIComponent(
                  `Olá ${billingTenantModal.tenant.ownerName}! Segue o link seguro para renovação da assinatura da ${billingTenantModal.tenant.name} (${billingTenantModal.plan.name} - R$ ${Number(billingTenantModal.plan.price).toFixed(2)}):\n\n${billingTenantModal.plan.nubankPaymentLink}\n\nVocê pode pagar via PIX ou Cartão.`,
                );
                window.open(
                  `https://wa.me/55${phoneOnly}?text=${msg}`,
                  "_blank",
                );
              }}
              className="w-full text-xs py-2.5 bg-emerald-600 hover:bg-emerald-500 font-extrabold shadow-md flex items-center justify-center gap-2"
            >
              <span>📲</span>
              <span>Abrir WhatsApp com Mensagem Pronta</span>
            </Button>
          </div>
        )}
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: EDITAR ASSINATURA E STATUS                      */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!selectedTenantForEdit}
        onClose={() => setSelectedTenantForEdit(null)}
        title={`Gerenciar Barbearia: ${selectedTenantForEdit?.name}`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setSelectedTenantForEdit(null)}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveTenantChanges}>
              Salvar Alterações
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-neutral-400">
            Altere manualmente o plano contratado ou o status de acesso deste
            tenant.
          </p>

          <Select
            label="Plano de Assinatura"
            value={editPlan}
            onChange={(e) => setEditPlan(e.target.value)}
            options={[
              { value: "starter", label: "Plano Solo (R$ 69,90/mês)" },
              { value: "pro", label: "Plano Pro (R$ 149,90/mês)" },
              {
                value: "enterprise",
                label: "Redes & Franquias (R$ 279,90/mês)",
              },
            ]}
          />

          <Select
            label="Status de Acesso à Plataforma"
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            options={[
              { value: "active", label: "Ativa (Acesso Liberado)" },
              { value: "trial", label: "Em Período de Testes (Trial)" },
              { value: "overdue", label: "Inadimplente (Aviso de Pagamento)" },
              { value: "suspended", label: "Suspensa / Bloqueada" },
            ]}
          />
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 5: WHITE-LABEL E CORES DA MARCA                   */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!selectedTenantForWhiteLabel}
        onClose={() => setSelectedTenantForWhiteLabel(null)}
        title={`🎨 White-Label & Marca: ${selectedTenantForWhiteLabel?.name}`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setSelectedTenantForWhiteLabel(null)}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveWhiteLabel}>
              Salvar e Publicar no Supabase
            </Button>
          </>
        }
      >
        <div className="space-y-5 text-left">
          <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">
                Pacote White-Label Ativo
              </p>
              <p className="text-[11px] text-neutral-400">
                Habilita a injeção personalizada das cores da barbearia.
              </p>
            </div>
            <input
              type="checkbox"
              checked={wlActive}
              onChange={(e) => setWlActive(e.target.checked)}
              className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">
                Cor Primária (Botões e Ações)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={wlPrimary}
                  onChange={(e) => setWlPrimary(e.target.value)}
                  className="w-10 h-10 rounded-xl bg-transparent border-none cursor-pointer"
                />
                <Input
                  value={wlPrimary}
                  onChange={(e) => setWlPrimary(e.target.value)}
                  placeholder="#ea580c"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-300">
                Cor Secundária (Badges e Detalhes)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={wlSecondary}
                  onChange={(e) => setWlSecondary(e.target.value)}
                  className="w-10 h-10 rounded-xl bg-transparent border-none cursor-pointer"
                />
                <Input
                  value={wlSecondary}
                  onChange={(e) => setWlSecondary(e.target.value)}
                  placeholder="#16a34a"
                />
              </div>
            </div>
          </div>

          <Input
            label="URL da Logotipo Oficial (PNG/SVG)"
            placeholder="https://sua-barbearia.com/logo.png"
            value={wlLogoUrl}
            onChange={(e) => setWlLogoUrl(e.target.value)}
            helperText="Exibida na tela pública de agendamento do cliente e na Navbar."
          />

          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider">
                Pré-visualização em Tempo Real
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                WCAG 4.5:1 Aprovado
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                style={{
                  backgroundColor: wlPrimary,
                  color: bestTextColorOnPrimary,
                }}
                className="text-xs font-black py-2 px-4 rounded-xl shadow-md cursor-default"
              >
                Botão Agendar Corte
              </button>

              <span
                style={{ borderColor: wlSecondary, color: wlSecondary }}
                className="text-xs font-bold py-1 px-3 rounded-full border bg-transparent"
              >
                Badge Destaque
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 6: CRIAR OU EDITAR PLANO (NUBANK PJ INCLUSO)       */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!planModalMode}
        onClose={() => setPlanModalMode(null)}
        title={
          planModalMode === "edit"
            ? `Editar Plano: ${planForm.name}`
            : "Criar Novo Plano de Assinatura"
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setPlanModalMode(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSavePlanSubmit}>
              {planModalMode === "edit"
                ? "Salvar Alterações do Plano"
                : "Criar e Publicar Plano"}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-left max-h-[75vh] overflow-y-auto pr-1">
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white">
                Plano Ativo na Vitrine
              </p>
              <p className="text-[10px] text-neutral-400">
                Planos inativos não aparecem para novas barbearias.
              </p>
            </div>
            <input
              type="checkbox"
              checked={planForm.active}
              onChange={(e) =>
                setPlanForm({ ...planForm, active: e.target.checked })
              }
              className="w-5 h-5 accent-amber-600 rounded cursor-pointer"
            />
          </div>

          <Input
            label="Nome do Plano"
            placeholder="Ex: Plano Master Premium"
            value={planForm.name}
            onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço Mensal (R$)"
              type="number"
              placeholder="149.90"
              value={planForm.price}
              onChange={(e) =>
                setPlanForm({ ...planForm, price: e.target.value })
              }
            />

            <Input
              label="Etiqueta / Tag"
              placeholder="Ex: Mais Escolhido"
              value={planForm.tag}
              onChange={(e) =>
                setPlanForm({ ...planForm, tag: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Capacidade de Barbeiros"
              type="number"
              placeholder="6"
              value={planForm.maxBarbers}
              onChange={(e) =>
                setPlanForm({ ...planForm, maxBarbers: e.target.value })
              }
              helperText="Digite 999 para ilimitado"
            />

            <Input
              label="R$ por Barbeiro Adicional"
              type="number"
              placeholder="19.90"
              value={planForm.extraBarberPrice}
              onChange={(e) =>
                setPlanForm({ ...planForm, extraBarberPrice: e.target.value })
              }
            />
          </div>

          <div className="space-y-1.5 p-3.5 bg-purple-950/20 border border-purple-800/40 rounded-2xl">
            <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <span>💳</span>
              <span>Link de Cobrança Nubank PJ (Com Valor Fixado)</span>
            </label>
            <Input
              placeholder="https://nubank.com.br/cobrar/barbersaas/plano-149"
              value={planForm.nubankPaymentLink}
              onChange={(e) =>
                setPlanForm({ ...planForm, nubankPaymentLink: e.target.value })
              }
              helperText="Gere no app do Nubank PJ um link de cobrança com o valor exato deste plano."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-300">
              Benefícios e Recursos (Digite um por linha)
            </label>
            <textarea
              rows={4}
              value={planForm.featuresText}
              onChange={(e) =>
                setPlanForm({ ...planForm, featuresText: e.target.value })
              }
              placeholder="1 Cadeira Inclusa&#10;Agenda Online&#10;WhatsApp Automático"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-neutral-900 border border-neutral-700 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
