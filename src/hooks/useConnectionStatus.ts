import { useState, useEffect, useCallback } from 'react';
import { getPendingCount } from '@/lib/offlineDb';

export type ConnectionState = 'online' | 'offline' | 'syncing';

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionState>(
    navigator.onLine ? 'online' : 'offline'
  );
  const [pendingUploads, setPendingUploads] = useState(0);
  const [pendingMutations, setPendingMutations] = useState(0);

  const checkPendingUploads = useCallback(() => {
    try {
      const queue = JSON.parse(localStorage.getItem('upload_queue') || '[]');
      setPendingUploads(queue.length);
      return queue.length;
    } catch {
      return 0;
    }
  }, []);

  const checkPendingMutations = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingMutations(count);
      return count;
    } catch {
      return 0;
    }
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      const uploads = checkPendingUploads();
      const mutations = await checkPendingMutations();
      setStatus((uploads + mutations) > 0 ? 'syncing' : 'online');
    };

    const handleOffline = () => {
      setStatus('offline');
    };

    const handleQueueChange = async () => {
      const uploads = checkPendingUploads();
      const mutations = await checkPendingMutations();
      if (navigator.onLine) {
        setStatus((uploads + mutations) > 0 ? 'syncing' : 'online');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('upload-queue-changed', handleQueueChange);
    window.addEventListener('offline-queue-changed', handleQueueChange);

    // Initial check
    checkPendingMutations();

    const interval = setInterval(async () => {
      checkPendingUploads();
      await checkPendingMutations();
      if (navigator.onLine && status === 'offline') {
        setStatus('online');
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('upload-queue-changed', handleQueueChange);
      window.removeEventListener('offline-queue-changed', handleQueueChange);
      clearInterval(interval);
    };
  }, [checkPendingUploads, checkPendingMutations, status]);

  const totalPending = pendingUploads + pendingMutations;

  return { status, pendingUploads, pendingMutations, totalPending };
}
