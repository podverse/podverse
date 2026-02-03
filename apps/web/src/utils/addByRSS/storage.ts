import type { AddByRSSFeedRecord, AddByRSSResourceType } from './types';

const DB_NAME = 'add-by-rss';
const DB_VERSION = 1;
const FEEDS_STORE = 'feeds';

const isIndexedDbAvailable = (): boolean =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const openAddByRSSDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FEEDS_STORE)) {
        const store = db.createObjectStore(FEEDS_STORE, { keyPath: 'idText' });
        store.createIndex('feedUrl', 'feedUrl', { unique: true });
        store.createIndex('resourceType', 'resourceType', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = openAddByRSSDb();
  }
  return dbPromise;
};

const withStore = async <T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => Promise<T>
): Promise<T> => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FEEDS_STORE, mode);
    const store = tx.objectStore(FEEDS_STORE);

    handler(store)
      .then((result) => {
        tx.oncomplete = () => resolve(result);
      })
      .catch((error) => {
        tx.onabort = () => reject(error);
        tx.onerror = () => reject(error);
        tx.abort();
      });
  });
};

export const getAllAddByRSSFeeds = async (): Promise<AddByRSSFeedRecord[]> => {
  if (!isIndexedDbAvailable()) {
    return [];
  }

  return withStore('readonly', async (store) => requestToPromise(store.getAll()));
};

export const getAddByRSSFeedsByResourceType = async (
  resourceType: AddByRSSResourceType
): Promise<AddByRSSFeedRecord[]> => {
  if (!isIndexedDbAvailable()) {
    return [];
  }

  return withStore('readonly', async (store) => {
    const index = store.index('resourceType');
    return requestToPromise(index.getAll(resourceType));
  });
};

export const getAddByRSSFeedByIdText = async (
  idText: string
): Promise<AddByRSSFeedRecord | null> => {
  if (!isIndexedDbAvailable()) {
    return null;
  }

  return withStore('readonly', async (store) => requestToPromise(store.get(idText)));
};

export const getAddByRSSFeedByUrl = async (feedUrl: string): Promise<AddByRSSFeedRecord | null> => {
  if (!isIndexedDbAvailable()) {
    return null;
  }

  return withStore('readonly', async (store) => {
    const index = store.index('feedUrl');
    return requestToPromise(index.get(feedUrl));
  });
};

export const upsertAddByRSSFeed = async (record: AddByRSSFeedRecord): Promise<void> => {
  if (!isIndexedDbAvailable()) {
    return;
  }

  await withStore('readwrite', async (store) => {
    await requestToPromise(store.put(record));
  });
};

export const bulkUpsertAddByRSSFeeds = async (records: AddByRSSFeedRecord[]): Promise<void> => {
  if (!isIndexedDbAvailable()) {
    return;
  }

  await withStore('readwrite', async (store) => {
    for (const record of records) {
      await requestToPromise(store.put(record));
    }
  });
};

export const removeAddByRSSFeed = async (idText: string): Promise<void> => {
  if (!isIndexedDbAvailable()) {
    return;
  }

  await withStore('readwrite', async (store) => {
    await requestToPromise(store.delete(idText));
  });
};

export const bulkRemoveAddByRSSFeeds = async (idTexts: string[]): Promise<void> => {
  if (!isIndexedDbAvailable() || idTexts.length === 0) {
    return;
  }

  await withStore('readwrite', async (store) => {
    for (const idText of idTexts) {
      await requestToPromise(store.delete(idText));
    }
  });
};
