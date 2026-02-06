/**
 * CLI and shared logic for generating RSS 2.0 feeds and media under tools/test-assets/assets/.
 * Layout: assets/audio/, assets/feeds/, assets/images/, assets/videos/.
 * Served at http://localhost:2111/<subdir>/<filename>.
 * Usage: npm run generate -- <count> [--items 20|min-max] [--multi 2|min-max]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { faker } from '@faker-js/faker';
import { AssetGenerator } from './asset-generator.js';
import { DEFAULT_ASSETS_BASE_URL } from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_ITEMS = 20;
const DEFAULT_MULTI = 2;
const ITEMS_PER_SEASON = 10;
const MAX_FEEDS = 100_000;
const MAX_ASSETS_PER_TYPE = 100;

export type MultiConfig =
  | { kind: 'fixed'; value: number }
  | { kind: 'range'; min: number; max: number };

/** Nine feed types per set: 5 non-season + 4 season. See 10-test-data-spec.md */
const FEED_KINDS = [
  'none',
  'podcast',
  'video',
  'music',
  'publisher',
  'season',
  'podcast-season',
  'video-season',
  'music-season',
] as const;
export type FeedKind = (typeof FEED_KINDS)[number];

const ITUNES_CATEGORIES = [
  'Technology',
  'Business',
  'News',
  'Comedy',
  'Education',
  'Science',
  'Society & Culture',
  'Arts',
  'Health',
  'Religion & Spirituality',
] as const;

function isSeasonFeed(kind: FeedKind): boolean {
  return (
    kind === 'season' ||
    kind === 'podcast-season' ||
    kind === 'video-season' ||
    kind === 'music-season'
  );
}

/** Enclosure type by feed medium. Plan 03 will wire medium; here we use feed kind. */
function getEnclosureKind(kind: FeedKind): 'audio' | 'video' {
  if (kind === 'video' || kind === 'video-season') return 'video';
  return 'audio';
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function parseNumericArg(flag: string, defaultVal: number, argv: string[]): MultiConfig {
  const idx = argv.indexOf(flag);
  const value = argv[idx + 1];
  if (idx === -1 || value === undefined) {
    return { kind: 'fixed', value: defaultVal };
  }
  const rangeMatch = value.match(/^(\d+)-(\d+)$/);
  if (rangeMatch && rangeMatch[1] !== undefined && rangeMatch[2] !== undefined) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    if (!Number.isNaN(min) && !Number.isNaN(max) && min >= 1 && max >= min) {
      return { kind: 'range', min, max };
    }
  }
  const n = parseInt(value, 10);
  if (!Number.isNaN(n) && n >= 1) {
    return { kind: 'fixed', value: n };
  }
  return { kind: 'fixed', value: defaultVal };
}

export function getValueFromConfig(config: MultiConfig): number {
  if (config.kind === 'fixed') return config.value;
  return faker.number.int({ min: config.min, max: config.max });
}

export function getPositionalCount(argv: string[]): number | null {
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === '--multi' || arg === '--items') {
      i++;
      continue;
    }
    positionals.push(arg);
  }
  const first = positionals[0];
  if (!first) return null;
  const n = parseInt(first, 10);
  if (Number.isNaN(n) || n < 1) return null;
  return n;
}

function getOutputDir(): string {
  return path.join(__dirname, '../assets');
}

function getFeedFilename(kind: FeedKind, setIndex: number): string {
  if (kind === 'none') return `feed-${setIndex}.rss`;
  return `feed-${kind}-${setIndex}.rss`;
}

function pad3(n: number): string {
  return n.toString().padStart(3, '0');
}

async function ensureMediaAssets(poolSize: number): Promise<void> {
  const generator = new AssetGenerator({ namespace: '' });
  await generator.ensureAssetsDirectory();
  console.log(`Ensuring ${poolSize} image/audio/video assets (random content)...\n`);

  for (let i = 1; i <= poolSize; i++) {
    const pad = pad3(i);
    const color = faker.color.rgb({ format: 'hex' });
    const durationSec = faker.number.int({ min: 30, max: 90 });
    await generator.generateImage(`image-${pad}.jpg`, color, { width: 320, height: 320 });
    await generator.generateMP3(`audio-${pad}.mp3`, durationSec);
    await generator.generateMP4(`video-${pad}.mp4`, durationSec);
  }

  console.log(`\nMedia pool ready (1..${poolSize}). Writing feeds...\n`);
}

/** RFC 2822-style date for pubDate/lastBuildDate */
function toRfc2822(d: Date): string {
  return d.toUTCString();
}

function buildFeed(
  feedKind: FeedKind,
  _filename: string,
  itemCount: number,
  poolSize: number,
  _multiConfig: MultiConfig,
  baseUrl: string
): string {
  const enclosureKind = getEnclosureKind(feedKind);

  // Channel RSS 2.0 (all required)
  const channelTitle = faker.lorem.sentence();
  const channelDesc = faker.lorem.paragraph();
  const channelLink = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const channelImageIndex = faker.number.int({ min: 1, max: Math.min(poolSize, 100) });
  const channelImageUrl = `${baseUrl}/images/image-${pad3(channelImageIndex)}.jpg`;
  const copyright = `© ${faker.date.past().getFullYear()} ${faker.company.name()}`;
  const webMaster = faker.internet.email();
  const managingEditor = faker.internet.email();
  const ttl = faker.number.int({ min: 60, max: 1440 });
  const lastBuildDate = toRfc2822(new Date());
  const pubDate = toRfc2822(faker.date.past());

  // Channel iTunes (all required except newFeedUrl)
  const itunesTitle = faker.helpers.arrayElement([channelTitle, faker.lorem.sentence()]);
  const itunesSummary = faker.lorem.paragraph();
  const itunesCategory = faker.helpers.arrayElement(ITUNES_CATEGORIES);
  const itunesExplicit = faker.datatype.boolean() ? 'yes' : 'no';
  const itunesBlock = 'no';
  const itunesComplete = 'no';
  const itunesType = faker.helpers.arrayElement(['episodic', 'serial'] as const);
  const ownerName = faker.person.fullName();
  const ownerEmail = faker.internet.email();

  const items: string[] = [];
  const seasonCount = isSeasonFeed(feedKind) ? Math.ceil(itemCount / ITEMS_PER_SEASON) : 0;

  for (let i = 0; i < itemCount; i++) {
    const enclosureIndex = (i % poolSize) + 1;
    const encUrl =
      enclosureKind === 'audio'
        ? `${baseUrl}/audio/audio-${pad3(enclosureIndex)}.mp3`
        : `${baseUrl}/videos/video-${pad3(enclosureIndex)}.mp4`;
    const encType = enclosureKind === 'audio' ? 'audio/mpeg' : 'video/mp4';
    const imageIndex = (i % poolSize) + 1;
    const imageUrl = `${baseUrl}/images/image-${pad3(imageIndex)}.jpg`;

    const itemTitle = faker.lorem.sentence();
    const itemDesc = faker.lorem.paragraph();
    const itemLink = faker.internet.url();
    const guid = faker.string.uuid();
    const itemPubDate = toRfc2822(faker.date.past());
    const length = faker.number.int({ min: 0, max: 99999999 });

    const itunesAuthor = faker.person.fullName();
    const itunesItemExplicit = faker.datatype.boolean() ? 'yes' : 'no';
    const durationSec = faker.number.int({ min: 60, max: 7200 });
    const itunesDuration =
      durationSec >= 3600
        ? `${Math.floor(durationSec / 3600)}:${String(Math.floor((durationSec % 3600) / 60)).padStart(2, '0')}:${String(durationSec % 60).padStart(2, '0')}`
        : String(durationSec);
    const contentEncoded = faker.lorem.paragraphs(2);
    const keywords = Array.from({ length: 3 }, () => faker.lorem.word()).join(', ');

    let seasonEpisodeBlock = '';
    if (isSeasonFeed(feedKind) && seasonCount > 0) {
      const seasonNum = Math.floor(i / ITEMS_PER_SEASON) + 1;
      const episodeNum = (i % ITEMS_PER_SEASON) + 1;
      const episodeType = faker.helpers.arrayElement(['full', 'trailer', 'bonus'] as const);
      seasonEpisodeBlock = `      <itunes:season>${seasonNum}</itunes:season>
      <itunes:episode>${episodeNum}</itunes:episode>
      <itunes:episodeType>${episodeType}</itunes:episodeType>
`;
    }

    items.push(
      `    <item>
      <title>${escapeXml(itemTitle)}</title>
      <description>${escapeXml(itemDesc)}</description>
      <link>${escapeXml(itemLink)}</link>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
      <pubDate>${itemPubDate}</pubDate>
      <enclosure url="${escapeXml(encUrl)}" type="${encType}" length="${length}"/>
      <content:encoded>${escapeXml(contentEncoded)}</content:encoded>
      <itunes:author>${escapeXml(itunesAuthor)}</itunes:author>
      <itunes:title>${escapeXml(itemTitle)}</itunes:title>
      <itunes:summary>${escapeXml(itemDesc)}</itunes:summary>
      <itunes:image href="${escapeXml(imageUrl)}"/>
      <itunes:explicit>${itunesItemExplicit}</itunes:explicit>
      <itunes:duration>${itunesDuration}</itunes:duration>
      <itunes:keywords>${escapeXml(keywords)}</itunes:keywords>
${seasonEpisodeBlock}    </item>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <description>${escapeXml(channelDesc)}</description>
    <link>${escapeXml(channelLink)}</link>
    <language>en</language>
    <image>
      <url>${escapeXml(channelImageUrl)}</url>
      <title>${escapeXml(channelTitle)}</title>
      <link>${escapeXml(channelLink)}</link>
    </image>
    <copyright>${escapeXml(copyright)}</copyright>
    <webMaster>${escapeXml(webMaster)}</webMaster>
    <managingEditor>${escapeXml(managingEditor)}</managingEditor>
    <ttl>${ttl}</ttl>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <pubDate>${pubDate}</pubDate>
    <generator>podverse-rss-feed-generator</generator>
    <itunes:title>${escapeXml(itunesTitle)}</itunes:title>
    <itunes:summary>${escapeXml(itunesSummary)}</itunes:summary>
    <itunes:image href="${escapeXml(channelImageUrl)}"/>
    <itunes:category text="${escapeXml(itunesCategory)}"/>
    <itunes:explicit>${itunesExplicit}</itunes:explicit>
    <itunes:block>${itunesBlock}</itunes:block>
    <itunes:complete>${itunesComplete}</itunes:complete>
    <itunes:type>${itunesType}</itunes:type>
    <itunes:owner>
      <itunes:name>${escapeXml(ownerName)}</itunes:name>
      <itunes:email>${escapeXml(ownerEmail)}</itunes:email>
    </itunes:owner>
${items.join('\n')}
  </channel>
</rss>
`;
}

export type RunGenerateFeedAndAssetsOptions = {
  itemsConfig?: MultiConfig;
  multiConfig?: MultiConfig;
  baseUrl?: string;
};

export type RunGenerateFeedAndAssetsResult = {
  success: boolean;
  written: number;
  skipped: number;
};

/**
 * Shared logic: generate media pool and feed files under assets/audio, assets/feeds,
 * assets/images, assets/videos. Used by both the CLI and generateFeedAndAssets().
 */
export async function runGenerateFeedAndAssets(
  count: number,
  options: RunGenerateFeedAndAssetsOptions = {}
): Promise<RunGenerateFeedAndAssetsResult> {
  const {
    itemsConfig = { kind: 'fixed', value: DEFAULT_ITEMS },
    multiConfig = { kind: 'fixed', value: DEFAULT_MULTI },
    baseUrl = DEFAULT_ASSETS_BASE_URL,
  } = options;

  const totalFeeds = count * FEED_KINDS.length;
  const poolSize = Math.min(totalFeeds, MAX_ASSETS_PER_TYPE);
  const outDir = getOutputDir();
  const feedsDir = path.join(outDir, 'feeds');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  if (!fs.existsSync(feedsDir)) {
    fs.mkdirSync(feedsDir, { recursive: true });
  }

  await ensureMediaAssets(poolSize);

  let written = 0;
  let skipped = 0;
  for (let setIndex = 1; setIndex <= count; setIndex++) {
    for (const kind of FEED_KINDS) {
      const filename = getFeedFilename(kind, setIndex);
      const filePath = path.join(feedsDir, filename);
      if (fs.existsSync(filePath)) {
        skipped++;
        if (skipped <= 12 || skipped % 100 === 0) {
          console.log(`Skipped (exists): ${filename}`);
        }
        continue;
      }
      const itemCount = getValueFromConfig(itemsConfig);
      const xml = buildFeed(kind, filename, itemCount, poolSize, multiConfig, baseUrl);
      fs.writeFileSync(filePath, xml, 'utf8');
      written++;
      if (written <= 12 || written % 100 === 0) {
        console.log(`Wrote ${filePath} (${itemCount} items)`);
      }
    }
  }

  console.log(
    `\nDone. ${written} new feed(s), ${skipped} already present (${count} sets × 9 types).`
  );
  console.log(
    `Assets in tools/test-assets/assets/{audio,feeds,images,videos}. Served at ${baseUrl}/<subdir>/<filename>.`
  );

  return { success: true, written, skipped };
}

/**
 * Returns the list of feed URLs for the same sets/kinds that runGenerateFeedAndAssets writes.
 * Used by generate_and_parse to populate the DB from all generated feeds.
 */
export function getFeedUrlsForSets(count: number, baseUrl: string): string[] {
  const base = baseUrl.replace(/\/$/, '');
  const urls: string[] = [];
  for (let setIndex = 1; setIndex <= count; setIndex++) {
    for (const kind of FEED_KINDS) {
      const filename = getFeedFilename(kind, setIndex);
      urls.push(`${base}/feeds/${filename}`);
    }
  }
  return urls;
}

export async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const countArg = getPositionalCount(argv);
  if (countArg === null) {
    console.error('Usage: generate-feed-cli <count> [--items 20|min-max] [--multi 2|min-max]');
    console.error(
      '  count   Number of sets (each set = 9 feed types). 1 to 100,000. Existing assets left unchanged.'
    );
    console.error('  --items Items per feed. Default 20. Range (e.g. 10-30) = random per feed.');
    console.error(
      '  --multi Multi-value tag count (funding, person, etc.). Default 2. Range = random per feed/attribute.'
    );
    process.exit(1);
  }

  const count = Math.min(countArg, MAX_FEEDS);
  const itemsConfig = parseNumericArg('--items', DEFAULT_ITEMS, argv);
  const multiConfig = parseNumericArg('--multi', DEFAULT_MULTI, argv);

  await runGenerateFeedAndAssets(count, { itemsConfig, multiConfig });
}
