import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'info', 'success'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    isOpen: { control: 'boolean' },
    inlinePreview: { control: 'boolean' },
    title: { control: 'text' },
    description: { control: 'text' },
    primaryActionLabel: { control: 'text' },
    secondaryActionLabel: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const DefaultInlineSnapshot: Story = {
  args: {
    isOpen: true,
    inlinePreview: true,
    title: 'Criar Novo Componente no Design System',
    description: 'Adicione as especificações do componente e configure seus tokens.',
    variant: 'default',
    size: 'md',
    primaryActionLabel: 'Criar Componente',
    secondaryActionLabel: 'Cancelar',
    children: (
      <div className="space-y-3">
        <Input label="Nome do Componente" placeholder="Ex: SegmentedControl" simulatedState="default" />
        <Input label="Categoria" placeholder="Ex: Navigation / Inputs" simulatedState="default" />
      </div>
    ),
  },
};

export const DestructiveConfirmation: Story = {
  args: {
    isOpen: true,
    inlinePreview: true,
    variant: 'destructive',
    size: 'sm',
    title: 'Excluir Histórico de Snapshots?',
    description: 'Esta ação removerá todos os 48 baselines visuais anteriores desta branch. Esta operação não pode ser desfeita.',
    primaryActionLabel: 'Excluir Definitivamente',
    secondaryActionLabel: 'Manter Baselines',
  },
};

export const InteractiveTrigger: Story = {
  render: function RenderInteractive() {
    const [open, setOpen] = useState(false);
    return (
      <div className="p-8 flex flex-col items-start gap-4">
        <Button variant="primary" onClick={() => setOpen(true)}>
          Abrir Modal em Camada Real
        </Button>
        <Modal
          isOpen={open}
          onClose={() => setOpen(false)}
          title="Modal Interativo com Backdrop"
          description="Pressione Esc ou clique em Fechar para dispensar este diálogo."
          primaryActionLabel="Concluir"
          onPrimaryAction={() => setOpen(false)}
        >
          <p className="text-sm text-slate-300">
            Este modal renderiza sobre a tela com efeito de desfoque (backdrop-blur-xs) e isolamento de foco acessível (WAI-ARIA Dialog).
          </p>
        </Modal>
      </div>
    );
  },
};
