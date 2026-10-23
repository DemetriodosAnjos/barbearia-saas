import { describe, it, expect, beforeEach } from "vitest";
import {
  REAL_EXTERNAL_ACTIONS,
  generateRealExternalSteps,
  getRealExternalActionsList,
  getRealExternalStepsList,
  markExternalItemAsResolved,
  markExternalItemAsPending,
  resetAllExternalResolutions,
  getExternalMetrics,
  verifyExternalServiceItem,
} from "../../pages/QAPanel/externalPendingStore";

describe("externalPendingStore - Ações e Passos de Infraestrutura Externa", () => {
  beforeEach(() => {
    resetAllExternalResolutions();
  });

  it("deve conter as ações principais de infraestrutura externa registradas", () => {
    expect(REAL_EXTERNAL_ACTIONS.length).toBeGreaterThanOrEqual(8);
    const hasDb = REAL_EXTERNAL_ACTIONS.some((a) => a.id === "EXT-DB-01");
    expect(hasDb).toBe(true);
  });

  it("deve gerar passos técnicos granulares distribuídos nas ações externas", () => {
    const steps = generateRealExternalSteps();
    const totalStepsInChecklists = REAL_EXTERNAL_ACTIONS.reduce(
      (acc, action) => acc + action.checklist.length,
      0
    );
    expect(steps).toHaveLength(totalStepsInChecklists);
  });

  it("cada passo técnico deve possuir identificador único, squad, serviço e checklist", () => {
    const steps = generateRealExternalSteps();
    const ids = new Set();

    steps.forEach((step) => {
      expect(step.id).toBeDefined();
      expect(ids.has(step.id)).toBe(false);
      ids.add(step.id);

      expect(step.stepNumber).toBeGreaterThanOrEqual(1);
      expect(step.stepNumber).toBeLessThanOrEqual(steps.length);
      expect(step.squad).toBeDefined();
      expect(step.service).toBeDefined();
      expect(step.stepText.length).toBeGreaterThan(5);
    });
  });

  it("deve iniciar com todas as ações e passos com status 'Pendente'", () => {
    const steps = generateRealExternalSteps();
    const metrics = getExternalMetrics();
    expect(metrics.totalSteps).toBe(steps.length);
    expect(metrics.pendingSteps).toBe(steps.length);
    expect(metrics.resolvedSteps).toBe(0);

    expect(metrics.totalActions).toBe(REAL_EXTERNAL_ACTIONS.length);
    expect(metrics.pendingActions).toBe(REAL_EXTERNAL_ACTIONS.length);
    expect(metrics.resolvedActions).toBe(0);

    const stepsList = getRealExternalStepsList();
    expect(stepsList.every((s) => s.status === "Pendente")).toBe(true);
  });

  it("deve permitir atualizar status para APROVADO e mover para aprovados", () => {
    const steps = generateRealExternalSteps();
    const totalSteps = steps.length;

    // Resolve o primeiro passo
    markExternalItemAsResolved("EXT-SEC-01-S1");

    let metrics = getExternalMetrics();
    expect(metrics.resolvedSteps).toBe(1);
    expect(metrics.pendingSteps).toBe(totalSteps - 1);

    const stepsList = getRealExternalStepsList();
    const resolvedStep = stepsList.find((s) => s.id === "EXT-SEC-01-S1");
    expect(resolvedStep.status).toBe("APROVADO");
    expect(resolvedStep.passed).toBe(true);

    // Reverte para pendente
    markExternalItemAsPending("EXT-SEC-01-S1");
    metrics = getExternalMetrics();
    expect(metrics.resolvedSteps).toBe(0);
    expect(metrics.pendingSteps).toBe(totalSteps);
  });

  it("deve permitir resolver uma ação principal completa e marcar seus passos", () => {
    markExternalItemAsResolved("EXT-FE-01");

    const actionsList = getRealExternalActionsList();
    const action = actionsList.find((a) => a.id === "EXT-FE-01");
    expect(action.status).toBe("APROVADO");
    expect(action.passed).toBe(true);
  });

  it("deve verificar serviço externo sem quebrar mesmo em ambiente de teste", async () => {
    const item = REAL_EXTERNAL_ACTIONS[0];
    const res = await verifyExternalServiceItem(item);
    expect(res).toBeDefined();
    expect(typeof res.resolved).toBe("boolean");
    expect(res.service).toBeDefined();
  });

  it("deve verificar CORR-014 / EXT-API-01 de restrições de schema na tabela services", async () => {
    const res = await verifyExternalServiceItem({ id: "CORR-014" });
    expect(res).toBeDefined();
    expect(res.service).toBe("Supabase PostgreSQL Database");
    expect(typeof res.resolved).toBe("boolean");
  });
});
