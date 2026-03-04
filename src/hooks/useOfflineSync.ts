import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  getAllPendingMutations,
  removeMutation,
  getPendingCount,
  type OfflineMutation,
} from '@/lib/offlineDb';
import { toast } from 'sonner';

/**
 * Syncs pending offline mutations to the backend when the device comes online.
 * Returns the current pending count and syncing state.
 */
export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB might not be available
    }
  }, []);

  const syncOne = useCallback(async (mutation: OfflineMutation): Promise<boolean> => {
    try {
      const { table, operation, payload, conflictKey } = mutation;

      if (operation === 'upsert') {
        const { error } = await supabase
          .from(table)
          .upsert(payload as any, conflictKey ? { onConflict: conflictKey } : undefined);
        if (error) throw error;
      } else if (operation === 'insert') {
        const { error } = await supabase.from(table).insert(payload as any);
        if (error) throw error;
      } else if (operation === 'delete') {
        // payload should contain the filter conditions
        // Not used for now but available
      }

      await removeMutation(mutation.id);
      return true;
    } catch (err) {
      console.warn(`[OfflineSync] Failed to sync mutation ${mutation.id}:`, err);
      return false;
    }
  }, []);

  const syncAll = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);

    try {
      const mutations = await getAllPendingMutations();
      if (mutations.length === 0) {
        setIsSyncing(false);
        syncingRef.current = false;
        return;
      }

      let synced = 0;
      let failed = 0;

      for (const m of mutations) {
        if (!navigator.onLine) break;
        const ok = await syncOne(m);
        if (ok) synced++;
        else failed++;
      }

      await refreshCount();

      if (synced > 0) {
        toast.success(`${synced} registro${synced > 1 ? 's' : ''} sincronizado${synced > 1 ? 's' : ''}`, {
          description: failed > 0 ? `${failed} falha${failed > 1 ? 's' : ''} — tentará novamente` : undefined,
          duration: 3000,
        });
      }
    } catch (err) {
      console.error('[OfflineSync] Sync error:', err);
    } finally {
      setIsSyncing(false);
      syncingRef.current = false;
    }
  }, [syncOne, refreshCount]);

  // Listen for online event + queue changes
  useEffect(() => {
    refreshCount();

    const handleOnline = () => {
      setTimeout(syncAll, 1500); // Small delay to let connection stabilize
    };
    const handleQueueChange = () => {
      refreshCount();
      if (navigator.onLine) {
        setTimeout(syncAll, 500);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline-queue-changed', handleQueueChange);

    // Try sync on mount if online and there are pending items
    if (navigator.onLine) {
      syncAll();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline-queue-changed', handleQueueChange);
    };
  }, [syncAll, refreshCount]);

  return { pendingCount, isSyncing, syncAll };
}
