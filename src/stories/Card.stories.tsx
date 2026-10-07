import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MoreHorizontal, ArrowUpRight } from 'lucide-react';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'interactive', 'bordered'],
    },
    simulatedState: {
      control: 'select',
      options: ['default', 'hover', 'active', 'disabled', 'error'],
    },
    title: { control: 'text' },
    subtitle: { control: 'text' },
    category: { control: 'text' },
    timestamp: { control: 'text' },
    author: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    category: 'Design Tokens',
    timestamp: 'Set 2026',
    author: 'Equipe QA',
    title: 'Diretrizes de Consistência Visual',
    subtitle: 'Especificações de espaçamento, tipografia e raios de borda para prevenção de regressão visual.',
    variant: 'default',
    simulatedState: 'default',
    footerContent: (
      <>
        <span>Status: Validado no CI</span>
        <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
          Ver Tokens
        </Button>
      </>
    ),
  },
};

export const InteractiveHover: Story = {
  args: {
    category: 'Relatório Automatizado',
    timestamp: 'Hoje, 04:12',
    title: 'Auditoria de Regressão Visual #1084',
    subtitle: 'Nenhuma alteração pixel-a-pixel detectada na suíte de 64 componentes.',
    variant: 'interactive',
    simulatedState: 'hover',
  },
};

export const ErrorState: Story = {
  args: {
    category: 'Alerta de Regressão',
    timestamp: 'Há 5 minutos',
    title: 'Falha no Snapshot de Checkout Dialog',
    subtitle: 'Diferença de 1.4% detectada no botão primário após refatoração de padding.',
    variant: 'default',
    simulatedState: 'error',
    errorMessage: 'Diferença excedeu a tolerância máxima estipulada de 0.20%.',
  },
};

export const DisabledState: Story = {
  args: {
    category: 'Módulo Obsoleto',
    timestamp: 'Descontinuado',
    title: 'Legado: Antigo Seletor de Cores v1',
    subtitle: 'Este componente foi substituído pela nova suíte de tokens CSS nativos.',
    variant: 'default',
    simulatedState: 'disabled',
  },
};

export const MatrixAllStates: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-slate-950 text-slate-100 rounded-xl border border-slate-800">
      <Card
        category="1. Default"
        title="Card em Estado Padrão"
        subtitle="Superfície lisa com borda sutil de 1px e tipografia em hierarquia."
        variant="default"
        simulatedState="default"
      />
      <Card
        category="2. Hover"
        title="Card em Estado Hover"
        subtitle="Borda destacada e sutil reflexo de iluminação para affordance interativa."
        variant="interactive"
        simulatedState="hover"
      />
      <Card
        category="3. Erro"
        title="Card em Estado de Falha"
        subtitle="Alerta semáforo com contraste visual e mensagem descritiva de erro."
        variant="default"
        simulatedState="error"
        errorMessage="Incompatibilidade de dimensões com o contêiner"
      />
      <Card
        category="4. Desabilitado"
        title="Card Desabilitado"
        subtitle="Opacidade reduzida e interação suprimida sem comprometer a legibilidade."
        variant="default"
        simulatedState="disabled"
      />
    </div>
  ),
};
