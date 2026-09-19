export const MANAGED_COPY_SLUGS = ['faq', 'clip-how-to'] as const;

export type ManagedCopySlug = (typeof MANAGED_COPY_SLUGS)[number];

export function isManagedCopySlug(value: string): value is ManagedCopySlug {
  return MANAGED_COPY_SLUGS.some((slug) => slug === value);
}
