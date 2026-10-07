import React from "react";
import Button from "../components/ui/Button";

export default {
  title: "Design System/UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Botão essencial do Design System com suporte a estados default, hover, active, disabled, loading e danger, além de anéis de foco WCAG :focus-visible.",
      },
    },
    chromatic: { delay: 200, diffThreshold: 0.05 },
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["primary", "secondary", "outline", "danger"],
      description: "Variante visual do botão",
    },
    disabled: { control: "boolean", description: "Estado desabilitado" },
    isLoading: { control: "boolean", description: "Estado de carregamento com spinner SVG" },
    children: { control: "text", description: "Conteúdo textual ou elementos" },
    onClick: { action: "clicked" },
  },
};

// 1. Estado Padrão (Default)
export const Default = {
  args: {
    children: "Agendar Horário",
    variant: "primary",
    disabled: false,
    isLoading: false,
  },
};

// 2. Estado Hover / Foco Visível
export const HoverAndFocus = {
  args: {
    children: "Hover / :focus-visible",
    variant: "primary",
    className: "ring-2 ring-amber-400 bg-amber-500 scale-[1.02]",
  },
  parameters: {
    pseudo: { hover: true, focusVisible: true },
  },
};

// 3. Estado Ativo (Active / Pressionado)
export const Active = {
  args: {
    children: "Botão Pressionado",
    variant: "primary",
    className: "scale-95 bg-amber-700 shadow-inner",
  },
  parameters: {
    pseudo: { active: true },
  },
};

// 4. Estado Desabilitado (Disabled)
export const Disabled = {
  args: {
    children: "Ação Indisponível",
    variant: "primary",
    disabled: true,
  },
};

// 5. Estado de Carregamento (Loading)
export const Loading = {
  args: {
    children: "Processando Agendamento...",
    variant: "primary",
    isLoading: true,
  },
};

// 6. Estado de Erro / Destrutivo (Danger)
export const Danger = {
  args: {
    children: "Cancelar Agendamento",
    variant: "danger",
  },
};

// 7. Variante Secundária (Secondary)
export const Secondary = {
  args: {
    children: "Voltar para Início",
    variant: "secondary",
  },
};

// 8. Variante Outline
export const Outline = {
  args: {
    children: "Ver Detalhes do Serviço",
    variant: "outline",
  },
};

// Matriz de Todos os Estados para Regressão Visual
export const AllStatesMatrix = {
  render: () => (
    <div className="flex flex-col gap-4 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg">
      <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
        Matriz de Estados do Botão (Visual Regression Baseline)
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-neutral-400 font-mono block mb-1">DEFAULT</span>
          <Button variant="primary" className="w-full">Confirmar</Button>
        </div>
        <div>
          <span className="text-[10px] text-neutral-400 font-mono block mb-1">HOVER / FOCUS</span>
          <Button variant="primary" className="w-full ring-2 ring-amber-400 bg-amber-500">Confirmar</Button>
        </div>
        <div>
          <span className="text-[10px] text-neutral-400 font-mono block mb-1">ACTIVE</span>
          <Button variant="primary" className="w-full scale-95 bg-amber-700">Confirmar</Button>
        </div>
        <div>
          <span className="text-[10px] text-neutral-400 font-mono block mb-1">DISABLED</span>
          <Button variant="primary" disabled className="w-full">Confirmar</Button>
        </div>
        <div>
          <span className="text-[10px] text-neutral-400 font-mono block mb-1">LOADING</span>
          <Button variant="primary" isLoading className="w-full">Carregando</Button>
        </div>
        <div>
          <span className="text-[10px] text-neutral-400 font-mono block mb-1">DANGER / ERROR</span>
          <Button variant="danger" className="w-full">Excluir</Button>
        </div>
      </div>
    </div>
  ),
};
