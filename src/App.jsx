import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import DesignSystem from "./pages/DesignSystem";
import OnboardingWizard from "./pages/Onboarding/OnboardingWizard";
import Login from "./pages/Auth/Login";
import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import BarbershopDashboard from "./pages/BarbershopAdmin/BarbershopDashboard";
import ClientBookingView from "./pages/ClientBooking/ClientBookingView";
import QAPanel from "./pages/QAPanel/QAPanel";

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlScreen = urlParams.get("screen");
  const urlBarber = urlParams.get("barbeiro");
  const urlClient = urlParams.get("cliente");
  const urlPhone = urlParams.get("telefone");

  const [currentScreen, setCurrentScreen] = useState(
    urlScreen || (urlBarber ? "login" : "login"),
  );

  // Estados Centrais do SaaS (Iniciam 100% vazios, sem dados fictícios)
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [connectionError, setConnectionError] = useState(null);

  // [Função useCallback: memoriza a busca para evitar recriação na memória e loops]
  const loadDataFromSupabase = useCallback(async () => {
    try {
      setLoadingData(true);
      setConnectionError(null);

      // 1. Método Promise.all: busca serviços, barbeiros e agendamentos simultaneamente
      const [servicesRes, barbersRes, appointmentsRes] = await Promise.all([
        supabase.from("services").select("*").order("name"),
        supabase.from("barbers").select("*").order("name"),
        supabase.from("appointments").select("*").order("start_time"),
      ]);

      if (servicesRes.error) throw servicesRes.error;
      if (barbersRes.error) throw barbersRes.error;
      if (appointmentsRes.error) throw appointmentsRes.error;

      // 2. Normalização tolerante de Serviços (camelCase e snake_case)
      const formattedServices = (servicesRes.data || []).map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category || "Cabelo",
        durationMinutes: s.duration_minutes || s.durationMinutes || 30,
        price: Number(s.price) || 0,
        active: s.active ?? true,
      }));

      // 3. Normalização tolerante de Barbeiros
      const formattedBarbers = (barbersRes.data || []).map((b) => ({
        id: b.id,
        name: b.name,
        displayName: b.display_name || b.name,
        role: b.role || "Barbeiro",
        avatar:
          b.avatar || (b.name ? b.name.substring(0, 2).toUpperCase() : "💈"),
        rating: Number(b.rating) || 5.0,
        reviewCount: b.review_count || 0,
        status: b.status || "active",
        specialties: b.specialties || [],
        breaks: b.breaks || [],
      }));

      // 4. Normalização tolerante de Agendamentos
      const formattedAppointments = (appointmentsRes.data || []).map((a) => ({
        id: a.id,
        barberId: a.barber_id || a.barberId,
        barberName: a.barber_name || a.barberName,
        clientName: a.client_name || a.clientName,
        clientPhone: a.client_phone || a.clientPhone,
        serviceName: a.service_name || a.serviceName,
        startTime: a.start_time || a.startTime,
        endTime: a.end_time || a.endTime,
        durationMinutes: a.duration_minutes || a.durationMinutes || 30,
        price: Number(a.price) || 0,
        status: a.status || "confirmed",
        isPaid: a.is_paid ?? a.isPaid ?? false,
        isVip: a.is_vip ?? a.isVip ?? false,
      }));

      // Atualização dos estados reais
      setServices(formattedServices);
      setBarbers(formattedBarbers);
      setAppointments(formattedAppointments);
    } catch (error) {
      console.error("Erro ao sincronizar com o Supabase:", error);
      setConnectionError(
        "Não foi possível conectar ao banco de dados. Verifique sua conexão com a internet.",
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  // [Efeito de ciclo de vida: dispara a busca apenas na montagem com dependência estável]
  useEffect(() => {
    loadDataFromSupabase();
  }, [loadDataFromSupabase]);

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

  // 1. Tela de Carregamento Suave
  if (loadingData) {
    return (
      <div className="min-h-screen w-full bg-neutral-950 flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-neutral-400">
          Sincronizando barbearia com a nuvem...
        </p>
      </div>
    );
  }

  // 2. Tela de Erro de Conexão com Botão "Tentar Novamente"
  if (connectionError) {
    return (
      <div className="min-h-screen w-full bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center text-xl mb-4">
          ⚠️
        </div>
        <h3 className="text-base font-bold text-white mb-1">Erro de Conexão</h3>
        <p className="text-xs text-neutral-400 max-w-sm mb-5 leading-relaxed">
          {connectionError}
        </p>
        <button
          onClick={loadDataFromSupabase}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow-lg transition-all"
        >
          Tentar Novamente ↻
        </button>
      </div>
    );
  }

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

        <button
          type="button"
          onClick={() => setCurrentScreen("qa-panel")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            currentScreen === "qa-panel"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-neutral-400 hover:text-white bg-neutral-800/60"
          }`}
        >
          🧪 QA Studio
        </button>
      </div>

      {/* 1. APP DO CLIENTE: Consome os barbeiros e serviços reais! */}
      {currentScreen === "client-app" && (
        <ClientBookingView
          tenant={tenant}
          services={services}
          barbers={barbers}
          onFinishBooking={handleFinishBooking}
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

      {currentScreen === "qa-panel" && <QAPanel />}
    </div>
  );
}
