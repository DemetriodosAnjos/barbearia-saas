import React from 'react';
import { Play, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

export type ActiveTab = 'qa-studio' | 'storybook' | 'docs' | 'logs-corrections';

export interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isRunningScan: boolean;
  onRunScan: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  isRunningScan,
  onRunScan,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Single element Brand Wordmark */}
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap">
            Visual QA Studio
          </span>
          <span className="hidden sm:inline-block text-xs text-slate-500 font-mono">
            Storybook & Regressão
          </span>
        </div>

        {/* Zone 2: 4 Clean Navigation Tabs (Functional interactive tabs) */}
        <nav className="flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-900/90 rounded-lg border border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => onTabChange('qa-studio')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'qa-studio'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            QA Studio & Workbench
          </button>
          <button
            onClick={() => onTabChange('storybook')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'storybook'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Storybook Explorer
          </button>
          <button
            onClick={() => onTabChange('docs')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'docs'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Documentação Técnica
          </button>
          <button
            onClick={() => onTabChange('logs-corrections')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'logs-corrections'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Logs & Correções
          </button>
        </nav>

        {/* Zone 3: Primary Action - Run full scan */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            isLoading={isRunningScan}
            onClick={onRunScan}
            leftIcon={!isRunningScan ? <Play className="w-3.5 h-3.5 fill-current" /> : undefined}
          >
            {isRunningScan ? 'Varrendo Arquivos...' : 'Executar Testes Visuais'}
          </Button>
        </div>
      </div>
    </header>
  );
};
