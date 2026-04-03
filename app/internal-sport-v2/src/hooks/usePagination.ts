import { useState, useCallback, useEffect, useMemo } from 'react';

interface UsePaginationOptions {
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

/**
 * Hook to manage pagination with infinite scroll support
 * @param items - Full array of data (not yet paginated)
 * @param options - Configuration (pageSize, callbacks)
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
) {
  const pageSize = options.pageSize || 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Paginated data - only take from beginning to end of current page
  const paginatedItems = useMemo(() => {
    const end = currentPage * pageSize;
    return items.slice(0, end);
  }, [items, currentPage, pageSize]);

  // Check if there's more data to load
  const hasMore = paginatedItems.length < items.length;

  // Load next page
  const loadMore = useCallback(() => {
    setCurrentPage(prev => prev + 1);
    options.onPageChange?.(currentPage + 1);
  }, [currentPage, options]);

  // Reset to page 1
  const reset = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // Reset when items change (e.g., filter is applied)
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  return {
    paginatedItems,
    currentPage,
    pageSize,
    hasMore,
    loadMore,
    reset,
    totalItems: items.length,
    totalPages: Math.ceil(items.length / pageSize),
  };
}
