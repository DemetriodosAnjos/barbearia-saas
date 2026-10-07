import React, { useState } from "react";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";

export default {
  title: "Design System/UI/Modal",
  component: Modal,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Janela modal acessível (WAI-ARIA dialog) com backdrop fosco, armadilha de foco, suporte à tecla Escape e estados de confirmação e alerta.",
      },
    },
    chromatic: { delay: 300, diffThreshold: 0.05 },
  },
  argTypes: {
    isOpen: { control: "boolean", description: "Visibilidade do modal" },
    title: { control: "text", description: "Título do cabeçalho acessível" },
    onClose: { action: "closed" },
  },
};

// 1. Estado Aberto Padrão (Default Open)
export const DefaultOpen = {
  args: {
    isOpen: true,
    title: "Confirmar Horário de Atendimento",
    children: (
      <div className="space-y-3 text-neutral-300 text-sm">
        <p>Você selecionou o serviço <strong>Corte Masculino + Barba</strong> no dia <strong>15/10 às 14:30</strong> com o profissional <strong>Carlos Silva</strong>.</p>
        <p className="text-xs text-neutral-400">Total a pagar na barbearia: <span className="text-amber-400 font-bold">R$ 75,00</span></p>
      </div>
    ),
    footer: (
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm">Cancelar</Button>
        <Button variant="primary" size="sm">Confirmar Reserva</Button>
      </div>
    ),
  },
};

// 2. Estado Diálogo de Confirmação Crítica (Active Danger Modal)
export const CriticalConfirmation = {
  args: {
    isOpen: true,
    title: "Cancelar Agendamento?",
    children: (
      <div className="space-y-2 text-neutral-300 text-sm">
        <p className="text-rose-300 font-semibold">Atenção: Esta ação não pode ser desfeita.</p>
        <p className="text-xs text-neutral-400">O horário das 14:30 será liberado imediatamente para outros clientes na agenda online.</p>
      </div>
    ),
    footer: (
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm">Manter Agendamento</Button>
        <Button variant="danger" size="sm">Sim, Cancelar Agora</Button>
      </div>
    ),
  },
};

// 3. Estado com Conteúdo Extenso (Long Scrollable Content)
export const ScrollableContent = {
  args: {
    isOpen: true,
    title: "Termos de Uso e Política de Cancelamento",
    children: (
      <div className="space-y-3 text-neutral-300 text-xs max-h-48 overflow-y-auto pr-2">
        <p><strong>1. Tolerância de Atraso:</strong> É garantida tolerância máxima de 10 minutos após o horário agendado.</p>
        <p><strong>2. Cancelamento Antecipado:</strong> O cancelamento sem custos deve ser efetuado com no mínimo 2 horas de antecedência.</p>
        <p><strong>3. Não Comparecimento (No-Show):</strong> Clientes com 2 faltas consecutivas sem aviso prévio necessitarão de pré-pagamento para novas reservas.</p>
        <p><strong>4. Tratamento de Dados (LGPD):</strong> Seus dados de contato são utilizados estritamente para lembretes de agendamento e acúmulo de pontos de fidelidade.</p>
        <p><strong>5. Formas de Pagamento:</strong> Aceitamos Pix, Cartão de Crédito/Débito e Dinheiro diretamente no balcão.</p>
      </div>
    ),
    footer: (
      <div className="flex justify-end">
        <Button variant="primary" size="sm">Li e Concordo</Button>
      </div>
    ),
  },
};

// 4. Estado Desabilitado (Disabled Actions inside Modal)
export const DisabledActions = {
  args: {
    isOpen: true,
    title: "Processando Pagamento",
    children: (
      <div className="space-y-2 text-neutral-300 text-sm">
        <p>Aguardando confirmação do Pix no gateway Mercado Pago...</p>
        <p className="text-xs text-amber-400">Os botões ficam desabilitados durante a conciliação.</p>
      </div>
    ),
    footer: (
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" disabled>Cancelar</Button>
        <Button variant="primary" size="sm" disabled isLoading>Aguardando Pix</Button>
      </div>
    ),
  },
};

// 5. Estado Hover no Botão Fechar e Ações
export const HoverCloseButton = {
  args: {
    isOpen: true,
    title: "Modal com Foco e Hover",
    children: <p className="text-sm text-neutral-300">Hover no botão fechar ativa anel dourado.</p>,
  },
  parameters: {
    pseudo: { hover: true },
  },
};

// 6. Exemplo Interativo com Controle de Estado
const InteractiveTriggerModal = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-8 text-center">
      <Button variant="primary" onClick={() => setOpen(true)}>
        Abrir Modal Interativo
      </Button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Resumo do Serviço Selecionado"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Salvar
            </Button>
          </div>
        }
      >
        <p className="text-sm text-neutral-300">
          Modal renderizado com transições de fade e backdrop escuro 80% opacity.
        </p>
      </Modal>
    </div>
  );
};

export const InteractiveTrigger = {
  render: () => <InteractiveTriggerModal />,
};
