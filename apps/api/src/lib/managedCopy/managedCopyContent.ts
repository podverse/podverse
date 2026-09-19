import { config } from '@api/config/index.js';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import type { ManagedCopySlug } from '@podverse/helpers';
import { getDefaultLocale } from '@podverse/orm';

const BUNDLED_FROM_MODULE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../managed-copy'
);

export const MANAGED_COPY_UPDATED_AT: Readonly<Record<ManagedCopySlug, string>> = {
  // Bump these dates whenever the markdown files for a slug are edited.
  faq: '2026-09-17',
  'clip-how-to': '2026-09-17',
};

export function resolveManagedCopyContentDir(): string {
  const fromEnv = config.managedCopy.contentDir.trim();
  if (fromEnv !== '') {
    return fromEnv;
  }

  if (existsSync(path.join(BUNDLED_FROM_MODULE, 'faq', 'en-US.md'))) {
    return BUNDLED_FROM_MODULE;
  }

  return path.join(process.cwd(), 'apps', 'api', 'managed-copy');
}

function resolveDefaultLocale(): string {
  try {
    return getDefaultLocale();
  } catch {
    return 'en-US';
  }
}

export function resolveManagedCopyMarkdownPath(
  slug: ManagedCopySlug,
  requestedLocale: string,
  contentDir = resolveManagedCopyContentDir()
): { locale: string; filePath: string } {
  const defaultLocale = resolveDefaultLocale();
  const languagePrefix = requestedLocale.split('-')[0] ?? requestedLocale;
  const candidates = [requestedLocale, languagePrefix, defaultLocale, 'en-US'];
  const seen = new Set<string>();

  for (const locale of candidates) {
    if (seen.has(locale) || locale === '') {
      continue;
    }
    seen.add(locale);
    const filePath = path.join(contentDir, slug, `${locale}.md`);
    if (existsSync(filePath)) {
      return { locale, filePath };
    }
  }

  throw new Error(`Managed copy for slug "${slug}" is not available`);
}

export function loadManagedCopy(
  slug: ManagedCopySlug,
  requestedLocale: string
): { locale: string; markdown: string } {
  const { locale, filePath } = resolveManagedCopyMarkdownPath(slug, requestedLocale);
  const markdown = readFileSync(filePath, 'utf8').replaceAll('{brand_name}', config.brandName);

  return { locale, markdown };
}
