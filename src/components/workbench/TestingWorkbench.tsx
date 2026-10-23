import React, { useState, useRef, useEffect } from 'react';
import { ProjectFileScan, VisualDiffItem } from '../../types/qa';
import { Button } from '../ui/Button';
import { Input, InputState } from '../ui/Input';
import { Card, CardState } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { CheckoutScreenPreview, DashboardScreenPreview } from '../ui/DependentScreens';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  Sliders,
  Maximize2,
  ShieldAlert,
  Sparkles,
  Eye,
  Columns,
  SplitSquareVertical,
  Check,
  X,
  Search,
  Filter,
  MoveHorizontal,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

export interface TestingWorkbenchProps {
  scannedFiles: ProjectFileScan[];
  diffItems: VisualDiffItem[];
  isRunningScan: boolean;
  onRunScan: () => void;
  toleranceThreshold: number;
  onUpdateThreshold: (val: number) => void;
  onApproveBaseline: (itemId: string) => void;
  onRejectChange: (itemId: string) => void;
  activeRegressionsCount: number;
}

export const TestingWorkbench: React.FC<TestingWorkbenchProps> = ({
  scannedFiles,
  diffItems,
  isRunningScan,
  onRunScan,
  toleranceThreshold,
  onUpdateThreshold,
  onApproveBaseline,
  onRejectChange,
  activeRegressionsCount,
}) => {
  const [selectedDiffId, setSelectedDiffId] = useState<string>(diffItems[0]?.id || 'diff-btn-default');
  const [diffMode, setDiffMode] = useState<'side-by-side' | 'slider' | 'diff-mask'>('slider');
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [simulateCascadingRegression, setSimulateCascadingRegression] = useState<boolean>(false);
  const [fileSearchQuery, setFileSearchQuery] = useState<string>('');
  const [selectedViewport, setSelectedViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedBrowser, setSelectedBrowser] = useState<'Chromium' | 'WebKit' | 'Firefox'>('Chromium');

  const sliderContainerRef = useRef<HTMLDivElement>(null);

  const selectedItem = diffItems.find((item) => item.id === selectedDiffId) || diffItems[0];

  const handleSliderMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setSliderPosition(percent);
  };

  const handleMouseDown = () => setIsDraggingSlider(true);

  useEffect(() => {
    const handleMouseUp = () => setIsDraggingSlider(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider) {
        handleSliderMove(e.clientX);
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingSlider && e.touches[0]) {
        handleSliderMove(e.touches[0].clientX);
      }
    };

    if (isDraggingSlider) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingSlider]);

  const filteredFiles = scannedFiles.filter(
    (file) =>
      file.path.toLowerCase().includes(fileSearchQuery.toLowerCase()) ||
      file.category.toLowerCase().includes(fileSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner: File Scan Status and Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-400 font-mono uppercase tracking-wider">
                Auditoria Automatizada
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400">Playwright & Chromatic Pixel Engine</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 mt-1">
              QA Studio & Testing Workbench
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Mecanismo de inspeção pixel-a-pixel. Varrimento contínuo de todos os arquivos de componentes, histórias do Storybook e telas dependentes com limiar estrito de regressão.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Tolerância Slider */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/60 rounded-lg border border-slate-800">
              <Sliders className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <label htmlFor="workbench-tolerance" className="text-xs text-slate-400 whitespace-nowrap">Tolerância:</label>
              <input
                id="workbench-tolerance"
                aria-label="Tolerância de regressão visual"
                type="range"
                min="0.01"
                max="1.00"
                step="0.01"
                value={toleranceThreshold}
                onChange={(e) => onUpdateThreshold(parseFloat(e.target.value))}
                className="w-20 accent-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-slate-200 tabular-nums">
                {toleranceThreshold.toFixed(2)}%
              </span>
            </div>

            {/* Run Button */}
            <Button
              variant="primary"
              size="sm"
              isLoading={isRunningScan}
              onClick={onRunScan}
              leftIcon={<RotateCcw className={`w-3.5 h-3.5 ${isRunningScan ? 'animate-spin' : ''}`} />}
            >
              {isRunningScan ? 'Varrendo Todos os Arquivos...' : 'Executar Varredura Completa'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = File Scanner & Test Suite Index | Right = Visual Diff Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scanned Files & Stories Matrix (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* File Scanner Widget */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-800 bg-slate-900/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                  Arquivos Varridos ({filteredFiles.length})
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sincronizado
              </span>
            </div>

            <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar arquivos ou histórias..."
                  value={fileSearchQuery}
                  onChange={(e) => setFileSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto font-mono text-xs">
              {filteredFiles.map((file) => (
                <div
                  key={file.path}
                  className="p-3 hover:bg-slate-850/50 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-slate-200 truncate font-medium text-[11px]">{file.path}</div>
                    <div className="text-[10px] text-slate-500 font-sans flex items-center gap-2 mt-0.5">
                      <span>{file.category}</span>
                      <span>·</span>
                      <span>{file.linesOfCode} LOC</span>
                      <span>·</span>
                      <span className="font-mono">{file.checksum}</span>
                    </div>
                  </div>
                  <Badge variant={file.status === 'TESTS_PASSING' ? 'success' : 'info'} size="sm">
                    {file.status === 'TESTS_PASSING' ? 'OK' : 'Sync'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Test Stories Queue / Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-800 bg-slate-900/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                  Histórias & Telas Avaliadas
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {diffItems.length} snapshots
              </span>
            </div>

            <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
              {diffItems.map((item) => {
                const isSelected = item.id === selectedItem.id;
                const isFailing = item.diffPercentage > toleranceThreshold;

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedDiffId(item.id)}
                    className={`w-full p-3 text-left transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/40 border-l-2 border-indigo-500'
                        : 'hover:bg-slate-850/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          {item.component}
                        </span>
                        <span className="text-[11px] text-slate-500">/</span>
                        <span className="text-[11px] text-slate-400 truncate">{item.story.split('/')[2] || item.story}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                        <span>{item.viewport.split(' ')[0]}</span>
                        <span>·</span>
                        <span>{item.browser}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs font-mono font-bold tabular-nums ${
                          isFailing ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {item.diffPercentage.toFixed(2)}%
                      </div>
                      <Badge variant={isFailing ? 'danger' : 'success'} size="sm">
                        {isFailing ? 'Regressão' : 'Passou'}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Diff Inspection Canvas (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs flex flex-col">
            {/* Canvas Header & Controls */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-100">{selectedItem.story}</span>
                  <Badge variant={selectedItem.diffPercentage > toleranceThreshold ? 'danger' : 'success'} size="sm">
                    {selectedItem.diffPercentage > toleranceThreshold ? 'Falha Detectada' : 'Aprovado'}
                  </Badge>
                </div>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                  <span>Browser: {selectedBrowser}</span>
                  <span>·</span>
                  <span>Viewport: {selectedViewport === 'desktop' ? '1440x900' : selectedViewport === 'tablet' ? '768x1024' : '375x812'}</span>
                  <span>·</span>
                  <span className={selectedItem.diffPercentage > toleranceThreshold ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                    Delta: {selectedItem.diffPercentage.toFixed(2)}% (Max: {toleranceThreshold}%)
                  </span>
                </div>
              </div>

              {/* View Modes */}
              <div className="flex items-center gap-1 p-1 bg-slate-950/70 rounded-lg border border-slate-800">
                <button
                  onClick={() => setDiffMode('slider')}
                  title="Modo Split Slider (arraste a divisória)"
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    diffMode === 'slider' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <SplitSquareVertical className="w-3.5 h-3.5" />
                  <span>Slider</span>
                </button>
                <button
                  onClick={() => setDiffMode('side-by-side')}
                  title="Lado a Lado (Baseline vs Candidato)"
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    diffMode === 'side-by-side' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Lado a Lado</span>
                </button>
                <button
                  onClick={() => setDiffMode('diff-mask')}
                  title="Máscara de Diferença (Pixels alterados em destaque)"
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    diffMode === 'diff-mask' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Máscara Diff</span>
                </button>
              </div>
            </div>

            {/* Interactive Diff Canvas Area */}
            <div className="p-6 bg-slate-950 min-h-[420px] flex items-center justify-center relative overflow-hidden select-none">
              {diffMode === 'slider' && (
                <div
                  ref={sliderContainerRef}
                  className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-6 cursor-ew-resize min-h-[300px] flex items-center justify-center"
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleMouseDown}
                >
                  {/* Baseline Content (Bottom Layer) */}
                  <div className="w-full flex flex-col items-center justify-center p-4">
                    <div className="text-[11px] font-mono text-slate-500 mb-3 uppercase tracking-wider">
                      Baseline Dourado (v2.4.0)
                    </div>
                    {renderSimulatedComponent(selectedItem, false, false)}
                  </div>

                  {/* Candidate Content (Top Layer with Clip Path) */}
                  <div
                    className="absolute inset-0 bg-slate-900 p-6 flex flex-col items-center justify-center pointer-events-none"
                    style={{
                      clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)`,
                    }}
                  >
                    <div className="text-[11px] font-mono text-indigo-400 mb-3 uppercase tracking-wider">
                      Candidato Atual (Git Head)
                    </div>
                    {renderSimulatedComponent(selectedItem, simulateCascadingRegression, true)}
                  </div>

                  {/* Draggable Divider Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] z-20 flex items-center justify-center pointer-events-none"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div className="w-6 h-6 bg-indigo-600 rounded-full shadow-lg border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
                      <MoveHorizontal className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>

                  {/* Badges on Corners */}
                  <div className="absolute bottom-3 left-3 bg-slate-950/80 px-2.5 py-1 rounded text-[11px] text-slate-400 font-mono border border-slate-800 flex items-center gap-1.5">
                    <ArrowLeft className="w-3 h-3 text-slate-400" />
                    <span>Baseline (100%)</span>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-slate-950/80 px-2.5 py-1 rounded text-[11px] text-indigo-300 font-mono border border-indigo-900/60 flex items-center gap-1.5">
                    <span>Candidato ({sliderPosition}%)</span>
                    <ArrowRight className="w-3 h-3 text-indigo-300" />
                  </div>
                </div>
              )}

              {diffMode === 'side-by-side' && (
                <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Baseline Column */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center">
                    <div className="text-xs font-mono text-slate-400 mb-3 flex items-center justify-between w-full pb-2 border-b border-slate-800">
                      <span>Baseline (Esperado)</span>
                      <span className="text-emerald-400">Golden Reference</span>
                    </div>
                    <div className="w-full py-6 flex items-center justify-center">
                      {renderSimulatedComponent(selectedItem, false, false)}
                    </div>
                  </div>

                  {/* Candidate Column */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center">
                    <div className="text-xs font-mono text-slate-400 mb-3 flex items-center justify-between w-full pb-2 border-b border-slate-800">
                      <span>Candidato do PR</span>
                      <span className={simulateCascadingRegression ? 'text-rose-400 font-semibold' : 'text-indigo-400'}>
                        {simulateCascadingRegression ? 'Quebra Detectada' : 'Sem Divergência'}
                      </span>
                    </div>
                    <div className="w-full py-6 flex items-center justify-center">
                      {renderSimulatedComponent(selectedItem, simulateCascadingRegression, true)}
                    </div>
                  </div>
                </div>
              )}

              {diffMode === 'diff-mask' && (
                <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center relative">
                  <div className="text-xs font-mono text-slate-400 mb-3 flex items-center justify-between w-full pb-2 border-b border-slate-800">
                    <span>Mapa de Diferença Térmica (Mask Highlight)</span>
                    <span className="text-rose-400 font-mono font-bold">
                      {simulateCascadingRegression ? 'Pixels Incompatíveis: 148 px (4.8%)' : '0 pixels alterados (0.00%)'}
                    </span>
                  </div>

                  <div className="relative p-6 w-full flex items-center justify-center">
                    {renderSimulatedComponent(selectedItem, simulateCascadingRegression, true)}

                    {simulateCascadingRegression && (
                      <div className="absolute inset-0 bg-rose-500/20 border-2 border-dashed border-rose-500 rounded-xl pointer-events-none flex items-center justify-center">
                        <div className="bg-rose-950/90 text-rose-200 border border-rose-600 px-3 py-1.5 rounded-md text-xs font-mono flex items-center gap-2 shadow-lg">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>Mutações de Pixel em Destaque (Delta &gt; {toleranceThreshold}%)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Canvas Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-medium text-slate-300">Telas Dependentes Vinculadas:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedItem.dependentScreens.map((screen) => (
                    <span
                      key={screen}
                      className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 font-mono border border-slate-700/60"
                    >
                      {screen}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRejectChange(selectedItem.id)}
                  leftIcon={<X className="w-3.5 h-3.5 text-rose-400" />}
                >
                  Rejeitar Mudança
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onApproveBaseline(selectedItem.id)}
                  leftIcon={<Check className="w-3.5 h-3.5" />}
                >
                  Aprovar Novo Baseline
                </Button>
              </div>
            </div>
          </div>

          {/* Cascading Screen Impact Testing Sandbox */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-indigo-400" />
                  <span>Laboratório de Teste de Cascata em Telas Dependentes</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verifique como alterações isoladas em componentes básicos impactam telas completas do sistema.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={simulateCascadingRegression ? 'destructive' : 'secondary'}
                  size="sm"
                  onClick={() => setSimulateCascadingRegression(!simulateCascadingRegression)}
                >
                  {simulateCascadingRegression ? 'Reverter Quebra Invasiva' : 'Provocar Quebra em Cascata'}
                </Button>
              </div>
            </div>

            {/* Dependent Screen Preview */}
            <div className="pt-2">
              <CheckoutScreenPreview simulateCascadingRegression={simulateCascadingRegression} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function renderSimulatedComponent(
  item: VisualDiffItem,
  simulateRegression: boolean,
  isCandidate: boolean
) {
  if (item.component === 'Button') {
    return (
      <div className={`p-4 ${simulateRegression ? 'p-10 border-2 border-rose-500 rounded-none' : ''}`}>
        <Button
          variant={simulateRegression ? 'destructive' : 'primary'}
          simulatedState={item.state}
          errorMessage={item.state === 'error' ? 'Falha de validação' : undefined}
        >
          {simulateRegression ? 'Botão Quebrado (Padding Excessivo)' : 'Salvar Alterações'}
        </Button>
      </div>
    );
  }

  if (item.component === 'Input') {
    const inputSimulatedState: InputState =
      item.state === 'active' ? 'focus' : item.state === 'loading' ? 'default' : item.state;

    return (
      <div className="w-full max-w-sm">
        <Input
          label="E-mail de Cadastro"
          placeholder="seu@dominio.com"
          simulatedState={simulateRegression ? 'error' : inputSimulatedState}
          errorMessage={simulateRegression ? 'Regressão de layout detectada no input' : undefined}
          defaultValue="engenharia@empresa.com.br"
        />
      </div>
    );
  }

  if (item.component === 'Modal') {
    return (
      <div className="w-full max-w-md">
        <Modal
          isOpen={true}
          inlinePreview={true}
          onClose={() => {}}
          title={simulateRegression ? 'Modal Desalinhado' : 'Confirmar Atualização de Token'}
          description="Esta alteração visual será submetida à aprovação da equipe de QA."
          variant={simulateRegression ? 'destructive' : 'default'}
          primaryActionLabel="Confirmar"
        >
          <p className="text-xs text-slate-300">
            Estrutura e contraste em conformidade com WCAG AA.
          </p>
        </Modal>
      </div>
    );
  }

  if (item.component === 'Card') {
    const cardSimulatedState: CardState =
      item.state === 'loading' ? 'default' : item.state;

    return (
      <div className="w-full max-w-md">
        <Card
          category="Design System"
          timestamp="Hoje, 04:10"
          title="Componente Card Inspecionado"
          subtitle="Validação de raio de borda e sombra monocromática."
          variant="interactive"
          simulatedState={simulateRegression ? 'error' : cardSimulatedState}
          errorMessage={simulateRegression ? 'Quebra de sombra e borda' : undefined}
        />
      </div>
    );
  }

  if (item.component === 'DependentScreen') {
    return (
      <div className="w-full max-w-lg">
        <CheckoutScreenPreview simulateCascadingRegression={simulateRegression} />
      </div>
    );
  }

  return (
    <div className="p-4 text-xs text-slate-400">
      Preview do componente carregado
    </div>
  );
}
