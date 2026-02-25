'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

export type AddByRSSListSortOrder = 'recent' | 'oldest';

export type AddByRSSListContextState = {
  feedIdText: string;
  itemIdTexts: string[];
  currentIndex: number;
  /** List sort when context was set. 'recent' = newest first (index 0 = newest); 'oldest' = oldest first. Default 'recent'. */
  sortOrder?: AddByRSSListSortOrder;
};

type AddByRSSListContextType = {
  listContext: AddByRSSListContextState | null;
  setAddByRSSListContext: (ctx: AddByRSSListContextState | null) => void;
};

const AddByRSSListContext = createContext<AddByRSSListContextType | null>(null);

export function AddByRSSListContextProvider({ children }: { children: ReactNode }) {
  const [listContext, setListContext] = useState<AddByRSSListContextState | null>(null);
  const setAddByRSSListContext = useCallback((ctx: AddByRSSListContextState | null) => {
    setListContext(ctx);
  }, []);
  return (
    <AddByRSSListContext.Provider value={{ listContext, setAddByRSSListContext }}>
      {children}
    </AddByRSSListContext.Provider>
  );
}

export function useAddByRSSListContext() {
  const ctx = useContext(AddByRSSListContext);
  if (ctx === null) {
    throw new Error('useAddByRSSListContext must be used within AddByRSSListContextProvider');
  }
  return ctx;
}
