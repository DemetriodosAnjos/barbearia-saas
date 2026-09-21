import { useState } from "react";
import DesignSystem from "./pages/DesignSystem";
import OnboardingWizard from "./pages/Onboarding/OnboardingWizard";
import Login from "./pages/Auth/Login";
import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import BarbershopDashboard from "./pages/BarbershopAdmin/BarbershopDashboard";
import ClientBookingView from "./pages/ClientBooking/ClientBookingView";

// 1. Catálogo Oficial de Serviços Compartilhado
const initialSharedServices = [
  {
    id: "s1",
    name: "Corte Degradê Navalhado",
    category: "Cabelo",
    durationMinutes: 40,
    price: 55,
    active: true,
  },
  {
    id: "s2",
    name: "Barboterapia Tradicional",
    category: "Barba",
    durationMinutes: 30,
    price: 45,
    active: true,
  },
  {
    id: "s3",
    name: "Combo VIP: Cabelo + Barba",
    category: "Combos",
    durationMinutes: 70,
    price: 90,
    active: true,
  },
  {
    id: "s4",
    name: "Corte na Tesoura Clássico",
    category: "Cabelo",
    durationMinutes: 60,
    price: 50,
    active: true,
  },
];

// 👇 2. EQUIPE OFICIAL DE BARBEIROS COMPARTILHADA (FONTE ÚNICA DA VERDADE)
const initialSharedBarbers = [
  {
    id: "barber-carlos",
    name: "Carlos Silva",
    displayName: "Carlos Navalha",
    role: "Master Barber",
    avatar: "CS",
    rating: 4.9,
    reviewCount: 168,
    status: "active", // Ativo -> Aparece para o cliente!
    specialties: ["Degradê Navalhado", "Barboterapia", "Tesoura"],
    breaks: [{ startTime: "12:00", endTime: "13:00", label: "Almoço Carlos" }],
  },
  {
    id: "barber-marcos",
    name: "Marcos Vinicius",
    displayName: "Marquinhos",
    role: "Especialista Degradê",
    avatar: "MV",
    rating: 4.8,
    reviewCount: 94,
    status: "active", // Ativo -> Aparece para o cliente!
    specialties: ["Pigmentação", "Platinado / Nevou"],
    breaks: [{ startTime: "13:00", endTime: "14:00", label: "Almoço Marcos" }],
  },
  {
    id: "barber-tiago",
    name: "Tiago Santos",
    displayName: "Tiago Barbeiro",
    role: "Barba & Navalha",
    avatar: "TS",
    rating: 4.7,
    reviewCount: 82,
    status: "vacation", // 👈 FÉRIAS: Não deve aparecer no app do cliente!
    specialties: ["Corte Clássico", "Barba Alinhada"],
    breaks: [{ startTime: "12:30", endTime: "13:30", label: "Almoço Tiago" }],
  },
];

// Agendamentos Compartilhados
const initialSharedAppointments = [
  {
    id: "apt-1",
    barberId: "barber-carlos",
    barberName: "Carlos Silva",
    clientName: "Rodrigo Faro",
    clientPhone: "(11) 98765-4321",
    serviceName: "Corte Degradê Navalhado",
    startTime: "09:00",
    endTime: "10:00",
    durationMinutes: 60,
    price: 55,
    status: "confirmed",
    isPaid: true,
    isVip: true,
  },
  {
    id: "apt-2",
    barberId: "barber-carlos",
    barberName: "Carlos Silva",
    clientName: "Guilherme Boulos",
    clientPhone: "(11) 97654-3210",
    serviceName: "Barboterapia Tradicional",
    startTime: "10:15",
    endTime: "11:00",
    durationMinutes: 45,
    price: 45,
    status: "in_progress",
    isPaid: false,
  },
];

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlScreen = urlParams.get("screen");
  const urlBarber = urlParams.get("barbeiro");
  const urlClient = urlParams.get("cliente");
  const urlPhone = urlParams.get("telefone");

  const [currentScreen, setCurrentScreen] = useState(
    urlScreen || (urlBarber ? "login" : "login"),
  );

  // Estados Centrais do SaaS
  const [appointments, setAppointments] = useState(initialSharedAppointments);
  const [services, setServices] = useState(initialSharedServices);
  const [barbers, setBarbers] = useState(initialSharedBarbers); // 👈 Equipe viva centralizada!

  // Pipeline de Agendamento do Cliente
  const handleClientBookingFinished = (bookingData) => {
    const createdAppointment = {
      id: `apt-${Date.now()}`,
      barberId: bookingData.barberId || "barber-carlos",
      barberName: bookingData.barberName,
      clientName: bookingData.clientName,
      clientPhone: bookingData.clientPhone,
      serviceName: bookingData.services,
      startTime: bookingData.time,
      endTime: bookingData.endTime,
      durationMinutes: bookingData.totalDuration,
      price: bookingData.totalPrice,
      status: "confirmed",
      isPaid: false,
      isVip: false,
    };

    setAppointments((prev) => [...prev, createdAppointment]);

    alert(
      `🎉 AGENDAMENTO SINCRONIZADO COM A AGENDA!\n\n` +
        `• Cliente: ${bookingData.clientName}\n` +
        `• Barbeiro Escolhido: ${bookingData.barberName}\n` +
        `• Horário: ${bookingData.time}h às ${bookingData.endTime}h\n\n` +
        `👉 O corte já está posicionado na coluna de ${bookingData.barberName} no Painel da Barbearia!`,
    );
  };

  return (
    <div>
      {/* Barra de Navegação do Protótipo */}
      <div className="bg-neutral-900 border-b border-neutral-800 p-2.5 flex flex-wrap justify-center gap-2 sm:gap-3 text-xs z-50 sticky top-0 shadow-lg select-none">
        <span className="text-neutral-500 font-bold self-center">
          Navegação do Protótipo:
        </span>

        <button
          type="button"
          onClick={() => setCurrentScreen("client-app")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            currentScreen === "client-app"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-neutral-400 hover:text-white bg-neutral-800/60"
          }`}
        >
          📱 App do Cliente (Agendar)
        </button>

        <button
          type="button"
          onClick={() => setCurrentScreen("barbershop")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            currentScreen === "barbershop"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-neutral-400 hover:text-white bg-neutral-800/60"
          }`}
        >
          ✂️ Painel da Barbearia
        </button>

        <button
          type="button"
          onClick={() => setCurrentScreen("superadmin")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            currentScreen === "superadmin"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-neutral-400 hover:text-white bg-neutral-800/60"
          }`}
        >
          👑 SuperAdmin
        </button>

        <button
          type="button"
          onClick={() => setCurrentScreen("onboarding")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            currentScreen === "onboarding"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-neutral-400 hover:text-white bg-neutral-800/60"
          }`}
        >
          Onboarding
        </button>

        <button
          type="button"
          onClick={() => setCurrentScreen("login")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            currentScreen === "login"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-neutral-400 hover:text-white bg-neutral-800/60"
          }`}
        >
          Login
        </button>

        <button
          type="button"
          onClick={() => setCurrentScreen("design-system")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            currentScreen === "design-system"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-neutral-400 hover:text-white bg-neutral-800/60"
          }`}
        >
          🎨 UI Kit
        </button>
      </div>

      {/* 1. APP DO CLIENTE: Consome os barbeiros e serviços reais! */}
      {currentScreen === "client-app" && (
        <ClientBookingView
          services={services}
          barbers={barbers} // 👈 Passa a equipe oficial de barbeiros!
          initialBarberId={
            urlBarber === "carlos"
              ? "barber-carlos"
              : urlBarber || "barber-carlos"
          }
          initialClientName={urlClient || "Rodrigo Faro"}
          initialClientPhone={urlPhone || "(11) 98765-4321"}
          onFinishBooking={handleClientBookingFinished}
        />
      )}

      {/* 2. PAINEL DA BARBEARIA */}
      {currentScreen === "barbershop" && (
        <BarbershopDashboard
          appointments={appointments}
          services={services}
          barbers={barbers} // 👈 Passa a equipe oficial!
          onUpdateBarbers={setBarbers}
          onAddService={(newServ) => setServices((prev) => [newServ, ...prev])}
          onLogout={() => setCurrentScreen("login")}
        />
      )}

      {currentScreen === "superadmin" && (
        <SuperAdminDashboard onLogout={() => setCurrentScreen("login")} />
      )}

      {currentScreen === "onboarding" && (
        <OnboardingWizard
          onGoToLogin={() => setCurrentScreen("login")}
          onCompleteOnboarding={() => setCurrentScreen("barbershop")}
        />
      )}

      {currentScreen === "login" && (
        <Login
          onGoToSignup={() => setCurrentScreen("onboarding")}
          onLoginSuccess={() => setCurrentScreen("barbershop")}
        />
      )}

      {currentScreen === "design-system" && <DesignSystem />}
    </div>
  );
}
