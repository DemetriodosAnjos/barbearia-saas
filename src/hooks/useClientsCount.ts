import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { safeStorage } from '../utils/safeStorage';

export interface UseClientsCountResult {
  count: number;
  newThisMonth: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseClientsCountOptions {
  loading?: boolean;
  user?: any;
}

export function useClientsCount(
  tenantOrId?: string | { id?: string } | null,
  initialClients?: any[],
  options?: UseClientsCountOptions
): UseClientsCountResult {
  // Resolve ID do tenant de forma robusta e segura
  const resolvedTenantId = useMemo(() => {
    if (typeof tenantOrId === 'string' && tenantOrId.trim()) {
      return tenantOrId.trim();
    }
    if (tenantOrId && typeof tenantOrId === 'object' && tenantOrId.id) {
      return String(tenantOrId.id).trim();
    }
    if (options?.user) {
      const u = options.user;
      const candidate = u.barbeariaId || u.barbershop_id || u.tenant_id || u.user_metadata?.barbershop_id || u.user_metadata?.tenant_id || u.id;
      if (candidate) return String(candidate).trim();
    }
    try {
      const activeTenant = safeStorage.getItem('saas_active_tenant');
      if (activeTenant) {
        const parsed = JSON.parse(activeTenant);
        if (parsed?.id) return String(parsed.id).trim();
      }
      const authUser = safeStorage.getItem('saas_auth_user');
      if (authUser) {
        const parsed = JSON.parse(authUser);
        const candidate = parsed?.user_metadata?.barbershop_id || parsed?.user_metadata?.tenant_id || parsed?.barbeariaId || parsed?.id;
        if (candidate) return String(candidate).trim();
      }
    } catch {
      // ignore
    }
    return '';
  }, [tenantOrId, options?.user]);

  // Contagem inicial baseada no cache / estado atual
  const initialComputedCount = useMemo(() => {
    if (Array.isArray(initialClients)) {
      if (!resolvedTenantId) return initialClients.length;
      return initialClients.filter((c) => {
        const t = c.tenant_id || c.tenantId || c.barbershop_id || c.barbershopId;
        return t ? t === resolvedTenantId : true;
      }).length;
    }
    try {
      if (resolvedTenantId) {
        const cached = safeStorage.getItem(`saas_clients_cache_${resolvedTenantId}`);
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list)) return list.length;
        }
      }
    } catch {
      // ignore
    }
    return 0;
  }, [initialClients, resolvedTenantId]);

  const [count, setCount] = useState<number>(initialComputedCount);
  const [newThisMonth, setNewThisMonth] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sincroniza imediatamente com initialClients quando fornecido
  useEffect(() => {
    if (Array.isArray(initialClients)) {
      const scoped = resolvedTenantId
        ? initialClients.filter((c) => {
            const t = c.tenant_id || c.tenantId || c.barbershop_id || c.barbershopId;
            return t === resolvedTenantId;
          })
        : initialClients;
      setCount(scoped.length);

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const mNew = scoped.filter((c) => {
        const createdAt = c.created_at || c.createdAt;
        return createdAt && new Date(createdAt) >= firstDayOfMonth;
      }).length;
      setNewThisMonth(mNew);
    }
  }, [initialClients, resolvedTenantId]);

  // Função central de busca da contagem filtrada estritamente pelo tenant_id no Supabase
  const fetchCountFromSupabase = useCallback(async () => {
    // Loading guard estrito: não executa enquanto a autenticação/sessão estiver carregando ou usuário não hidratado
    if (options?.loading || (options && 'user' in options && !options.user) || !resolvedTenantId) {
      if (Array.isArray(initialClients)) {
        const scoped = resolvedTenantId
          ? initialClients.filter((c) => {
              const t = c.tenant_id || c.tenantId || c.barbershop_id || c.barbershopId;
              return !t || t === resolvedTenantId;
            })
          : initialClients;
        setCount(scoped.length);
      }
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // 1. Consulta exata do total de clientes filtrado por tenant_id
      let { count: dbCount, error: dbErr } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', resolvedTenantId);

      // 2. Fallback caso a tabela utilize a coluna legado barbershop_id
      if (dbErr && (dbErr.code === '42703' || dbErr.message?.includes('tenant_id'))) {
        const fbRes = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', resolvedTenantId);
        if (!fbRes.error && typeof fbRes.count === 'number') {
          dbCount = fbRes.count;
          dbErr = null;
        }
      }

      // 3. Consulta de clientes novos criados no mês atual
      const now = new Date();
      const firstDayIso = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      let monthNew = 0;

      let { count: mCount, error: mErr } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', resolvedTenantId)
        .gte('created_at', firstDayIso);

      if (mErr && (mErr.code === '42703' || mErr.message?.includes('tenant_id'))) {
        const mFb = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('barbershop_id', resolvedTenantId)
          .gte('created_at', firstDayIso);
        if (!mFb.error && typeof mFb.count === 'number') {
          mCount = mFb.count;
          mErr = null;
        }
      }

      if (!mErr && typeof mCount === 'number') {
        monthNew = mCount;
      }

      if (!dbErr && typeof dbCount === 'number') {
        setCount(dbCount);
        setNewThisMonth(monthNew);
      } else if (Array.isArray(initialClients)) {
        const scoped = initialClients.filter((c) => {
          const t = c.tenant_id || c.tenantId || c.barbershop_id || c.barbershopId;
          return t === resolvedTenantId;
        });
        setCount(scoped.length);
        const mNew = scoped.filter((c) => {
          const createdAt = c.created_at || c.createdAt;
          return createdAt && new Date(createdAt) >= new Date(firstDayIso);
        }).length;
        setNewThisMonth(mNew);
      }
    } catch (err: any) {
      setError(err?.message || 'Falha ao buscar contagem de clientes');
      if (Array.isArray(initialClients)) {
        const scoped = initialClients.filter((c) => {
          const t = c.tenant_id || c.tenantId || c.barbershop_id || c.barbershopId;
          return t === resolvedTenantId;
        });
        setCount(scoped.length);
      }
    } finally {
      setIsLoading(false);
    }
  }, [resolvedTenantId, initialClients, options?.loading, options?.user]);

  useEffect(() => {
    if (options?.loading || (options && 'user' in options && !options.user) || !resolvedTenantId) {
      return;
    }
    fetchCountFromSupabase();
  }, [fetchCountFromSupabase, options?.loading, options?.user, resolvedTenantId]);

  // Escuta Realtime e eventos locais para atualização instantânea da contagem
  useEffect(() => {
    if (!resolvedTenantId || options?.loading || (options && 'user' in options && !options.user)) return;

    let channel: any = null;
    try {
      channel = supabase
        .channel(`realtime-clients-count-${resolvedTenantId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'clients',
            filter: `tenant_id=eq.${resolvedTenantId}`,
          },
          () => {
            fetchCountFromSupabase();
          }
        )
        .subscribe();
    } catch {
      // Non-blocking
    }

    const handleLocalSync = () => {
      fetchCountFromSupabase();
    };

    window.addEventListener('saas:client-created', handleLocalSync);
    window.addEventListener('saas:client-deleted', handleLocalSync);
    window.addEventListener('saas:clients-updated', handleLocalSync);
    window.addEventListener('storage', handleLocalSync);

    return () => {
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener('saas:client-created', handleLocalSync);
      window.removeEventListener('saas:client-deleted', handleLocalSync);
      window.removeEventListener('saas:clients-updated', handleLocalSync);
      window.removeEventListener('storage', handleLocalSync);
    };
  }, [resolvedTenantId, fetchCountFromSupabase, options?.loading, options?.user]);

  return {
    count,
    newThisMonth,
    isLoading: isLoading || Boolean(options?.loading) || Boolean(options && 'user' in options && !options.user),
    error,
    refetch: fetchCountFromSupabase,
  };
}
