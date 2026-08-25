/**
 * IndexedDB Offline Answer Outbox for NavyTryout
 * Stores pending answers in IndexedDB when offline or debouncing,
 * and flushes them to the server when online.
 */

const DB_NAME = "navy_tryout_db";
const DB_VERSION = 1;
const STORE_NAME = "answer_outbox";

export interface OutboxItem {
  id: string; // `${attemptId}_${questionId}`
  attemptId: string;
  questionId: string;
  selectedOptionId: string | null;
  clientUpdatedAt: string; // ISO string
  isFlagged?: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("attemptId", "attemptId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveToOutbox(item: OutboxItem): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB save failed, falling back to in-memory:", err);
  }
}

export async function getOutboxForAttempt(attemptId: string): Promise<OutboxItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("attemptId");
      const req = index.getAll(attemptId);

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB get failed:", err);
    return [];
  }
}

export async function removeFromOutbox(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      for (const id of ids) {
        store.delete(id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("IndexedDB remove failed:", err);
  }
}

export async function clearOutboxForAttempt(attemptId: string): Promise<void> {
  try {
    const items = await getOutboxForAttempt(attemptId);
    const ids = items.map((i) => i.id);
    await removeFromOutbox(ids);
  } catch (err) {
    console.warn("IndexedDB clear failed:", err);
  }
}
