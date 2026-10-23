import React from 'react';
import { useBarbershop } from '../context/BarbershopContext';
import { ActiveTab } from '../types';
import {
  LayoutDashboard,
  Calendar,
  Receipt,
  Scissors,
  Sparkles,
  Package,
  Users,
  DollarSign,
  Globe,
  Settings,
  RotateCcw,
  BadgeCheck,
} from 'lucide-react';

interface SidebarProps {
  onOpenSaaSSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSaaSSettings }) => {
  const {
    activeTab,
    setActiveTab,
    userRole,
    selectedBarberId,
    setSelectedBarberId,
    barbers,
    settings,
    comandas,
    appointments,
    selectedDate,
    resetToDefaultData,
  } = useBarbershop();

  const openComandasCount = comandas.filter((c) => c.status === 'aberta').length;
  const todayAptsCount = appointments.filter((a) => a.date === selectedDate).length;

  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda de Horários', icon: Calendar, badge: todayAptsCount },
    { id: 'comandas', label: 'Comandas & PDV', icon: Receipt, badge: openComandasCount },
    { id: 'barbeiros', label: 'Barbeiros & Cadeiras', icon: Scissors },
    { id: 'servicos', label: 'Serviços & Catálogo', icon: Sparkles },
    { id: 'clientes', label: 'Clientes & CRM', icon: Users },
    { id: 'financeiro', label: 'Financeiro & Comissões', icon: DollarSign },
    { id: 'portal_cliente', label: 'Portal do Cliente (Web)', icon: Globe },
    { id: 'configuracoes', label: 'Configurações da Barbearia', icon: Settings },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#0d1017] border-r border-slate-800/80 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 select-none overflow-y-auto">
      <div className="p-4 space-y-5">
        {/* If in barber mode, show active barber switcher */}
        {userRole === 'barber' && (
          <div className="p-3 bg-[#151a24] rounded-lg border border-amber-500/30">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 block mb-1.5">
              Cadeira Atual
            </span>
            <select
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              className="w-full bg-[#1c2331] text-xs text-slate-100 rounded p-1.5 border border-slate-700 focus:outline-none focus:border-amber-500 font-medium"
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} (Cadeira {b.chairNumber})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left group ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#151922]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                      isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer & SaaS Plan info */}
      <div className="p-4 border-t border-slate-800/80 space-y-3 bg-[#0a0d13]">
        <div
          onClick={onOpenSaaSSettings}
          className="p-2.5 rounded-lg bg-[#141822] border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1">
              <BadgeCheck className="w-3.5 h-3.5 text-amber-400" />
              Plano {settings.plan.toUpperCase()}
            </span>
            <span className="text-[10px] text-amber-400 font-mono">Ativo</span>
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {settings.chairsCount} Cadeiras · WhatsApp VIP
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
          <span>v2.4.0 · SaaS</span>
          <button
            onClick={() => {
              if (window.confirm('Deseja restaurar os dados de exemplo padrão da barbearia?')) {
                resetToDefaultData();
              }
            }}
            className="flex items-center gap-1 hover:text-amber-400 transition-colors"
            title="Restaurar dados padrão"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
