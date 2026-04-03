/**
 * useDocumentQueue Hook
 * Manages a queue of selected document IDs for sequential navigation
 * on the Review page. Uses sessionStorage so the queue survives
 * in-app navigation and page refreshes but resets on tab close.
 */

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveLastViewedRowId } from '@/pages/Dashboard/hooks/useScrollManagement';

const STORAGE_KEY = 'document_queue';

// ── Public helpers (called from Dashboard) ──

/** Save an ordered list of document IDs to the queue. */
export function saveDocumentQueue(ids: string[]) {
  if (ids.length > 1) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

/** Clear the document queue. */
export function clearDocumentQueue() {
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Read the queue (returns empty array if none). */
function getQueue(): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Hook (used on Review page) ──

export interface DocumentQueueState {
  /** Whether a multi-document queue is active */
  hasQueue: boolean;
  /** 0-based index of current document in queue */
  currentIndex: number;
  /** Total number of documents in queue */
  total: number;
  /** Navigate to the first document */
  goFirst: () => void;
  /** Navigate to the previous document */
  goPrev: () => void;
  /** Navigate to the next document */
  goNext: () => void;
  /** Navigate to the last document */
  goLast: () => void;
}

export function useDocumentQueue(currentId: string | undefined): DocumentQueueState {
  const navigate = useNavigate();
  const queue = useMemo(() => getQueue(), []);
  const currentIndex = currentId ? queue.indexOf(currentId) : -1;
  const hasQueue = queue.length > 1 && currentIndex >= 0;
  const total = queue.length;

  const navigateTo = useCallback(
    (index: number) => {
      const targetId = queue[index];
      if (targetId) {
        saveLastViewedRowId(targetId);
        navigate(`/review/${targetId}`, { replace: true });
      }
    },
    [queue, navigate]
  );

  const goFirst = useCallback(() => navigateTo(0), [navigateTo]);
  const goPrev = useCallback(
    () => navigateTo(Math.max(0, currentIndex - 1)),
    [navigateTo, currentIndex]
  );
  const goNext = useCallback(
    () => navigateTo(Math.min(queue.length - 1, currentIndex + 1)),
    [navigateTo, currentIndex, queue.length]
  );
  const goLast = useCallback(
    () => navigateTo(queue.length - 1),
    [navigateTo, queue.length]
  );

  return { hasQueue, currentIndex, total, goFirst, goPrev, goNext, goLast };
}
