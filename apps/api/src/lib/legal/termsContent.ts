import { config } from '@api/config/index.js';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS } from '@podverse/helpers';
import { getDefaultLocale } from '@podverse/orm';

const BUNDLED_FROM_MODULE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../legal/terms'
);

export function resolveTermsContentDir(): string {
  const fromEnv = config.terms.contentDir.trim();
  if (fromEnv !== '') {
    return fromEnv;
  }
  if (existsSync(path.join(BUNDLED_FROM_MODULE, 'en-US.md'))) {
    return BUNDLED_FROM_MODULE;
  }
  return path.join(process.cwd(), 'apps', 'api', 'legal', 'terms');
}

function retentionDaysLabel(): string {
  const raw = config.terms.retentionDays.trim();
  const parsed = Number.parseInt(raw, 10);
  if (raw !== '' && Number.isFinite(parsed) && parsed > 0) {
    return String(parsed);
  }
  return String(DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS);
}

export function interpolateTermsMarkdown(markdown: string): string {
  const contactEmail = config.terms.contactEmail.trim();
  const withPlaceholders =
    contactEmail === ''
      ? markdown
          .split('\n')
          .filter((line) => !line.includes('{contact_email}'))
          .join('\n')
      : markdown;

  return withPlaceholders
    .replaceAll('{brand_name}', config.brandName)
    .replaceAll('{legal_name}', config.legal.name)
    .replaceAll('{brand_domain}', config.web.domain)
    .replaceAll('{retention_days}', retentionDaysLabel())
    .replaceAll('{contact_email}', contactEmail);
}

function resolveDefaultLocale(): string {
  try {
    return getDefaultLocale();
  } catch {
    return 'en-US';
  }
}

export function resolveTermsMarkdownPath(
  requestedLocale: string,
  contentDir = resolveTermsContentDir()
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

  throw new Error('Terms of service file is not available');
}

export function loadTermsMarkdown(requestedLocale: string): string {
  return interpolateTermsMarkdown(
    readFileSync(resolveTermsMarkdownPath(requestedLocale), 'utf8')
  );
}
