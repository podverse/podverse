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

export function resolveStatsTrackEventRetentionDays(): number {
  const raw = config.terms.retentionDays.trim();
  const parsed = Number.parseInt(raw, 10);
  if (raw !== '' && Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS;
}

function retentionDaysLabel(): string {
  return String(resolveStatsTrackEventRetentionDays());
}

function omitLinesWithPlaceholder(markdown: string, placeholder: string): string {
  return markdown
    .split('\n')
    .filter((line) => !line.includes(placeholder))
    .join('\n');
}

export function interpolateTermsMarkdown(markdown: string): string {
  const contactEmail = config.terms.contactEmail.trim();
  const legalAddress = config.legal.address.trim();
  let prepared = markdown;
  if (contactEmail === '') {
    prepared = omitLinesWithPlaceholder(prepared, '{contact_email}');
  }
  if (legalAddress === '') {
    prepared = omitLinesWithPlaceholder(prepared, '{legal_address}');
  }

  return prepared
    .replaceAll('{brand_name}', config.brandName)
    .replaceAll('{legal_name}', config.legal.name)
    .replaceAll('{brand_domain}', config.web.domain)
    .replaceAll('{retention_days}', retentionDaysLabel())
    .replaceAll('{contact_email}', contactEmail)
    .replaceAll('{legal_address}', legalAddress);
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
  return interpolateTermsMarkdown(readFileSync(resolveTermsMarkdownPath(requestedLocale), 'utf8'));
}
