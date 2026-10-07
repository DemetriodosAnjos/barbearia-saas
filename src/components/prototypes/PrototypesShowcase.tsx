/**
 * @file PrototypesShowcase.tsx
 * @description Central de visualização dos protótipos do sistema (Login, Dashboard, Onboarding).
 */

import React, { useState } from 'react';
import { LoginPrototype } from './LoginPrototype';
import { DashboardPrototype } from './DashboardPrototype';
import { OnboardingPrototype } from './OnboardingPrototype';
import { 
  LogIn, 
  LayoutDashboard, 
  UserPlus, 
  Sparkles, 
  Laptop, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export type PrototypeView = 'LOGIN' | 'DASHBOARD' | 'ONBOARDING';

export const PrototypesShowcase: React.FC = () => {
  const [activePrototype, setActivePrototype] = useState<PrototypeView>('DASHBOARD');

  return (
    <div className="space-y-6">
      {/* Prototype Navigation Header */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg backdrop-blur flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              PROTÓTIPOS DO SISTEMA
            </span>
            <span className="text-xs text-zinc-400 font-mono">Telas Integradas com SafeHtml</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
            <Laptop className="w-5 h-5 text-indigo-400" />
            Galeria de Telas & Protótipos Interativos
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Acesse as telas completas de autenticação, painel administrativo e boas-vindas do sistema.
          </p>
        </div>

        {/* Sub-selector for Prototypes */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-zinc-950 border border-zinc-800 w-full md:w-auto">
          <button
            onClick={() => setActivePrototype('LOGIN')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activePrototype === 'LOGIN'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login</span>
          </button>

          <button
            onClick={() => setActivePrototype('DASHBOARD')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activePrototype === 'DASHBOARD'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActivePrototype('ONBOARDING')}
            className={`flex-1 md:flex-initial px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activePrototype === 'ONBOARDING'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Onboarding</span>
          </button>
        </div>
      </div>

      {/* Render Active Prototype */}
      <div className="transition-all duration-200">
        {activePrototype === 'LOGIN' && (
          <div className="py-4">
            <LoginPrototype onSuccess={() => setActivePrototype('DASHBOARD')} />
          </div>
        )}

        {activePrototype === 'DASHBOARD' && (
          <DashboardPrototype />
        )}

        {activePrototype === 'ONBOARDING' && (
          <div className="py-4">
            <OnboardingPrototype />
          </div>
        )}
      </div>
    </div>
  );
};

export const PrototypeShowcase = PrototypesShowcase;

