/**
 * @file AuthContext.tsx
 * @description [FRONTEND] Contexto de Autenticação React com Armazenamento Estritamente em Memória (useState).
 * 
 * Por que este modelo de segurança foi adotado:
 * 1. Access Token estritamente em memória: O token JWT NÃO é gravado em localStorage ou sessionStorage.
 *    Qualquer script malicioso injetado por XSS não consegue roubar o token via storage do navegador.
 * 2. Silent Refresh no Carregamento Inicial (useEffect / F5): Ao recarregar a página (F5), a memória RAM
 *    do React é limpa. O useEffect executa automaticamente uma requisição para /api/auth/refresh.
 *    Como o Refresh Token está seguro no Cookie HttpOnly, o backend renova o Access Token e o usuário
 *    permanece logado sem interrupção de tela.
 * 3. Separação de Níveis de Acesso (RBAC): O estado mantém o perfil do usuário (owner, barber, client) e o
 *    barbeariaId, habilitando proteção de rotas no front-end e validação multi-tenant.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { api, setupAxiosAuthBridges } from '../services/api';
import { supabase, resolveUnifiedTenantId } from '../lib/supabase';
import { safeStorage } from '../utils/safeStorage';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'barber' | 'client' | 'admin';
  barbeariaId: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  silentRefresh: () => Promise<boolean>;
  setAuthUser?: (user: AuthUser | null) => void;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // ETAPA 3: O accessToken e user são inicializados com verificação defensiva de storage
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    try {
      return safeStorage.getItem('saas_jwt_access_token') || safeStorage.getItem('access_token') || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const savedUserStr = safeStorage.getItem('saas_auth_user');
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed?.email) {
          const userMeta = parsed.user_metadata || {};
          const mappedRole = parsed.role || userMeta.role || 'admin';
          const resolvedTenantId =
            parsed.barbeariaId ||
            parsed.tenant_id ||
            parsed.barbershop_id ||
            userMeta.tenant_id ||
            userMeta.barbershop_id ||
            resolveUnifiedTenantId(null, parsed) ||
            '';
          return {
            id: parsed.id || 'usr-default',
            email: parsed.email,
            name: parsed.name || userMeta.name || userMeta.full_name || parsed.email.split('@')[0] || 'Usuário',
            role: mappedRole === 'owner' ? 'owner' : mappedRole === 'barber' ? 'barber' : mappedRole === 'client' ? 'client' : 'admin',
            barbeariaId: resolvedTenantId,
          };
        }
      }
    } catch {}
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      const savedUserStr = safeStorage.getItem('saas_auth_user');
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed?.email) return false;
      }
    } catch {}
    return true;
  });

  // Função interna de logout (limpa estado em memória e desativa o cookie no backend)
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignora falhas de rede no logout para garantir limpeza local
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  // Registra as pontes entre o Axios e os estados em memória do React
  useEffect(() => {
    setupAxiosAuthBridges(
      () => accessToken,
      (newToken) => setAccessToken(newToken),
      () => {
        setAccessToken(null);
        setUser(null);
      }
    );
  }, [accessToken]);

  // ETAPA 5.3: Silent Refresh para renovar o Access Token sem intervenção do usuário
  const silentRefresh = useCallback(async (): Promise<boolean> => {
    try {
      const response = await axios.post<{
        success: boolean;
        accessToken: string;
        user: AuthUser;
      }>(
        '/api/auth/refresh',
        {},
        {
          withCredentials: true, // Envia o cookie HttpOnly refreshToken
          baseURL: import.meta.env.VITE_API_URL || '',
          validateStatus: (status) => status < 500, // Trata 401 (sem cookie) silenciosamente sem estourar no console
        }
      );

      if (response.status === 200 && response.data?.accessToken) {
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
        return true;
      }
      setAccessToken(null);
      setUser(null);
      return false;
    } catch {
      setAccessToken(null);
      setUser(null);
      return false;
    }
  }, []);

  // Sincronizador reativo imediato para eventos de login e atualização de sessão
  useEffect(() => {
    let isMounted = true;

    const handleAuthSync = () => {
      if (!isMounted) return;
      try {
        const savedUserStr = safeStorage.getItem('saas_auth_user');
        if (savedUserStr) {
          const parsed = JSON.parse(savedUserStr);
          if (parsed?.email) {
            const userMeta = parsed.user_metadata || {};
            const mappedRole = parsed.role || userMeta.role || 'admin';
            const resolvedTenantId =
              parsed.barbeariaId ||
              parsed.tenant_id ||
              parsed.barbershop_id ||
              userMeta.tenant_id ||
              userMeta.barbershop_id ||
              resolveUnifiedTenantId(null, parsed) ||
              '';
            setUser({
              id: parsed.id || 'usr-default',
              email: parsed.email,
              name: parsed.name || userMeta.name || userMeta.full_name || parsed.email.split('@')[0] || 'Usuário',
              role: mappedRole === 'owner' ? 'owner' : mappedRole === 'barber' ? 'barber' : mappedRole === 'client' ? 'client' : 'admin',
              barbeariaId: resolvedTenantId,
            });
            const token = safeStorage.getItem('saas_jwt_access_token') || safeStorage.getItem('access_token');
            if (token) setAccessToken(token);
            setIsLoading(false);
          }
        }
      } catch {}
    };

    window.addEventListener('saas:auth-state-changed', handleAuthSync);
    window.addEventListener('storage', handleAuthSync);

    const initializeAuthSession = async () => {
      try {
        // 1. Tenta recuperar sessão ativa oficial do Supabase Auth
        const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        if (session?.user && isMounted) {
          const u = session.user;
          const userMeta = u.user_metadata || {};
          let profileShopId = userMeta.barbershop_id || userMeta.tenant_id || (u as any).barbeariaId;
          let profileName = userMeta.name || userMeta.full_name;
          let profileRole = userMeta.role;
          let officialUserId = u.id;

          // Busca perfil prioritariamente por e-mail para sincronizar com o UUID oficial (Google)
          try {
            const userEmail = (u.email || '').toLowerCase().trim();
            if (userEmail) {
              const { data: pByEmail } = await supabase
                .from('profiles')
                .select('*')
                .ilike('email', userEmail)
                .maybeSingle();
              if (pByEmail) {
                if (pByEmail.id) officialUserId = pByEmail.id;
                if (pByEmail.barbershop_id) profileShopId = pByEmail.barbershop_id;
                if (pByEmail.full_name) profileName = pByEmail.full_name;
                if (pByEmail.role) profileRole = pByEmail.role;
              }
            }
          } catch {}

          if (!profileShopId || !profileName) {
            try {
              const { data: pData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', u.id)
                .maybeSingle();
              if (pData) {
                if (pData.barbershop_id) profileShopId = pData.barbershop_id;
                if (pData.full_name) profileName = pData.full_name;
                if (pData.role) profileRole = pData.role;
              }
            } catch {}
          }

          const mappedRole = profileRole || 'admin';
          const resolvedTenantId =
            profileShopId ||
            resolveUnifiedTenantId(null, u) ||
            '';
          const resolvedUser: AuthUser = {
            id: officialUserId,
            email: u.email || '',
            name: profileName || u.email?.split('@')[0] || 'Usuário',
            role: mappedRole === 'owner' ? 'owner' : mappedRole === 'barber' ? 'barber' : mappedRole === 'client' ? 'client' : 'admin',
            barbeariaId: resolvedTenantId,
          };
          setUser(resolvedUser);
          if (session.access_token) {
            setAccessToken(session.access_token);
          }
          setIsLoading(false);
          return;
        }

        // 2. Tenta recuperar sessão persistida segura
        const savedUserStr = safeStorage.getItem('saas_auth_user');
        if (savedUserStr && isMounted) {
          try {
            const parsed = JSON.parse(savedUserStr);
            if (parsed?.email) {
              const userMeta = parsed.user_metadata || {};
              const mappedRole = parsed.role || userMeta.role || 'admin';
              const resolvedTenantId =
                parsed.barbeariaId ||
                parsed.tenant_id ||
                parsed.barbershop_id ||
                userMeta.tenant_id ||
                userMeta.barbershop_id ||
                resolveUnifiedTenantId(null, parsed) ||
                '';
              setUser({
                id: parsed.id || 'usr-default',
                email: parsed.email,
                name: parsed.name || userMeta.name || userMeta.full_name || parsed.email.split('@')[0] || 'Usuário',
                role: mappedRole === 'owner' ? 'owner' : mappedRole === 'barber' ? 'barber' : mappedRole === 'client' ? 'client' : 'admin',
                barbeariaId: resolvedTenantId,
              });
              const token = safeStorage.getItem('saas_jwt_access_token') || safeStorage.getItem('access_token');
              if (token) setAccessToken(token);
              setIsLoading(false);
              return;
            }
          } catch {}
        }

        // 3. Fallback: silent refresh via backend cookie
        await silentRefresh();
      } catch (err) {
        console.warn('Aviso na inicialização do AuthContext:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuthSession();

    // Escuta alterações de estado de autenticação no Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        const u = session.user;
        const userMeta = u.user_metadata || {};
        const mappedRole = userMeta.role || 'admin';
        setUser({
          id: u.id,
          email: u.email || '',
          name: userMeta.name || userMeta.full_name || u.email?.split('@')[0] || 'Usuário',
          role: mappedRole === 'owner' ? 'owner' : mappedRole === 'barber' ? 'barber' : mappedRole === 'client' ? 'client' : 'admin',
          barbeariaId: userMeta.barbershop_id || userMeta.tenant_id || u.id,
        });
        if (session.access_token) {
          setAccessToken(session.access_token);
        }
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAccessToken(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('saas:auth-state-changed', handleAuthSync);
      window.removeEventListener('storage', handleAuthSync);
    };
  }, [silentRefresh]);

  // ETAPA 2: Ação de Login do Usuário com Loading Guards
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
      setIsLoading(true);
      try {
        // Tenta primeiro o Supabase Auth oficial
        const { data: supaData, error: supaErr } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (!supaErr && supaData?.user) {
          const u = supaData.user;
          const userMeta = u.user_metadata || {};
          const mappedRole = userMeta.role || 'admin';
          const resolvedUser: AuthUser = {
            id: u.id,
            email: u.email || '',
            name: userMeta.name || userMeta.full_name || u.email?.split('@')[0] || 'Usuário',
            role: mappedRole === 'owner' ? 'owner' : mappedRole === 'barber' ? 'barber' : mappedRole === 'client' ? 'client' : 'admin',
            barbeariaId: userMeta.barbershop_id || userMeta.tenant_id || u.id,
          };
          setUser(resolvedUser);
          if (supaData.session?.access_token) {
            setAccessToken(supaData.session.access_token);
          }
          return { success: true };
        }

        const response = await api.post<{
          success: boolean;
          accessToken: string;
          user: AuthUser;
          message?: string;
        }>('/auth/login', { email, password });

        if (response.data.success && response.data.accessToken) {
          setAccessToken(response.data.accessToken);
          setUser(response.data.user);
          return { success: true, message: response.data.message };
        }

        return {
          success: false,
          message: response.data.message || 'Falha ao autenticar usuário.',
        };
      } catch (error: any) {
        const errMsg =
          error?.response?.data?.message ||
          error?.message ||
          'Erro de conexão ao tentar realizar login.';
        return { success: false, message: errMsg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const setAuthUser = useCallback((newUser: AuthUser | null) => {
    setUser(newUser);
    if (newUser) setIsLoading(false);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(accessToken && user),
      isLoading,
      login,
      logout,
      silentRefresh,
      setAuthUser,
    }),
    [user, accessToken, isLoading, login, logout, silentRefresh, setAuthUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook customizado para consumo seguro do contexto de autenticação em qualquer componente React.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    let savedUser: AuthUser | null = null;
    let savedToken: string | null = null;
    try {
      const savedUserStr = safeStorage.getItem('saas_auth_user');
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed?.email) {
          const userMeta = parsed.user_metadata || {};
          savedUser = {
            id: parsed.id || 'usr-default',
            email: parsed.email,
            name: parsed.name || userMeta.name || userMeta.full_name || 'Usuário',
            role: parsed.role || userMeta.role || 'admin',
            barbeariaId: parsed.barbershop_id || userMeta.barbershop_id || parsed.barbeariaId || parsed.id || '',
          };
        }
      }
      savedToken = safeStorage.getItem('saas_jwt_access_token') || safeStorage.getItem('access_token');
    } catch {}

    return {
      user: savedUser,
      accessToken: savedToken,
      isAuthenticated: Boolean(savedUser && savedToken),
      isLoading: false,
      login: async () => ({ success: false, message: 'AuthProvider não encontrado.' }),
      logout: async () => {},
      silentRefresh: async () => false,
      setAuthUser: () => {},
    };
  }

  // Se o contexto ainda não tiver o user mas o safeStorage já possuir, provê hidratação imediata
  if (!context.user) {
    try {
      const savedUserStr = safeStorage.getItem('saas_auth_user');
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        if (parsed?.email) {
          const userMeta = parsed.user_metadata || {};
          const mappedRole = parsed.role || userMeta.role || 'admin';
          const hydratedUser: AuthUser = {
            id: parsed.id || 'usr-default',
            email: parsed.email,
            name: parsed.name || userMeta.name || userMeta.full_name || parsed.email.split('@')[0] || 'Usuário',
            role: mappedRole === 'owner' ? 'owner' : mappedRole === 'barber' ? 'barber' : mappedRole === 'client' ? 'client' : 'admin',
            barbeariaId: parsed.barbershop_id || userMeta.barbershop_id || userMeta.tenant_id || parsed.id || '',
          };
          return {
            ...context,
            user: hydratedUser,
            isAuthenticated: true,
            isLoading: false,
          };
        }
      }
    } catch {}
  }

  return context;
}
