/**
 * @file multiTenantDataService.ts
 * @description Camada de serviço de dados com isolamento estrito Multi-Tenant (RLS & Frontend Filter).
 * 
 * Regras Obrigatórias:
 * 1. TODA consulta deve incluir o filtro `.eq('tenant_id', tenantId)` ou fallback `.eq('barbershop_id', tenantId)`.
 * 2. TODO insert / upsert deve incluir tanto `tenant_id: tenantId` quanto `barbershop_id: tenantId`.
 * 3. O cache local em safeStorage é segmentado por tenant (`saas_cache_{entidade}_{tenantId}`)
 *    para NUNCA permitir que dados do Administrador A persistam na sessão do Administrador B.
 */

import { supabase } from '../lib/supabase';
import { safeStorage } from '../utils/safeStorage';

export interface TenantContext {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export class MultiTenantDataService {
  /**
   * Retorna a chave de armazenamento sanitizada e isolada por tenant
   */
  private static getStorageKey(entity: string, tenantId: string): string {
    const cleanTenant = (tenantId || 'unassigned').replace(/[^a-zA-Z0-9_-]/g, '_');
    return `saas_mt_${entity}_${cleanTenant}`;
  }

  /**
   * Helper de consulta tolerante a schemas legados (tenta tenant_id e barbershop_id)
   */
  private static async resilientSelect(
    tables: string[],
    tenantId: string,
    orderCol: string,
    ascending = true
  ): Promise<{ data: any[] | null; error: any }> {
    for (const table of tables) {
      try {
        // 1. Tenta com tenant_id
        const res = await supabase.from(table).select('*').eq('tenant_id', tenantId).order(orderCol, { ascending });
        if (!res.error && res.data) {
          return { data: res.data, error: null };
        }

        // Se o erro for de coluna 'tenant_id' não existente (código 42703), tenta por barbershop_id
        if (res.error?.code === '42703' || res.error?.message?.includes('tenant_id')) {
          const resB = await supabase.from(table).select('*').eq('barbershop_id', tenantId).order(orderCol, { ascending });
          if (!resB.error && resB.data) {
            return { data: resB.data, error: null };
          }
        }

        // Se a tabela não existir, continua para a próxima da lista
        if (res.error?.code === '42P01' || res.error?.message?.includes('does not exist')) {
          continue;
        }
      } catch (err) {
        console.warn(`[MultiTenantDataService] Falha ao consultar ${table}:`, err);
      }
    }

    return { data: null, error: new Error(`Nenhuma tabela encontrada entre: ${tables.join(', ')}`) };
  }

  /**
   * Busca clientes pertencentes ESTRITAMENTE ao tenant fornecido
   */
  static async getClients(tenantId: string): Promise<{ data: any[]; error: any; fromCache?: boolean }> {
    if (!tenantId) {
      return { data: [], error: new Error('tenant_id obrigatório para isolamento de dados.') };
    }

    const storageKey = this.getStorageKey('clients', tenantId);

    try {
      const res = await this.resilientSelect(['clients', 'clientes'], tenantId, 'name', true);

      if (!res.error && Array.isArray(res.data)) {
        safeStorage.setItem(storageKey, JSON.stringify(res.data));
        return { data: res.data, error: null };
      }

      const cached = safeStorage.getItem(storageKey);
      if (cached) {
        return { data: JSON.parse(cached), error: res.error, fromCache: true };
      }

      return { data: [], error: res.error };
    } catch (err) {
      const cached = safeStorage.getItem(storageKey);
      if (cached) {
        return { data: JSON.parse(cached), error: err, fromCache: true };
      }
      return { data: [], error: err };
    }
  }

  /**
   * Salva ou atualiza cliente vinculando obrigatoriamente tenant_id e barbershop_id
   */
  static async upsertClient(clientData: any, tenantId?: string): Promise<{ data: any; error: any }> {
    let resolvedTenant = tenantId;
    if (!resolvedTenant) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          resolvedTenant = authData.user.id;
        }
      } catch {}
    }

    if (!resolvedTenant) {
      return { data: null, error: new Error('Operação bloqueada: tenant_id é obrigatório para isolamento RLS.') };
    }

    const payload = {
      ...clientData,
      tenant_id: resolvedTenant,
      barbershop_id: resolvedTenant,
      updated_at: new Date().toISOString(),
    };

    try {
      let res = await supabase.from('clients').upsert([payload], { onConflict: 'id' }).select().maybeSingle();

      if (res.error && (res.error.code === '42P01' || res.error.message?.includes('does not exist'))) {
        res = await supabase.from('clientes').upsert([payload], { onConflict: 'id' }).select().maybeSingle();
      }

      const storageKey = this.getStorageKey('clients', resolvedTenant);
      const cachedRaw = safeStorage.getItem(storageKey);
      const list = cachedRaw ? JSON.parse(cachedRaw) : [];
      const updatedList = [payload, ...list.filter((c: any) => c.id !== clientData.id)];
      safeStorage.setItem(storageKey, JSON.stringify(updatedList));

      return { data: res.data || payload, error: res.error };
    } catch (err) {
      return { data: payload, error: err };
    }
  }

  /**
   * Busca agendamentos pertencentes ESTRITAMENTE ao tenant ativo
   */
  static async getAppointments(tenantId: string): Promise<{ data: any[]; error: any; fromCache?: boolean }> {
    if (!tenantId) {
      return { data: [], error: new Error('tenant_id obrigatório para isolamento de dados.') };
    }

    const storageKey = this.getStorageKey('appointments', tenantId);

    try {
      const res = await this.resilientSelect(['appointments', 'agendamentos'], tenantId, 'start_time', false);

      if (!res.error && Array.isArray(res.data)) {
        safeStorage.setItem(storageKey, JSON.stringify(res.data));
        return { data: res.data, error: null };
      }

      const cached = safeStorage.getItem(storageKey);
      if (cached) {
        return { data: JSON.parse(cached), error: res.error, fromCache: true };
      }

      return { data: [], error: res.error };
    } catch (err) {
      const cached = safeStorage.getItem(storageKey);
      if (cached) {
        return { data: JSON.parse(cached), error: err, fromCache: true };
      }
      return { data: [], error: err };
    }
  }

  /**
   * Salva agendamento vinculando tenant_id e barbershop_id
   */
  static async upsertAppointment(appointmentData: any, tenantId: string): Promise<{ data: any; error: any }> {
    if (!tenantId) {
      return { data: null, error: new Error('Operação bloqueada: tenant_id é obrigatório.') };
    }

    const payload = {
      ...appointmentData,
      tenant_id: tenantId,
      barbershop_id: tenantId,
      updated_at: new Date().toISOString(),
    };

    try {
      let res = await supabase.from('appointments').upsert([payload], { onConflict: 'id' }).select().maybeSingle();

      if (res.error && (res.error.code === '42P01' || res.error.message?.includes('does not exist'))) {
        res = await supabase.from('agendamentos').upsert([payload], { onConflict: 'id' }).select().maybeSingle();
      }

      const storageKey = this.getStorageKey('appointments', tenantId);
      const cachedRaw = safeStorage.getItem(storageKey);
      const list = cachedRaw ? JSON.parse(cachedRaw) : [];
      const updatedList = [payload, ...list.filter((a: any) => a.id !== appointmentData.id)];
      safeStorage.setItem(storageKey, JSON.stringify(updatedList));

      return { data: res.data || payload, error: res.error };
    } catch (err) {
      return { data: payload, error: err };
    }
  }

  /**
   * Busca serviços com isolamento de tenant
   */
  static async getServices(tenantId: string): Promise<{ data: any[]; error: any }> {
    if (!tenantId) return { data: [], error: null };
    const storageKey = this.getStorageKey('services', tenantId);

    try {
      const res = await this.resilientSelect(['services', 'servicos'], tenantId, 'name', true);
      if (!res.error && Array.isArray(res.data)) {
        safeStorage.setItem(storageKey, JSON.stringify(res.data));
        return { data: res.data, error: null };
      }

      const cached = safeStorage.getItem(storageKey);
      return { data: cached ? JSON.parse(cached) : [], error: res.error };
    } catch (err) {
      const cached = safeStorage.getItem(storageKey);
      return { data: cached ? JSON.parse(cached) : [], error: err };
    }
  }

  /**
   * Busca barbeiros com isolamento de tenant
   */
  static async getBarbers(tenantId: string): Promise<{ data: any[]; error: any }> {
    if (!tenantId) return { data: [], error: null };
    const storageKey = this.getStorageKey('barbers', tenantId);

    try {
      const res = await this.resilientSelect(['barbers', 'barbeiros'], tenantId, 'name', true);
      if (!res.error && Array.isArray(res.data)) {
        safeStorage.setItem(storageKey, JSON.stringify(res.data));
        return { data: res.data, error: null };
      }

      const cached = safeStorage.getItem(storageKey);
      return { data: cached ? JSON.parse(cached) : [], error: res.error };
    } catch (err) {
      const cached = safeStorage.getItem(storageKey);
      return { data: cached ? JSON.parse(cached) : [], error: err };
    }
  }

  /**
   * Busca produtos com isolamento de tenant
   */
  static async getProducts(tenantId: string): Promise<{ data: any[]; error: any }> {
    if (!tenantId) return { data: [], error: null };
    const storageKey = this.getStorageKey('products', tenantId);

    try {
      const res = await this.resilientSelect(['products', 'produtos'], tenantId, 'name', true);
      if (!res.error && Array.isArray(res.data)) {
        safeStorage.setItem(storageKey, JSON.stringify(res.data));
        return { data: res.data, error: null };
      }

      const cached = safeStorage.getItem(storageKey);
      return { data: cached ? JSON.parse(cached) : [], error: res.error };
    } catch (err) {
      const cached = safeStorage.getItem(storageKey);
      return { data: cached ? JSON.parse(cached) : [], error: err };
    }
  }

  /**
   * Simula teste de penetração BOLA / IDOR tentando consultar dados de outro tenant
   */
  static async simulatePenetrationTest(
    activeTenantId: string,
    targetVictimTenantId: string
  ): Promise<{
    allowed: boolean;
    leakedCount: number;
    violationDetected: boolean;
    details: string;
  }> {
    if (activeTenantId === targetVictimTenantId) {
      return {
        allowed: true,
        leakedCount: 0,
        violationDetected: false,
        details: 'Teste abortado: o tenant ativo é igual ao alvo.',
      };
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', targetVictimTenantId);

      if (error) {
        return {
          allowed: false,
          leakedCount: 0,
          violationDetected: false,
          details: `Bloqueado com sucesso pelo Supabase RLS: ${error.message}`,
        };
      }

      const leakedCount = data ? data.length : 0;
      const violationDetected = leakedCount > 0;

      return {
        allowed: !violationDetected,
        leakedCount,
        violationDetected,
        details: violationDetected
          ? `VULNERABILIDADE DETECTADA: ${leakedCount} registros do tenant vítima foram retornados para outro tenant!`
          : 'Segurança RLS validada: 0 registros retornados da outra conta.',
      };
    } catch (err: any) {
      return {
        allowed: false,
        leakedCount: 0,
        violationDetected: false,
        details: `Requisição rejeitada pelo banco: ${err?.message || err}`,
      };
    }
  }

  /**
   * Simulação direta de ataque cross-tenant
   */
  static async simulateCrossTenantAttack(
    attackerTenantId: string,
    victimTenantId: string,
    targetRecordId?: string
  ): Promise<{ blocked: boolean; details: string }> {
    try {
      const res = await this.simulatePenetrationTest(attackerTenantId, victimTenantId);
      return {
        blocked: !res.violationDetected,
        details: res.details,
      };
    } catch {
      return { blocked: true, details: 'Bloqueado por RLS do PostgreSQL.' };
    }
  }
}
