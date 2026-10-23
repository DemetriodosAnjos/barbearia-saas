import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { Modal } from './Modal';
import { Badge } from './Badge';
import { CreditCard, ShieldCheck, Mail, Lock, ShoppingBag, ArrowRight } from 'lucide-react';

export interface DependentScreensProps {
  simulateCascadingRegression?: boolean; // For QA Studio regression demonstration
}

export const CheckoutScreenPreview: React.FC<DependentScreensProps> = ({
  simulateCascadingRegression = false,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className={`p-6 rounded-xl border ${simulateCascadingRegression ? 'border-rose-500/80 bg-rose-950/10' : 'border-slate-850 bg-slate-900/90'} max-w-xl mx-auto shadow-xl`}>
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-100">Checkout Seguro & Licença</h3>
        </div>
        <Badge variant={simulateCascadingRegression ? 'danger' : 'success'} dot>
          {simulateCascadingRegression ? 'Regressão Detectada' : 'SSL 256-bit'}
        </Badge>
      </div>

      <div className="py-4 space-y-4">
        <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-200">Plano Enterprise UI/QA Suite</div>
            <div className="text-xs text-slate-400 mt-0.5">Assinatura Anual · Licenças Ilimitadas</div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold text-slate-100 font-mono tabular-nums">R$ 1.490,00</div>
            <div className="text-[11px] text-emerald-400">Desconto de 20% aplicado</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="E-mail de Faturamento"
            placeholder="engenheiro@empresa.com.br"
            defaultValue="qa.lead@enterprise.io"
            prefixIcon={<Mail className="w-4 h-4" />}
            size="md"
            simulatedState={simulateCascadingRegression ? 'error' : 'filled'}
            errorMessage={simulateCascadingRegression ? 'Padding colidindo com grid pai' : undefined}
          />
          <Input
            label="Número do Cartão"
            placeholder="0000 0000 0000 0000"
            defaultValue="•••• •••• •••• 4242"
            prefixIcon={<CreditCard className="w-4 h-4" />}
            size="md"
            simulatedState="default"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Transação autenticada via PCI-DSS Compliant Gateway (Mercado Pago / Stripe).</span>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        <div className="text-xs text-slate-400">
          <span>Total: </span>
          <span className="font-semibold text-slate-200 font-mono tabular-nums">R$ 1.490,00</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Voltar
          </Button>
          <Button
            variant={simulateCascadingRegression ? 'destructive' : 'primary'}
            size="sm"
            isLoading={isProcessing}
            onClick={() => {
              setIsProcessing(true);
              setTimeout(() => setIsProcessing(false), 1200);
            }}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Confirmar Pagamento
          </Button>
        </div>
      </div>
    </div>
  );
};

export const DashboardScreenPreview: React.FC<DependentScreensProps> = ({
  simulateCascadingRegression = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          category="Métrica de Qualidade"
          timestamp="Hoje, 04:00"
          title="Taxa de Regressão Visual"
          variant={simulateCascadingRegression ? 'bordered' : 'default'}
          simulatedState={simulateCascadingRegression ? 'error' : 'default'}
          errorMessage={simulateCascadingRegression ? 'Quebra visual por alteração de border-radius' : undefined}
        >
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-100 mt-1">
            {simulateCascadingRegression ? '4.8%' : '0.00%'}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Baseline: 120 snapshots</span>
            <span className={simulateCascadingRegression ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
              {simulateCascadingRegression ? '+4.8% delta' : '100% íntegro'}
            </span>
          </div>
        </Card>

        <Card
          category="Design System Tokens"
          timestamp="v2.4.0"
          title="Tokens CSS Validados"
          variant="default"
        >
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-100 mt-1">
            348 tokens
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Cores, Espaçamentos, Raios, Tipografia
          </div>
        </Card>

        <Card
          category="CI Pipeline"
          timestamp="Chromatic & Playwright"
          title="Status dos Builds"
          variant="interactive"
        >
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
            Passing
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Executado em 1m 42s em Chromium, WebKit & Firefox
          </div>
        </Card>
      </div>
    </div>
  );
};
