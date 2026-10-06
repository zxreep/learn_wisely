import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 20_000, retry: (count, error: any) => error?.status >= 500 && count < 2, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});
