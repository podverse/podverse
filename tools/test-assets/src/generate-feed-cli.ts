/**
 * CLI and shared logic for generating RSS 2.0 feeds and media assets under tools/test-assets/assets/.
 * All files (feeds and media) are written as siblings in assets/ (no rss-generator or media subdirs).
 * Served at http://localhost:2111/<filename>.
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

const FEED_KINDS = ['none', 'podcast', 'podcast-season', 'video', 'music', 'publisher'] as const;
export type FeedKind = (typeof FEED_KINDS)[number];

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

function getValueFromConfig(config: MultiConfig): number {
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

function buildFeed(
  feedKind: FeedKind,
  filename: string,
  itemCount: number,
  poolSize: number,
  multiConfig: MultiConfig,
  baseUrl: string
): string {
  const channelTitle = faker.lorem.sentence();
  const channelDesc = faker.lorem.paragraph();
  const channelLink = `${baseUrl}/${filename}`;
  const channelImageIndex = faker.number.int({ min: 1, max: poolSize });
  const channelImageUrl = `${baseUrl}/image-${pad3(channelImageIndex)}.jpg`;

  const fundingCount = getValueFromConfig(multiConfig);
  const fundingTags = Array.from({ length: fundingCount }, () => {
    const url = faker.internet.url();
    const msg = faker.lorem.sentence();
    return `    <podcast:funding url="${escapeXml(url)}">${escapeXml(msg)}</podcast:funding>`;
  }).join('\n');
  const fundingBlock = fundingCount > 0 ? fundingTags + '\n' : '';

  const mediumTag =
    feedKind === 'none'
      ? ''
      : `    <podcast:medium>${feedKind === 'podcast-season' ? 'podcast' : feedKind}</podcast:medium>\n`;

  const items: string[] = [];
  const seasons = feedKind === 'podcast-season' ? Math.ceil(itemCount / ITEMS_PER_SEASON) : 0;

  for (let i = 0; i < itemCount; i++) {
    const enclosureIndex = faker.number.int({ min: 1, max: poolSize });
    const enclosureKind = faker.helpers.arrayElement(['audio', 'video'] as const);
    const enclosureUrl =
      enclosureKind === 'audio'
        ? `${baseUrl}/audio-${pad3(enclosureIndex)}.mp3`
        : `${baseUrl}/video-${pad3(enclosureIndex)}.mp4`;
    const enclosureType = enclosureKind === 'audio' ? 'audio/mpeg' : 'video/mp4';
    const imageIndex = faker.number.int({ min: 1, max: poolSize });
    const imageUrl = `${baseUrl}/image-${pad3(imageIndex)}.jpg`;

    const itemTitle = faker.lorem.sentence();
    const itemDesc = faker.lorem.paragraph();
    const guid = `${baseUrl}/${filename}#item-${i + 1}`;
    const pubDate = faker.date.past().toUTCString();

    let seasonEpisodeTags = '';
    if (feedKind === 'podcast-season' && seasons > 0) {
      const seasonNum = Math.floor(i / ITEMS_PER_SEASON) + 1;
      const episodeNum = (i % ITEMS_PER_SEASON) + 1;
      seasonEpisodeTags = `      <podcast:season number="${seasonNum}" name="Season ${seasonNum}"/>\n      <podcast:episode number="${episodeNum}" display="${episodeNum}"/>\n`;
    }

    items.push(
      `    <item>
      <title>${escapeXml(itemTitle)}</title>
      <description>${escapeXml(itemDesc)}</description>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${escapeXml(enclosureUrl)}" type="${enclosureType}" length="0"/>
      <image>
        <url>${escapeXml(imageUrl)}</url>
      </image>
${seasonEpisodeTags}    </item>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <description>${escapeXml(channelDesc)}</description>
    <link>${escapeXml(channelLink)}</link>
    <language>en</language>
    <image>
      <url>${escapeXml(channelImageUrl)}</url>
    </image>
${fundingBlock}${mediumTag}${items.join('\n')}
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
 * Shared logic: generate media pool and feed files under assets/ (flat).
 * Used by both the CLI and generateFeedAndAssets().
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

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  await ensureMediaAssets(poolSize);

  let written = 0;
  let skipped = 0;
  for (let setIndex = 1; setIndex <= count; setIndex++) {
    for (const kind of FEED_KINDS) {
      const filename = getFeedFilename(kind, setIndex);
      const filePath = path.join(outDir, filename);
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
    `\nDone. ${written} new feed(s), ${skipped} already present (${count} sets × 6 types).`
  );
  console.log(
    `Assets in tools/test-assets/assets/ (feeds + media). Served at ${baseUrl}/<filename>.`
  );

  return { success: true, written, skipped };
}

export async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const countArg = getPositionalCount(argv);
  if (countArg === null) {
    console.error('Usage: generate-feed-cli <count> [--items 20|min-max] [--multi 2|min-max]');
    console.error(
      '  count   Number of sets (each set = 6 feed types). 1 to 100,000. Existing assets left unchanged.'
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
