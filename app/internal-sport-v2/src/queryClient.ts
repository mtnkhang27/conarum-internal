import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: (failureCount, error) => {
                // Never retry 403 — it's an authorization issue, not a transient error
                if ((error as any)?.response?.status === 403 || (error as any)?.isForbidden) return false;
                return failureCount < 1;
            },
            refetchOnWindowFocus: false,
        },
    },
});
