import React from 'react';
import { X, CheckCircle2, Shield, Eye, Layers, Monitor, Smartphone, Tablet } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export interface VerMaisModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedFilesCount: number;
  totalStoriesCount: number;
  toleranceThreshold: number;
  cascadingSafetyScore: number;
}

export const VerMaisModal: React.FC<VerMaisModalProps> = ({
  isOpen,
  onClose,
  scannedFilesCount,
  totalStoriesCount,
  toleranceThreshold,
  cascadingSafetyScore,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              <span>Detalhamento Completo das Métricas & Big Numbers</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Auditoria avançada de qualidade de Design System e Regressão Visual no Storybook
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Grid de 3 Pilares */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Arquitetura de Teste</div>
              <div className="text-2xl font-bold text-slate-100 font-mono mt-1">Playwright + Chromatic</div>
              <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>CI Pipeline Integrada</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Tolerância Estrita</div>
              <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">{toleranceThreshold}%</div>
              <div className="text-xs text-slate-400 mt-2">
                Filtro inteligente de anti-aliasing SSIM
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Segurança em Cascata</div>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">{cascadingSafetyScore}%</div>
              <div className="text-xs text-slate-400 mt-2">
                Telas integradas protegidas contra quebras
              </div>
            </div>
          </div>

          {/* Matriz de Viewports e Navegadores */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Monitor className="w-4 h-4 text-indigo-400" />
              <span>Matriz de Dispositivos e Navegadores Suportados</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-start gap-3">
                <Monitor className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200 text-xs">Desktop Baseline</div>
                  <div className="text-xs text-slate-400 font-mono">1440 × 900 px</div>
                  <div className="text-[11px] text-slate-500 mt-1">Chromium & WebKit</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-start gap-3">
                <Tablet className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200 text-xs">Tablet Viewport</div>
                  <div className="text-xs text-slate-400 font-mono">768 × 1024 px</div>
                  <div className="text-[11px] text-slate-500 mt-1">iPad Air / Safari</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200 text-xs">Mobile Touch</div>
                  <div className="text-xs text-slate-400 font-mono">375 × 812 px</div>
                  <div className="text-[11px] text-slate-500 mt-1">iPhone 14 / Mobile Safari</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Arquivos e Cobertura de Snapshots */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Resumo de Cobertura por Arquivo Monitorado ({scannedFilesCount} arquivos)</span>
            </h4>
            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Arquivo do Projeto</th>
                    <th className="py-2.5 px-3">Papel no Sistema</th>
                    <th className="py-2.5 px-3 text-right">Tokens / Snapshots</th>
                    <th className="py-2.5 px-3 text-right">Status QA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  <tr className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-2 px-3 text-slate-300">src/components/ui/Button.tsx</td>
                    <td className="py-2 px-3 text-slate-400 font-sans">Componente UI Principal</td>
                    <td className="py-2 px-3 text-right text-slate-300">6 estados</td>
                    <td className="py-2 px-3 text-right">
                      <Badge variant="success" size="sm">Validado</Badge>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-2 px-3 text-slate-300">src/components/ui/Input.tsx</td>
                    <td className="py-2 px-3 text-slate-400 font-sans">Campo de Formulário / Estados</td>
                    <td className="py-2 px-3 text-right text-slate-300">6 estados</td>
                    <td className="py-2 px-3 text-right">
                      <Badge variant="success" size="sm">Validado</Badge>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-2 px-3 text-slate-300">src/components/ui/Modal.tsx</td>
                    <td className="py-2 px-3 text-slate-400 font-sans">Diálogos & Confirmações</td>
                    <td className="py-2 px-3 text-right text-slate-300">4 variações</td>
                    <td className="py-2 px-3 text-right">
                      <Badge variant="success" size="sm">Validado</Badge>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-2 px-3 text-slate-300">src/components/ui/Card.tsx</td>
                    <td className="py-2 px-3 text-slate-400 font-sans">Superfície de Conteúdo</td>
                    <td className="py-2 px-3 text-right text-slate-300">5 estados</td>
                    <td className="py-2 px-3 text-right">
                      <Badge variant="success" size="sm">Validado</Badge>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-2 px-3 text-slate-300">src/components/ui/DependentScreens.tsx</td>
                    <td className="py-2 px-3 text-slate-400 font-sans">Telas Integradas (Checkout/Dash)</td>
                    <td className="py-2 px-3 text-right text-slate-300">2 telas inteiras</td>
                    <td className="py-2 px-3 text-right">
                      <Badge variant="success" size="sm">Protegido</Badge>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-2 px-3 text-slate-300">playwright.config.ts</td>
                    <td className="py-2 px-3 text-slate-400 font-sans">Configuração de Pixel-Diff</td>
                    <td className="py-2 px-3 text-right text-slate-300">3 navegadores</td>
                    <td className="py-2 px-3 text-right">
                      <Badge variant="info" size="sm">Ativo</Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <div className="text-xs text-slate-400">
            Total de Histórias Ativas no Storybook: <span className="font-semibold text-slate-200">{totalStoriesCount} histórias</span>
          </div>
          <Button variant="primary" size="sm" onClick={onClose}>
            Fechar Detalhamento
          </Button>
        </div>
      </div>
    </div>
  );
};
