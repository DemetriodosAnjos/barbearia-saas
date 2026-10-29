import { useState, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { barbershopStyles } from "./BarbershopDashboard.styles";
import Sidebar from "../../components/ui/Sidebar";
import Navbar from "../../components/ui/Navbar";
import TrialBanner, { isTenantTrial } from "../../components/dashboard/TrialBanner";
import ProfileCompletionBanner from "../../components/dashboard/ProfileCompletionBanner";
import ErrorBoundary from "../../components/ui/ErrorBoundary";
import { SafeHtml } from "../../components/ui/SafeHtml";
import ScheduleView from "./ScheduleView";
import ServicesAndProductsView from "./ServicesAndProductsView";
import BarbersTeamView from "./BarbersTeamView";
import BarbershopSettingsView from "./BarbershopSettingsView";
import UserProfileView from "./UserProfileView";
import SupportView from "./SupportView";
import ReferralProgramView from "./ReferralProgramView";
import ClientsDirectoryView from "./ClientsDirectoryView";
import CashierPosView from "./CashierPosView";
import FinancialDashboardView from "./FinancialDashboardView";
import SkeletonDashboard from "../../components/resilience/SkeletonDashboard";
import ProjectIcon from "../../components/ui/ProjectIcon";
import BottomNavigation from "../../components/ui/BottomNavigation";
import TenantBookingLinkCard from "../../components/tenant/TenantBookingLinkCard";
import {
  Calendar,
  Users,
  Plus,
  Scissors,
  DollarSign,
  Settings,
  Menu,
  Share2,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { safeStorage } from "../../utils/safeStorage";
import { useClientsCount } from "../../hooks/useClientsCount";

export default function BarbershopDashboard({
  tenant, // Objeto real da barbearia vindo do Supabase
  onUpdateTenant,
  user, // Objeto do usuário autenticado (Auth Supabase)
  onUpdateUser,
  barbers = [],
  onUpdateBarbers,
  appointments = [],
  onUpdateAppointments,
  clients = [],
  onUpdateClients,
  onUpdateClient,
  comandas = [],
  onUpdateComandas,
  services = [],
  onAddService,
  onUpdateService,
  onUpdateServices,
  onDeleteService,
  products = [],
  onAddProduct,
  onUpdateProduct,
  onUpdateProducts,
  onDeleteProduct,
  onLogout,
  onNavigateSuperAdmin,
  isLoading = false,
}) {
  const [activeMenuTab, setActiveMenuTab] = useState("agenda");
  const [targetCashierComandaId, setTargetCashierComandaId] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [barberPresenceStatus, setBarberPresenceStatus] = useState("available");
  const [openNewAppointmentTrigger, setOpenNewAppointmentTrigger] = useState(0);

  // Configuração dos 5 itens simétricos da barra inferior mobile (Layout 2 + 1 + 2)
  const mobileNavItems = useMemo(
    () => [
      {
        id: "agenda",
        label: "Agenda",
        title: "Agenda (Home)",
        ariaLabel: "Agenda (Home)",
        icon: <Calendar className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
        isActive: activeMenuTab === "agenda",
      },
      {
        id: "clientes",
        label: "Clientes",
        title: "Clientes",
        ariaLabel: "Clientes",
        icon: <Users className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
        isActive: activeMenuTab === "clientes",
      },
      {
        id: "novo_atendimento",
        label: "Novo Atendimento",
        title: "Novo Atendimento",
        ariaLabel: "Novo Atendimento",
        icon: <Scissors className="w-6 h-6 stroke-[2.2] text-white" />,
        isCenterAction: true,
      },
      {
        id: "financeiro",
        label: "Financeiro",
        title: "Financeiro",
        ariaLabel: "Financeiro",
        icon: <DollarSign className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
        isActive:
          activeMenuTab === "dashboard_financeiro" ||
          activeMenuTab === "caixa" ||
          activeMenuTab === "pagamentos",
      },
      {
        id: "perfil",
        label: "Mais",
        title: "Mais / Perfil",
        ariaLabel: "Mais / Perfil",
        icon: <Menu className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
        isActive:
          activeMenuTab === "perfil" ||
          activeMenuTab === "compartilhar_agenda" ||
          activeMenuTab === "configuracoes" ||
          activeMenuTab === "suporte" ||
          activeMenuTab === "servicos" ||
          activeMenuTab === "profissionais" ||
          activeMenuTab === "indicacoes",
      },
    ],
    [activeMenuTab],
  );

  const handleBottomNavChange = (tabId) => {
    if (tabId === "novo_atendimento") {
      setActiveMenuTab("agenda");
      setOpenNewAppointmentTrigger((prev) => prev + 1);
      return;
    }
    if (tabId === "financeiro") {
      setActiveMenuTab("dashboard_financeiro");
      return;
    }
    if (tabId === "perfil" || tabId === "mais") {
      setActiveMenuTab("perfil");
      return;
    }
    setActiveMenuTab(tabId);
  };

  // [Lazy Initializer: captura o timestamp de referência de forma idempotente na montagem]
  const [referenceDate] = useState(() => new Date());

  // [Cálculo derivado: dias restantes calculado apenas se a conta estiver no modo TRIAL]
  const isCurrentTrial = isTenantTrial(tenant);
  const trialEnds = tenant?.trial_ends_at || tenant?.trialEndsAt;
  const realDaysLeft = isCurrentTrial
    ? (trialEnds
        ? Math.max(
            0,
            Math.ceil(
              (new Date(trialEnds).getTime() - referenceDate.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : (tenant?.trialDaysLeft ?? 7))
    : 0;

  const hasTrialBanner = Boolean(isCurrentTrial && realDaysLeft !== undefined && realDaysLeft !== null);

  // Sincroniza o status ativo do plano da barbearia a partir do Supabase e escuta alterações em tempo real
  useEffect(() => {
    let isMounted = true;
    const tenantId = tenant?.id || "788299e3-a26c-4a0b-bc71-c7ae81ed40d3";

    async function syncTenantPlanFromSupabase() {
      try {
        const [bRes, tRes] = await Promise.all([
          supabase
            .from("barbershops")
            .select("subscription_plan, plan, trial_ends_at, payment_status")
            .eq("id", tenantId)
            .maybeSingle(),
          supabase
            .from("tenants")
            .select("plan, status, trial_days_left, trial_ends_at, mrr, payment_status")
            .eq("id", tenantId)
            .maybeSingle(),
        ]);

        const bData = bRes?.data;
        const tData = tRes?.data;

        const bSubPlan = String(bData?.subscription_plan || "").toLowerCase().trim();
        const tPlan = String(tData?.plan || "").toLowerCase().trim();
        const tStatus = String(tData?.status || "").toLowerCase().trim();
        const bPaymentStatus = String(bData?.payment_status || "").toLowerCase().trim();
        const tPaymentStatus = String(tData?.payment_status || "").toLowerCase().trim();

        // Se barbershops ou tenants indicarem modo trial, a prioridade absoluta é TRIAL
        const isDbTrial =
          bSubPlan === "trial" ||
          bSubPlan.includes("teste") ||
          tPlan === "trial" ||
          tPlan.includes("teste") ||
          tStatus === "trial" ||
          bPaymentStatus === "trial" ||
          tPaymentStatus === "trial";

        if (isMounted && onUpdateTenant) {
          if (isDbTrial) {
            const trialDays = Number(tData?.trial_days_left ?? 7);
            const trialEnds = tData?.trial_ends_at || bData?.trial_ends_at;

            const updated = {
              ...tenant,
              plan: "trial",
              subscription_plan: "Plano de Teste",
              status: "trial",
              payment_status: "trial",
              paymentStatus: "trial",
              trialDaysLeft: trialDays,
              trial_days_left: trialDays,
              trial_ends_at: trialEnds,
              trialEndsAt: trialEnds,
            };

            onUpdateTenant(updated);

            try {
              safeStorage.setItem("saas_active_tenant", JSON.stringify(updated));
              safeStorage.setItem("barbearia_tenant_cache", JSON.stringify(updated));
            } catch {}
          } else {
            // Conta pagante (Starter, Pro ou Entreprise)
            const targetPlanCandidate = bSubPlan || tPlan || String(bData?.plan || "").toLowerCase();
            const resolvedPlanName =
              targetPlanCandidate.includes("starter") || targetPlanCandidate.includes("solo")
                ? "Starter"
                : targetPlanCandidate.includes("enterprise") || targetPlanCandidate.includes("entreprise")
                ? "Entreprise"
                : "Pro";

            const resolvedPlanId = resolvedPlanName.toLowerCase();

            const updated = {
              ...tenant,
              plan: resolvedPlanId,
              subscription_plan: resolvedPlanName,
              status: "active",
              payment_status: "paid",
              paymentStatus: "paid",
              trialDaysLeft: 0,
              trial_days_left: 0,
              trial_ends_at: null,
              trialEndsAt: null,
            };

            onUpdateTenant(updated);

            try {
              safeStorage.setItem("saas_active_tenant", JSON.stringify(updated));
              safeStorage.setItem("barbearia_tenant_cache", JSON.stringify(updated));
            } catch {}
          }
        }
      } catch (err) {
        // Non-blocking
      }
    }

    // Executa sincronização inicial
    syncTenantPlanFromSupabase();

    // 1. Canal Supabase Realtime para escutar UPDATE em tempo real nas tabelas barbershops e tenants
    const realtimeChannel = supabase
      .channel(`realtime-plan-sync-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "barbershops",
          filter: `id=eq.${tenantId}`,
        },
        () => {
          if (isMounted) syncTenantPlanFromSupabase();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tenants",
          filter: `id=eq.${tenantId}`,
        },
        () => {
          if (isMounted) syncTenantPlanFromSupabase();
        }
      )
      .subscribe();

    // 2. Ouvinte de evento local customizado para sincronização imediata na mesma janela
    const handlePlanChanged = (event) => {
      if (isMounted) {
        if (!event?.detail?.tenantId || event.detail.tenantId === tenantId) {
          syncTenantPlanFromSupabase();
        }
      }
    };

    const handleOpenPlans = () => setIsPlansModalOpen(true);

    window.addEventListener("saas:tenant-plan-updated", handlePlanChanged);
    window.addEventListener("saas:open-plans-modal", handleOpenPlans);
    window.addEventListener("storage", handlePlanChanged);

    return () => {
      isMounted = false;
      supabase.removeChannel(realtimeChannel);
      window.removeEventListener("saas:tenant-plan-updated", handlePlanChanged);
      window.removeEventListener("saas:open-plans-modal", handleOpenPlans);
      window.removeEventListener("storage", handlePlanChanged);
    };
  }, [tenant?.id]);

  // Contagem precisa de agendamentos ativos de hoje (excluindo cancelados)
  const todayYMD = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const todayActiveAppointments = useMemo(() => {
    if (!Array.isArray(appointments)) return [];
    return appointments.filter((appt) => {
      if (!appt || appt.status === "cancelled" || appt.status === "cancelado") return false;
      const rawDate = appt.date || appt.bookingDate || appt.start_time || appt.created_at || "";
      const dateStr = typeof rawDate === "string" ? rawDate.slice(0, 10) : "";
      return dateStr ? dateStr === todayYMD : true;
    });
  }, [appointments, todayYMD]);

  const activeTenantId = tenant?.id || user?.user_metadata?.barbershop_id || user?.id;
  const { count: clientsCount } = useClientsCount(activeTenantId, clients, { loading: isLoading, user });

  const barbershopMenuItems = [
    {
      id: "agenda",
      label: "Agenda de Atendimento",
      icon: "calendar",
      badge: `${todayActiveAppointments.length} hoje`,
    },
    {
      id: "compartilhar_agenda",
      label: "Compartilhar Agenda",
      icon: "Share2",
    },
    { id: "servicos", label: "Serviços & Produtos", icon: "scissors" },
    { id: "profissionais", label: "Equipe de Barbeiros", icon: "barber" },
    {
      id: "clientes",
      label: "Clientes & Prontuários Técnicos",
      icon: "users",
      badge: `${clientsCount}`,
    },
    {
      id: "financeiro_group",
      label: "Financeiro",
      icon: "dollar",
      children: [
        { id: "caixa", label: "Frente de Caixa (PDV)", icon: "receipt" },
        {
          id: "dashboard_financeiro",
          label: "Dashboard & Big Numbers",
          icon: "barChart",
        },
        {
          id: "pagamentos",
          label: "Pagamentos & Comissões",
          icon: "creditCard",
        },
      ],
    },
    {
      id: "indicacoes",
      label: "Indique & Ganhe",
      icon: "gift",
      badge: "Ganhe 50%",
    },
  ];

  return (
    <div className={barbershopStyles.pageWrapper}>
      {/* Componente: exibe a contagem real calculada do banco e modal de planos */}
      <TrialBanner
        trialDaysLeft={realDaysLeft}
        isPlansModalOpen={isPlansModalOpen}
        setIsPlansModalOpen={setIsPlansModalOpen}
        tenant={tenant}
        user={user}
        onSubscribePlan={async (planId, link, planObj) => {
          const planName =
            planObj?.name ||
            (typeof planId === "string" && planId.includes("teste") ? "Plano de Teste" : planId) ||
            "Plano Ativo";

          const sqlValidPlan = String(planObj?.id || planId).toLowerCase().includes("enterprise")
            ? "enterprise"
            : String(planObj?.id || planId).toLowerCase().includes("starter")
            ? "starter"
            : String(planObj?.id || planId).toLowerCase().includes("teste") || String(planObj?.id || planId).toLowerCase().includes("trial")
            ? "trial"
            : "pro";

          const isNowTrial = sqlValidPlan === "trial";

          const updatedTenant = {
            ...tenant,
            subscription_plan: planName,
            plan: sqlValidPlan,
            status: isNowTrial ? "trial" : "active",
            trial_days_left: isNowTrial ? 7 : 0,
            trialDaysLeft: isNowTrial ? 7 : 0,
          };

          if (onUpdateTenant) {
            onUpdateTenant(updatedTenant);
          }

          try {
            safeStorage.setItem("saas_active_tenant", JSON.stringify(updatedTenant));
            safeStorage.setItem("barbearia_tenant_cache", JSON.stringify(updatedTenant));
          } catch {}

          const tenantId = tenant?.id || "a0000000-0000-0000-0000-000000000001";

          try {
            const barbershopPayload = isNowTrial
              ? {
                  subscription_plan: "trial",
                  payment_status: "trial",
                  trial_ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
                  updated_at: new Date().toISOString(),
                }
              : {
                  plan: sqlValidPlan,
                  subscription_plan: planName,
                  payment_status: "paid",
                  trial_ends_at: null,
                  updated_at: new Date().toISOString(),
                };

            await supabase
              .from("barbershops")
              .update(barbershopPayload)
              .eq("id", tenantId);
          } catch (e) {
            console.warn("Aviso ao atualizar barbershops:", e);
          }

          try {
            await supabase
              .from("tenants")
              .update({
                status: isNowTrial ? "trial" : "active",
                plan: sqlValidPlan,
                payment_status: isNowTrial ? "trial" : "paid",
                trial_days_left: isNowTrial ? 7 : 0,
                trial_ends_at: isNowTrial ? new Date(Date.now() + 7 * 86400000).toISOString() : null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", tenantId);
          } catch (e) {
            console.warn("Aviso ao atualizar tenants:", e);
          }

          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("saas:tenant-plan-updated", {
                detail: {
                  tenantId,
                  plan: sqlValidPlan,
                  subscription_plan: planName,
                  status: isNowTrial ? "trial" : "active",
                  trial_days_left: isNowTrial ? 7 : 0,
                },
              })
            );
          }
        }}
      />

      {/* Banner de alerta: orienta o profissional autônomo a completar o perfil e cadastrar PIX */}
      <ProfileCompletionBanner
        tenant={tenant}
        user={user}
        onCompleteProfile={() => setActiveMenuTab("perfil")}
      />

      <div className={barbershopStyles.layoutBody}>
        {/* SIDEBAR com dados dinâmicos da barbearia, encolhimento e link para planos */}
        <Sidebar
          tenantName={DOMPurify.sanitize(tenant?.name || "Minha Barbearia")}
          tenantPlan={DOMPurify.sanitize(
            isTenantTrial(tenant) ||
            (tenant?.subscription_plan || tenant?.plan || "trial").toLowerCase() === "trial" ||
            String(tenant?.subscription_plan || "").toLowerCase().includes("teste")
              ? "TRIAL"
              : String(tenant?.subscription_plan || tenant?.plan || "TRIAL").toUpperCase()
          )}
          items={barbershopMenuItems}
          activeItem={activeMenuTab}
          onSelect={setActiveMenuTab}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          onOpenPlansModal={() => setIsPlansModalOpen(true)}
          user={
            user || {
              name: tenant?.name ? `Admin ${DOMPurify.sanitize(tenant.name)}` : "Administrador",
              role: "Proprietário",
            }
          }
          onLogout={onLogout}
          onNavigateSuperAdmin={onNavigateSuperAdmin}
        />

        {/* ÁREA CENTRAL */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar
            variant="admin"
            tenant={tenant}
            hasTrialBanner={hasTrialBanner}
            user={
              user || {
                name: tenant?.name ? `Gestor ${DOMPurify.sanitize(tenant.name)}` : "Administrador",
                role: "Proprietário",
              }
            }
            breadcrumbs={[
              "Painel da Barbearia",
              {
                agenda: "Agenda",
                compartilhar_agenda: "Compartilhar Agenda",
                servicos: "Serviços",
                profissionais: "Equipe",
                clientes: "Clientes",
                caixa: "Frente de Caixa",
                dashboard_financeiro: "Financeiro",
                pagamentos: "Pagamentos",
                indicacoes: "Indicações",
                perfil: "Meu Perfil",
                configuracoes: "Configurações",
                suporte: "Suporte",
              }[activeMenuTab] || "Agenda",
            ]}
            barberStatus={barberPresenceStatus}
            onStatusChange={setBarberPresenceStatus}
            notificationsCount={todayActiveAppointments.length}
            onMenuClick={() => setIsMobileSidebarOpen(true)}
            onQuickAction={() => setActiveMenuTab("agenda")}
            onProfileClick={() => setActiveMenuTab("perfil")}
            onSettingsClick={() => setActiveMenuTab("configuracoes")}
            onSupportClick={() => setActiveMenuTab("suporte")}
            onLogout={onLogout}
          />

          <main className={barbershopStyles.mainContent}>
            {isLoading ? (
              <SkeletonDashboard latencyNotice={true} />
            ) : (
              <>
                {/* 1. AGENDA: Consome 'appointments' e 'onUpdateAppointments' */}
                {activeMenuTab === "agenda" && (
                  <ErrorBoundary componentName="Agenda de Atendimentos">
                    <ScheduleView
                      tenant={tenant}
                      user={user}
                      barbers={barbers}
                      appointments={appointments}
                      onUpdateAppointments={onUpdateAppointments}
                      services={services}
                      onAddService={onAddService}
                      clients={clients}
                      onUpdateClients={onUpdateClients}
                      onUpdateClient={onUpdateClient}
                      comandas={comandas}
                      onNavigateToClients={() => setActiveMenuTab("clientes")}
                      onNavigateToCashier={(comandaId) => {
                        setTargetCashierComandaId(comandaId || null);
                        setActiveMenuTab("caixa");
                      }}
                      onNavigateToShareAgenda={() => setActiveMenuTab("compartilhar_agenda")}
                      openNewAppointmentTrigger={openNewAppointmentTrigger}
                    />
                  </ErrorBoundary>
                )}

            {/* 1b. COMPARTILHAR AGENDA: Página dedicada com link público e QR Code da barbearia */}
            {activeMenuTab === "compartilhar_agenda" && (
              <ErrorBoundary componentName="Compartilhar Agenda">
                <div className="space-y-4 max-w-5xl">
                  <TenantBookingLinkCard
                    tenant={tenant}
                    onOpenSettings={() => setActiveMenuTab("configuracoes")}
                  />
                </div>
              </ErrorBoundary>
            )}

            {/* 2. SERVIÇOS & PRODUTOS */}
            {activeMenuTab === "servicos" && (
              <ErrorBoundary componentName="Catálogo de Serviços & Produtos">
                <ServicesAndProductsView
                  services={services}
                  onAddService={onAddService}
                  onUpdateService={onUpdateService}
                  onUpdateServices={onUpdateServices}
                  onDeleteService={onDeleteService}
                  products={products}
                  onAddProduct={onAddProduct}
                  onUpdateProduct={onUpdateProduct}
                  onUpdateProducts={onUpdateProducts}
                  onDeleteProduct={onDeleteProduct}
                  tenant={tenant}
                />
              </ErrorBoundary>
            )}

            {/* 3. EQUIPE DE BARBEIROS: Atualiza a lista oficial */}
            {activeMenuTab === "profissionais" && (
              <ErrorBoundary componentName="Equipe de Barbeiros">
                <BarbersTeamView
                  barbers={barbers}
                  onUpdateBarbers={onUpdateBarbers}
                  tenant={tenant}
                  onBack={() => setActiveMenuTab("agenda")}
                  onOpenPlansModal={() => setIsPlansModalOpen(true)}
                  onNavigateToSupport={() => setActiveMenuTab("suporte")}
                />
              </ErrorBoundary>
            )}

            {/* 4. CLIENTES: Consome 'clients', 'onUpdateClients', 'onUpdateClient' e 'barbers' */}
            {activeMenuTab === "clientes" && (
              <ErrorBoundary componentName="Diretório de Clientes">
                <ClientsDirectoryView
                  clientsList={clients}
                  onUpdateClients={onUpdateClients}
                  onUpdateClient={onUpdateClient}
                  onNavigateToBooking={() => setActiveMenuTab("agenda")}
                  onBack={() => setActiveMenuTab("agenda")}
                  tenant={tenant}
                  barbers={barbers}
                  appointments={appointments}
                  onUpdateAppointments={onUpdateAppointments}
                />
              </ErrorBoundary>
            )}

            {/* 5. FRENTE DE CAIXA (PDV): Consome 'comandas', 'appointments' e 'onUpdateAppointments' */}
            {activeMenuTab === "caixa" && (
              <ErrorBoundary componentName="Frente de Caixa (PDV)">
                <CashierPosView
                  targetComandaId={targetCashierComandaId}
                  onClearTargetComanda={() => setTargetCashierComandaId(null)}
                  sharedComandas={comandas}
                  onUpdateComandas={onUpdateComandas}
                  appointments={appointments}
                  onUpdateAppointments={onUpdateAppointments}
                  tenant={tenant}
                  user={user}
                  barbers={barbers}
                  products={products}
                  onUpdateProducts={onUpdateProducts}
                  onBack={() => setActiveMenuTab("agenda")}
                />
              </ErrorBoundary>
            )}

            {/* 6. DASHBOARD FINANCEIRO E PAGAMENTOS */}
            {(activeMenuTab === "dashboard_financeiro" || activeMenuTab === "pagamentos") && (
              <ErrorBoundary componentName="Dashboard Financeiro & Comissões">
                <FinancialDashboardView
                  initialTab={activeMenuTab === "pagamentos" ? "pagamentos" : "visao_geral"}
                  appointments={appointments}
                  onUpdateAppointments={onUpdateAppointments}
                  barbers={barbers}
                  onUpdateBarbers={onUpdateBarbers}
                  comandas={comandas}
                  onUpdateComandas={onUpdateComandas}
                  tenant={tenant}
                  user={user}
                  onBack={() => setActiveMenuTab("caixa")}
                />
              </ErrorBoundary>
            )}

            {/* Telas secundárias */}
            {activeMenuTab === "indicacoes" && (
              <ErrorBoundary componentName="Programa de Indicações">
                <ReferralProgramView
                  tenant={tenant}
                  onBack={() => setActiveMenuTab("agenda")}
                />
              </ErrorBoundary>
            )}
            {activeMenuTab === "perfil" && (
              <ErrorBoundary componentName="Perfil do Usuário">
                <UserProfileView
                  user={user}
                  tenant={tenant}
                  onUpdateUser={onUpdateUser}
                  onUpdateTenant={onUpdateTenant}
                  onBack={() => setActiveMenuTab("agenda")}
                  onLogout={onLogout}
                />
              </ErrorBoundary>
            )}
            {activeMenuTab === "configuracoes" && (
              <ErrorBoundary componentName="Configurações da Barbearia">
                <BarbershopSettingsView
                  tenant={tenant}
                  onUpdateTenant={onUpdateTenant}
                  onBack={() => setActiveMenuTab("agenda")}
                />
              </ErrorBoundary>
            )}
            {activeMenuTab === "suporte" && (
              <ErrorBoundary componentName="Central de Suporte">
                <SupportView onBack={() => setActiveMenuTab("agenda")} />
              </ErrorBoundary>
            )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* 5. NAVEGAÇÃO INFERIOR MOBILE FIXA (LAYOUT ERGONÔMICO 2 + 1 + 2) */}
      <BottomNavigation
        items={mobileNavItems}
        activeItem={activeMenuTab}
        onChange={handleBottomNavChange}
        onNavigate={setActiveMenuTab}
        onLogout={onLogout}
      />
    </div>
  );
}
