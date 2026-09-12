import { useState } from "react";
import DesignSystem from "./pages/DesignSystem";
import OnboardingWizard from "./pages/Onboarding/OnboardingWizard";
import Login from "./pages/Auth/Login";
import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import BarbershopDashboard from "./pages/BarbershopAdmin/BarbershopDashboard";

export default function App() {
  // Tela inicial: 'barbershop' | 'superadmin' | 'onboarding' | 'login' | 'design-system'
  const [currentScreen, setCurrentScreen] = useState("barbershop");

  return (
    <div>
      {/* Barra Superior para Navegar entre as Telas do Protótipo */}
      <div className="bg-neutral-900 border-b border-neutral-800 p-2.5 flex flex-wrap justify-center gap-2 sm:gap-3 text-xs z-50 sticky top-0 shadow-lg select-none">
        <span className="text-neutral-500 font-bold self-center">
          Navegação do Protótipo:
        </span>

        {/* 1. Painel da Barbearia */}
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

        {/* 2. SuperAdmin */}
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

        {/* 3. Onboarding */}
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

        {/* 4. Login */}
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

        {/* 5. UI Kit */}
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

      {/* RENDERIZAÇÃO DA TELA ATIVA */}
      {currentScreen === "barbershop" && (
        <BarbershopDashboard onLogout={() => setCurrentScreen("login")} />
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
