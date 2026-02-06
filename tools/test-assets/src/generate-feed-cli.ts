/**
 * CLI and shared logic for generating RSS 2.0 feeds and media under tools/test-assets/assets/.
 * Layout: assets/audio/, assets/feeds/, assets/images/, assets/videos/.
 * Served at http://localhost:2111/<subdir>/<filename>.
 * Usage: npm run generate -- <count> [--items 20|min-max] [--multi 2|min-max]
 *
 * Database tables and columns that should have values after the generated feeds are parsed
 * (e.g. via generate_and_parse or parseRSSFeedAndSaveToDatabase):
 *
 * feed
 *   id, url, podcast_index_id, feed_flag_status_id, last_parsed_file_hash, container_id, created_at, updated_at
 * feed_flag_status
 *   id, status
 * feed_log
 *   id, feed_id, last_http_status, last_good_http_status_time, last_finished_parse_time, parse_errors
 * channel
 *   id, id_text, feed_id, podcast_guid, title, sortable_title, medium_id
 * channel_about
 *   id, channel_id, author, episode_count, explicit, itunes_type_id, language, last_pub_date, website_link_url
 * channel_category
 *   id, channel_id, category_id
 * channel_chat
 *   id, channel_id, server, protocol, account_id, space
 * channel_description
 *   id, channel_id, value
 * channel_funding
 *   id, channel_id, url, title
 * channel_image
 *   id, channel_id, url, image_width_size, is_resized
 * channel_license
 *   id, channel_id, identifier, url
 * channel_location
 *   id, channel_id, geo, osm, name
 * channel_person
 *   id, channel_id, name, role, person_group, img, href
 * channel_trailer
 *   id, channel_id, title, url, pub_date, length, type, channel_season_id
 * channel_txt
 *   id, channel_id, purpose, value
 * channel_season
 *   id, channel_id, number, name
 * channel_social_interact
 *   id, channel_id, protocol, uri, account_id, account_url, priority
 * channel_itunes_type
 *   id, itunes_type
 * medium
 *   id, value
 * category
 *   id, parent_id, display_name, slug, mapping_key
 * item
 *   id, id_text, channel_id, guid, guid_enclosure_url, pub_date, title, item_flag_status_id
 * item_about
 *   id, item_id, duration, explicit, website_link_url, item_itunes_episode_type_id
 * item_chapters_feed
 *   id, item_id, url, type
 * item_chat
 *   id, item_id, server, protocol, account_id, space
 * item_description
 *   id, item_id, value
 * item_enclosure
 *   id, item_id, type, length, bitrate, height, language, title, rel, codecs, item_enclosure_default
 * item_enclosure_source
 *   id, item_enclosure_id, uri, content_type
 * item_image
 *   id, item_id, url, image_width_size, is_resized
 * item_license
 *   id, item_id, identifier, url
 * item_location
 *   id, item_id, geo, osm, name
 * item_person
 *   id, item_id, name, role, person_group, img, href
 * item_season
 *   id, item_id, channel_season_id, title
 * item_season_episode
 *   id, item_id, number, display
 * item_social_interact
 *   id, item_id, protocol, uri, account_id, account_url, priority
 * item_soundbite
 *   id, id_text, item_id, start_time, duration, title
 * item_transcript
 *   id, item_id, url, type, language, rel
 * item_txt
 *   id, item_id, purpose, value
 * item_flag_status
 *   id, status
 *
 * ---
 * Channel and item tables/columns that do NOT have corresponding values in the generated RSS feeds (yet).
 * These exist in the DB schema but are not populated when the above feeds are parsed (e.g. Sub-Plan 4+ tags).
 *
 * channel_value
 *   id, channel_id, type, method, suggested
 * channel_value_recipient
 *   id, channel_value_id, type, address, split, name, custom_key, custom_value, fee
 * channel_podroll
 *   id, channel_id
 * channel_podroll_remote_item
 *   id, channel_podroll_id, feed_guid, feed_url, item_guid, title
 * channel_publisher
 *   id, channel_id
 * channel_publisher_remote_item
 *   id, channel_publisher_id, feed_guid, feed_url, item_guid, title
 * channel_remote_item
 *   id, channel_id, feed_guid, feed_url, item_guid, title
 * channel_social_interact
 *   id, channel_id, protocol, uri, account_id, account_url, priority
 *   (feed has podcast:chat at channel, not podcast:socialInteract; socialInteract is item-only in feed)
 *
 * item_value
 *   id, item_id, type, method, suggested
 * item_value_recipient
 *   id, item_value_id, type, address, split, name, custom_key, custom_value, fee
 * item_value_time_split
 *   id, item_value_id, start_time, duration, remote_start_time, remote_percentage
 * item_value_time_split_recipient
 *   id, item_value_time_split_id, type, address, split, name, custom_key, custom_value, fee
 * item_value_time_split_remote_item
 *   id, item_value_time_split_id, feed_guid, feed_url, item_guid, title
 * item_funding
 *   id, item_id, url, title
 * item_content_link
 *   id, item_id, href, title
 * item_chapter
 *   id, id_text, item_chapters_feed_id, data_hash, start_time, end_time, title, img, web_url, table_of_contents
 *   (populated when chapters file is fetched/parsed, not from feed XML directly)
 * item_chapter_location
 *   id, item_chapter_id, geo, osm, name
 * item_chapters_feed_log
 *   id, item_chapters_feed_id, last_http_status, last_good_http_status_time, last_finished_parse_time, parse_errors
 * item_enclosure_integrity
 *   id, item_enclosure_id, type, value
 * live_item
 *   id, item_id, live_item_status_id, start_time, end_time, chat_web_url
 * live_item_status
 *   id, status
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
const MAX_JPEG_FILES = 100;
/** Widths (px) for podcast:images srcset. Total JPEGs = imagePoolSize * IMAGE_SIZES.length ≤ MAX_JPEG_FILES. */
const IMAGE_SIZES = [300, 600, 1400];

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

/** Image pool size so that imagePoolSize * IMAGE_SIZES.length ≤ MAX_JPEG_FILES. */
function getImagePoolSize(poolSize: number): number {
  return Math.min(poolSize, Math.floor(MAX_JPEG_FILES / IMAGE_SIZES.length));
}

async function ensureMediaAssets(poolSize: number): Promise<void> {
  const generator = new AssetGenerator({ namespace: '' });
  await generator.ensureAssetsDirectory();
  const imagePoolSize = getImagePoolSize(poolSize);
  console.log(
    `Ensuring ${imagePoolSize} image indices × ${IMAGE_SIZES.length} sizes, ${poolSize} audio/video (random content)...\n`
  );

  for (let i = 1; i <= imagePoolSize; i++) {
    const pad = pad3(i);
    const color = faker.color.rgb({ format: 'hex' });
    await generator.generateImageSizes(pad, IMAGE_SIZES, color, true);
  }
  for (let i = 1; i <= poolSize; i++) {
    const pad = pad3(i);
    const durationSec = faker.number.int({ min: 30, max: 90 });
    await generator.generateMP3(`audio-${pad}.mp3`, durationSec);
    await generator.generateMP4(`video-${pad}.mp4`, durationSec);
  }

  console.log(
    `\nMedia pool ready (images 1..${imagePoolSize} × ${IMAGE_SIZES.length} sizes; audio/video 1..${poolSize}). Writing feeds...\n`
  );
}

/** RFC 2822-style date for pubDate/lastBuildDate */
function toRfc2822(d: Date): string {
  return d.toUTCString();
}

/** Build podcast:images srcset value (e.g. "url1 300w, url2 600w, url3 1400w"). */
function buildPodcastImagesSrcset(baseUrl: string, indexPad: string): string {
  const base = baseUrl.replace(/\/$/, '');
  return IMAGE_SIZES.map((w) => `${base}/images/image-${indexPad}-${w}.jpg ${w}w`).join(', ');
}

/** podcast:medium value per feed kind; null = omit tag (feed-none, feed-season). */
function getMediumForKind(kind: FeedKind): string | null {
  switch (kind) {
    case 'podcast':
    case 'podcast-season':
      return 'podcast';
    case 'video':
    case 'video-season':
      return 'video';
    case 'music':
    case 'music-season':
      return 'music';
    case 'publisher':
      return 'publisher';
    default:
      return null;
  }
}

/** Person role/group values Partytime accepts (from person-enum). */
const PERSON_ROLES = ['Host', 'Co-Host', 'Guest', 'Producer', 'Narrator'] as const;
const PERSON_GROUPS = ['Cast', 'Hosts', 'Creative Direction'] as const;

function buildFeed(
  feedKind: FeedKind,
  _filename: string,
  itemCount: number,
  poolSize: number,
  imagePoolSize: number,
  multiConfig: MultiConfig,
  baseUrl: string
): string {
  const enclosureKind = getEnclosureKind(feedKind);
  const multiCount = getValueFromConfig(multiConfig);

  // Channel RSS 2.0 (all required)
  const channelTitle = faker.lorem.sentence();
  const channelDesc = faker.lorem.paragraph();
  const channelLink = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const channelImageIndex = faker.number.int({ min: 1, max: imagePoolSize });
  const channelImagePad = pad3(channelImageIndex);
  const channelImageUrl = `${baseUrl}/images/image-${channelImagePad}-${IMAGE_SIZES[0]}.jpg`;
  const channelImagesSrcset = buildPodcastImagesSrcset(baseUrl, channelImagePad);
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

  // Channel-level podcast namespace (all required)
  const podcastGuid = faker.string.uuid();
  const mediumTag = getMediumForKind(feedKind);
  const lockedVal = faker.datatype.boolean() ? 'yes' : 'no';
  const lockedOwner = faker.internet.email();
  const fundingBlocks = Array.from({ length: multiCount }, () => {
    const url = faker.internet.url();
    const message = faker.lorem.sentence();
    return `<podcast:funding url="${escapeXml(url)}">${escapeXml(message)}</podcast:funding>`;
  }).join('\n    ');
  const personBlocks = Array.from({ length: multiCount }, () => {
    const name = faker.person.fullName();
    const role = faker.helpers.arrayElement(PERSON_ROLES);
    const group = faker.helpers.arrayElement(PERSON_GROUPS);
    const img = `${baseUrl}/images/image-${pad3(faker.number.int({ min: 1, max: imagePoolSize }))}-${IMAGE_SIZES[0]}.jpg`;
    const href = faker.internet.url();
    return `<podcast:person role="${escapeXml(role)}" group="${escapeXml(group)}" img="${escapeXml(img)}" href="${escapeXml(href)}">${escapeXml(name)}</podcast:person>`;
  }).join('\n    ');
  const locationName = faker.location.city();
  const locationGeo = `geo:${faker.location.latitude()},${faker.location.longitude()}`;
  const locationOsm = 'node/123';
  const trailerBlocks = Array.from({ length: multiCount }, () => {
    const url = `${baseUrl}/audio/audio-${pad3(faker.number.int({ min: 1, max: poolSize }))}.mp3`;
    const pubdate = toRfc2822(faker.date.past());
    const length = faker.number.int({ min: 1000, max: 99999 });
    const type = 'audio/mpeg';
    const title = faker.lorem.sentence();
    return `<podcast:trailer url="${escapeXml(url)}" pubdate="${pubdate}" length="${length}" type="${type}">${escapeXml(title)}</podcast:trailer>`;
  }).join('\n    ');
  const licenseId = 'CC-BY-4.0';
  const licenseUrl = 'https://creativecommons.org/licenses/by/4.0/';
  const txtBlocks = Array.from({ length: multiCount }, () => {
    const purpose = faker.helpers.arrayElement(['description', 'summary', 'license'] as const);
    const value = faker.lorem.sentence();
    return `<podcast:txt purpose="${escapeXml(purpose)}">${escapeXml(value)}</podcast:txt>`;
  }).join('\n    ');
  const chatServer = 'chat.example.com';
  const chatProtocol = faker.helpers.arrayElement(['irc', 'xmpp', 'nostr', 'matrix'] as const);
  const chatAccountId = faker.string.alphanumeric(8);
  const chatSpace = faker.lorem.slug();
  const chatEmbedUrl = faker.internet.url();

  const channelPodcastBlock = [
    mediumTag !== null ? `<podcast:medium>${mediumTag}</podcast:medium>` : '',
    `<podcast:guid>${escapeXml(podcastGuid)}</podcast:guid>`,
    `<podcast:locked owner="${escapeXml(lockedOwner)}">${lockedVal}</podcast:locked>`,
    fundingBlocks,
    personBlocks,
    `<podcast:location geo="${escapeXml(locationGeo)}" osm="${escapeXml(locationOsm)}">${escapeXml(locationName)}</podcast:location>`,
    trailerBlocks,
    `<podcast:license url="${escapeXml(licenseUrl)}">${escapeXml(licenseId)}</podcast:license>`,
    `<podcast:images srcset="${escapeXml(channelImagesSrcset)}"/>`,
    txtBlocks,
    `<podcast:chat server="${escapeXml(chatServer)}" protocol="${chatProtocol}" accountId="${escapeXml(chatAccountId)}" space="${escapeXml(chatSpace)}" embedUrl="${escapeXml(chatEmbedUrl)}"/>`,
  ]
    .filter(Boolean)
    .join('\n    ');

  const items: string[] = [];
  const seasonCount = isSeasonFeed(feedKind) ? Math.ceil(itemCount / ITEMS_PER_SEASON) : 0;

  for (let i = 0; i < itemCount; i++) {
    const enclosureIndex = (i % poolSize) + 1;
    const encUrl =
      enclosureKind === 'audio'
        ? `${baseUrl}/audio/audio-${pad3(enclosureIndex)}.mp3`
        : `${baseUrl}/videos/video-${pad3(enclosureIndex)}.mp4`;
    const encType = enclosureKind === 'audio' ? 'audio/mpeg' : 'video/mp4';
    const imageIndex = (i % imagePoolSize) + 1;
    const imagePad = pad3(imageIndex);
    const imageUrl = `${baseUrl}/images/image-${imagePad}-${IMAGE_SIZES[0]}.jpg`;
    const itemImagesSrcset = buildPodcastImagesSrcset(baseUrl, imagePad);

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
    const seasonNum =
      isSeasonFeed(feedKind) && seasonCount > 0 ? Math.floor(i / ITEMS_PER_SEASON) + 1 : 0;
    const episodeNum = isSeasonFeed(feedKind) && seasonCount > 0 ? (i % ITEMS_PER_SEASON) + 1 : 0;
    if (isSeasonFeed(feedKind) && seasonCount > 0) {
      const episodeType = faker.helpers.arrayElement(['full', 'trailer', 'bonus'] as const);
      seasonEpisodeBlock = `      <itunes:season>${seasonNum}</itunes:season>
      <itunes:episode>${episodeNum}</itunes:episode>
      <itunes:episodeType>${episodeType}</itunes:episodeType>
`;
    }

    const transcriptBlocks = Array.from({ length: multiCount }, () => {
      const url = `${baseUrl}/feeds/transcript-${faker.string.alphanumeric(8)}.txt`;
      const type = faker.helpers.arrayElement([
        'text/plain',
        'text/vtt',
        'application/srt',
      ] as const);
      const language = 'en';
      return `<podcast:transcript url="${escapeXml(url)}" type="${type}" language="${language}"/>`;
    }).join('\n      ');
    const chaptersUrl = `${baseUrl}/feeds/chapters-${faker.string.alphanumeric(8)}.json`;
    const soundbiteBlocks = Array.from({ length: multiCount }, () => {
      const startTime = faker.number.float({ min: 0, max: 300, fractionDigits: 1 });
      const duration = faker.number.float({ min: 15, max: 60, fractionDigits: 1 });
      const title = faker.lorem.sentence();
      return `<podcast:soundbite startTime="${startTime}" duration="${duration}">${escapeXml(title)}</podcast:soundbite>`;
    }).join('\n      ');
    const itemPersonBlocks = Array.from({ length: multiCount }, () => {
      const name = faker.person.fullName();
      const role = faker.helpers.arrayElement(PERSON_ROLES);
      const group = faker.helpers.arrayElement(PERSON_GROUPS);
      const img = `${baseUrl}/images/image-${pad3(faker.number.int({ min: 1, max: imagePoolSize }))}-${IMAGE_SIZES[0]}.jpg`;
      const href = faker.internet.url();
      return `<podcast:person role="${escapeXml(role)}" group="${escapeXml(group)}" img="${escapeXml(img)}" href="${escapeXml(href)}">${escapeXml(name)}</podcast:person>`;
    }).join('\n      ');
    const itemLocationName = faker.location.city();
    const itemLocationGeo = `geo:${faker.location.latitude()},${faker.location.longitude()}`;
    const itemLicenseId = 'CC-BY-4.0';
    const itemLicenseUrl = 'https://creativecommons.org/licenses/by/4.0/';
    const socialInteractBlocks = Array.from({ length: multiCount }, () => {
      const platform = faker.helpers.arrayElement(['twitter', 'mastodon', 'instagram'] as const);
      const url = faker.internet.url();
      const id = faker.string.alphanumeric(10);
      const profileUrl = faker.internet.url();
      const priority = faker.number.int({ min: 1, max: 10 });
      return `<podcast:socialInteract platform="${escapeXml(platform)}" url="${escapeXml(url)}" id="${escapeXml(id)}" profileUrl="${escapeXml(profileUrl)}" accountUrl="${escapeXml(profileUrl)}" priority="${priority}">${escapeXml(url)}</podcast:socialInteract>`;
    }).join('\n      ');
    const itemTxtBlocks = Array.from({ length: multiCount }, () => {
      const purpose = faker.helpers.arrayElement(['description', 'summary'] as const);
      const value = faker.lorem.sentence();
      return `<podcast:txt purpose="${escapeXml(purpose)}">${escapeXml(value)}</podcast:txt>`;
    }).join('\n      ');
    const itemChatServer = 'chat.example.com';
    const itemChatProtocol = faker.helpers.arrayElement(['irc', 'xmpp'] as const);
    const itemChatAccountId = faker.string.alphanumeric(8);
    const itemChatSpace = faker.lorem.slug();

    const podcastSeasonBlock =
      seasonNum > 0
        ? `<podcast:season number="${seasonNum}" name="${escapeXml(faker.lorem.words(3))}">${seasonNum}</podcast:season>\n      `
        : '';
    const podcastEpisodeBlock =
      episodeNum > 0
        ? `<podcast:episode number="${episodeNum}" display="${episodeNum}">${episodeNum}</podcast:episode>\n      `
        : '';

    const itemPodcastBlock = [
      transcriptBlocks,
      `<podcast:chapters url="${escapeXml(chaptersUrl)}" type="application/json+chapters"/>`,
      soundbiteBlocks,
      itemPersonBlocks,
      `<podcast:location geo="${escapeXml(itemLocationGeo)}">${escapeXml(itemLocationName)}</podcast:location>`,
      podcastSeasonBlock,
      podcastEpisodeBlock,
      `<podcast:license url="${escapeXml(itemLicenseUrl)}">${escapeXml(itemLicenseId)}</podcast:license>`,
      `<podcast:images srcset="${escapeXml(itemImagesSrcset)}"/>`,
      socialInteractBlocks,
      itemTxtBlocks,
      `<podcast:chat server="${escapeXml(itemChatServer)}" protocol="${itemChatProtocol}" accountId="${escapeXml(itemChatAccountId)}" space="${escapeXml(itemChatSpace)}"/>`,
    ]
      .filter(Boolean)
      .join('\n      ');

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
      ${itemPodcastBlock}
${seasonEpisodeBlock}    </item>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:podcast="https://podcastindex.org/namespace/1.0">
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
    ${channelPodcastBlock}
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
      const imagePoolSize = getImagePoolSize(poolSize);
      const xml = buildFeed(
        kind,
        filename,
        itemCount,
        poolSize,
        imagePoolSize,
        multiConfig,
        baseUrl
      );
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
