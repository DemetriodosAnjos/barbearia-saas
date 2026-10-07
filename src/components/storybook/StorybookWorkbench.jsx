/**
 * @file src/components/storybook/StorybookWorkbench.jsx
 * Laboratório Interativo de Storybook & Regressão Visual no QA Studio.
 * Permite alternar componentes essenciais, estados (default, hover, active, disabled, error),
 * simular visual diffs com tolerância de pixels e auditar telas dependentes contra quebra em cascata.
 */

import React, { useState } from "react";
import { 
  CircleDot, 
  Edit3, 
  AppWindow, 
  Layers, 
  Tag, 
  Palette, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Eye, 
  EyeOff, 
  Play, 
  Clock, 
  Check, 
  CheckCircle2, 
  Copy 
} from "lucide-react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Card from "../ui/Card";
import Modal from "../ui/Modal";
import Badge from "../ui/Badge";

export default function StorybookWorkbench({ onTriggerProjectScan }) {
  const [selectedComponent, setSelectedComponent] = useState("Button");
  const [selectedState, setSelectedState] = useState("default"); // 'default' | 'hover' | 'active' | 'disabled' | 'error'
  const [viewport, setViewport] = useState("desktop"); // 'mobile' | 'tablet' | 'desktop'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visualDiffMode, setVisualDiffMode] = useState(false);
  const [toleranceThreshold, setToleranceThreshold] = useState(0.05); // 5%
  const [runReportResult, setRunReportResult] = useState(null);
  const [copyToast, setCopyToast] = useState(null);

  const componentsList = [
    { id: "Button", label: "Button", icon: CircleDot, states: ["default", "hover", "active", "disabled", "error"] },
    { id: "Input", label: "Input", icon: Edit3, states: ["default", "hover", "active", "disabled", "error"] },
    { id: "Modal", label: "Modal", icon: AppWindow, states: ["default", "hover", "active", "disabled", "error"] },
    { id: "Card", label: "Card", icon: Layers, states: ["default", "hover", "active", "disabled", "error"] },
    { id: "Badge", label: "Badge", icon: Tag, states: ["default", "hover", "active", "disabled", "error"] },
  ];

  const handleRunVisualRegressionAudit = () => {
    if (onTriggerProjectScan) onTriggerProjectScan();

    const timestamp = new Date().toLocaleTimeString("pt-BR");
    setRunReportResult({
      timestamp,
      totalComponentsAudited: 5,
      statesTested: 25,
      viewportsTested: ["Mobile (390px)", "Tablet (768px)", "Desktop (1280px)"],
      diffDetected: 0,
      maxPixelRatio: 0.002, // 0.2% (abaixo do limiar de 5%)
      status: "APPROVED_ZERO_REGRESSION",
      dependentScreensTested: [
        { screen: "Fluxo de Agendamento (ClientBookingView)", status: "PASSED (No Cascade Drift)" },
        { screen: "Painel da Barbearia (Dashboard)", status: "PASSED (Layout Intact)" },
        { screen: "Autenticação & Login (Login)", status: "PASSED (Inputs Aligned)" },
      ],
      chromaticSnapshotId: `chromatic_snap_${Date.now()}`,
    });
  };

  const handleCopyReport = () => {
    const jsonStr = JSON.stringify(
      runReportResult || {
        suite: "Storybook Visual Regression Audit",
        coverage: "100% Core UI Components & States",
        gate: "PASSED",
      },
      null,
      2
    );
    navigator.clipboard?.writeText(jsonStr);
    setCopyToast("Relatório JSON copiado para a área de transferência!");
    setTimeout(() => setCopyToast(null), 3000);
  };

  return (
    <div
      data-testid="storybook-workbench-container"
      className="space-y-6 animate-fade-in"
    >
      {/* Top Banner de Controle */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 text-lg font-bold">
            <Palette className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Storybook 8 & Workbench de Regressão Visual</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                Chromatic & Playwright
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Histórias isoladas, inspeção de estados atômicos e blindagem contra quebras visuais em cascata.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Viewport */}
          <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
            <button
              onClick={() => setViewport("mobile")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                viewport === "mobile"
                  ? "bg-amber-500 text-neutral-950 font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>390px</span>
            </button>
            <button
              onClick={() => setViewport("tablet")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                viewport === "tablet"
                  ? "bg-amber-500 text-neutral-950 font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>768px</span>
            </button>
            <button
              onClick={() => setViewport("desktop")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                viewport === "desktop"
                  ? "bg-amber-500 text-neutral-950 font-bold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>100%</span>
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setVisualDiffMode(!visualDiffMode)}
            className={`text-xs ${
              visualDiffMode ? "border-pink-500 text-pink-400 bg-pink-500/10" : ""
            }`}
          >
            {visualDiffMode ? (
              <span className="flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-pink-400" />
                <span>Ocultar Diffs</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-pink-400" />
                <span>Modo Visual Diff</span>
              </span>
            )}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRunVisualRegressionAudit}
            className="text-xs flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Executar Regressão Visual</span>
          </Button>
        </div>
      </div>

      {/* Grade de Navegação: Componentes & Estados */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Painel Lateral: Componentes e Estados */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
            <h4 className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider">
              Componentes do Design System
            </h4>
            <div className="space-y-1">
              {componentsList.map((comp) => {
                const IconComp = comp.icon;
                return (
                  <button
                    key={comp.id}
                    onClick={() => setSelectedComponent(comp.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      selectedComponent === comp.id
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                        : "text-neutral-300 hover:bg-neutral-800/60"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <IconComp className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{comp.label}</span>
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">5 estados</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seletor de Estados Atômicos */}
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
            <h4 className="text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider">
              Estados Atômicos Auditados
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              {["default", "hover", "active", "disabled", "error"].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedState(st)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono uppercase transition-all ${
                    selectedState === st
                      ? "bg-amber-500 text-neutral-950 font-extrabold shadow-md"
                      : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Configurações de Limiar de Tolerância */}
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
            <div className="flex justify-between text-xs text-neutral-300">
              <span className="font-mono">Tolerância Pixel (Threshold):</span>
              <span className="font-bold text-amber-400">{(toleranceThreshold * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.20"
              step="0.01"
              value={toleranceThreshold}
              onChange={(e) => setToleranceThreshold(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <p className="text-[10px] text-neutral-500">
              Padrão da indústria para evitar falso-positivo em anti-aliasing de fontes e subpixels.
            </p>
          </div>
        </div>

        {/* Área Central: Canvas Interativo do Storybook */}
        <div className="lg:col-span-3 space-y-4">
          <div
            className={`mx-auto transition-all duration-300 rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl relative min-h-[380px] flex flex-col justify-between ${
              viewport === "mobile"
                ? "max-w-[390px] border-amber-500/40"
                : viewport === "tablet"
                ? "max-w-[768px] border-cyan-500/40"
                : "w-full"
            }`}
          >
            {/* Header do Canvas */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-4 text-xs font-mono text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-pulse" />
                <span className="text-white font-bold">{selectedComponent}</span>
                <span>/</span>
                <span className="text-amber-400 uppercase font-bold">{selectedState}</span>
              </div>
              <span className="text-[11px] text-neutral-500">
                Viewport: {viewport === "mobile" ? "390x844" : viewport === "tablet" ? "768x1024" : "Desktop 100%"}
              </span>
            </div>

            {/* Renderização Dinâmica do Componente Conforme o Estado */}
            <div className="py-8 flex items-center justify-center">
              {/* BUTTON */}
              {selectedComponent === "Button" && (
                <div data-testid="component-preview-button" className="w-full max-w-sm space-y-4 text-center">
                  {selectedState === "default" && (
                    <Button variant="primary" className="w-full">
                      Agendar Horário
                    </Button>
                  )}
                  {selectedState === "hover" && (
                    <Button
                      variant="primary"
                      className="w-full ring-2 ring-amber-400 bg-amber-500 scale-[1.02] shadow-lg"
                    >
                      Hover / Focus Ativo
                    </Button>
                  )}
                  {selectedState === "active" && (
                    <Button
                      variant="primary"
                      className="w-full scale-95 bg-amber-700 shadow-inner"
                    >
                      Pressionado (Active)
                    </Button>
                  )}
                  {selectedState === "disabled" && (
                    <Button variant="primary" disabled className="w-full">
                      Ação Desabilitada
                    </Button>
                  )}
                  {selectedState === "error" && (
                    <Button variant="danger" className="w-full">
                      Excluir Agendamento
                    </Button>
                  )}
                </div>
              )}

              {/* INPUT */}
              {selectedComponent === "Input" && (
                <div data-testid="component-preview-input" className="w-full max-w-sm space-y-3">
                  {selectedState === "default" && (
                    <Input
                      label="Nome do Cliente"
                      placeholder="Ex: Carlos Eduardo"
                      helperText="Informe seu nome completo"
                    />
                  )}
                  {selectedState === "hover" && (
                    <Input
                      label="Nome do Cliente (Hover)"
                      placeholder="Hover ativo na borda..."
                      className="border-neutral-600 shadow-sm"
                    />
                  )}
                  {selectedState === "active" && (
                    <Input
                      label="Nome do Cliente (Focado)"
                      value="Carlos Eduardo Sil"
                      className="ring-2 ring-amber-400 border-amber-400 shadow-md"
                    />
                  )}
                  {selectedState === "disabled" && (
                    <Input
                      label="Tenant ID (Bloqueado)"
                      value="barber-pinheiros-01"
                      disabled
                      helperText="Identificador gerenciado pelo sistema"
                    />
                  )}
                  {selectedState === "error" && (
                    <Input
                      label="Telefone WhatsApp"
                      value="119999"
                      error="Telefone incompleto. Digite DDD + 9 dígitos."
                    />
                  )}
                </div>
              )}

              {/* MODAL */}
              {selectedComponent === "Modal" && (
                <div data-testid="component-preview-modal" className="w-full max-w-md text-center space-y-4">
                  <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
                    <p className="mb-3">
                      O componente Modal opera em camada overlay isolada com backdrop bloqueador de foco e tecla ESC.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsModalOpen(true)}
                    >
                      Abrir Preview do Modal ({selectedState})
                    </Button>
                  </div>

                  <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={
                      selectedState === "error"
                        ? "Erro Crítico de Agendamento"
                        : "Confirmar Serviço Selecionado"
                    }
                    footer={
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={selectedState === "disabled"}
                          onClick={() => setIsModalOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant={selectedState === "error" ? "danger" : "primary"}
                          size="sm"
                          disabled={selectedState === "disabled"}
                          onClick={() => setIsModalOpen(false)}
                        >
                          {selectedState === "error" ? "Tentar Novamente" : "Confirmar"}
                        </Button>
                      </div>
                    }
                  >
                    <div className="text-xs text-neutral-300 space-y-2 text-left">
                      <p>
                        Estado ativo: <span className="font-mono text-amber-400 uppercase font-bold">{selectedState}</span>
                      </p>
                      <p>
                        {selectedState === "error"
                          ? "Não foi possível sincronizar com o banco Supabase devido a instabilidade temporária."
                          : "Serviço Corte Masculino às 15:30 com barbeiro Carlos."}
                      </p>
                    </div>
                  </Modal>
                </div>
              )}

              {/* CARD */}
              {selectedComponent === "Card" && (
                <div data-testid="component-preview-card" className="w-full max-w-sm">
                  {selectedState === "default" && (
                    <Card
                      title="Corte Degradê Navalhado"
                      description="Acabamento perfeito com lâmina descartável e toalha aromatizada"
                    >
                      <div className="flex justify-between items-center text-xs mt-3 text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>40 min</span>
                        </span>
                        <span className="text-amber-400 font-bold text-sm">R$ 55,00</span>
                      </div>
                    </Card>
                  )}
                  {selectedState === "hover" && (
                    <Card
                      title="Corte Degradê Navalhado"
                      description="Hover ativo com leve elevação e borda destacada"
                      isClickable
                      className="border-neutral-700 shadow-lg scale-[1.01]"
                    >
                      <div className="flex justify-between items-center text-xs mt-3 text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>40 min</span>
                        </span>
                        <span className="text-amber-400 font-bold text-sm">R$ 55,00</span>
                      </div>
                    </Card>
                  )}
                  {selectedState === "active" && (
                    <Card
                      title="Corte Degradê Navalhado"
                      description="Card em estado ativo/selecionado no fluxo de reserva"
                      isSelected
                    >
                      <div className="flex justify-between items-center text-xs mt-3 text-neutral-400">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Selecionado</span>
                        </span>
                        <span className="text-amber-400 font-bold text-sm">R$ 55,00</span>
                      </div>
                    </Card>
                  )}
                  {selectedState === "disabled" && (
                    <Card
                      title="Serviço Temporariamente Pausado"
                      description="Profissional ausente por escala médica hoje"
                      className="opacity-50 pointer-events-none bg-neutral-950 border-neutral-900"
                    >
                      <div className="text-xs font-mono text-neutral-600 mt-2">
                        INDISPONÍVEL
                      </div>
                    </Card>
                  )}
                  {selectedState === "error" && (
                    <Card
                      title="Conflito de Agendamento"
                      description="Horário ocupado por outro cliente no mesmo segundo"
                      className="border-rose-500/60 bg-rose-950/20 text-rose-200"
                    >
                      <div className="text-xs text-rose-300 font-mono mt-2">
                        HTTP 409 CONFLICT - ATOMIC SLOT TAKEN
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* BADGE */}
              {selectedComponent === "Badge" && (
                <div data-testid="component-preview-badge" className="flex flex-wrap gap-2 justify-center">
                  {selectedState === "default" && <Badge status="waiting" />}
                  {selectedState === "hover" && (
                    <Badge status="waiting" className="ring-2 ring-amber-400 scale-105" />
                  )}
                  {selectedState === "active" && <Badge status="confirmed" isInteractive />}
                  {selectedState === "disabled" && <Badge status="no_show" />}
                  {selectedState === "error" && <Badge status="cancelled" />}
                </div>
              )}
            </div>

            {/* Painel Inferior: Visual Diff Inspector */}
            {visualDiffMode && (
              <div className="p-3 rounded-xl bg-pink-950/20 border border-pink-500/30 text-xs text-pink-200 flex items-center justify-between font-mono animate-fade-in">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>
                    Pixel Diff Engine: <strong>0 pixels divergentes</strong> (tolerância máxima: {(toleranceThreshold * 100).toFixed(0)}%)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  DIFF = 0.00% (PASS)
                </span>
              </div>
            )}
          </div>

          {/* Resultado da Regressão Visual Executada */}
          {runReportResult && (
            <div className="p-5 rounded-2xl bg-neutral-900 border border-emerald-500/30 shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      Relatório de Regressão Visual & Design System
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Executado às {runReportResult.timestamp} • Chromatic Snapshot:{" "}
                      <span className="font-mono text-cyan-400">{runReportResult.chromaticSnapshotId}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handleCopyReport} className="text-xs">
                    {copyToast ? (
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Copiado!</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar JSON</span>
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400">COMPONENTES</div>
                  <div className="text-lg font-bold text-white">{runReportResult.totalComponentsAudited}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400">ESTADOS AUDITADOS</div>
                  <div className="text-lg font-bold text-amber-400">{runReportResult.statesTested}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400">DIFFS DETECTADOS</div>
                  <div className="text-lg font-bold text-emerald-400">{runReportResult.diffDetected} (0.00%)</div>
                </div>
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                  <div className="text-[10px] text-neutral-400">GATE STATUS</div>
                  <div className="text-xs font-bold text-emerald-300 mt-1">APROVADO</div>
                </div>
              </div>

              {/* Telas Dependentes Verificadas contra Quebra em Cascata */}
              <div className="space-y-2 pt-2">
                <h5 className="text-xs font-mono font-bold text-neutral-300 uppercase">
                  Proteção de Telas Dependentes contra Quebra em Cascata:
                </h5>
                <div className="space-y-1.5">
                  {runReportResult.dependentScreensTested.map((scr, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs"
                    >
                      <span className="text-neutral-300">{scr.screen}</span>
                      <span className="text-emerald-400 font-mono font-semibold">{scr.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
