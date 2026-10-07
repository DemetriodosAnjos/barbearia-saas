/**
 * @file api.ts
 * @description [FRONTEND] Instância do Axios com withCredentials e Interceptadores de Requisição e Resposta.
 * 
 * Por que esta arquitetura de interceptadores foi adotada:
 * 1. withCredentials: true -> Obrigatório para o navegador enviar automaticamente o Cookie HttpOnly ('refreshToken')
 *    em requisições para o backend, tanto no login quanto na rota /refresh.
 * 2. Interceptador de Requisição -> Injeta dinamicamente 'Authorization: Bearer <accessToken>' obtido do estado
 *    em memória do React, mantendo o token fora do LocalStorage/SessionStorage.
 * 3. Interceptador de Resposta com Fila de Espera (Request Queuing) -> Caso múltiplas requisições concorrentes
 *    recebam HTTP 401 simultaneamente quando o Access Token expirar, apenas UMA chamada para /refresh é disparada.
 *    As demais requisições aguardam na fila e são reexecutadas automaticamente com o novo token transparente para o usuário.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Callbacks para sincronização segura com o estado em memória do AuthContext (React)
type TokenGetter = () => string | null;
type TokenSetter = (token: string | null) => void;
type LogoutHandler = () => void;

let getMemoryToken: TokenGetter = () => null;
let setMemoryToken: TokenSetter = () => {};
let handleForcedLogout: LogoutHandler = () => {};

/**
 * Registra as pontes com o React AuthContext para ler e atualizar o Access Token em memória.
 */
export function setupAxiosAuthBridges(
  getToken: TokenGetter,
  setToken: TokenSetter,
  onLogout: LogoutHandler
) {
  getMemoryToken = getToken;
  setMemoryToken = setToken;
  handleForcedLogout = onLogout;
}

// ETAPA 4.1: Configuração da Instância do Axios com withCredentials
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // Garante que cookies HttpOnly (refreshToken) sejam enviados automaticamente
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ETAPA 4.2: Interceptador de REQUISIÇÃO
// Anexa dinamicamente o header Authorization: Bearer <token> a partir da memória do React
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getMemoryToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  }
);

// ETAPA 5.2: Interceptador de RESPOSTA e Fila de Renovação Silenciosa (Silent Refresh)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Se a rota que falhou foi o próprio /auth/refresh-token ou /auth/login, não tenta renovar em loop
    const isAuthRoute =
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/login');

    // Detecta erro HTTP 401 (Não Autorizado) e se a requisição ainda não foi reprocessada
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        // Pausa as requisições paralelas em uma fila de espera até o token ser renovado
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Dispara a rota de Silent Refresh enviando o Cookie HttpOnly automaticamente
        const refreshResponse = await axios.post<{
          success: boolean;
          accessToken: string;
        }>(
          '/api/auth/refresh',
          {},
          {
            withCredentials: true, // Garante que o navegador envie o cookie HttpOnly refreshToken
            baseURL: import.meta.env.VITE_API_URL || '',
          }
        );

        const newAccessToken = refreshResponse.data.accessToken;

        // Atualiza a memória do React (AuthContext)
        setMemoryToken(newAccessToken);

        // Atualiza o header da requisição original que falhou
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        // Libera todas as requisições pausadas na fila
        processQueue(null, newAccessToken);

        // Reexecuta a requisição original de forma 100% transparente para o usuário
        return api(originalRequest);
      } catch (refreshError) {
        // Se a renovação falhar (ex: Refresh Token expirado após 7 dias ou revogado), limpa a memória e desloga
        processQueue(refreshError, null);
        setMemoryToken(null);
        handleForcedLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
