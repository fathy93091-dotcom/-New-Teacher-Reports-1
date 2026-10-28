/**
/**
 * GoStars Local IndexedDB Storage Engine
 * 
 * Provides an enterprise-grade, offline-first local database.
 * Primary storage for all students, reports, lessons, attendance, payments, groups, and sync queue.
 * Operates without storage quota limitations of localStorage.
 */

export interface SyncQueueItem {
  id: string;
  userId: string;
  entityType:
    | "student"
    | "report"
    | "attendance"
    | "lesson"
    | "payment"
    | "group"
    | "privateLesson"
    | "combinedGroup"
    | "exam"
    | "settings";
  entityId: string;
  operation: "create" | "update" | "delete";
  payload?: any;
  timestamp: number;
  status: "pending" | "syncing" | "synced" | "failed";
  retryCount: number;
  lastError?: string;
  version?: number;
}

const DB_NAME = "gostars_local_db";
const DB_VERSION = 2; // Incremented for structured entity stores & syncQueue

const STORE_KEYVAL = "keyval";
const STORE_SYNC_QUEUE = "sync_queue";
const STORE_STUDENTS = "students";
const STORE_REPORTS = "reports";
const STORE_ATTENDANCE = "attendance";
const STORE_LESSONS = "lessons";
const STORE_PAYMENTS = "payments";
const STORE_GROUPS = "groups";
const STORE_PRIVATE_LESSONS = "private_lessons";
const STORE_COMBINED_GROUPS = "combined_groups";
const STORE_EXAMS = "exams";
const STORE_SETTINGS = "settings";

let dbPromise: Promise<IDBDatabase> | null = null;

export function getIDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not supported in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Legacy key-value store for backward compatibility
      if (!db.objectStoreNames.contains(STORE_KEYVAL)) {
        db.createObjectStore(STORE_KEYVAL);
      }

      // 2. Sync queue store with indices for status and userId
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: "id" });
        syncStore.createIndex("status", "status", { unique: false });
        syncStore.createIndex("userId", "userId", { unique: false });
        syncStore.createIndex("timestamp", "timestamp", { unique: false });
      }

      // 3. Dedicated entity stores
      const entityStores = [
        STORE_STUDENTS,
        STORE_REPORTS,
        STORE_ATTENDANCE,
        STORE_LESSONS,
        STORE_PAYMENTS,
        STORE_GROUPS,
        STORE_PRIVATE_LESSONS,
        STORE_COMBINED_GROUPS,
        STORE_EXAMS,
        STORE_SETTINGS
      ];

      entityStores.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: "id" });
          store.createIndex("userId", "userId", { unique: false });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      });
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error("Failed to open IndexedDB"));
    };

    request.onblocked = () => {
      dbPromise = null;
      console.warn("[GoStars IDB] Database open blocked by another connection");
    };
  });

  return dbPromise;
}

// -----------------------------------------------------------------------------
// Low-level Key-Value operations (Safe for backward compatibility & cached lists)
// -----------------------------------------------------------------------------
export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_KEYVAL, "readonly");
      const store = tx.objectStore(STORE_KEYVAL);
      const req = store.get(key);

      req.onsuccess = () => {
        resolve(req.result ?? null);
      };

      req.onerror = () => {
        reject(req.error);
      };
    });
  } catch (err) {
    console.debug("[GoStars IDB] idbGet error for key", key, err);
    return null;
  }
}

export async function idbSet<T>(key: string, value: T): Promise<boolean> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_KEYVAL, "readwrite");
      const store = tx.objectStore(STORE_KEYVAL);
      const req = store.put(value, key);

      req.onsuccess = () => {
        resolve(true);
      };

      req.onerror = () => {
        reject(req.error);
      };
    });
  } catch (err) {
    console.warn("[GoStars IDB] idbSet error for key", key, err);
    return false;
  }
}

export async function idbDelete(key: string): Promise<boolean> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_KEYVAL, "readwrite");
      const store = tx.objectStore(STORE_KEYVAL);
      const req = store.delete(key);

      req.onsuccess = () => {
        resolve(true);
      };

      req.onerror = () => {
        reject(req.error);
      };
    });
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// Sync Queue Local IndexedDB Store Operations
// -----------------------------------------------------------------------------
export async function idbEnqueueSyncItem(item: SyncQueueItem): Promise<boolean> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, "readwrite");
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const req = store.put(item);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("[GoStars IDB] Enqueue sync item failed:", e);
    return false;
  }
}

export async function idbGetPendingSyncItems(userId?: string): Promise<SyncQueueItem[]> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SYNC_QUEUE, "readonly");
      const store = tx.objectStore(STORE_SYNC_QUEUE);
      const req = store.getAll();

      req.onsuccess = () => {
        const all: SyncQueueItem[] = req.result || [];
        const filtered = all.filter(
          (item) =>
            (item.status === "pending" || (item.status === "failed" && (item.retryCount || 0) < 3)) &&
            (!userId || !item.userId || item.userId === userId)
        );
        // Sort oldest first for FIFO execution, process in safe batches of max 25 items
        filtered.sort((a, b) => a.timestamp - b.timestamp);
        resolve(filtered.slice(0, 25));
      };

      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.debug("[GoStars IDB] Get pending sync items error:", e);
    return [];
  }
}

export async function idbUpdateSyncItemStatus(
  id: string,
  status: SyncQueueItem["status"],
  errorMsg?: string
): Promise<void> {
  try {
    const db = await getIDB();
    const tx = db.transaction(STORE_SYNC_QUEUE, "readwrite");
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const item: SyncQueueItem = getReq.result;
      if (item) {
        if (status === "synced") {
          // If successfully synced, remove from queue to save space
          store.delete(id);
        } else {
          item.status = status;
          if (errorMsg) {
            item.lastError = errorMsg;
            item.retryCount = (item.retryCount || 0) + 1;
          }
          store.put(item);
        }
      }
    };
  } catch (e) {
    console.debug("[GoStars IDB] Update sync item status note:", e);
  }
}

export async function idbClearSyncedQueue(): Promise<void> {
  try {
    const db = await getIDB();
    const tx = db.transaction(STORE_SYNC_QUEUE, "readwrite");
    const store = tx.objectStore(STORE_SYNC_QUEUE);
    const index = store.index("status");
    const req = index.getAllKeys("synced");

    req.onsuccess = () => {
      const keys = req.result;
      keys.forEach((k) => store.delete(k));
    };
  } catch (e) {
    console.debug("[GoStars IDB] Clear synced queue note:", e);
  }
}
