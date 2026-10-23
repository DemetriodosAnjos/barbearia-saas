/**
 * @file OnboardingPrototype.tsx
 * @description Protótipo de Onboarding / Boas-vindas para configuração inicial do sistema.
 */

import React, { useState } from 'react';
import { 
  Building2, 
  Key, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles,
  Lock,
  Globe,
  Bell
} from 'lucide-react';
import { SafeHtml } from '../SafeHtml';

export const OnboardingPrototype: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [orgName, setOrgName] = useState('Acme Corporation Brasil');
  const [sector, setSector] = useState('Fintech & E-commerce');
  const [webhookUrl, setWebhookUrl] = useState('https://api.empresa.com.br/v1/webhooks/mercadopago');
  const [secretKey, setSecretKey] = useState('whsec_mock_sample_test_9b72a819fc23de019284');
  const [bioSnippet, setBioSnippet] = useState('Empresa líder em pagamentos digitais com <strong>segurança em tempo real</strong>.');

  return (
    <div className="max-w-2xl mx-auto w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
      {/* Progress Steps Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-mono mb-3">
          <span className="text-indigo-400 font-bold uppercase tracking-wider">
            Passo {currentStep} de 3
          </span>
          <span className="text-zinc-500">
            {currentStep === 1 && '1. Organização'}
            {currentStep === 2 && '2. Webhooks & Segurança'}
            {currentStep === 3 && '3. Conclusão'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className={`h-1.5 rounded-full transition-all ${currentStep >= 1 ? 'bg-indigo-500' : 'bg-zinc-800'}`} />
          <div className={`h-1.5 rounded-full transition-all ${currentStep >= 2 ? 'bg-indigo-500' : 'bg-zinc-800'}`} />
          <div className={`h-1.5 rounded-full transition-all ${currentStep >= 3 ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
        </div>
      </div>

      {/* Step 1: Organização */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Dados da Sua Organização</h3>
              <p className="text-xs text-zinc-400">Configure o nome da conta e informações do seu ambiente.</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 font-mono">
                Razão Social ou Nome do Negócio
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 font-mono">
                Segmento de Atuação
              </label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 font-mono">
                Descrição Pública (Protegida por SafeHtml)
              </label>
              <textarea
                rows={3}
                value={bioSnippet}
                onChange={(e) => setBioSnippet(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <div className="mt-2 p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-xs">
                <span className="text-[10px] font-mono text-emerald-400 block mb-1">Pré-visualização Segura:</span>
                <SafeHtml html={bioSnippet} preset="comment" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-800">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold font-mono flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <span>Avançar para Segurança</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Webhooks & Segurança */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Segurança de Webhook & HMAC</h3>
              <p className="text-xs text-zinc-400">Configuração das chaves criptográficas para integração com o Mercado Pago e APIs.</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 font-mono">
                Endpoint do Webhook (URL de Callback)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 font-mono">
                Chave Secreta de Assinatura (HMAC Secret)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 font-mono text-emerald-400"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                Validação obrigatória com <code className="text-indigo-400">crypto.timingSafeEqual</code> contra ataques de temporização.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold font-mono flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <span>Concluir Onboarding</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Conclusão */}
      {currentStep === 3 && (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
            <Sparkles className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-white">Configuração Concluída com Sucesso!</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Seu ambiente para <strong className="text-white">{orgName}</strong> está pronto. Todas as entradas de dados e requisições externas agora passam automaticamente pelo pipeline de sanitização e HMAC.
          </p>

          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-left text-xs font-mono space-y-2 max-w-md mx-auto">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Organização:</span>
              <span className="text-white font-bold">{orgName}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Proteção XSS:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ativa (&lt;SafeHtml&gt;)
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Webhook HMAC:</span>
              <span className="text-indigo-400 font-bold">SHA-256 Configurado</span>
            </div>
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition-all cursor-pointer"
            >
              Reiniciar Tour
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
