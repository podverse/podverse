import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { MembershipComparisonMessages, MembershipComparisonNameKey } from '@podverse/helpers';
import { MEMBERSHIP_COMPARISON_FEATURES, SUPPORTED_LOCALES } from '@podverse/helpers';

const LANGUAGE_PREFIX_LOCALE: Record<string, string> = {
  el: 'el-GR',
  es: 'es',
  fr: 'fr',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readJson(filePath: string): Record<string, unknown> | null {
  if (!existsSync(filePath)) {
    return null;
  }
  const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
  if (!isRecord(parsed)) {
    throw new Error(`Expected a JSON object at ${filePath}`);
  }
  return parsed;
}

function catalogRoots(): string[] {
  return [
    path.join(process.cwd(), 'packages', 'i18n-catalog', 'consumer'),
    path.join(process.cwd(), '..', '..', 'packages', 'i18n-catalog', 'consumer'),
  ];
}

function catalogRoot(): string {
  for (const root of catalogRoots()) {
    if (existsSync(path.join(root, 'originals', 'en-US.json'))) {
      return root;
    }
  }
  throw new Error('Membership comparison catalog was not found');
}

function readString(root: Record<string, unknown> | null, keys: readonly string[]): string | null {
  let current: unknown = root;
  for (const key of keys) {
    if (!isRecord(current)) {
      return null;
    }
    current = current[key];
  }
  if (typeof current !== 'string' || current === '') {
    return null;
  }
  return current;
}

function message(
  localeRoot: Record<string, unknown>,
  overrideRoot: Record<string, unknown> | null,
  keys: readonly string[]
): string {
  const override = readString(overrideRoot, keys);
  if (override !== null) {
    return override;
  }
  const original = readString(localeRoot, keys);
  if (original === null) {
    throw new Error(`Missing membership comparison string ${keys.join('.')}`);
  }
  return original;
}

/** First requested language the catalog can fill. Unknown languages use en-US. */
export function resolveMembershipComparisonLocale(requested: string): string {
  const trimmed = requested.trim();
  const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === trimmed.toLowerCase());
  if (exact !== undefined) {
    return exact;
  }
  const prefix = trimmed.split('-')[0]?.toLowerCase() ?? '';
  const fromPrefix = LANGUAGE_PREFIX_LOCALE[prefix];
  if (fromPrefix !== undefined) {
    return fromPrefix;
  }
  return 'en-US';
}

const localeCache = new Map<string, MembershipComparisonMessages>();

export function loadMembershipComparisonMessages(locale: string): MembershipComparisonMessages {
  const cached = localeCache.get(locale);
  if (cached !== undefined) {
    return cached;
  }

  const root = catalogRoot();
  const original = readJson(path.join(root, 'originals', `${locale}.json`));
  if (original === null) {
    throw new Error(`Missing membership comparison catalog for ${locale}`);
  }
  const override = readJson(path.join(root, 'overrides', `${locale}.json`));

  const names: Partial<Record<MembershipComparisonNameKey, string>> = {};
  for (const feature of MEMBERSHIP_COMPARISON_FEATURES) {
    names[feature.nameKey] = message(original, override, [
      'membership',
      'comparison',
      feature.nameKey,
    ]);
  }
  names.comments = message(original, override, ['membership', 'comparison', 'comments']);

  const loaded: MembershipComparisonMessages = {
    available: message(original, override, ['misc', 'available']),
    availableOnMobileApp: message(original, override, ['membership', 'available_on_mobile_app']),
    comingSoon: message(original, override, ['membership', 'coming_soon']),
    feature: message(original, override, ['membership', 'feature']),
    free: message(original, override, ['membership', 'free']),
    freeOnMobileLegend: message(original, override, ['membership', 'free_on_mobile_legend']),
    mobileOnlyLegend: message(original, override, ['membership', 'mobile_only_legend']),
    nameMobileOnly: message(original, override, ['membership', 'comparison_name_mobile_only']),
    names: requireComparisonNames(names),
    premium: message(original, override, ['membership', 'premium']),
    trialDirectory: message(original, override, [
      'membership',
      'trial_limitations_directory_add_by_rss',
    ]),
    trialRefreshLimit: message(original, override, [
      'membership',
      'trial_limitations_manual_refresh_limit',
    ]),
    trialStats: message(original, override, ['membership', 'trial_limitations_stats_tracking']),
    trialSummary: message(original, override, ['membership', 'trial_limitations_summary']),
    trialTitle: message(original, override, ['membership', 'trial_limitations_title']),
  };
  localeCache.set(locale, loaded);
  return loaded;
}

function requireComparisonNames(
  names: Partial<Record<MembershipComparisonNameKey, string>>
): Record<MembershipComparisonNameKey, string> {
  const required: MembershipComparisonNameKey[] = [
    ...MEMBERSHIP_COMPARISON_FEATURES.map((feature) => feature.nameKey),
    'comments',
  ];
  const result: Partial<Record<MembershipComparisonNameKey, string>> = {};
  for (const key of required) {
    const value = names[key];
    if (value === undefined) {
      throw new Error(`Missing membership comparison name ${key}`);
    }
    result[key] = value;
  }
  if (
    result.add_rss === undefined ||
    result.android_auto === undefined ||
    result.api_keys === undefined ||
    result.boostagrams === undefined ||
    result.carplay === undefined ||
    result.chapters === undefined ||
    result.clips === undefined ||
    result.comments === undefined ||
    result.download === undefined ||
    result.livestreams === undefined ||
    result.mark_played === undefined ||
    result.notifications === undefined ||
    result.opml === undefined ||
    result.playback_handoff === undefined ||
    result.playlists === undefined ||
    result.profiles === undefined ||
    result.queue === undefined ||
    result.recommendations === undefined ||
    result.screen_reader === undefined ||
    result.sleep_timer === undefined ||
    result.subscribe === undefined ||
    result.support_foss === undefined ||
    result.sync === undefined ||
    result.transcripts === undefined ||
    result.video === undefined
  ) {
    throw new Error('Missing membership comparison name');
  }
  return {
    add_rss: result.add_rss,
    android_auto: result.android_auto,
    api_keys: result.api_keys,
    boostagrams: result.boostagrams,
    carplay: result.carplay,
    chapters: result.chapters,
    clips: result.clips,
    comments: result.comments,
    download: result.download,
    livestreams: result.livestreams,
    mark_played: result.mark_played,
    notifications: result.notifications,
    opml: result.opml,
    playback_handoff: result.playback_handoff,
    playlists: result.playlists,
    profiles: result.profiles,
    queue: result.queue,
    recommendations: result.recommendations,
    screen_reader: result.screen_reader,
    sleep_timer: result.sleep_timer,
    subscribe: result.subscribe,
    support_foss: result.support_foss,
    sync: result.sync,
    transcripts: result.transcripts,
    video: result.video,
  };
}
