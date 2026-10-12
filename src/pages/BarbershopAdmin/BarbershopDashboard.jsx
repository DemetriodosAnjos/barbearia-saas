import { useState, useEffect } from "react";
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
import { supabase } from "../../lib/supabase";
import { safeStorage } from "../../utils/safeStorage";

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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isPlansModalOpen, setIsPlansModalOpen] = useState(false);
  const [barberPresenceStatus, setBarberPresenceStatus] = useState("available");

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

  // Sincroniza o status ativo do plano da barbearia a partir do Supabase na inicialização
  useEffect(() => {
    let isMounted = true;
    const tenantId = tenant?.id || "a0000000-0000-0000-0000-000000000001";

    async function syncTenantPlanFromSupabase() {
      try {
        const [bRes, tRes] = await Promise.all([
          supabase
            .from("barbershops")
            .select("subscription_plan, plan, trial_ends_at")
            .eq("id", tenantId)
            .maybeSingle(),
          supabase
            .from("tenants")
            .select("plan, status, trial_days_left, trial_ends_at, mrr")
            .eq("id", tenantId)
            .maybeSingle(),
        ]);

        const bData = bRes?.data;
        const tData = tRes?.data;

        // Avalia se o registro no banco indica trial ou plano pago
        const rawSubPlan = bData?.subscription_plan || tenant?.subscription_plan || "";
        const rawPlan = tData?.plan || bData?.plan || tenant?.plan || "";
        const combinedPlanStr = `${rawSubPlan} ${rawPlan}`.toLowerCase().trim();

        const isPaidPlan =
          combinedPlanStr.includes("starter") ||
          combinedPlanStr.includes("pro") ||
          combinedPlanStr.includes("enterprise") ||
          combinedPlanStr.includes("entreprise") ||
          combinedPlanStr.includes("solo") ||
          combinedPlanStr.includes("franquia");

        const isDbTrial = !isPaidPlan && (
          tData?.status === "trial" ||
          combinedPlanStr.includes("trial") ||
          combinedPlanStr.includes("teste")
        );

        if (isMounted && onUpdateTenant) {
          if (isPaidPlan) {
            const resolvedPlanName =
              bData?.subscription_plan ||
              (rawPlan.includes("starter") || rawPlan.includes("solo")
                ? "Starter"
                : rawPlan.includes("enterprise")
                  ? "Entreprise"
                  : "Pro");

            onUpdateTenant({
              ...tenant,
              plan: tData?.plan || bData?.plan || "starter",
              subscription_plan: resolvedPlanName,
              status: "active",
              trialDaysLeft: 0,
              trial_days_left: 0,
              trial_ends_at: null,
              trialEndsAt: null,
            });
          } else if (isDbTrial) {
            onUpdateTenant({
              ...tenant,
              plan: "trial",
              subscription_plan: "Plano de Teste",
              status: "trial",
              trialDaysLeft: Number(tData?.trial_days_left ?? 7),
              trial_days_left: Number(tData?.trial_days_left ?? 7),
              trial_ends_at: tData?.trial_ends_at || bData?.trial_ends_at,
              trialEndsAt: tData?.trial_ends_at || bData?.trial_ends_at,
            });
          }
        }
      } catch (err) {
        // Non-blocking
      }
    }

    syncTenantPlanFromSupabase();

    return () => {
      isMounted = false;
    };
  }, [tenant?.id]);

  const barbershopMenuItems = [
    {
      id: "agenda",
      label: "Agenda de Atendimentos",
      icon: "calendar",
      badge: `${appointments.length} hoje`,
    },
    { id: "servicos", label: "Serviços & Produtos", icon: "scissors" },
    { id: "profissionais", label: "Equipe de Barbeiros", icon: "barber" },
    {
      id: "clientes",
      label: "Clientes & Prontuário",
      icon: "users",
      badge: `${clients.length}`,
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
      ],
    },
    {
      id: "indicacoes",
      label: "Indique & Ganhe 50%",
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
            await supabase
              .from("barbershops")
              .update({
                subscription_plan: planName,
                plan: sqlValidPlan,
                updated_at: new Date().toISOString(),
              })
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
                trial_days_left: isNowTrial ? 7 : 0,
                updated_at: new Date().toISOString(),
              })
              .eq("id", tenantId);
          } catch (e) {
            console.warn("Aviso ao atualizar tenants:", e);
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
            (tenant?.subscription_plan || tenant?.plan || "trial").toLowerCase() === "trial"
              ? "TRIAL"
              : tenant?.subscription_plan || tenant?.plan || "TRIAL"
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
            user={
              user || {
                name: tenant?.name ? `Gestor ${DOMPurify.sanitize(tenant.name)}` : "Administrador",
                role: "Proprietário",
              }
            }
            breadcrumbs={["Painel da Barbearia", activeMenuTab.toUpperCase()]}
            barberStatus={barberPresenceStatus}
            onStatusChange={setBarberPresenceStatus}
            notificationsCount={appointments.length}
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
                      onNavigateToCashier={() => setActiveMenuTab("caixa")}
                    />
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
                />
              </ErrorBoundary>
            )}

            {/* 4. CLIENTES: Consome 'clients' e 'onUpdateClients' */}
            {activeMenuTab === "clientes" && (
              <ErrorBoundary componentName="Diretório de Clientes">
                <ClientsDirectoryView
                  clientsList={clients}
                  onUpdateClients={onUpdateClients}
                  onNavigateToBooking={() => setActiveMenuTab("agenda")}
                  onBack={() => setActiveMenuTab("agenda")}
                />
              </ErrorBoundary>
            )}

            {/* 5. FRENTE DE CAIXA (PDV): Consome 'comandas', 'appointments' e 'onUpdateAppointments' */}
            {activeMenuTab === "caixa" && (
              <ErrorBoundary componentName="Frente de Caixa (PDV)">
                <CashierPosView
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

            {/* 6. DASHBOARD FINANCEIRO */}
            {activeMenuTab === "dashboard_financeiro" && (
              <ErrorBoundary componentName="Dashboard Financeiro & Comissões">
                <FinancialDashboardView
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
    </div>
  );
}
