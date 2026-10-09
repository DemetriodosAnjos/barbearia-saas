import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
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
import { SafeHtml } from "../../components/ui/SafeHtml";
import ProjectIcon from "../../components/ui/ProjectIcon";
import { getBestContrastTextColor } from "../../utils/theme";
import MercadoPagoCheckoutModal from "../../components/payments/MercadoPagoCheckoutModal";
import ApiKeysManagement from "../../components/superadmin/ApiKeysManagement";
import { mercadoPagoConfigStore } from "../../services/mercadoPagoConfigStore";
import { INITIAL_PLANS } from "./SuperAdminMockNuank";
import { safeSessionStorage } from "../../utils/safeStorage";

export default function SuperAdminDashboard({
  onImpersonateTenant,
  onLogout,
}) {
  const [activeTab, setActiveTabState] = useState(() => {
    return safeSessionStorage.getItem("superadmin_active_tab") || "tenants";
  });

  const setActiveTab = (tab) => {
    safeSessionStorage.setItem("superadmin_active_tab", tab);
    setActiveTabState(tab);
  };
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Estado do Mercado Pago sincronizado com o Store Central
  const [mpConfig, setMpConfig] = useState(() => mercadoPagoConfigStore.getConfig());

  useEffect(() => {
    const unsub = mercadoPagoConfigStore.subscribe((newCfg) => {
      setMpConfig(newCfg);
    });
    return unsub;
  }, []);

  // Estados de Checkout via Mercado Pago API
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [selectedTenantForCheckout, setSelectedTenantForCheckout] = useState(null);
  const [mercadoPagoEnv, setMercadoPagoEnv] = useState("production");
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState(
    "APP_USR-70502220-4q7b-8910-barbersaas-prod"
  );
  const [mercadoPagoWebhookSecret, setMercadoPagoWebhookSecret] = useState(
    "mp_sec_8f4a7c1b5e39d20a46f8271035cb"
  );

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

          // [Atualização de estado: popula o array dinâmico de planos com suporte ao Mercado Pago]
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
                mercadoPagoPlanId: p.mercado_pago_plan_id || `plan_mp_${p.id}`,
                mercadoPagoCheckoutUrl:
                  p.mercado_pago_checkout_url ||
                  p.nubank_payment_link ||
                  `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_mp_${p.id}`,
                features: Array.isArray(p.features) ? p.features : [],
              })),
            );
          } else {
            setPlans(INITIAL_PLANS);
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
      mercadoPagoCheckoutUrl: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_mp_novo",
      featuresText:
        "Agenda Online\nControle de Comissões\nPix Instantâneo Mercado Pago\nSuporte via WhatsApp",
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
      mercadoPagoCheckoutUrl: plan.mercadoPagoCheckoutUrl || `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_mp_${plan.id}`,
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

    // [Objeto payload: formata dados estritamente para as colunas existentes na tabela 'plans' do PostgreSQL]
    const checkoutUrl = planForm.mercadoPagoCheckoutUrl || "";
    const planPayload = {
      name: planForm.name,
      price: Number(planForm.price),
      max_barbers: Number(planForm.maxBarbers),
      extra_barber_price: Number(planForm.extraBarberPrice || 0),
      tag: planForm.tag || "Novo",
      active: planForm.active,
      nubank_payment_link: checkoutUrl,
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
            mercadoPagoCheckoutUrl: checkoutUrl,
            nubankPaymentLink: checkoutUrl,
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
                  mercadoPagoCheckoutUrl: checkoutUrl,
                  nubankPaymentLink: checkoutUrl,
                }
              : p,
          ),
        );
      }
      setSaveSuccessMsg("Plano salvo com sucesso no banco de dados!");
      setTimeout(() => setSaveSuccessMsg(""), 3500);
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
            <div className={superAdminStyles.brandLogo}><ProjectIcon name="Crown" size={18} className="text-amber-400" /></div>
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
            <ProjectIcon name="Building2" size={16} className="text-amber-400" />
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
            <ProjectIcon name="Sparkles" size={16} className="text-amber-400" />
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
            <ProjectIcon name="Key" size={16} className="text-amber-400" />
            <div className="flex items-center justify-between w-full">
              <span>Chaves de API &amp; SSOT</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold border ${
                mpConfig.activeEnvironment === "sandbox"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
              }`}>
                {mpConfig.activeEnvironment === "sandbox" ? "SANDBOX" : "PROD"}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("settings");
              setIsMobileDrawerOpen(false);
            }}
            className={`${superAdminStyles.navItem} ${activeTab === "settings" ? superAdminStyles.navActive : superAdminStyles.navInactive}`}
          >
            <ProjectIcon name="Settings" size={16} className="text-amber-400" />
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
            <button
              type="button"
              onClick={() => setActiveTab("payments")}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border cursor-pointer transition-all ${
                mpConfig.activeEnvironment === "sandbox"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25"
                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
              }`}
              title="Ambiente Mercado Pago ativo (clique para gerenciar)"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${mpConfig.activeEnvironment === "sandbox" ? "bg-amber-400" : "bg-emerald-400"} animate-pulse`} />
              <span>MP: {mpConfig.activeEnvironment === "sandbox" ? "TESTE" : "PROD"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={onLogout}
              className="text-xs py-1 px-2.5"
            >
              Sair
            </Button>
          </div>
        </header>

        <main className={superAdminStyles.mainContent}>
          {/* Barra de Sanitização SuperAdmin Master (SafeHtml) */}
          <div className="mb-4 p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl flex items-center justify-between text-xs text-neutral-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-emerald-400 font-semibold">Master Control Blindado com SafeHtml:</span>
              <span>Todos os 14 módulos de governança operando com sanitização em tempo real (Zero-XSS).</span>
            </div>
            <span className="font-mono text-[11px] text-neutral-400 hidden sm:inline">
              <span className="inline-flex items-center gap-1"><ProjectIcon name="ShieldCheck" size={13} className="text-emerald-400" /> Zero-XSS Ativo</span>
            </span>
          </div>

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
                  icon="DollarSign"
                  theme="gold"
                />
                <StatCard
                  title="Barbearias Ativas"
                  value={`${activeTenantsCount} ativas`}
                  icon="Building2"
                  theme="green"
                />
                <StatCard
                  title="Barbeiros nas Cadeiras"
                  value={`${totalBarbers} cadeiras`}
                  icon="Scissors"
                  theme="blue"
                />
                <StatCard
                  title="Assinaturas em Teste"
                  value={`${trialTenantsCount} em teste`}
                  icon="Clock"
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
                      onChange={(e) => setSearchTerm(DOMPurify.sanitize(e.target.value, { ALLOWED_TAGS: [] }))}
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
                                <SafeHtml html={row.name} />
                              </span>
                              {row.hasWhiteLabel && (
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-amber-500 text-neutral-950">
                                  White-Label
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-amber-500">
                              <SafeHtml html={`app.barbersaas.com/${row.slug}`} />
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
                              <SafeHtml html={row.ownerName} />
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              <SafeHtml html={row.ownerPhone} />
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
                              label: "Inativa",
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
                        label: "Cobrança via Mercado Pago (Pix & Cartão)",
                        icon: "Zap",
                        onClick: (row) => handleOpenBilling(row),
                      },
                      {
                        label: "Acessar como Barbearia (Impersonate)",
                        icon: "Rocket",
                        onClick: (row) =>
                          onImpersonateTenant && onImpersonateTenant(row),
                      },
                      {
                        label: "Configurar Cores e White-Label",
                        icon: "Palette",
                        onClick: (row) => handleOpenWhiteLabelModal(row),
                      },
                      {
                        label: "Editar Assinatura e Status",
                        icon: "Settings",
                        onClick: (row) => {
                          setSelectedTenantForEdit(row);
                          setEditPlan(row.plan);
                          setEditStatus(row.status);
                        },
                      },
                      {
                        label: "Inativar ou Ativar Acesso",
                        icon: "Pause",
                        isDanger: true,
                        onClick: (row) => setTenantToToggleStatus(row),
                      },
                      {
                        label: "Conceder Bônus de Teste (+Dias)",
                        icon: "Gift",
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
          {/* ABA 2: GESTÃO DE PLANOS & PREÇOS (MERCADO PAGO)          */}
          {/* ======================================================== */}
          {activeTab === "plans" && (
            <div className="space-y-6">
              <div className={superAdminStyles.pageHeader}>
                <div className={superAdminStyles.titleWrapper}>
                  <div className="flex items-center gap-2">
                    <h1 className={superAdminStyles.pageTitle}>
                      Planos de Assinatura &amp; API Mercado Pago
                    </h1>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30 flex items-center gap-1">
                      <ProjectIcon name="Zap" size={12} className="text-sky-400" />
                      <span>API Ativa</span>
                    </span>
                  </div>
                  <p className={superAdminStyles.pageSubtitle}>
                    Planos oficiais integrados com geração automatizada de Pix Instantâneo e Checkout Pro em até 12x via Mercado Pago.
                  </p>
                </div>

                <Button
                  variant="primary"
                  onClick={handleOpenCreatePlan}
                  className="text-xs py-2 px-4 bg-emerald-600 hover:bg-emerald-500 font-extrabold shadow-md cursor-pointer"
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
                              className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                isActive
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-neutral-800 text-neutral-400 border-neutral-700"
                              }`}
                            >
                              {isActive && <ProjectIcon name="Check" size={10} className="text-emerald-400" />}
                              <span>{isActive ? "Ativo" : "Inativo"}</span>
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

                      {/* Bloco Integrado da API Mercado Pago */}
                      <div className="p-3 bg-gradient-to-br from-amber-950/20 via-neutral-900 to-neutral-950 border border-amber-500/30 rounded-xl text-left space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                            <ProjectIcon name="CreditCard" size={12} className="text-amber-400" />
                            <span>Mercado Pago API</span>
                          </span>
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Pix &amp; Cartão
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-300">
                          Emita Pix QR Code ou gere link seguro do Checkout Pro para cobrança avulsa ou mensalidade.
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedPlanForCheckout(p);
                            setSelectedTenantForCheckout(null);
                          }}
                          className="w-full text-xs py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 font-extrabold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                        >
                          <ProjectIcon name="CreditCard" size={13} className="text-neutral-950" />
                          <span>Gerar Cobrança Mercado Pago</span>
                        </Button>
                      </div>

                      <div className="space-y-1 pt-1 border-t border-neutral-800/80 text-xs text-neutral-400">
                        {p.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <ProjectIcon name="Check" size={11} className="text-amber-400 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>

                      <Button
                        variant="secondary"
                        onClick={() => handleOpenEditPlan(p)}
                        className="w-full text-xs py-2 mt-2 cursor-pointer"
                      >
                        <span className="flex items-center justify-center gap-1.5"><ProjectIcon name="Edit3" size={13} className="text-neutral-300" /><span>Editar Valores e Benefícios</span></span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ABA 3: CHAVES DE API & INTEGRAÇÕES (SSOT)                */}
          {/* ======================================================== */}
          {activeTab === "payments" && (
            <ApiKeysManagement
              onOpenPixCheckoutModal={(plan) => setSelectedPlanForCheckout(plan)}
            />
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
              <p className="font-bold flex items-center gap-1.5"><ProjectIcon name="AlertTriangle" size={14} className="text-red-400" /><span>Consequências da desativação:</span></p>
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
        title={`Enviar Cobrança: ${billingTenantModal?.tenant?.name}`}
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
                Link Oficial de Pagamento Mercado Pago deste Plano:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={
                    billingTenantModal.plan.mercadoPagoCheckoutUrl ||
                    `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_mp_${billingTenantModal.plan.id}`
                  }
                  className="w-full bg-neutral-950 border border-neutral-800 text-sky-400 text-xs font-mono p-2.5 rounded-xl outline-none"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      billingTenantModal.plan.mercadoPagoCheckoutUrl ||
                      `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_mp_${billingTenantModal.plan.id}`,
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
                <p className="font-mono text-sky-400 break-all">
                  {billingTenantModal.plan.mercadoPagoCheckoutUrl ||
                   `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_mp_${billingTenantModal.plan.id}`}
                </p>
                <p className="text-[11px] text-neutral-400">
                  Pague com Pix Instantâneo (QR Code) ou Cartão de Crédito em até 12x via Mercado Pago.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                variant="primary"
                onClick={() => {
                  setSelectedPlanForCheckout(billingTenantModal.plan);
                  setSelectedTenantForCheckout(billingTenantModal.tenant);
                  setBillingTenantModal(null);
                }}
                className="w-full text-xs py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <ProjectIcon name="Zap" size={14} className="text-white" />
                <span>Cobrar via Mercado Pago (Pix / Cartão)</span>
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  const phoneOnly = (
                    billingTenantModal.tenant.ownerPhone || ""
                  ).replace(/\D/g, "");
                  const msg = encodeURIComponent(
                    `Olá ${billingTenantModal.tenant.ownerName}! Segue o link seguro para renovação da assinatura da ${billingTenantModal.tenant.name} (${billingTenantModal.plan.name} - R$ ${Number(billingTenantModal.plan.price).toFixed(2)}):\n\nhttps://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_mp_${billingTenantModal.plan.id}\n\nVocê pode pagar via PIX Instantâneo ou Cartão pelo Mercado Pago.`,
                  );
                  window.open(
                    `https://wa.me/55${phoneOnly}?text=${msg}`,
                    "_blank",
                  );
                }}
                className="w-full text-xs py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer border border-emerald-500"
              >
                <ProjectIcon name="Smartphone" size={14} className="text-white" />
                <span>Abrir WhatsApp com Mensagem Pronta</span>
              </Button>
            </div>
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
        title={`White-Label & Marca: ${selectedTenantForWhiteLabel?.name}`}
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

          <div className="space-y-1.5 p-3.5 bg-sky-950/20 border border-sky-800/40 rounded-2xl">
            <label className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <ProjectIcon name="Zap" size={14} className="text-sky-400" />
              <span>Integração Automática Mercado Pago API</span>
            </label>
            <p className="text-[11px] text-neutral-400">
              O Mercado Pago gera automaticamente links de Checkout Pro e QR Codes Pix com cálculo de juros e conciliação direta no webhook.
            </p>
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

      {/* ======================================================== */}
      {/* MODAL 7: CHECKOUT INTERATIVO MERCADO PAGO                */}
      {/* ======================================================== */}
      {selectedPlanForCheckout && (
        <MercadoPagoCheckoutModal
          isOpen={Boolean(selectedPlanForCheckout)}
          onClose={() => {
            setSelectedPlanForCheckout(null);
            setSelectedTenantForCheckout(null);
          }}
          plan={selectedPlanForCheckout}
          tenant={selectedTenantForCheckout}
          onPaymentSuccess={(info) => {
            setSaveSuccessMsg(`Pagamento ${info.paymentId} confirmado com sucesso via Mercado Pago!`);
            setTimeout(() => setSaveSuccessMsg(""), 5000);
          }}
        />
      )}
    </div>
  );
}
