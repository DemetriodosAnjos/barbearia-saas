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
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // ETAPA 3: O accessToken é mantido ESTRITAMENTE em memória (useState)
  // NUNCA gravado em localStorage, sessionStorage ou IndexedDB
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // ETAPA 5.3: useEffect no carregamento da aplicação (F5)
  // Restaura a sessão silenciosamente antes de renderizar a interface final
  useEffect(() => {
    let isMounted = true;

    const initializeAuthSession = async () => {
      try {
        await silentRefresh();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuthSession();

    return () => {
      isMounted = false;
    };
  }, [silentRefresh]);

  // ETAPA 2: Ação de Login do Usuário
  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
      try {
        const response = await api.post<{
          success: boolean;
          accessToken: string;
          user: AuthUser;
          message?: string;
        }>('/auth/login', { email, password });

        if (response.data.success && response.data.accessToken) {
          // Salva estritamente no estado em memória
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
      }
    },
    []
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(accessToken && user),
      isLoading,
      login,
      logout,
      silentRefresh,
    }),
    [user, accessToken, isLoading, login, logout, silentRefresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook customizado para consumo seguro do contexto de autenticação em qualquer componente React.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um <AuthProvider />.');
  }
  return context;
}
