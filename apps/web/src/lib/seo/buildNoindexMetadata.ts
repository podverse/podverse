import type { Metadata } from 'next';

export const buildNoindexMetadata = (title?: string): Metadata => {
  return {
    ...(title ? { title } : {}),
    robots: {
      index: false,
      follow: false,
    },
  };
};
