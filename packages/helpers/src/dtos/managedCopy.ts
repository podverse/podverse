import type { ManagedCopySlug } from '../lib/managedCopy.js';

export type DTOManagedCopy = {
  slug: ManagedCopySlug;
  locale: string;
  updated_at: string;
  markdown: string;
};
