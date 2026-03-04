import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QueuedUpload {
  id: string;
  bucket: string;
  path: string;
  base64Data: string;
  contentType: string;
  createdAt: string;
}

const QUEUE_KEY = 'upload_queue';

function dispatchQueueChange() {
  window.dispatchEvent(new Event('upload-queue-changed'));
}

function getQueue(): QueuedUpload[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedUpload[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  dispatchQueueChange();
}

export function useUploadQueue() {
  const [queue, setQueue] = useState<QueuedUpload[]>(getQueue);
  const [isSyncing, setIsSyncing] = useState(false);

  // Add a file to the queue
  const enqueue = useCallback((
    bucket: string,
    path: string,
    base64Data: string,
    contentType: string
  ) => {
    const item: QueuedUpload = {
      id: crypto.randomUUID(),
      bucket,
      path,
      base64Data,
      contentType,
      createdAt: new Date().toISOString(),
    };

    const updated = [...getQueue(), item];
    saveQueue(updated);
    setQueue(updated);

    if (!navigator.onLine) {
      toast.info('Foto salva na fila — será enviada quando a conexão voltar');
    }

    return item.id;
  }, []);

  // Process the queue
  const processQueue = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    const currentQueue = getQueue();
    if (currentQueue.length === 0) return;

    setIsSyncing(true);

    const remaining: QueuedUpload[] = [];
    let uploaded = 0;

    for (const item of currentQueue) {
      try {
        // Convert base64 to Blob
        const byteString = atob(item.base64Data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: item.contentType });

        const { error } = await supabase.storage
          .from(item.bucket)
          .upload(item.path, blob, {
            contentType: item.contentType,
            upsert: true,
          });

        if (error) {
          console.error('Upload failed:', error);
          remaining.push(item);
        } else {
          uploaded++;
        }
      } catch (err) {
        console.error('Upload error:', err);
        remaining.push(item);
      }
    }

    saveQueue(remaining);
    setQueue(remaining);
    setIsSyncing(false);

    if (uploaded > 0) {
      toast.success(`${uploaded} foto${uploaded > 1 ? 's' : ''} sincronizada${uploaded > 1 ? 's' : ''} com sucesso!`);
    }
  }, [isSyncing]);

  // Auto-process when coming online
  useEffect(() => {
    const handleOnline = () => {
      processQueue();
    };

    window.addEventListener('online', handleOnline);

    // Also try on mount if online
    if (navigator.onLine) {
      processQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [processQueue]);

  // Refresh queue state periodically
  useEffect(() => {
    const handleChange = () => setQueue(getQueue());
    window.addEventListener('upload-queue-changed', handleChange);
    return () => window.removeEventListener('upload-queue-changed', handleChange);
  }, []);

  return {
    queue,
    enqueue,
    processQueue,
    isSyncing,
    pendingCount: queue.length,
  };
}
