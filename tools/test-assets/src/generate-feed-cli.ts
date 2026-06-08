/**
 * CLI and shared logic for generating RSS 2.0 feeds and media under tools/test-assets/assets/.
 * Layout: assets/audio/, assets/feeds/, assets/images/, assets/videos/.
 * Served at http://localhost:2111/<subdir>/<filename>.
 * Usage: npm run generate -- <count> [--items 20|min-max] [--multi 2|min-max] [--force-rss] [--add-fake-value-tags]
 * Value tags (podcast:value) are only emitted when --add-fake-value-tags is passed and the user confirms.
 *
 * Database tables and columns that should have values after the generated feeds are parsed
 * (e.g. via generate_and_parse or parseRSSFeedAndSaveToDatabase):
 *
 * feed
 *   id, url, podcast_index_id, feed_flag_status_id, last_parsed_file_hash, container_id, created_at, updated_at
 * feed_flag_status
 *   id, status
 * feed_log
 *   id, feed_id, last_http_status, last_good_http_status_time, last_finished_parse_time, last_failed_parse_time, parse_errors
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
 * item_enclosure / item_enclosure_source — POPULATED (07b: enclosure + podcast:alternateEnclosure)
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
 * channel_value / channel_value_recipient — POPULATED (07a: podcast:value Lightning keysend)
 * channel_podroll / channel_podroll_remote_item — POPULATED (07d: podcast:podroll)
 * channel_publisher / channel_publisher_remote_item — POPULATED (07d: podcast:publisher)
 * channel_remote_item — POPULATED (07d: channel-level podcast:remoteItem)
 * channel_social_interact
 *   id, channel_id, protocol, uri, account_id, account_url, priority
 *   (feed has podcast:chat at channel, not podcast:socialInteract; socialInteract is item-only in feed)
 *
 * item_value / item_value_recipient / item_value_time_split* — POPULATED (07a: podcast:value on items)
 * item_funding
 *   id, item_id, url, title
 * item_content_link — POPULATED (podcast:contentLink on items)
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
 * live_item / live_item_status — POPULATED (07c: podcast:liveItem on channel)
 */

import { faker } from '@faker-js/faker';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { generateGuidWithRandomVersion } from '@podverse/helpers';

import { AssetGenerator, AUDIO_FREQ_MAX, AUDIO_FREQ_MIN } from './asset-generator.js';
import { BASIC_AUTH_BASE_URL, BASIC_AUTH_SUBDIR, DEFAULT_ASSETS_BASE_URL } from './constants.js';
import { buildChaptersForItem, buildChaptersJson } from './generate-feed-chapters.js';
import {
  confirmAddFakeValueTags,
  getPositionalCount,
  getValueFromConfig,
  parseNumericArg,
} from './generate-feed-cli-utils.js';
import { type MultiConfig } from './generate-feed-cli-utils.js';
import {
  BASIC_AUTH_FEED_FILENAME,
  BASIC_AUTH_FEED_ITEMS,
  BASIC_AUTH_IMAGE_POOL_SIZE,
  DEFAULT_ITEMS,
  DEFAULT_MULTI,
  FEED_KINDS,
  IMAGE_SIZES,
  ITEMS_PER_SEASON,
  ITUNES_CATEGORIES,
  MAX_ASSETS_PER_TYPE,
  MAX_FEEDS,
  MIN_SEASONS,
  PERSON_GROUPS,
  PERSON_ROLES,
  SOCIAL_INTERACT_ACCOUNT_ID,
  SOCIAL_INTERACT_ACCOUNT_URL,
  SOCIAL_INTERACT_PROTOCOL,
  SOCIAL_INTERACT_URI,
} from './generate-feed-constants.js';
import { type FeedKind } from './generate-feed-constants.js';
import {
  type BuildFeedResult,
  type RunGenerateFeedAndAssetsOptions,
  type RunGenerateFeedAndAssetsResult,
  type WrittenFeedInfo,
} from './generate-feed-types.js';
import { buildPodcastImagesSrcset, getImagePoolSize, pad3 } from './generate-feed-utils.js';
import {
  buildChannelMetaBoostTag,
  buildChannelValueBlock,
  buildItemValueBlock,
} from './generate-feed-value-tags.js';
import {
  buildLiveItemBlock,
  buildPublisherRemoteItemXml,
  buildRemoteItemXml,
  escapeXml,
  toRfc2822,
} from './generate-feed-xml.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type { MultiConfig } from './generate-feed-cli-utils.js';
export type { FeedKind } from './generate-feed-constants.js';
export type {
  BuildFeedResult,
  RunGenerateFeedAndAssetsOptions,
  RunGenerateFeedAndAssetsResult,
  WrittenFeedInfo,
} from './generate-feed-types.js';
export {
  confirmAddFakeValueTags,
  getPositionalCount,
  getValueFromConfig,
  parseNumericArg,
} from './generate-feed-cli-utils.js';

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

function getOutputDir(): string {
  return path.join(__dirname, '../assets');
}

function getFeedFilename(kind: FeedKind, setIndex: number): string {
  if (kind === 'none') return `feed-${setIndex}.rss`;
  return `feed-${kind}-${setIndex}.rss`;
}

async function ensureMediaAssets(poolSize: number): Promise<number[]> {
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
  const durations: number[] = [];
  for (let i = 1; i <= poolSize; i++) {
    const pad = pad3(i);
    const durationSec = faker.number.int({ min: 30, max: 90 });
    const frequencyHz = faker.number.int({ min: AUDIO_FREQ_MIN, max: AUDIO_FREQ_MAX });
    durations.push(durationSec);
    await generator.generateMP3(`audio-${pad}.mp3`, durationSec, frequencyHz);
    await generator.generateOGG(`audio-${pad}.ogg`, durationSec, frequencyHz);
    await generator.generateMP4(`video-${pad}.mp4`, durationSec, frequencyHz);
    await generator.generateWebM(`video-${pad}.webm`, durationSec, frequencyHz);
  }

  console.log(
    `\nMedia pool ready (images 1..${imagePoolSize} × ${IMAGE_SIZES.length} sizes; audio/video/ogg/webm 1..${poolSize}). Writing feeds...\n`
  );
  return durations;
}

/** Ensure media pool for the single basic-auth feed (10 items, 4 image indices, under assets/basic-auth/). */
async function ensureBasicAuthMediaAssets(): Promise<number[]> {
  const generator = new AssetGenerator({ namespace: BASIC_AUTH_SUBDIR });
  await generator.ensureAssetsDirectory();
  for (let i = 1; i <= BASIC_AUTH_IMAGE_POOL_SIZE; i++) {
    const pad = pad3(i);
    const color = faker.color.rgb({ format: 'hex' });
    await generator.generateImageSizes(pad, IMAGE_SIZES, color, true);
  }
  const durations: number[] = [];
  for (let i = 1; i <= BASIC_AUTH_FEED_ITEMS; i++) {
    const pad = pad3(i);
    const durationSec = faker.number.int({ min: 30, max: 90 });
    const frequencyHz = faker.number.int({ min: AUDIO_FREQ_MIN, max: AUDIO_FREQ_MAX });
    durations.push(durationSec);
    await generator.generateMP3(`audio-${pad}.mp3`, durationSec, frequencyHz);
    await generator.generateOGG(`audio-${pad}.ogg`, durationSec, frequencyHz);
    await generator.generateMP4(`video-${pad}.mp4`, durationSec, frequencyHz);
    await generator.generateWebM(`video-${pad}.webm`, durationSec, frequencyHz);
  }
  return durations;
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

/** 07b: Build 4 <podcast:alternateEnclosure> per item (audio/mpeg, audio/ogg, video/mp4, video/webm) with <podcast:source>. */
function buildAlternateEnclosureBlocks(baseUrl: string, enclosureIndex: number): string {
  const base = baseUrl.replace(/\/$/, '');
  const pad = pad3(enclosureIndex);
  const audioMpegUrl = `${base}/audio/audio-${pad}.mp3`;
  const audioOggUrl = `${base}/audio/audio-${pad}.ogg`;
  const videoMp4Url = `${base}/videos/video-${pad}.mp4`;
  const videoWebmUrl = `${base}/videos/video-${pad}.webm`;
  const audioLength = 5000000;
  const videoLength = 10000000;
  const lang = 'en';
  const audioMpegAttrs = `type="audio/mpeg" length="${audioLength}" bitrate="128000" lang="${escapeXml(lang)}" title="${escapeXml('MP3 128kbps')}" rel="alternate" codecs="${escapeXml('mp4a.40.2')}"`;
  const audioOggAttrs = `type="audio/ogg" length="${audioLength}" bitrate="192000" lang="${escapeXml(lang)}" title="${escapeXml('OGG Opus')}" rel="alternate" codecs="${escapeXml('opus')}"`;
  const videoMp4Attrs = `type="video/mp4" length="${videoLength}" bitrate="2500000" height="720" lang="${escapeXml(lang)}" title="${escapeXml('MP4 720p')}" rel="alternate" codecs="${escapeXml('avc1.4d401f,mp4a.40.2')}"`;
  const videoWebmAttrs = `type="video/webm" length="${videoLength}" bitrate="1800000" height="1080" lang="${escapeXml(lang)}" title="${escapeXml('WebM 1080p')}" rel="alternate" codecs="${escapeXml('vp9,opus')}"`;
  const sriValue = 'sha384-ExVqijgYHm15PqQqdXfW95x+Rs6C+d6E/ICxyQOeFevnxNLR/wtJNrNYTjIysUBo';
  const integrityTag = `<podcast:integrity type="sri" value="${escapeXml(sriValue)}"/>`;
  const blocks = [
    `<podcast:alternateEnclosure ${audioMpegAttrs}><podcast:source uri="${escapeXml(audioMpegUrl)}" contentType="audio/mpeg"/>${integrityTag}</podcast:alternateEnclosure>`,
    `<podcast:alternateEnclosure ${audioOggAttrs}><podcast:source uri="${escapeXml(audioOggUrl)}" contentType="audio/ogg"/>${integrityTag}</podcast:alternateEnclosure>`,
    `<podcast:alternateEnclosure ${videoMp4Attrs}><podcast:source uri="${escapeXml(videoMp4Url)}" contentType="video/mp4"/>${integrityTag}</podcast:alternateEnclosure>`,
    `<podcast:alternateEnclosure ${videoWebmAttrs}><podcast:source uri="${escapeXml(videoWebmUrl)}" contentType="video/webm"/>${integrityTag}</podcast:alternateEnclosure>`,
  ];
  return blocks.join('\n      ');
}

/** One transcript cue: start/end in seconds, text for that interval. */
type TranscriptSegment = { startSec: number; endSec: number; text: string };

/** Format seconds as HH:MM:SS.mmm (VTT) or HH:MM:SS,mmm (SRT). */
function secToTimestamp(sec: number, useComma: boolean): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec % 1) * 1000);
  const sep = useComma ? ',' : '.';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(ms).padStart(3, '0')}`;
}

/** Build transcript segments that fit within [0, durationSec]; varied text per segment. */
function buildTranscriptSegments(durationSec: number): TranscriptSegment[] {
  const numSegments = Math.max(2, Math.min(50, Math.floor(durationSec / 8)));
  const segmentDuration = durationSec / numSegments;
  const segments: TranscriptSegment[] = [];
  for (let i = 0; i < numSegments; i++) {
    const startSec = Math.round(i * segmentDuration * 1000) / 1000;
    const endSec =
      i === numSegments - 1
        ? Math.round(durationSec * 1000) / 1000
        : Math.round((i + 1) * segmentDuration * 1000) / 1000;
    segments.push({
      startSec,
      endSec,
      text: faker.lorem.sentence(),
    });
  }
  return segments;
}

/** Format segments as WebVTT, SRT, or plain text. */
function formatTranscriptSegments(
  segments: TranscriptSegment[],
  format: 'vtt' | 'srt' | 'plain'
): string {
  if (format === 'plain') {
    return segments.map((s) => s.text).join('\n');
  }
  if (format === 'vtt') {
    const lines = ['WEBVTT', ''];
    for (const seg of segments) {
      lines.push(
        `${secToTimestamp(seg.startSec, false)} --> ${secToTimestamp(seg.endSec, false)}`,
        seg.text,
        ''
      );
    }
    return lines.join('\n');
  }
  // SRT
  const lines: string[] = [];
  segments.forEach((seg, idx) => {
    lines.push(
      String(idx + 1),
      `${secToTimestamp(seg.startSec, true)} --> ${secToTimestamp(seg.endSec, true)}`,
      seg.text,
      ''
    );
  });
  return lines.join('\n');
}

function buildFeed(
  feedKind: FeedKind,
  filename: string,
  itemCount: number,
  poolSize: number,
  mediaDurationsByPoolIndex: number[],
  imagePoolSize: number,
  multiConfig: MultiConfig,
  baseUrl: string,
  writtenFeedInfo: WrittenFeedInfo[] = [],
  liveItemStatus?: 'live' | 'pending' | 'ended',
  includeValueTags = false
): BuildFeedResult {
  const enclosureKind = getEnclosureKind(feedKind);
  const multiCount = getValueFromConfig(multiConfig);
  const feedBasename = filename.replace(/\.rss$/i, '');
  const chaptersToWrite: { filename: string; content: string }[] = [];
  const transcriptsToWrite: { filename: string; content: string }[] = [];

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
  const itunesCategories = faker.helpers.shuffle([...ITUNES_CATEGORIES]).slice(0, 2);
  const itunesExplicit = faker.helpers.arrayElement([true, false]) ? 'yes' : 'no';
  const itunesBlock = 'no';
  const itunesComplete = 'no';
  const itunesType = faker.helpers.arrayElement(['episodic', 'serial'] as const);
  const ownerName = faker.person.fullName();
  const ownerEmail = faker.internet.email();
  const channelAuthor = faker.person.fullName();

  // Channel-level podcast namespace (all required)
  const podcastGuid = generateGuidWithRandomVersion();
  const mediumTag = getMediumForKind(feedKind);
  const lockedVal = faker.helpers.arrayElement([true, false]) ? 'yes' : 'no';
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

  // 07d: remoteItem, podroll, publisher (only when we have previously written feeds to point to)
  const remoteItemPodrollPublisherBlocks = ((): string[] => {
    if (writtenFeedInfo.length === 0) return [];
    const blocks: string[] = [];

    // Publisher: exactly one <podcast:publisher> with one remoteItem (optional itemGuid/title)
    const publisherTarget = faker.helpers.arrayElement(writtenFeedInfo);
    blocks.push(
      `<podcast:publisher>\n    ${buildPublisherRemoteItemXml(publisherTarget)}\n    </podcast:publisher>`
    );

    // Podroll: one <podcast:podroll> with multiCount remoteItems (varied itemGuid, title, medium)
    const podrollTargets = Array.from({ length: multiCount }, () =>
      faker.helpers.arrayElement(writtenFeedInfo)
    );
    const podrollRemoteItems = podrollTargets.map((t) => buildRemoteItemXml(t));
    blocks.push(
      `<podcast:podroll>\n    ${podrollRemoteItems.join('\n    ')}\n    </podcast:podroll>`
    );

    // Direct channel remoteItem(s): 1–2 items (varied itemGuid, title, medium)
    const directCount = faker.number.int({ min: 1, max: 2 });
    const directTargets = Array.from({ length: directCount }, () =>
      faker.helpers.arrayElement(writtenFeedInfo)
    );
    directTargets.forEach((t) => blocks.push(buildRemoteItemXml(t)));
    return blocks;
  })();

  const channelSocialInteractTag = `<podcast:socialInteract protocol="${escapeXml(SOCIAL_INTERACT_PROTOCOL)}" uri="${escapeXml(SOCIAL_INTERACT_URI)}" accountId="${escapeXml(SOCIAL_INTERACT_ACCOUNT_ID)}" accountUrl="${escapeXml(SOCIAL_INTERACT_ACCOUNT_URL)}" priority="1"/>`;
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
    channelSocialInteractTag,
    `<podcast:chat server="${escapeXml(chatServer)}" protocol="${chatProtocol}" accountId="${escapeXml(chatAccountId)}" space="${escapeXml(chatSpace)}" embedUrl="${escapeXml(chatEmbedUrl)}"/>`,
    includeValueTags ? buildChannelMetaBoostTag() : '',
    includeValueTags ? buildChannelValueBlock(multiCount) : '',
    ...remoteItemPodrollPublisherBlocks,
    liveItemStatus !== undefined
      ? buildLiveItemBlock(
          liveItemStatus,
          liveItemStatus === 'live' ? faker.internet.url() : undefined
        )
      : '',
  ]
    .filter(Boolean)
    .join('\n    ');

  const items: string[] = [];
  const seasonCount = isSeasonFeed(feedKind)
    ? Math.max(MIN_SEASONS, Math.ceil(itemCount / ITEMS_PER_SEASON))
    : 0;
  const itemsPerSeason =
    isSeasonFeed(feedKind) && seasonCount > 0 ? Math.ceil(itemCount / seasonCount) : 0;

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
    const guid = generateGuidWithRandomVersion();
    const itemPubDate = toRfc2822(faker.date.past());
    const length = faker.number.int({ min: 0, max: 99999999 });

    const itunesAuthor = faker.person.fullName();
    const itunesItemExplicit = faker.helpers.arrayElement([true, false]) ? 'yes' : 'no';
    const durationSec = mediaDurationsByPoolIndex[enclosureIndex - 1] ?? 60;
    const itunesDuration =
      durationSec >= 3600
        ? `${Math.floor(durationSec / 3600)}:${String(Math.floor((durationSec % 3600) / 60)).padStart(2, '0')}:${String(durationSec % 60).padStart(2, '0')}`
        : String(durationSec);
    const contentEncoded = faker.lorem.paragraphs(2);
    const keywords = Array.from({ length: 3 }, () => faker.lorem.word()).join(', ');

    let seasonEpisodeBlock = '';
    const seasonNum =
      isSeasonFeed(feedKind) && seasonCount > 0 ? Math.floor(i / itemsPerSeason) + 1 : 0;
    const episodeNum = isSeasonFeed(feedKind) && seasonCount > 0 ? (i % itemsPerSeason) + 1 : 0;
    if (isSeasonFeed(feedKind) && seasonCount > 0) {
      const episodeType = faker.helpers.arrayElement(['full', 'trailer', 'bonus'] as const);
      seasonEpisodeBlock = `      <itunes:season>${seasonNum}</itunes:season>
      <itunes:episode>${episodeNum}</itunes:episode>
      <itunes:episodeType>${episodeType}</itunes:episodeType>
`;
    }

    const baseNoSlash = baseUrl.replace(/\/$/, '');
    const transcriptSegments = buildTranscriptSegments(durationSec);
    const transcriptEntries: { filename: string; type: string; content: string; rel?: string }[] = [
      {
        filename: `transcript-${feedBasename}-item-${i}-0.vtt`,
        type: 'text/vtt',
        content: formatTranscriptSegments(transcriptSegments, 'vtt'),
        rel: 'captions',
      },
      {
        filename: `transcript-${feedBasename}-item-${i}-1.srt`,
        type: 'application/x-subrip',
        content: formatTranscriptSegments(transcriptSegments, 'srt'),
        // omit rel so item_transcript.rel is null for this row (some populated, some not)
      },
    ];
    for (const entry of transcriptEntries) {
      transcriptsToWrite.push({ filename: entry.filename, content: entry.content });
    }
    const transcriptBlocks = transcriptEntries
      .map(
        (entry) =>
          `<podcast:transcript url="${escapeXml(`${baseNoSlash}/transcripts/${entry.filename}`)}" type="${escapeXml(entry.type)}" language="en"${entry.rel ? ` rel="${entry.rel}"` : ''}/>`
      )
      .join('\n      ');
    const chaptersFilename = `chapters-${feedBasename}-item-${i}.json`;
    const chaptersArray = buildChaptersForItem(durationSec, baseUrl, imagePoolSize);
    const chaptersJsonObj = buildChaptersJson(chaptersArray);
    chaptersToWrite.push({
      filename: chaptersFilename,
      content: JSON.stringify(chaptersJsonObj, null, 0),
    });
    const chaptersUrl = `${baseUrl.replace(/\/$/, '')}/chapters/${chaptersFilename}`;
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
    const useOsmForItem = i % 2 === 0;
    const OSM_IDS = ['R113314', 'W43678282', 'N123456'] as const;
    const itemLocationOsm = OSM_IDS[i % OSM_IDS.length] ?? OSM_IDS[0];
    const itemLocationTag = useOsmForItem
      ? `<podcast:location osm="${escapeXml(itemLocationOsm)}" country="US">${escapeXml(itemLocationName)}</podcast:location>`
      : `<podcast:location geo="${escapeXml(itemLocationGeo)}">${escapeXml(itemLocationName)}</podcast:location>`;
    const itemLicenseId = 'CC-BY-4.0';
    const itemLicenseUrl = 'https://creativecommons.org/licenses/by/4.0/';
    const itemSocialInteractTag = `<podcast:socialInteract protocol="${escapeXml(SOCIAL_INTERACT_PROTOCOL)}" uri="${escapeXml(SOCIAL_INTERACT_URI)}" accountId="${escapeXml(SOCIAL_INTERACT_ACCOUNT_ID)}" accountUrl="${escapeXml(SOCIAL_INTERACT_ACCOUNT_URL)}" priority="1"/>`;
    const itemTxtBlocks = Array.from({ length: multiCount }, () => {
      const purpose = faker.helpers.arrayElement(['description', 'summary'] as const);
      const value = faker.lorem.sentence();
      return `<podcast:txt purpose="${escapeXml(purpose)}">${escapeXml(value)}</podcast:txt>`;
    }).join('\n      ');
    const itemChatServer = 'chat.example.com';
    const itemChatProtocol = faker.helpers.arrayElement(['irc', 'xmpp'] as const);
    const itemChatAccountId = faker.string.alphanumeric(8);
    const itemChatSpace = faker.lorem.slug();

    const itemContentLinkCount = faker.number.int({ min: 1, max: 2 });
    const itemContentLinkBlocks = Array.from({ length: itemContentLinkCount }, () => {
      const href = faker.internet.url();
      const title = faker.helpers.arrayElement([
        'Watch on YouTube',
        'Listen on Spotify',
        'Read the transcript',
        'View on website',
      ]);
      return `<podcast:contentLink href="${escapeXml(href)}">${escapeXml(title)}</podcast:contentLink>`;
    }).join('\n      ');

    const includeItemValue = includeValueTags && i < multiCount;
    const remoteItemTargetForValue = writtenFeedInfo.length > 0 ? writtenFeedInfo[0] : null;
    const itemValueBlock = includeItemValue
      ? buildItemValueBlock(i === 0, remoteItemTargetForValue)
      : '';

    const alternateEnclosureBlocks = buildAlternateEnclosureBlocks(baseUrl, enclosureIndex);

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
      itemContentLinkBlocks,
      soundbiteBlocks,
      itemPersonBlocks,
      itemLocationTag,
      podcastSeasonBlock,
      podcastEpisodeBlock,
      `<podcast:license url="${escapeXml(itemLicenseUrl)}">${escapeXml(itemLicenseId)}</podcast:license>`,
      `<podcast:images srcset="${escapeXml(itemImagesSrcset)}"/>`,
      itemSocialInteractTag,
      itemTxtBlocks,
      `<podcast:chat server="${escapeXml(itemChatServer)}" protocol="${itemChatProtocol}" accountId="${escapeXml(itemChatAccountId)}" space="${escapeXml(itemChatSpace)}"/>`,
      itemValueBlock,
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
      ${alternateEnclosureBlocks}
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

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
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
    <itunes:author>${escapeXml(channelAuthor)}</itunes:author>
    <itunes:summary>${escapeXml(itunesSummary)}</itunes:summary>
    <itunes:image href="${escapeXml(channelImageUrl)}"/>
    ${itunesCategories.map((cat: string) => `<itunes:category text="${escapeXml(cat)}"/>`).join('\n    ')}
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
  return { xml, channelGuid: podcastGuid, chaptersToWrite, transcriptsToWrite };
}

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
    forceRss = false,
    addFakeValueTags = false,
  } = options;

  const totalFeeds = count * FEED_KINDS.length;
  const poolSize = Math.min(totalFeeds, MAX_ASSETS_PER_TYPE);
  const outDir = getOutputDir();
  const feedsDir = path.join(outDir, 'feeds');
  const chaptersDir = path.join(outDir, 'chapters');
  const transcriptsDir = path.join(outDir, 'transcripts');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  if (!fs.existsSync(feedsDir)) {
    fs.mkdirSync(feedsDir, { recursive: true });
  }
  if (!fs.existsSync(chaptersDir)) {
    fs.mkdirSync(chaptersDir, { recursive: true });
  }
  if (!fs.existsSync(transcriptsDir)) {
    fs.mkdirSync(transcriptsDir, { recursive: true });
  }

  const mediaDurations = await ensureMediaAssets(poolSize);

  const base = baseUrl.replace(/\/$/, '');
  const writtenFeedInfo: WrittenFeedInfo[] = [];
  let written = 0;
  let skipped = 0;
  for (let setIndex = 1; setIndex <= count; setIndex++) {
    for (const kind of FEED_KINDS) {
      const filename = getFeedFilename(kind, setIndex);
      const filePath = path.join(feedsDir, filename);
      if (!forceRss && fs.existsSync(filePath)) {
        skipped++;
        if (skipped <= 12 || skipped % 100 === 0) {
          console.log(`Skipped (exists): ${filename}`);
        }
        continue;
      }
      const itemCount = getValueFromConfig(itemsConfig);
      const imagePoolSize = getImagePoolSize(poolSize);
      const liveItemStatus: 'live' | 'pending' | 'ended' | undefined =
        kind === 'podcast'
          ? (['live', 'pending', 'ended'] as const)[(setIndex - 1) % 3]
          : undefined;
      const { xml, channelGuid, chaptersToWrite, transcriptsToWrite } = buildFeed(
        kind,
        filename,
        itemCount,
        poolSize,
        mediaDurations,
        imagePoolSize,
        multiConfig,
        baseUrl,
        writtenFeedInfo,
        liveItemStatus,
        addFakeValueTags
      );
      fs.writeFileSync(filePath, xml, 'utf8');
      for (const { filename: chFilename, content } of chaptersToWrite) {
        fs.writeFileSync(path.join(chaptersDir, chFilename), content, 'utf8');
      }
      for (const { filename: txFilename, content } of transcriptsToWrite) {
        fs.writeFileSync(path.join(transcriptsDir, txFilename), content, 'utf8');
      }
      writtenFeedInfo.push({ url: `${base}/feeds/${filename}`, guid: channelGuid });
      written++;
      if (written <= 12 || written % 100 === 0) {
        console.log(`Wrote ${filePath} (${itemCount} items)`);
      }
    }
  }

  // Basic-Auth feed: exactly one feed, 10 items, under assets/basic-auth/ (always created; never parsed by generate_and_parse).
  const basicAuthDir = path.join(outDir, BASIC_AUTH_SUBDIR);
  const basicAuthFeedsDir = path.join(basicAuthDir, 'feeds');
  const basicAuthChaptersDir = path.join(basicAuthDir, 'chapters');
  const basicAuthTranscriptsDir = path.join(basicAuthDir, 'transcripts');
  for (const dir of [
    basicAuthDir,
    basicAuthFeedsDir,
    basicAuthChaptersDir,
    basicAuthTranscriptsDir,
  ]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  const basicAuthDurations = await ensureBasicAuthMediaAssets();
  const basicAuthFeedPath = path.join(basicAuthFeedsDir, BASIC_AUTH_FEED_FILENAME);
  if (!forceRss && fs.existsSync(basicAuthFeedPath)) {
    skipped++;
    console.log(`Skipped (exists): ${BASIC_AUTH_SUBDIR}/feeds/${BASIC_AUTH_FEED_FILENAME}`);
  } else {
    const { xml, chaptersToWrite, transcriptsToWrite } = buildFeed(
      'podcast',
      BASIC_AUTH_FEED_FILENAME,
      BASIC_AUTH_FEED_ITEMS,
      BASIC_AUTH_FEED_ITEMS,
      basicAuthDurations,
      BASIC_AUTH_IMAGE_POOL_SIZE,
      multiConfig,
      BASIC_AUTH_BASE_URL,
      [],
      undefined,
      false
    );
    fs.writeFileSync(basicAuthFeedPath, xml, 'utf8');
    for (const { filename: chFilename, content } of chaptersToWrite) {
      fs.writeFileSync(path.join(basicAuthChaptersDir, chFilename), content, 'utf8');
    }
    for (const { filename: txFilename, content } of transcriptsToWrite) {
      fs.writeFileSync(path.join(basicAuthTranscriptsDir, txFilename), content, 'utf8');
    }
    written++;
    console.log(`Wrote ${basicAuthFeedPath} (${BASIC_AUTH_FEED_ITEMS} items, Basic Auth)`);
  }

  console.log(
    `\nDone. ${written} new feed(s), ${skipped} already present (${count} sets × 9 types + 1 basic-auth).`
  );
  console.log(
    `Assets in tools/test-assets/assets/{audio,chapters,feeds,images,transcripts,videos} and assets/${BASIC_AUTH_SUBDIR}/. Served at ${baseUrl}/<subdir>/<filename>.`
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
    console.error(
      'Usage: generate-feed-cli <count> [--items 20|min-max] [--multi 2|min-max] [--force-rss] [--add-fake-value-tags]'
    );
    console.error(
      '  count   Number of sets (each set = 9 feed types). 1 to 100,000. Existing feed files left unchanged unless --force-rss (media never overwritten).'
    );
    console.error('  --items Items per feed. Default 20. Range (e.g. 10-30) = random per feed.');
    console.error(
      '  --multi Multi-value tag count (funding, person, etc.). Default 2. Range = random per feed/attribute.'
    );
    console.error(
      '  --force-rss  Recreate RSS feed files only (images/audio/video are never overwritten).'
    );
    console.error(
      '  --add-fake-value-tags  Include podcast:value (fake Lightning); prompts for confirmation.'
    );
    process.exit(1);
  }

  const count = Math.min(countArg, MAX_FEEDS);
  const itemsConfig = parseNumericArg('--items', DEFAULT_ITEMS, argv);
  const multiConfig = parseNumericArg('--multi', DEFAULT_MULTI, argv);
  const forceRss = argv.includes('--force-rss');
  const addFakeValueTagsFlag = argv.includes('--add-fake-value-tags');

  let addFakeValueTags = false;
  if (addFakeValueTagsFlag) {
    const confirmed = await confirmAddFakeValueTags();
    if (!confirmed) {
      process.exit(1);
    }
    addFakeValueTags = true;
  }

  await runGenerateFeedAndAssets(count, { itemsConfig, multiConfig, forceRss, addFakeValueTags });
}
