'use client';

import { usePathname } from 'next/navigation';

import { FontPreloads } from '@podverse/ui';

import { isEmbedPathname } from '../../lib/embed/isEmbedPathname';

export function RouteAwareFontPreloads() {
  const pathname = usePathname();
  return <FontPreloads variant={isEmbedPathname(pathname) ? 'minimal' : 'full'} />;
}
