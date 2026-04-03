import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
  type InfiniteData
} from '@tanstack/react-query';

export function useODataQuery<
  T = unknown,
  TError = Error,
  TData = T
>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, TError, TData, QueryKey>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, TError, TData, QueryKey>({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * OData response type with pagination info
 */
export interface ODataPageResponse<T> {
  value: T[];
  '@odata.count'?: number;
}

/**
 * Hook for infinite scroll with OData pagination
 * Calls API multiple times as user scrolls, appending results
 */
export function useInfiniteODataQuery<T = unknown, TError = Error>(
  queryKey: QueryKey,
  queryFn: (page: number) => Promise<ODataPageResponse<T>>,
  options?: {
    pageSize?: number;
    staleTime?: number;
    enabled?: boolean;
    refetchInterval?: number | false | ((query: any) => number | false | undefined);
  }
) {
  const pageSize = options?.pageSize ?? 20;

  return useInfiniteQuery<
    ODataPageResponse<T>,
    TError,
    InfiniteData<ODataPageResponse<T>>,
    QueryKey,
    number
  >({
    queryKey,
    queryFn: ({ pageParam }) => queryFn(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.value) return undefined;
      const totalCount = lastPage['@odata.count'];
      const loadedCount = allPages.reduce((sum, page) => sum + (page.value?.length ?? 0), 0);

      // If we have total count, use it to determine if there are more pages
      if (totalCount !== undefined) {
        return loadedCount < totalCount ? allPages.length + 1 : undefined;
      }

      // Otherwise, check if the last page was full
      return lastPage.value.length >= pageSize ? allPages.length + 1 : undefined;
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
  });
}

export function useODataMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'>
) {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn,
    onSuccess: (data, variables, context, _meta) => {
      // Invalidate and refetch related queries
      queryClient.invalidateQueries();
      options?.onSuccess?.(data, variables, context, _meta);
    },
    ...options,
  });
}