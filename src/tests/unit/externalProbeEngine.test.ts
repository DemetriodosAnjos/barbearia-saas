import { describe, it, expect, beforeEach } from 'vitest';
import {
  runExternalItemProbe,
  getStoredProbedStatusMap,
  saveStoredProbedStatus,
  isRealSupabaseConfigured,
  PROBE_STATUS_STORAGE_KEY,
} from '../../lib/security/externalProbeEngine';

describe('externalProbeEngine - Sonda Ativa de Infraestrutura Externa', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(PROBE_STATUS_STORAGE_KEY);
    }
  });

  it('deve sincronizar aliases bidirecionais entre CORR-014 e EXT-API-01', () => {
    saveStoredProbedStatus('CORR-014', 'RESOLVED');
    const map = getStoredProbedStatusMap();
    expect(map['CORR-014']).toBe('RESOLVED');
    expect(map['EXT-API-01']).toBe('RESOLVED');

    saveStoredProbedStatus('EXT-API-01', 'UNRESOLVED');
    const updatedMap = getStoredProbedStatusMap();
    expect(updatedMap['EXT-API-01']).toBe('UNRESOLVED');
    expect(updatedMap['CORR-014']).toBe('UNRESOLVED');
  });

  it('deve executar o probe para CORR-014 retornando laudo estruturado', async () => {
    const result = await runExternalItemProbe(
      'CORR-014',
      'Supabase Database: Restrições de Schema e Validação Relacional de Contrato'
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('CORR-014');
    expect(typeof result.isResolved).toBe('boolean');
    expect(['RESOLVED', 'UNRESOLVED']).toContain(result.status);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics.checkType).toContain('Supabase PostgreSQL');
  });

  it('isRealSupabaseConfigured deve retornar valor booleano', () => {
    const isConfigured = isRealSupabaseConfigured();
    expect(typeof isConfigured).toBe('boolean');
  });
});
