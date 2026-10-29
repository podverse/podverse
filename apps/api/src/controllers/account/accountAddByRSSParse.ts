import { randomUUID } from 'node:crypto';

import { config } from '@api/config/index.js';
import { activeMQArtemisService } from '@api/factories/activeMQArtemisService.js';
import { loggerService } from '@api/factories/loggerService.js';
import {
  canonicalizeCredentialsByUrl,
  joiAddByRssCredentialField,
  joiAddByRssCredentialPair,
  sealAddByRssCredentialsForParse,
  shouldSkipParseAllEnqueue,
} from '@api/lib/addByRSSCredentials.js';
import {
  E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_GUID,
  E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_URL,
} from '@api/lib/addByRSSE2eRemoteItemFixture.js';
import { writeE2eAddByRSSPublisherListedFeeds } from '@api/lib/addByRSSE2ePublisherFixture.js';
import type { AddByRSSParseCacheEntry } from '@api/lib/addByRSSParseCache.js';
import {
  getAddByRSSParseCacheEntry,
  setAddByRSSParseCacheEntry,
} from '@api/lib/addByRSSParseCache.js';
import {
  E2E_ARTIST_NOT_YET_ADDED_ALBUM_FEED_URL,
  E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_GUID,
} from '@api/lib/e2eArtistAlbumsFixture.js';
import {
  getAddByRSSParseDedupeEntry,
  setAddByRSSParseDedupeEntry,
} from '@api/lib/addByRSSParseDedupeCache.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { getParamRequired } from '@api/lib/params.js';
import { rateLimitAuthEndpoint } from '@api/lib/rateLimiter.js';
import { joiFeedUrl, validateBodyObject, validateParamsObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import {
  ACCOUNT_ENTITLEMENT_CAPABILITY,
  getDedupeTTLSeconds,
  getRecordValue,
  MQ_QUEUES,
} from '@podverse/helpers';
import { resolveAddByRSSFeedUrlCredentials } from '@podverse/helpers-validation';
import { mqAddByRSSAdd } from '@podverse/mq';
import { AccountFollowingAddByRSSChannelService } from '@podverse/orm';

import { handleGenericErrorResponse } from '../helpers/error.js';

type FeedHashMap = Record<string, string>;

/** Sync with apps/web/e2e/helpers/seedConstants.ts / tools/web/seed-e2e.mjs (mobile E2E fixtures). */
const E2E_ADD_BY_RSS_CHANNEL_TITLE = 'E2E Add-by-RSS Channel';
const E2E_ADD_BY_RSS_CHANNEL_IMAGE_URL = 'https://e2e-seed-addbyrss.example/channel-art.png';
const E2E_ADD_BY_RSS_ITEM_IMAGE_URL = 'https://e2e-seed-addbyrss.example/item-art.png';
const E2E_ADD_BY_RSS_ITEM_GUID = 'https://e2e-seed-addbyrss.example/item-guid/fresh';
const E2E_ADD_BY_RSS_ITEM_TITLE = 'E2E Add-by-RSS Episode';
const E2E_ADDBYRSS_FRESH_ENCLOSURE_URL =
  'http://localhost:2111/e2e/audio/e2e-addbyrss-fresh-60s-440hz.mp3';

/**
 * The seeded account already follows this feed. Its fixture mirrors the committed feed's channel
 * and first episode, so it never shares a title with the feed a flow adds.
 */
const E2E_TEST_ASSETS_FEED_URL = 'http://localhost:2111/feeds/feed-podcast-1.rss';

type E2eParsedFeedFixture = {
  channelTitle: string;
  link: string;
  channelImageUrl: string;
  itemTitle: string;
  itemGuid: string;
  itemDurationSeconds: number;
  enclosureUrl: string;
  itemImageUrl: string;
  pubDate: string;
  chaptersUrl?: string;
  transcriptUrl?: string;
  medium?: string;
  liveItems?: {
    guid: string;
    startOffsetMs: number;
    status: 'live' | 'pending';
    title: string;
  }[];
  podcastGuid?: string;
  /** The feed's podcast:publisher pointer. */
  publisher?: { feedGuid: string; feedUrl: string; medium: string };
  /** Channel-level podcast:podroll remote items. */
  podroll?: Array<{
    feedGuid: string;
    feedUrl?: string;
    itemGuid?: string;
    title?: string;
  }>;
  /** Channel-level podcast:remoteItem elements. */
  remoteItems?: Array<{
    feedGuid: string;
    feedUrl?: string;
    itemGuid?: string;
    medium?: string;
    title?: string;
  }>;
  /** A publisher feed has no items of its own. */
  omitItems?: boolean;
};

const E2E_DEFAULT_PARSED_FEED: E2eParsedFeedFixture = {
  channelTitle: E2E_ADD_BY_RSS_CHANNEL_TITLE,
  link: 'https://e2e-seed-addbyrss.example/',
  channelImageUrl: E2E_ADD_BY_RSS_CHANNEL_IMAGE_URL,
  itemTitle: E2E_ADD_BY_RSS_ITEM_TITLE,
  itemGuid: E2E_ADD_BY_RSS_ITEM_GUID,
  itemDurationSeconds: 60,
  enclosureUrl: E2E_ADDBYRSS_FRESH_ENCLOSURE_URL,
  itemImageUrl: E2E_ADD_BY_RSS_ITEM_IMAGE_URL,
  pubDate: '2025-01-01T00:00:00.000Z',
};

const E2E_TEST_ASSETS_PARSED_FEED: E2eParsedFeedFixture = {
  channelTitle: 'Vitium amitto volup traho praesentium tantillus totam balbus balbus paulatim.',
  link: 'http://localhost:2111/',
  channelImageUrl: 'http://localhost:2111/images/image-005-300.jpg',
  itemTitle: 'Tamdiu deinde doloribus terebro asper accusamus pariatur atrocitas torrens ea.',
  itemGuid: 'ed7204c0-1267-11f1-89a4-7b8808f0f4f1',
  itemDurationSeconds: 61,
  enclosureUrl: 'http://localhost:2111/audio/audio-001.mp3',
  itemImageUrl: 'http://localhost:2111/images/image-001-300.jpg',
  pubDate: '2025-07-02T11:21:52.000Z',
};

const E2E_ADD_BY_RSS_SECTIONS_FEED_URL = 'https://e2e-seed-addbyrss.example/podcast-sections.xml';

/** A feed whose item links chapters and a transcript, for the mobile episode sections flow. */
const E2E_ADD_BY_RSS_SECTIONS_PARSED_FEED: E2eParsedFeedFixture = {
  channelTitle: 'E2E Add-by-RSS Sections Channel',
  link: E2E_DEFAULT_PARSED_FEED.link,
  channelImageUrl: E2E_DEFAULT_PARSED_FEED.channelImageUrl,
  itemTitle: 'E2E Add-by-RSS Sections Episode',
  itemGuid: 'https://e2e-seed-addbyrss.example/item-guid/sections',
  itemDurationSeconds: E2E_DEFAULT_PARSED_FEED.itemDurationSeconds,
  enclosureUrl: E2E_DEFAULT_PARSED_FEED.enclosureUrl,
  itemImageUrl: E2E_DEFAULT_PARSED_FEED.itemImageUrl,
  pubDate: E2E_DEFAULT_PARSED_FEED.pubDate,
  chaptersUrl: 'http://localhost:2111/chapters/chapters-feed-podcast-1-item-0.json',
  transcriptUrl: 'http://localhost:2111/transcripts/transcript-feed-podcast-1-item-0-0.vtt',
};

const E2E_ADD_BY_RSS_MUSIC_FEED_URL = 'https://e2e-seed-addbyrss.example/album.xml';
const E2E_ADD_BY_RSS_ARTIST_FEED_URL = 'https://e2e-seed-addbyrss.example/artist.xml';
const E2E_ADD_BY_RSS_ARTIST_PODCAST_GUID = 'e2e0a77a-0000-4000-8000-0000000000a1';
const E2E_ADD_BY_RSS_MUSIC_PODCAST_GUID = 'e2e0a1b0-0000-4000-8000-0000000000b1';
/**
 * Sync with tools/web/seed-e2e.mjs (`E2E_MUSIC_ALBUM_PODCAST_GUID`, `E2E_MUSIC_FEED_URL`).
 * The seeded directory album.
 */
const E2E_DIRECTORY_MUSIC_ALBUM_PODCAST_GUID = '11111111-2222-4333-8444-555555555501';
const E2E_DIRECTORY_MUSIC_FEED_URL = 'https://e2e-seed-music.example/album.xml';
/**
 * Sync with tools/web/seed-e2e.mjs: `${E2E_MUSIC_FEED_URL}#track-one`, the seeded track
 * "E2E Music Track One".
 */
const E2E_DIRECTORY_MUSIC_TRACK_ONE_GUID = 'https://e2e-seed-music.example/album.xml#track-one';
const E2E_ADD_BY_RSS_PODROLL_FEED_URL = 'https://e2e-seed-addbyrss.example/podcast-podroll.xml';

/** A music album whose track links a transcript, for the mobile track flow. */
const E2E_ADD_BY_RSS_MUSIC_PARSED_FEED: E2eParsedFeedFixture = {
  channelTitle: 'E2E Add-by-RSS Album',
  link: E2E_DEFAULT_PARSED_FEED.link,
  channelImageUrl: E2E_DEFAULT_PARSED_FEED.channelImageUrl,
  itemTitle: 'E2E Add-by-RSS Track',
  itemGuid: 'https://e2e-seed-addbyrss.example/item-guid/track',
  itemDurationSeconds: E2E_DEFAULT_PARSED_FEED.itemDurationSeconds,
  enclosureUrl: E2E_DEFAULT_PARSED_FEED.enclosureUrl,
  itemImageUrl: E2E_DEFAULT_PARSED_FEED.itemImageUrl,
  pubDate: E2E_DEFAULT_PARSED_FEED.pubDate,
  medium: 'music',
  podcastGuid: E2E_ADD_BY_RSS_MUSIC_PODCAST_GUID,
  publisher: {
    feedGuid: E2E_ADD_BY_RSS_ARTIST_PODCAST_GUID,
    feedUrl: E2E_ADD_BY_RSS_ARTIST_FEED_URL,
    medium: 'publisher',
  },
  transcriptUrl: 'http://localhost:2111/transcripts/transcript-feed-podcast-1-item-0-0.vtt',
};

/** A publisher feed that lists the Add by RSS album and the seeded directory album. */
const E2E_ADD_BY_RSS_ARTIST_PARSED_FEED: E2eParsedFeedFixture = {
  channelTitle: 'E2E Add-by-RSS Artist',
  link: E2E_DEFAULT_PARSED_FEED.link,
  channelImageUrl: E2E_DEFAULT_PARSED_FEED.channelImageUrl,
  itemTitle: E2E_DEFAULT_PARSED_FEED.itemTitle,
  itemGuid: E2E_DEFAULT_PARSED_FEED.itemGuid,
  itemDurationSeconds: E2E_DEFAULT_PARSED_FEED.itemDurationSeconds,
  enclosureUrl: E2E_DEFAULT_PARSED_FEED.enclosureUrl,
  itemImageUrl: E2E_DEFAULT_PARSED_FEED.itemImageUrl,
  pubDate: E2E_DEFAULT_PARSED_FEED.pubDate,
  medium: 'publisher',
  podcastGuid: E2E_ADD_BY_RSS_ARTIST_PODCAST_GUID,
  omitItems: true,
  remoteItems: [
    {
      feedGuid: E2E_ADD_BY_RSS_MUSIC_PODCAST_GUID,
      feedUrl: E2E_ADD_BY_RSS_MUSIC_FEED_URL,
      medium: 'music',
      title: 'E2E Add-by-RSS Album',
    },
    {
      feedGuid: E2E_DIRECTORY_MUSIC_ALBUM_PODCAST_GUID,
      feedUrl: E2E_DIRECTORY_MUSIC_FEED_URL,
      medium: 'music',
      title: 'E2E Music Album',
    },
    {
      feedGuid: E2E_ADD_BY_RSS_MUSIC_PODCAST_GUID,
      feedUrl: E2E_ADD_BY_RSS_MUSIC_FEED_URL,
      itemGuid: E2E_ADD_BY_RSS_MUSIC_PARSED_FEED.itemGuid,
      medium: 'music',
    },
  ],
};

const E2E_ADD_BY_RSS_PODROLL_PARSED_FEED: E2eParsedFeedFixture = {
  ...E2E_DEFAULT_PARSED_FEED,
  channelTitle: 'E2E Add-by-RSS Podroll Channel',
  itemTitle: 'E2E Add-by-RSS Podroll Episode',
  itemGuid: 'https://e2e-seed-addbyrss.example/item-guid/podroll',
  podroll: [
    {
      feedGuid: E2E_DIRECTORY_MUSIC_ALBUM_PODCAST_GUID,
      feedUrl: E2E_DIRECTORY_MUSIC_FEED_URL,
      title: 'E2E Music Album',
    },
    {
      feedGuid: E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_GUID,
      feedUrl: E2E_ARTIST_NOT_YET_ADDED_ALBUM_FEED_URL,
    },
    {
      feedGuid: E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_GUID,
      feedUrl: E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_URL,
      title: 'E2E Remote Not Found Feed',
    },
    {
      feedGuid: E2E_DIRECTORY_MUSIC_ALBUM_PODCAST_GUID,
      feedUrl: E2E_DIRECTORY_MUSIC_FEED_URL,
      itemGuid: E2E_DIRECTORY_MUSIC_TRACK_ONE_GUID,
      title: 'E2E Music Track One',
    },
  ],
  remoteItems: [
    {
      feedGuid: E2E_DIRECTORY_MUSIC_ALBUM_PODCAST_GUID,
      feedUrl: E2E_DIRECTORY_MUSIC_FEED_URL,
      itemGuid: E2E_DIRECTORY_MUSIC_TRACK_ONE_GUID,
      medium: 'music',
      title: 'E2E Music Track One',
    },
    {
      feedGuid: E2E_ARTIST_NOT_YET_ADDED_ALBUM_PODCAST_GUID,
      feedUrl: E2E_ARTIST_NOT_YET_ADDED_ALBUM_FEED_URL,
      itemGuid: 'https://e2e-seed-addbyrss.example/item-guid/not-yet-added-track',
      medium: 'music',
      title: 'E2E Not Yet Added Track',
    },
    {
      feedGuid: E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_GUID,
      feedUrl: E2E_ADD_BY_RSS_REMOTE_ITEM_NOT_FOUND_FEED_URL,
      itemGuid: 'https://e2e-seed-addbyrss.example/item-guid/remote-not-found',
      title: 'E2E Remote Not Found Episode',
    },
  ],
};

const E2E_ADD_BY_RSS_LIVE_FEED_URL = 'https://e2e-seed-addbyrss.example/podcast-live.xml';

/** A feed with one live and one scheduled livestream, for the mobile Add by RSS livestream flow. */
const E2E_ADD_BY_RSS_LIVE_PARSED_FEED: E2eParsedFeedFixture = {
  channelTitle: 'E2E Add-by-RSS Live Channel',
  link: E2E_DEFAULT_PARSED_FEED.link,
  channelImageUrl: E2E_DEFAULT_PARSED_FEED.channelImageUrl,
  itemTitle: 'E2E Add-by-RSS Live Channel Episode',
  itemGuid: 'https://e2e-seed-addbyrss.example/item-guid/live-channel',
  itemDurationSeconds: E2E_DEFAULT_PARSED_FEED.itemDurationSeconds,
  enclosureUrl: E2E_DEFAULT_PARSED_FEED.enclosureUrl,
  itemImageUrl: E2E_DEFAULT_PARSED_FEED.itemImageUrl,
  pubDate: E2E_DEFAULT_PARSED_FEED.pubDate,
  liveItems: [
    {
      guid: 'https://e2e-seed-addbyrss.example/live-guid/now',
      startOffsetMs: -60 * 60 * 1000,
      status: 'live',
      title: 'E2E Add-by-RSS Live Now',
    },
    {
      guid: 'https://e2e-seed-addbyrss.example/live-guid/scheduled',
      startOffsetMs: 24 * 60 * 60 * 1000,
      status: 'pending',
      title: 'E2E Add-by-RSS Scheduled Live',
    },
  ],
};

const E2E_PARSED_FEEDS_BY_URL: Record<string, E2eParsedFeedFixture> = {
  [E2E_TEST_ASSETS_FEED_URL]: E2E_TEST_ASSETS_PARSED_FEED,
  [E2E_ADD_BY_RSS_SECTIONS_FEED_URL]: E2E_ADD_BY_RSS_SECTIONS_PARSED_FEED,
  [E2E_ADD_BY_RSS_MUSIC_FEED_URL]: E2E_ADD_BY_RSS_MUSIC_PARSED_FEED,
  [E2E_ADD_BY_RSS_ARTIST_FEED_URL]: E2E_ADD_BY_RSS_ARTIST_PARSED_FEED,
  [E2E_ADD_BY_RSS_PODROLL_FEED_URL]: E2E_ADD_BY_RSS_PODROLL_PARSED_FEED,
  [E2E_ADD_BY_RSS_LIVE_FEED_URL]: E2E_ADD_BY_RSS_LIVE_PARSED_FEED,
};

/**
 * Minimal partytime-shaped payload so mobile `convertParsedRSSFeedToCompat` yields a mapped bundle
 * with one playable item. Cast via unknown: fixture is intentionally not a full FeedObject.
 */
const buildE2eParsedFeedPayload = (
  feedUrl: string
): NonNullable<AddByRSSParseCacheEntry['payload']> => {
  const source = E2E_PARSED_FEEDS_BY_URL[feedUrl] ?? E2E_DEFAULT_PARSED_FEED;
  const item = {
    title: source.itemTitle,
    guid: source.itemGuid,
    duration: source.itemDurationSeconds,
    explicit: false,
    enclosure: {
      url: source.enclosureUrl,
      type: 'audio/mpeg',
      length: 0,
    },
    image: source.itemImageUrl,
    pubDate: source.pubDate,
    ...(source.chaptersUrl !== undefined
      ? {
          podcastChapters: {
            url: source.chaptersUrl,
            type: 'application/json+chapters',
          },
        }
      : {}),
    ...(source.transcriptUrl !== undefined
      ? {
          podcastTranscripts: [
            {
              url: source.transcriptUrl,
              type: 'text/vtt',
              language: 'en',
              rel: 'captions',
            },
          ],
        }
      : {}),
  };
  const fixture = {
    title: source.channelTitle,
    ...(source.podcastGuid !== undefined ? { guid: source.podcastGuid } : {}),
    ...(source.medium !== undefined ? { medium: source.medium } : {}),
    ...(source.publisher !== undefined ? { podcastPublisher: source.publisher } : {}),
    ...(source.podroll !== undefined ? { podroll: source.podroll.map((ref) => ({ ...ref })) } : {}),
    link: source.link,
    description: 'E2E add-by-RSS fixture',
    explicit: false,
    image: { url: source.channelImageUrl },
    items: source.omitItems === true ? [] : [item],
    ...(source.liveItems !== undefined
      ? {
          podcastLiveItems: source.liveItems.map((liveItem) => ({
            title: liveItem.title,
            guid: liveItem.guid,
            status: liveItem.status,
            start: new Date(Date.now() + liveItem.startOffsetMs).toISOString(),
            enclosure: {
              url: 'http://localhost:2111/audio/audio-001.mp3',
              type: 'audio/mpeg',
              length: 0,
            },
          })),
        }
      : {}),
    ...(source.remoteItems !== undefined ? { podcastRemoteItems: source.remoteItems } : {}),
  };
  return fixture as unknown as NonNullable<AddByRSSParseCacheEntry['payload']>;
};

export const addByRssParseEnqueueRateLimit = rateLimitAuthEndpoint({
  windowMs: config.rateLimits.accountAddByRssParseEnqueue.windowMs,
  max: config.rateLimits.accountAddByRssParseEnqueue.max,
  apiKeyAccess: { resource: 'add_by_rss', action: 'create' },
});

class AccountAddByRSSParseController {
  static async enqueueParse(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        addByRssParseEnqueueRateLimit(req, res, () => {
          const bodySchema = Joi.object({
            feed_url: joiFeedUrl(),
            feed_hash: Joi.string().optional(),
            etag: Joi.string().optional(),
            last_modified: Joi.string().optional(),
            basic_auth_username: joiAddByRssCredentialField().optional(),
            basic_auth_password: joiAddByRssCredentialField().optional(),
          }).and('basic_auth_username', 'basic_auth_password');

          validateBodyObject(bodySchema, req, res, async () => {
            const account = getAuthenticatedUser(req);
            const requestId = randomUUID();
            const { feed_hash, etag, last_modified } = req.body;
            const resolved = resolveAddByRSSFeedUrlCredentials(
              req.body.feed_url,
              req.body.basic_auth_username,
              req.body.basic_auth_password
            );
            if (resolved === null) {
              res.status(400).json({ message: '"feed_url" must be a valid uri' });
              return;
            }
            const feedUrl = resolved.feedUrl;
            const mqConstantMessageOptions = MQ_QUEUES['add-by-rss-on-demand'];
            const dedupeTTLSeconds = getDedupeTTLSeconds(
              mqConstantMessageOptions.dedupeCacheTimeMS
            );

            try {
              const credentialsEnvelope =
                resolved.credentials && !config.e2e.fixturesEnabled
                  ? sealAddByRssCredentialsForParse({
                      credentials: resolved.credentials,
                      accountId: account.id,
                      requestId,
                      feedUrl,
                    })
                  : undefined;

              if (dedupeTTLSeconds) {
                const existing = await getAddByRSSParseDedupeEntry(account.id, feedUrl);
                // A body that carries credentials is an explicit check of a protected feed.
                // The duplicate window must not drop it, or save-and-check fails right after add.
                if (existing !== null && resolved.credentials === null) {
                  res.status(429).json({
                    message: 'Duplicate request. Please wait before retrying.',
                    retry_after_seconds: dedupeTTLSeconds,
                  });
                  return;
                }

                await setAddByRSSParseDedupeEntry(account.id, feedUrl, dedupeTTLSeconds);
              }

              if (process.env.MQ_DEBUG === 'true') {
                loggerService.info('Add-by-RSS enqueue debug', {
                  queueName: mqConstantMessageOptions.queueName,
                  host: config.activeMQArtemis.host,
                  port: config.activeMQArtemis.port,
                  protocol: config.activeMQArtemis.protocol,
                  requestId,
                  feedUrl,
                  dedupeTTLSeconds,
                  hasCredentials: credentialsEnvelope !== undefined,
                });
              }

              if (config.e2e.fixturesEnabled) {
                // Mobile E2E stack has no MQ/worker — resolve parse synchronously.
                const payload = buildE2eParsedFeedPayload(feedUrl);
                const publisherListedFeeds = await writeE2eAddByRSSPublisherListedFeeds({
                  accountId: account.id,
                  requestId,
                  feedUrl,
                  payload,
                  payloadForFeedUrl: buildE2eParsedFeedPayload,
                });
                await setAddByRSSParseCacheEntry({
                  requestId,
                  accountId: account.id,
                  feedUrl,
                  status: 'parsed',
                  cache: {
                    feedHash: feed_hash || undefined,
                    etag: etag || undefined,
                    lastModified: last_modified || undefined,
                  },
                  payload,
                  ...(publisherListedFeeds !== undefined ? { publisherListedFeeds } : {}),
                  updatedAt: new Date().toISOString(),
                });
                res.status(201).json({ request_id: requestId });
                return;
              }

              await mqAddByRSSAdd(activeMQArtemisService, {
                ...mqConstantMessageOptions,
                accountId: account.id,
                feedUrl,
                requestId,
                feedHash: feed_hash || undefined,
                etag: etag || undefined,
                lastModified: last_modified || undefined,
                credentialsEnvelope,
                closeAfterSend: false,
              });

              await setAddByRSSParseCacheEntry({
                requestId,
                accountId: account.id,
                feedUrl,
                status: 'queued',
                cache: {
                  feedHash: feed_hash || undefined,
                  etag: etag || undefined,
                  lastModified: last_modified || undefined,
                },
                updatedAt: new Date().toISOString(),
              });

              res.status(201).json({ request_id: requestId });
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        });
      },
      {
        skipMembershipStatus: false,
        // Mobile E2E seeds a trial user whose Add-by-RSS cap can resolve to 0; skip the
        // capability gate under deterministic fixtures so parse + poll succeed.
        requiredCapability: config.e2e.fixturesEnabled
          ? undefined
          : ACCOUNT_ENTITLEMENT_CAPABILITY.maxAddByRSSFeeds,
        apiKeyAccess: { resource: 'add_by_rss', action: 'create' },
      }
    );
  }

  static async enqueueParseAll(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        addByRssParseEnqueueRateLimit(req, res, () => {
          const bodySchema = Joi.object({
            feed_hashes_by_url: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
            etags_by_url: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
            last_modified_by_url: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
            credentials_by_url: Joi.object()
              .pattern(Joi.string(), joiAddByRssCredentialPair())
              .optional(),
          });

          validateBodyObject(bodySchema, req, res, async () => {
            const account = getAuthenticatedUser(req);
            const mqConstantMessageOptions = MQ_QUEUES['add-by-rss-on-demand'];
            const requestIds: Array<{ request_id: string; feed_url: string }> = [];
            const dedupedFeedUrls: string[] = [];
            const feedHashesByUrl = req.body.feed_hashes_by_url as FeedHashMap | undefined;
            const etagsByUrl = req.body.etags_by_url as FeedHashMap | undefined;
            const lastModifiedByUrl = req.body.last_modified_by_url as FeedHashMap | undefined;
            const credentialsByUrl = canonicalizeCredentialsByUrl(req.body.credentials_by_url);
            const dedupeTTLSeconds = getDedupeTTLSeconds(
              mqConstantMessageOptions.dedupeCacheTimeMS
            );

            try {
              const addByRSSChannelService = new AccountFollowingAddByRSSChannelService();
              const feeds = await addByRSSChannelService.getFollowedAddByRSSChannels(account.id);

              for (const feed of feeds) {
                const feedUrl = feed.feed_url;
                const credentials = credentialsByUrl.get(feedUrl) ?? null;

                if (
                  shouldSkipParseAllEnqueue({
                    requiresCredentials: feed.requires_credentials === true,
                    hasCredentials: credentials !== null,
                  })
                ) {
                  const requestId = randomUUID();
                  requestIds.push({ request_id: requestId, feed_url: feedUrl });
                  await setAddByRSSParseCacheEntry({
                    requestId,
                    accountId: account.id,
                    feedUrl,
                    status: 'failed',
                    error: 'Credentials are required to refresh this feed.',
                    failureReason: 'credentials_required',
                    credentialsState: 'not_provided',
                    updatedAt: new Date().toISOString(),
                  });
                  continue;
                }

                const requestId = randomUUID();
                const credentialsEnvelope =
                  credentials && !config.e2e.fixturesEnabled
                    ? sealAddByRssCredentialsForParse({
                        credentials,
                        accountId: account.id,
                        requestId,
                        feedUrl,
                      })
                    : undefined;

                if (dedupeTTLSeconds) {
                  const existing = await getAddByRSSParseDedupeEntry(account.id, feedUrl);
                  if (existing) {
                    dedupedFeedUrls.push(feedUrl);
                    continue;
                  }
                  await setAddByRSSParseDedupeEntry(account.id, feedUrl, dedupeTTLSeconds);
                }

                requestIds.push({ request_id: requestId, feed_url: feedUrl });
                const feedHash = getRecordValue(feedHashesByUrl, feedUrl);
                const etag = getRecordValue(etagsByUrl, feedUrl);
                const lastModified = getRecordValue(lastModifiedByUrl, feedUrl);

                if (config.e2e.fixturesEnabled) {
                  const payload = buildE2eParsedFeedPayload(feedUrl);
                  const publisherListedFeeds = await writeE2eAddByRSSPublisherListedFeeds({
                    accountId: account.id,
                    requestId,
                    feedUrl,
                    payload,
                    payloadForFeedUrl: buildE2eParsedFeedPayload,
                  });
                  await setAddByRSSParseCacheEntry({
                    requestId,
                    accountId: account.id,
                    feedUrl,
                    status: 'parsed',
                    cache: {
                      feedHash,
                      etag,
                      lastModified,
                    },
                    payload,
                    ...(publisherListedFeeds !== undefined ? { publisherListedFeeds } : {}),
                    updatedAt: new Date().toISOString(),
                  });
                  continue;
                }

                await mqAddByRSSAdd(activeMQArtemisService, {
                  ...mqConstantMessageOptions,
                  accountId: account.id,
                  feedUrl,
                  requestId,
                  feedHash,
                  etag,
                  lastModified,
                  credentialsEnvelope,
                  closeAfterSend: false,
                });

                await setAddByRSSParseCacheEntry({
                  requestId,
                  accountId: account.id,
                  feedUrl,
                  status: 'queued',
                  cache: {
                    feedHash,
                    etag,
                    lastModified,
                  },
                  updatedAt: new Date().toISOString(),
                });
              }

              res.status(201).json({
                request_ids: requestIds,
                deduped_feed_urls: dedupedFeedUrls,
                dedupe_ttl_seconds: dedupeTTLSeconds ?? null,
              });
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        });
      },
      {
        skipMembershipStatus: false,
        // Mobile E2E seeds a trial user whose Add-by-RSS cap can resolve to 0; skip the
        // capability gate under deterministic fixtures so parse + poll succeed.
        requiredCapability: config.e2e.fixturesEnabled
          ? undefined
          : ACCOUNT_ENTITLEMENT_CAPABILITY.maxAddByRSSFeeds,
        apiKeyAccess: { resource: 'add_by_rss', action: 'create' },
      }
    );
  }

  static async getParseStatus(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateParamsObject(
          Joi.object({ request_id: Joi.string().required() }),
          req,
          res,
          async () => {
            const account = getAuthenticatedUser(req);
            const requestId = getParamRequired(req, 'request_id');

            try {
              const cached = await getAddByRSSParseCacheEntry(requestId);
              if (!cached || cached.accountId !== account.id) {
                res.status(404).json({ message: 'Request not found.' });
                return;
              }

              res.json(cached);
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          }
        );
      },
      {
        skipMembershipStatus: false,
        // Mobile E2E seeds a trial user whose Add-by-RSS cap can resolve to 0; skip the
        // capability gate under deterministic fixtures so parse + poll succeed.
        requiredCapability: config.e2e.fixturesEnabled
          ? undefined
          : ACCOUNT_ENTITLEMENT_CAPABILITY.maxAddByRSSFeeds,
        apiKeyAccess: { resource: 'add_by_rss', action: 'read' },
      }
    );
  }
}

export { AccountAddByRSSParseController };
