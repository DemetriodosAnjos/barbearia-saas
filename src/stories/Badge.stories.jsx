import React from "react";
import Badge from "../components/ui/Badge";

export default {
  title: "Design System/UI/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Badge para status de agendamentos, papéis de usuários e alertas visuais.",
      },
    },
    chromatic: { delay: 150, diffThreshold: 0.05 },
  },
  argTypes: {
    status: {
      control: { type: "select" },
      options: ["waiting", "confirmed", "in_progress", "completed", "cancelled", "no_show"],
      description: "Status semântico do badge",
    },
    variant: {
      control: { type: "select" },
      options: ["subtle", "solid", "outline"],
      description: "Estilo visual da badge",
    },
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
      description: "Tamanho do elemento",
    },
    label: { control: "text", description: "Texto customizado opcional" },
  },
};

export const Confirmed = {
  args: {
    status: "confirmed",
    label: "Confirmado",
    variant: "subtle",
  },
};

export const Waiting = {
  args: {
    status: "waiting",
    label: "Aguardando Pagamento",
    variant: "subtle",
  },
};

export const Cancelled = {
  args: {
    status: "cancelled",
    label: "Cancelado",
    variant: "subtle",
  },
};

export const InProgress = {
  args: {
    status: "in_progress",
    label: "Em Atendimento",
    variant: "subtle",
  },
};

export const AllVariantsMatrix = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
      <Badge status="waiting" />
      <Badge status="confirmed" />
      <Badge status="in_progress" />
      <Badge status="completed" />
      <Badge status="cancelled" />
      <Badge status="no_show" />
    </div>
  ),
};
