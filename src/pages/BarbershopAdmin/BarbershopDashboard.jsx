import { useState } from "react";
import { barbershopStyles } from "./BarbershopDashboard.styles";
import Sidebar from "../../components/ui/Sidebar";
import Navbar from "../../components/ui/Navbar";
import TrialBanner from "../../components/dashboard/TrialBanner";
import ServicesAndProductsView from "./ServicesAndProductsView";
import NewAppointmentModal from "../../components/calendar/NewAppointmentModal";
import UserProfileView from "./UserProfileView";
import BarbershopSettingsView from "./BarbershopSettingsView";
import SupportView from "./SupportView";

export default function BarbershopDashboard({
  tenant = {
    name: "Barbearia Vintage Club",
    plan: "Plano Pro Multi-Cadeiras",
    slug: "vintage-club",
    trialDaysLeft: 6,
  },
  onLogout,
}) {
  const [activeMenuTab, setActiveMenuTab] = useState("servicos");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [barberPresenceStatus, setBarberPresenceStatus] = useState("available");
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] =
    useState(false);

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
  ];

  return (
    <div className={barbershopStyles.pageWrapper}>
      {/* 1. BANNER DE CONTAGEM REGRESSIVA DOS 7 DIAS GRÁTIS */}
      <TrialBanner
        trialDaysLeft={tenant.trialDaysLeft}
        onSubscribePlan={(plan) => {
          console.log("Plano assinado:", plan);
        }}
      />

      <div className={barbershopStyles.layoutBody}>
        {/* 2. SIDEBAR DA BARBEARIA */}
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

        {/* 3. ÁREA DE TRABALHO (NAVBAR + CONTEÚDO) */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Navbar Superior do Painel */}
          <Navbar
            variant="admin"
            breadcrumbs={["Painel da Barbearia", activeMenuTab.toUpperCase()]}
            barberStatus={barberPresenceStatus}
            onStatusChange={setBarberPresenceStatus}
            notificationsCount={3}
            onMenuClick={() => setIsMobileSidebarOpen(true)}
            onQuickAction={() => setIsNewAppointmentModalOpen(true)}
            onProfileClick={() => setActiveMenuTab("perfil")}
            onSettingsClick={() => setActiveMenuTab("configuracoes")}
            onSupportClick={() => setActiveMenuTab("suporte")}
            onLogout={onLogout}
          />

          {/* Área Central Fluida */}
          <main className={barbershopStyles.mainContent}>
            {/* Tela 1: Meu Perfil */}
            {activeMenuTab === "perfil" && (
              <UserProfileView onBack={() => setActiveMenuTab("servicos")} />
            )}

            {/* Tela 2: Configurações da Barbearia */}
            {activeMenuTab === "configuracoes" && (
              <BarbershopSettingsView
                onBack={() => setActiveMenuTab("servicos")}
              />
            )}

            {/* Tela 3: Central de Suporte (NOVO!) */}
            {activeMenuTab === "suporte" && (
              <SupportView onBack={() => setActiveMenuTab("servicos")} />
            )}

            {/* Tela 4: Serviços & Produtos */}
            {activeMenuTab === "servicos" && <ServicesAndProductsView />}

            {/* Outras telas em montagem */}
            {activeMenuTab !== "servicos" &&
              activeMenuTab !== "perfil" &&
              activeMenuTab !== "configuracoes" &&
              activeMenuTab !== "suporte" && (
                <div className="p-12 text-center text-sm text-neutral-400 space-y-3 bg-neutral-900 border border-neutral-800 rounded-3xl">
                  <p className="text-xl font-bold text-white">
                    Módulo em Montagem: {activeMenuTab.toUpperCase()}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveMenuTab("servicos")}
                    className="text-xs text-amber-500 font-bold underline cursor-pointer"
                  >
                    ← Voltar para Serviços & Produtos
                  </button>
                </div>
              )}
          </main>
        </div>
      </div>
      {/* MODAL OPERACIONAL DE NOVO AGENDAMENTO */}
      <NewAppointmentModal
        isOpen={isNewAppointmentModalOpen}
        onClose={() => setIsNewAppointmentModalOpen(false)}
        onSaveAppointment={(appointment) => {
          alert(
            `🎉 AGENDAMENTO CONFIRMADO COM SUCESSO!\n\n` +
              `• Cliente: ${appointment.clientName}\n` +
              `• WhatsApp: ${appointment.clientPhone}\n` +
              `• Barbeiro: ${appointment.barberName}\n` +
              `• Serviço: ${appointment.serviceName} (R$ ${appointment.price},00)\n` +
              `• Horário: ${appointment.startTime}h • Duração: ${appointment.durationMinutes} min\n\n` +
              `Horário bloqueado na agenda e notificação pronta para envio!`,
          );
        }}
      />
    </div>
  );
}
