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

// Catálogo Central Oficial de Serviços da Barbearia
const initialSharedServices = [
  {
    id: "s1",
    name: "Corte Degradê Navalhado",
    description:
      "Acabamento de precisão na navalha, lavagem refrescante e pomada matte inclusa.",
    category: "Cabelo",
    durationMinutes: 40,
    price: 55,
    commissionPercent: 50,
    onlineBooking: true,
    tag: "Mais Pedido ⭐",
  },
  {
    id: "s2",
    name: "Barboterapia Tradicional",
    description:
      "Toalha quente com óleos essenciais, massagem facial e alinhamento na lâmina.",
    category: "Barba",
    durationMinutes: 30,
    price: 45,
    commissionPercent: 50,
    onlineBooking: true,
  },
  {
    id: "s3",
    name: "Combo VIP: Cabelo + Barba",
    description:
      "Experiência completa com direito a cerveja artesanal ou café cortesia.",
    category: "Combos",
    durationMinutes: 70,
    price: 90,
    commissionPercent: 45,
    onlineBooking: true,
    tag: "15% OFF",
  },
  {
    id: "s4",
    name: "Corte na Tesoura Clássico",
    description:
      "Corte tradicional totalmente executado na tesoura com alinhamento de fios.",
    category: "Cabelo",
    durationMinutes: 60,
    price: 50,
    commissionPercent: 50,
    onlineBooking: true,
  },
];

export default function BarbershopDashboard({
  tenant = {
    name: "Barbearia Vintage Club",
    plan: "Plano Pro Multi-Cadeiras",
    slug: "vintage-club",
    trialDaysLeft: 6,
  },
  onLogout,
}) {
  const [activeMenuTab, setActiveMenuTab] = useState("agenda");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [barberPresenceStatus, setBarberPresenceStatus] = useState("available");

  // 👇 FONTE ÚNICA DA VERDADE: O Catálogo Oficial fica centralizado aqui!
  const [services, setServices] = useState(initialSharedServices);

  // Função para adicionar novo serviço de qualquer lugar do sistema
  const handleAddNewService = (newService) => {
    setServices((prev) => [newService, ...prev]);
  };

  // Atualiza um serviço existente
  const handleUpdateService = (updatedService) => {
    setServices((prev) =>
      prev.map((s) => (s.id === updatedService.id ? updatedService : s)),
    );
  };

  // Desativação Segura (Soft Delete): marca active = false
  const handleDeleteService = (serviceId) => {
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, active: false } : s)),
    );
  };

  const barbershopMenuItems = [
    {
      id: "agenda",
      label: "Agenda de Atendimentos",
      icon: "📅",
      badge: "3 hoje",
    },
    { id: "servicos", label: "Serviços & Produtos", icon: "✂️" },
    { id: "profissionais", label: "Equipe de Barbeiros", icon: "💈" },
    { id: "clientes", label: "Clientes & Prontuário", icon: "👥" },
    { id: "caixa", label: "Frente de Caixa (PDV)", icon: "🧾" },
    { id: "financeiro", label: "Relatórios Financeiros", icon: "💰" },
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

        <div className="flex-1 flex flex-col min-w-0">
          <Navbar
            variant="admin"
            breadcrumbs={["Painel da Barbearia", activeMenuTab.toUpperCase()]}
            barberStatus={barberPresenceStatus}
            onStatusChange={setBarberPresenceStatus}
            notificationsCount={3}
            onMenuClick={() => setIsMobileSidebarOpen(true)}
            onQuickAction={() => setActiveMenuTab("servicos")}
            onProfileClick={() => setActiveMenuTab("perfil")}
            onSettingsClick={() => setActiveMenuTab("configuracoes")}
            onSupportClick={() => setActiveMenuTab("suporte")}
            onLogout={onLogout}
          />

          <main className={barbershopStyles.mainContent}>
            {/* 1. AGENDA: Recebe os serviços e a função de cadastrar novo on-the-fly */}
            {activeMenuTab === "agenda" && (
              <ScheduleView
                services={services}
                onAddService={handleAddNewService}
                onNavigateToCashier={() => setActiveMenuTab("caixa")}
              />
            )}

            {/* 2. SERVIÇOS & PRODUTOS: Consome a mesma lista compartilhada! */}
            {activeMenuTab === "servicos" && (
              <ServicesAndProductsView
                services={services}
                onAddService={handleAddNewService}
                onUpdateService={handleUpdateService}
                onDeleteService={handleDeleteService}
              />
            )}

            {/* Telas complementares */}
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
            {activeMenuTab === "indicacoes" && (
              <ReferralProgramView onBack={() => setActiveMenuTab("agenda")} />
            )}
            {activeMenuTab === "profissionais" && (
              <BarbersTeamView onBack={() => setActiveMenuTab("agenda")} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
