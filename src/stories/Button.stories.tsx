import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Button } from '../components/ui/Button';
import { ArrowRight, Check, Trash2, Send } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'destructive', 'ghost'],
      description: 'Estilo visual do botão segundo o Design System',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Dimensão e padding vertical/horizontal',
    },
    simulatedState: {
      control: 'select',
      options: ['default', 'hover', 'active', 'disabled', 'error', 'loading'],
      description: 'Estado estático para auditoria de regressão visual',
    },
    isLoading: { control: 'boolean' },
    isError: { control: 'boolean' },
    disabled: { control: 'boolean' },
    errorMessage: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Salvar Alterações',
    simulatedState: 'default',
  },
};

export const HoverState: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Estado Hover (Simulado)',
    simulatedState: 'hover',
  },
};

export const ActiveState: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Pressionado (Active)',
    simulatedState: 'active',
  },
};

export const DisabledState: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Ação Desabilitada',
    simulatedState: 'disabled',
    disabled: true,
  },
};

export const ErrorState: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Falha no Envio',
    simulatedState: 'error',
    isError: true,
    errorMessage: 'Erro 422: Falha na validação de permissão',
  },
};

export const LoadingState: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Sincronizando...',
    simulatedState: 'loading',
    isLoading: true,
  },
};

export const WithIcons: Story = {
  args: {
    variant: 'secondary',
    size: 'md',
    children: 'Avançar Etapa',
    rightIcon: <ArrowRight className="w-4 h-4" />,
    simulatedState: 'default',
  },
};

export const DestructiveVariant: Story = {
  args: {
    variant: 'destructive',
    size: 'md',
    children: 'Excluir Registro',
    leftIcon: <Trash2 className="w-4 h-4" />,
    simulatedState: 'default',
  },
};

export const MatrixAllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-6 p-6 bg-slate-950 text-slate-100 rounded-xl border border-slate-800">
      <div className="text-sm font-semibold text-slate-400">Matriz de Estados para Captura Visual Snapshot</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 items-start">
        <div className="space-y-1">
          <span className="text-[11px] text-slate-500 font-mono">1. Default</span>
          <Button variant="primary" simulatedState="default">Default</Button>
        </div>
        <div className="space-y-1">
          <span className="text-[11px] text-slate-500 font-mono">2. Hover</span>
          <Button variant="primary" simulatedState="hover">Hover</Button>
        </div>
        <div className="space-y-1">
          <span className="text-[11px] text-slate-500 font-mono">3. Active</span>
          <Button variant="primary" simulatedState="active">Active</Button>
        </div>
        <div className="space-y-1">
          <span className="text-[11px] text-slate-500 font-mono">4. Disabled</span>
          <Button variant="primary" simulatedState="disabled" disabled>Disabled</Button>
        </div>
        <div className="space-y-1">
          <span className="text-[11px] text-slate-500 font-mono">5. Error</span>
          <Button variant="primary" simulatedState="error" errorMessage="Inválido">Erro</Button>
        </div>
        <div className="space-y-1">
          <span className="text-[11px] text-slate-500 font-mono">6. Loading</span>
          <Button variant="primary" simulatedState="loading" isLoading>Aguarde</Button>
        </div>
      </div>
    </div>
  ),
};
