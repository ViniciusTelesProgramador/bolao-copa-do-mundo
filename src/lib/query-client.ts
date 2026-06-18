import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 min — dados ficam "frescos" por 1 min
        gcTime: 5 * 60 * 1000, // 5 min — cache mantido na memória
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
