import { useState } from "react";
import { barbershopStyles } from "./BarbershopDashboard.styles";
import Sidebar from "../../components/ui/Sidebar";
import Navbar from "../../components/ui/Navbar";
import TrialBanner from "../../components/dashboard/TrialBanner";
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

export default function BarbershopDashboard({
  tenant, // Objeto real da barbearia vindo do Supabase
  user, // Objeto do usuário autenticado (Auth Supabase)
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
  onLogout,
}) {
  const [activeMenuTab, setActiveMenuTab] = useState("agenda");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [barberPresenceStatus, setBarberPresenceStatus] = useState("available");

  // [Lazy Initializer: captura o timestamp de referência de forma idempotente na montagem]
  const [referenceDate] = useState(() => new Date());

  // [Cálculo derivado puro: cálculo determinístico sem efeitos colaterais ou cascatas]
  const trialEnds = tenant?.trial_ends_at || tenant?.trialEndsAt;
  const realDaysLeft = trialEnds
    ? Math.max(
        0,
        Math.ceil(
          (new Date(trialEnds).getTime() - referenceDate.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : (tenant?.trialDaysLeft ?? null);

  const barbershopMenuItems = [
    {
      id: "agenda",
      label: "Agenda de Atendimentos",
      icon: "📅",
      badge: `${appointments.length} hoje`,
    },
    { id: "servicos", label: "Serviços & Produtos", icon: "✂️" },
    { id: "profissionais", label: "Equipe de Barbeiros", icon: "💈" },
    {
      id: "clientes",
      label: "Clientes & Prontuário",
      icon: "👥",
      badge: `${clients.length}`,
    },
    {
      id: "financeiro_group",
      label: "Financeiro",
      icon: "💰",
      children: [
        { id: "caixa", label: "Frente de Caixa (PDV)", icon: "🧾" },
        {
          id: "dashboard_financeiro",
          label: "Dashboard & Big Numbers",
          icon: "📊",
        },
      ],
    },
    {
      id: "indicacoes",
      label: "Indique & Ganhe 50%",
      icon: "🎁",
      badge: "Ganhe 50%",
    },
  ];

  return (
    <div className={barbershopStyles.pageWrapper}>
      {/* Componente: exibe a contagem real calculada do banco */}
      <TrialBanner
        trialDaysLeft={realDaysLeft}
        onSubscribePlan={(plan) => console.log("Plano assinado:", plan)}
      />

      <div className={barbershopStyles.layoutBody}>
        {/* SIDEBAR com dados dinâmicos da barbearia e do usuário logado */}
        <Sidebar
          tenantName={tenant?.name || "Minha Barbearia"}
          tenantPlan={tenant?.subscription_plan || tenant?.plan || "Plano Pro"}
          items={barbershopMenuItems}
          activeItem={activeMenuTab}
          onSelect={setActiveMenuTab}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          user={
            user || {
              name: tenant?.name ? `Admin ${tenant.name}` : "Administrador",
              role: "Proprietário",
            }
          }
          onLogout={onLogout}
        />

        {/* ÁREA CENTRAL */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar
            variant="admin"
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
            {/* 1. AGENDA: Consome 'appointments' e 'onUpdateAppointments' */}
            {activeMenuTab === "agenda" && (
              <ScheduleView
                barbers={barbers}
                appointments={appointments}
                onUpdateAppointments={onUpdateAppointments}
                services={services}
                onAddService={onAddService}
                onNavigateToCashier={() => setActiveMenuTab("caixa")}
              />
            )}

            {/* 2. SERVIÇOS & PRODUTOS */}
            {activeMenuTab === "servicos" && (
              <ServicesAndProductsView
                services={services}
                onAddService={onAddService}
              />
            )}

            {/* 3. EQUIPE DE BARBEIROS: Atualiza a lista oficial */}
            {activeMenuTab === "profissionais" && (
              <BarbersTeamView
                barbers={barbers}
                onUpdateBarbers={onUpdateBarbers}
                onBack={() => setActiveMenuTab("agenda")}
              />
            )}

            {/* 4. CLIENTES: Consome 'clients' e 'onUpdateClients' */}
            {activeMenuTab === "clientes" && (
              <ClientsDirectoryView
                clientsList={clients}
                onUpdateClients={onUpdateClients}
                onNavigateToBooking={() => setActiveMenuTab("agenda")}
                onBack={() => setActiveMenuTab("agenda")}
              />
            )}

            {/* 5. FRENTE DE CAIXA (PDV): Consome 'comandas' e 'onUpdateComandas' */}
            {activeMenuTab === "caixa" && (
              <CashierPosView
                sharedComandas={comandas}
                onUpdateComandas={onUpdateComandas}
                onBack={() => setActiveMenuTab("agenda")}
              />
            )}

            {/* 6. DASHBOARD FINANCEIRO */}
            {activeMenuTab === "dashboard_financeiro" && (
              <FinancialDashboardView
                onBack={() => setActiveMenuTab("caixa")}
              />
            )}

            {/* Telas secundárias */}
            {activeMenuTab === "indicacoes" && (
              <ReferralProgramView onBack={() => setActiveMenuTab("agenda")} />
            )}
            {activeMenuTab === "perfil" && (
              <UserProfileView
                user={user}
                tenant={tenant}
                onBack={() => setActiveMenuTab("agenda")}
              />
            )}
            {activeMenuTab === "configuracoes" && (
              <BarbershopSettingsView
                onBack={() => setActiveMenuTab("agenda")}
              />
            )}
            {activeMenuTab === "suporte" && (
              <SupportView onBack={() => setActiveMenuTab("agenda")} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
