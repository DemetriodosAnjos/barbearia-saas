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
  tenant = {
    name: "Barbearia Vintage Club",
    plan: "Plano Pro Multi-Cadeiras",
    slug: "vintage-club",
    trialDaysLeft: 6,
  },
  // 👇 TODAS AS PROPRIEDADES AGORA SÃO RECEBIDAS E CONSUMIDAS!
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
      <TrialBanner
        trialDaysLeft={tenant.trialDaysLeft}
        onSubscribePlan={(plan) => console.log("Plano assinado:", plan)}
      />

      <div className={barbershopStyles.layoutBody}>
        {/* SIDEBAR */}
        <Sidebar
          tenantName={tenant.name}
          tenantPlan={tenant.plan}
          items={barbershopMenuItems}
          activeItem={activeMenuTab}
          onSelect={setActiveMenuTab}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          user={{ name: "Carlos Silva", role: "Proprietário / Admin" }}
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
              <UserProfileView onBack={() => setActiveMenuTab("agenda")} />
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
