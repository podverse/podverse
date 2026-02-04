import type { AddByRSSEpisodeIndexItem, AddByRSSFeedRecord, AddByRSSResourceType } from './types';

const DB_NAME = 'add-by-rss';
const DB_VERSION = 2;
const FEEDS_STORE = 'feeds';
const EPISODES_STORE = 'episodes';
const EPISODES_META_STORE = 'episodesMeta';

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
      if (!db.objectStoreNames.contains(EPISODES_STORE)) {
        const store = db.createObjectStore(EPISODES_STORE, { keyPath: 'id' });
        store.createIndex('pubDateMs', 'pubDateMs', { unique: false });
        store.createIndex('itemGuid', 'itemGuid', { unique: false });
      }
      if (!db.objectStoreNames.contains(EPISODES_META_STORE)) {
        db.createObjectStore(EPISODES_META_STORE, { keyPath: 'key' });
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
  storeName: string,
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => Promise<T>
): Promise<T> => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);

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

  return withStore(FEEDS_STORE, 'readonly', async (store) => requestToPromise(store.getAll()));
};

export const getAddByRSSFeedsByResourceType = async (
  resourceType: AddByRSSResourceType
): Promise<AddByRSSFeedRecord[]> => {
  if (!isIndexedDbAvailable()) {
    return [];
  }

  return withStore(FEEDS_STORE, 'readonly', async (store) => {
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

  return withStore(FEEDS_STORE, 'readonly', async (store) => requestToPromise(store.get(idText)));
};

export const getAddByRSSFeedByUrl = async (feedUrl: string): Promise<AddByRSSFeedRecord | null> => {
  if (!isIndexedDbAvailable()) {
    return null;
  }

  return withStore(FEEDS_STORE, 'readonly', async (store) => {
    const index = store.index('feedUrl');
    return requestToPromise(index.get(feedUrl));
  });
};

export const upsertAddByRSSFeed = async (record: AddByRSSFeedRecord): Promise<void> => {
  if (!isIndexedDbAvailable()) {
    return;
  }

  await withStore(FEEDS_STORE, 'readwrite', async (store) => {
    await requestToPromise(store.put(record));
  });
};

export const bulkUpsertAddByRSSFeeds = async (records: AddByRSSFeedRecord[]): Promise<void> => {
  if (!isIndexedDbAvailable()) {
    return;
  }

  await withStore(FEEDS_STORE, 'readwrite', async (store) => {
    for (const record of records) {
      await requestToPromise(store.put(record));
    }
  });
};

export const removeAddByRSSFeed = async (idText: string): Promise<void> => {
  if (!isIndexedDbAvailable()) {
    return;
  }

  await withStore(FEEDS_STORE, 'readwrite', async (store) => {
    await requestToPromise(store.delete(idText));
  });
};

export const bulkRemoveAddByRSSFeeds = async (idTexts: string[]): Promise<void> => {
  if (!isIndexedDbAvailable() || idTexts.length === 0) {
    return;
  }

  await withStore(FEEDS_STORE, 'readwrite', async (store) => {
    for (const idText of idTexts) {
      await requestToPromise(store.delete(idText));
    }
  });
};

export const clearAddByRSSEpisodesIndex = async (): Promise<void> => {
  if (!isIndexedDbAvailable()) {
    return;
  }

  await withStore(EPISODES_STORE, 'readwrite', async (store) => {
    await requestToPromise(store.clear());
  });
};

export const bulkUpsertAddByRSSEpisodesIndexItems = async (
  items: AddByRSSEpisodeIndexItem[]
): Promise<void> => {
  if (!isIndexedDbAvailable()) {
    return;
  }

  await withStore(EPISODES_STORE, 'readwrite', async (store) => {
    for (const item of items) {
      await requestToPromise(store.put(item));
    }
  });
};

export const getAddByRSSEpisodesIndexCount = async (): Promise<number> => {
  if (!isIndexedDbAvailable()) {
    return 0;
  }

  return withStore(EPISODES_STORE, 'readonly', async (store) => requestToPromise(store.count()));
};

export const getAddByRSSEpisodeByGuid = async (
  itemGuid: string
): Promise<AddByRSSEpisodeIndexItem | null> => {
  if (!isIndexedDbAvailable()) {
    return null;
  }

  return withStore(EPISODES_STORE, 'readonly', async (store) => {
    const index = store.index('itemGuid');
    return requestToPromise(index.get(itemGuid));
  });
};

export const getAddByRSSEpisodesIndexPage = async (params: {
  sort: 'recent' | 'oldest';
  page: number;
  pageSize: number;
}): Promise<{ items: AddByRSSEpisodeIndexItem[]; totalCount: number }> => {
  if (!isIndexedDbAvailable()) {
    return { items: [], totalCount: 0 };
  }

  const totalCount = await getAddByRSSEpisodesIndexCount();
  if (totalCount === 0) {
    return { items: [], totalCount };
  }

  const offset = Math.max(0, (params.page - 1) * params.pageSize);
  const items: AddByRSSEpisodeIndexItem[] = [];
  const direction: IDBCursorDirection = params.sort === 'recent' ? 'prev' : 'next';

  await withStore(EPISODES_STORE, 'readonly', async (store) => {
    const index = store.index('pubDateMs');
    await new Promise<void>((resolve, reject) => {
      let skipped = 0;
      const request = index.openCursor(null, direction);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve();
          return;
        }
        if (skipped < offset) {
          skipped += 1;
          cursor.continue();
          return;
        }
        if (items.length < params.pageSize) {
          items.push(cursor.value as AddByRSSEpisodeIndexItem);
          cursor.continue();
          return;
        }
        resolve();
      };
    });
    return items;
  });

  return { items, totalCount };
};

export const getAddByRSSEpisodesIndexMeta = async <T = unknown>(key: string): Promise<T | null> => {
  if (!isIndexedDbAvailable()) {
    return null;
  }

  return withStore(EPISODES_META_STORE, 'readonly', async (store) => {
    return requestToPromise(store.get(key));
  });
};

export const setAddByRSSEpisodesIndexMeta = async (record: {
  key: string;
  [key: string]: unknown;
}): Promise<void> => {
  if (!isIndexedDbAvailable()) {
    return;
  }

  await withStore(EPISODES_META_STORE, 'readwrite', async (store) => {
    await requestToPromise(store.put(record));
  });
};
