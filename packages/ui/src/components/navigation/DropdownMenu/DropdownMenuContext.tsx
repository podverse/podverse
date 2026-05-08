'use client';

import { createContext } from 'react';

export type DropdownMenuContextValue = {
  close: () => void;
};

export const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);
