/**
 * src/lib/queryClient.ts
 *
 * Instância Centralizada do React Query Client (@tanstack/react-query).
 * Gerencia cache em memória, ciclo de vida de requisições e suporte
 * a expurgo total no logout (queryClient.clear()).
 */

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de dados frescos
      gcTime: 1000 * 60 * 15, // 15 minutos em memória cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

export default queryClient;
