import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getCatalogConfig } from '../../lib/catalog/catalogPolicy';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AddByRssLayout({ children }: { children: React.ReactNode }) {
  if (!getCatalogConfig().addByRSSEnabled) {
    notFound();
  }
  return children;
}
