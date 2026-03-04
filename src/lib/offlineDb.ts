/**
 * IndexedDB persistence layer for offline mutations.
 * Stores pending irrigation and rainfall operations that couldn't
 * be synced due to lack of network connectivity.
 */

const DB_NAME = 'solov3_offline';
const DB_VERSION = 1;
const STORE_MUTATIONS = 'pending_mutations';

export interface OfflineMutation {
  id: string;
  table: 'irrigation_logs' | 'rainfall_history';
  operation: 'upsert' | 'insert' | 'delete';
  payload: Record<string, unknown>;
  conflictKey?: string;
  createdAt: string;
  retries: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_MUTATIONS)) {
        const store = db.createObjectStore(STORE_MUTATIONS, { keyPath: 'id' });
        store.createIndex('table', 'table', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addOfflineMutation(mutation: OfflineMutation): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
    tx.objectStore(STORE_MUTATIONS).put(mutation);
    tx.oncomplete = () => {
      window.dispatchEvent(new CustomEvent('offline-queue-changed'));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllPendingMutations(): Promise<OfflineMutation[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MUTATIONS, 'readonly');
    const req = tx.objectStore(STORE_MUTATIONS).index('createdAt').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function removeMutation(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
    tx.objectStore(STORE_MUTATIONS).delete(id);
    tx.oncomplete = () => {
      window.dispatchEvent(new CustomEvent('offline-queue-changed'));
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MUTATIONS, 'readonly');
    const req = tx.objectStore(STORE_MUTATIONS).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
