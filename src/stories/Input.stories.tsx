import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Input } from '../components/ui/Input';
import { Mail, Search, Lock, User } from 'lucide-react';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    simulatedState: {
      control: 'select',
      options: ['default', 'hover', 'focus', 'filled', 'disabled', 'error'],
      description: 'Estado renderizado para comparação de snapshot no Playwright/Chromatic',
    },
    label: { control: 'text' },
    helperText: { control: 'text' },
    errorMessage: { control: 'text' },
    disabled: { control: 'boolean' },
    success: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    label: 'Nome de Usuário',
    placeholder: 'Ex: renato_dev',
    helperText: 'Usado para identificação no Storybook e painel de QA',
    simulatedState: 'default',
  },
};

export const HoverState: Story = {
  args: {
    label: 'E-mail Corporativo',
    placeholder: 'nome@empresa.com',
    simulatedState: 'hover',
    prefixIcon: <Mail className="w-4 h-4" />,
  },
};

export const FocusedState: Story = {
  args: {
    label: 'Chave de Acesso API',
    value: 'dummy_key_mock_456',
    simulatedState: 'focus',
    prefixIcon: <Lock className="w-4 h-4" />,
    helperText: 'Foco ativo com anel de destaque (ring-2 ring-indigo-500/30)',
  },
};

export const FilledState: Story = {
  args: {
    label: 'Telefone de Contato',
    value: '+55 (11) 98765-4321',
    simulatedState: 'filled',
    success: true,
  },
};

export const DisabledState: Story = {
  args: {
    label: 'Identificador do Tenant (Imutável)',
    value: 'tenant_enterprise_cluster_01',
    simulatedState: 'disabled',
    disabled: true,
    helperText: 'Campo desabilitado pelo sistema de permissões RBAC',
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Endereço de Webhook',
    value: 'ftp://invalido-protocolo',
    simulatedState: 'error',
    errorMessage: 'Protocolo inválido: URLs devem iniciar estritamente com https://',
  },
};

export const SearchWithIcon: Story = {
  args: {
    placeholder: 'Buscar componentes, histórias ou tokens...',
    prefixIcon: <Search className="w-4 h-4" />,
    size: 'md',
    simulatedState: 'default',
  },
};

export const MatrixAllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-5 p-6 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 max-w-2xl">
      <div className="text-sm font-semibold text-slate-400">Matriz de Validação Visual de Estados do Input</div>
      <Input label="1. Estado Default" placeholder="Placeholder padrão" simulatedState="default" />
      <Input label="2. Estado Hover" placeholder="Em foco pelo cursor" simulatedState="hover" />
      <Input label="3. Estado Focus" value="Texto em edição..." simulatedState="focus" />
      <Input label="4. Estado Preenchido / Sucesso" value="qa@designsystem.dev" simulatedState="filled" success />
      <Input label="5. Estado Disabled" value="Não editável" simulatedState="disabled" disabled />
      <Input label="6. Estado Erro" value="valor_invalido" simulatedState="error" errorMessage="Falha de formato RFC-5322" />
    </div>
  ),
};
