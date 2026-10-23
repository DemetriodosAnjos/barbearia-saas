import React from "react";
import { Clock, Check } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default {
  title: "Design System/UI/Card",
  component: Card,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Card flexível do Design System para serviços, profissionais, estatísticas e agrupamento de conteúdo.",
      },
    },
    chromatic: { delay: 200, diffThreshold: 0.05 },
  },
  argTypes: {
    title: { control: "text", description: "Título do card" },
    description: { control: "text", description: "Descrição de apoio" },
    variant: {
      control: { type: "select" },
      options: ["default", "clickable", "selected", "flat"],
      description: "Estilo visual do card",
    },
    isClickable: { control: "boolean", description: "Habilita efeito hover e cursor pointer" },
    isSelected: { control: "boolean", description: "Aplica borda e realce âmbar de seleção" },
    isLoading: { control: "boolean", description: "Exibe skeleton animado no lugar do conteúdo" },
  },
};

// 1. Estado Padrão (Default)
export const Default = {
  args: {
    title: "Corte Tradicional / Degradê",
    description: "Corte com máquina e tesoura, finalização com pomada e toalha quente",
    variant: "default",
    children: (
      <div className="flex items-center justify-between text-xs text-neutral-400 mt-2">
        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /> 45 min</span>
        <span className="text-amber-400 font-bold text-sm">R$ 50,00</span>
      </div>
    ),
  },
};

// 2. Estado Clicável / Hover (Clickable / Hover)
export const Clickable = {
  args: {
    title: "Barba & Terapia Facial",
    description: "Alinhamento com navalha, esfoliação e hidratação com óleos essenciais",
    isClickable: true,
    children: (
      <div className="flex items-center justify-between text-xs text-neutral-400 mt-2">
        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /> 30 min</span>
        <span className="text-amber-400 font-bold text-sm">R$ 35,00</span>
      </div>
    ),
  },
};

// 3. Estado Selecionado (Selected / Active)
export const Selected = {
  args: {
    title: "Combo VIP (Corte + Barba + Sobrancelha)",
    description: "Experiência completa com bebida de cortesia e massagem capilar",
    isSelected: true,
    children: (
      <div className="flex items-center justify-between text-xs text-neutral-400 mt-2">
        <span className="text-emerald-400 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Item Selecionado</span>
        <span className="text-amber-400 font-bold text-base">R$ 90,00</span>
      </div>
    ),
  },
};

// 4. Estado de Carregamento (Loading Skeleton)
export const LoadingSkeleton = {
  args: {
    title: "Título de Exemplo",
    description: "Descrição que será substituída pelo skeleton",
    isLoading: true,
  },
};

// 5. Card com Cabeçalho e Ação (With Header Action & Footer)
export const WithHeaderAndFooter = {
  args: {
    title: "Faturamento Diário",
    description: "Total acumulado no caixa de hoje",
    headerAction: (
      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
        +14.8% hoje
      </span>
    ),
    children: (
      <div className="py-2">
        <div className="text-2xl font-bold font-mono text-white">R$ 1.840,00</div>
        <p className="text-xs text-neutral-400 mt-1">24 clientes atendidos nas 4 cadeiras</p>
      </div>
    ),
    footer: (
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-400">Meta diária: R$ 2.000,00</span>
        <Button variant="secondary" size="sm">Ver Extrato</Button>
      </div>
    ),
  },
};

// 6. Estado Desabilitado (Disabled Card)
export const DisabledCard = {
  args: {
    title: "Serviço Temporariamente Indisponível",
    description: "Equipamento em manutenção na unidade",
    variant: "default",
    className: "opacity-50 pointer-events-none border-neutral-800 bg-neutral-950",
    children: (
      <div className="text-xs text-neutral-500 mt-2 font-mono">
        STATUS: DESABILITADO
      </div>
    ),
  },
};

// 7. Estado de Erro / Alerta (Error State Card)
export const ErrorStateCard = {
  args: {
    title: "Falha na Sincronização de Agenda",
    description: "Não foi possível carregar a grade de horários do profissional",
    variant: "default",
    className: "border-rose-500/50 bg-rose-950/20 text-rose-200",
    headerAction: (
      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
        ERRO 503
      </span>
    ),
  },
};

// Matriz de Todos os Estados para Regressão Visual
export const AllStatesMatrix = {
  render: () => (
    <div className="flex flex-col gap-4 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl">
      <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
        Matriz de Estados do Card (Visual Regression Baseline)
      </h4>
      <div className="space-y-3">
        <Card title="1. DEFAULT CARD" description="Card padrão com borda neutra e fundo sutil" />
        <Card
          title="2. CLICKABLE / HOVER CARD"
          description="Efeito hover ativo com transição suave de escala e borda iluminada"
          isClickable
        />
        <Card
          title="3. SELECTED CARD"
          description="Borda âmbar 500 destacada com anel de seleção ativa"
          isSelected
        />
        <Card title="4. LOADING SKELETON CARD" isLoading />
      </div>
    </div>
  ),
};
