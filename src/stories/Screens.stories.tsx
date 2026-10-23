import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { CheckoutScreenPreview, DashboardScreenPreview } from '../components/ui/DependentScreens';

const meta: Meta = {
  title: 'Dependent Screens/Cascading Visual Test',
  tags: ['autodocs'],
};

export default meta;

export const CheckoutScreenClean: StoryObj = {
  render: () => (
    <div className="p-6 bg-slate-950 min-h-[500px]">
      <div className="text-xs text-slate-400 mb-4 font-mono">
        Ambiente de Teste: Tela de Checkout Integrada com Button, Input e Modal
      </div>
      <CheckoutScreenPreview simulateCascadingRegression={false} />
    </div>
  ),
};

export const CheckoutScreenWithCascadingBreak: StoryObj = {
  render: () => (
    <div className="p-6 bg-slate-950 min-h-[500px]">
      <div className="text-xs text-rose-400 mb-4 font-mono">
        Alerta de Regressão: Componente Button alterado isoladamente causou quebra de layout na tela dependente
      </div>
      <CheckoutScreenPreview simulateCascadingRegression={true} />
    </div>
  ),
};

export const DashboardScreenClean: StoryObj = {
  render: () => (
    <div className="p-6 bg-slate-950">
      <DashboardScreenPreview simulateCascadingRegression={false} />
    </div>
  ),
};
