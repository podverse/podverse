import { config } from '@api/config/index.js';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { getDefaultLocale } from '@podverse/orm';

const BUNDLED_FROM_MODULE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../legal/popularity-tracking'
);

export function resolvePopularityTrackingContentDir(): string {
  const fromEnv = config.popularityTracking.contentDir.trim();
  if (fromEnv !== '') {
    return fromEnv;
  }
  if (existsSync(path.join(BUNDLED_FROM_MODULE, 'en-US.md'))) {
    return BUNDLED_FROM_MODULE;
  }
  return path.join(process.cwd(), 'apps', 'api', 'legal', 'popularity-tracking');
}

export function interpolatePopularityTrackingMarkdown(markdown: string): string {
  return markdown.replaceAll('{brand_name}', config.brandName);
}

function resolveDefaultLocale(): string {
  try {
    return getDefaultLocale();
  } catch {
    return 'en-US';
  }
}

export function resolvePopularityTrackingMarkdownPath(
  requestedLocale: string,
  contentDir = resolvePopularityTrackingContentDir()
): string {
  const defaultLocale = resolveDefaultLocale();
  const languagePrefix = requestedLocale.split('-')[0] ?? requestedLocale;
  const candidates = [requestedLocale, languagePrefix, defaultLocale, 'en-US'];
  const seen = new Set<string>();

  for (const locale of candidates) {
    if (seen.has(locale)) {
      continue;
    }
    seen.add(locale);
    const filePath = path.join(contentDir, `${locale}.md`);
    if (existsSync(filePath)) {
      return filePath;
    }
  }

  throw new Error('Popularity tracking agreement file is not available');
}

export function loadPopularityTrackingMarkdown(requestedLocale: string): string {
  return interpolatePopularityTrackingMarkdown(
    readFileSync(resolvePopularityTrackingMarkdownPath(requestedLocale), 'utf8')
  );
}
