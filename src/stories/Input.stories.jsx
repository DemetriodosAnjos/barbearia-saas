import React, { useState } from "react";
import Input from "../components/ui/Input";

export default {
  title: "Design System/UI/Input",
  component: Input,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Campo de entrada do Design System com suporte a estados default, hover, active/focus, disabled, error (com WAI-ARIA aria-describedby) e máscaras.",
      },
    },
    chromatic: { delay: 200, diffThreshold: 0.05 },
  },
  argTypes: {
    label: { control: "text", description: "Rótulo visível do campo" },
    placeholder: { control: "text", description: "Texto de placeholder" },
    error: { control: "text", description: "Mensagem de erro de validação" },
    helperText: { control: "text", description: "Texto explicativo de apoio" },
    disabled: { control: "boolean", description: "Estado desabilitado" },
    type: { control: "text", description: "Tipo HTML do input" },
  },
};

// 1. Estado Padrão (Default)
export const Default = {
  args: {
    label: "Nome do Cliente",
    placeholder: "Ex: Carlos Silva",
    helperText: "Digite seu nome completo para a reserva",
    disabled: false,
  },
};

// 2. Estado Ativo / Focado (Active / Focused)
export const Focused = {
  args: {
    label: "Nome do Cliente",
    placeholder: "Ex: Carlos Silva",
    value: "Carlos Sil",
    className: "ring-2 ring-amber-400 border-amber-400",
  },
  parameters: {
    pseudo: { focus: true, focusVisible: true },
  },
};

// 3. Estado Preenchido (Filled)
export const Filled = {
  args: {
    label: "E-mail de Notificação",
    value: "carlos.silva@barbearia.com.br",
    type: "email",
  },
};

// 4. Estado Desabilitado (Disabled)
export const Disabled = {
  args: {
    label: "Código da Unidade (Tenant ID)",
    value: "barber-sp-pinheiros-01",
    disabled: true,
    helperText: "Este campo não pode ser alterado após o cadastro",
  },
};

// 5. Estado de Erro de Validação (Error)
export const WithError = {
  args: {
    label: "Telefone Celular / WhatsApp",
    value: "119999",
    error: "Telefone incompleto. Informe DDD + 9 dígitos válidos.",
    mask: "phone",
  },
};

// 6. Estado com Máscara e Helper Text
const MaskedPhoneComponent = (args) => {
  const [val, setVal] = useState("");
  return (
    <Input
      label="Telefone (WhatsApp)"
      placeholder="(11) 99999-9999"
      mask="phone"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      helperText="Enviaremos lembretes 2 horas antes do corte"
      {...args}
    />
  );
};

export const MaskedPhone = {
  render: (args) => <MaskedPhoneComponent {...args} />,
};

// Matriz de Todos os Estados para Regressão Visual
export const AllStatesMatrix = {
  render: () => (
    <div className="flex flex-col gap-4 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg">
      <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
        Matriz de Estados do Input (Visual Regression Baseline)
      </h4>
      <div className="space-y-3">
        <Input label="1. DEFAULT" placeholder="Digite seu nome..." />
        <Input
          label="2. ACTIVE / FOCUSED"
          value="Texto em edição..."
          className="ring-2 ring-amber-400 border-amber-400"
        />
        <Input
          label="3. FILLED"
          value="guilherme@exemplo.com.br"
          helperText="E-mail verificado"
        />
        <Input
          label="4. DISABLED"
          value="barbearia-premium-01"
          disabled
          helperText="Campo bloqueado pelo sistema"
        />
        <Input
          label="5. ERROR (WCAG ARIA)"
          value="11888"
          error="Formato inválido para celular"
        />
      </div>
    </div>
  ),
};
