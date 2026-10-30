import { config } from '@api/config/index.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { indexProvider } from '@api/factories/indexProvider.js';
import { isE2eRemoteItemNotFoundRef } from '@api/lib/addByRSSE2eRemoteItemFixture.js';
import { ensureAuthenticated } from '@api/lib/auth/index.js';
import { rateLimitAuthEndpoint } from '@api/lib/rateLimiter.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import {
  ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS,
  DATABASE_CONSTANTS,
  splitFeedUrlUserinfo,
} from '@podverse/helpers';
import type { AddByRSSDirectoryChannelMatchRow } from '@podverse/orm';
import {
  ChannelAddByRSSDirectoryMatchService,
  ItemService,
  RemoteChannelStubService,
  RemoteItemStubService,
  toDTORemoteChannelStub,
  toDTORemoteItemStub,
} from '@podverse/orm';
import { REMOTE_STUB_REFRESH_AFTER_MS, resolveRemoteStubsForRefs } from '@podverse/parser';

const feedUrlSchema = Joi.string()
  .trim()
  .uri({ scheme: ['http', 'https'] })
  .max(2048)
  .custom((value: string, helpers: Joi.CustomHelpers) => {
    const split = splitFeedUrlUserinfo(value);
    if (split.username !== null || split.password !== null) {
      return helpers.error('any.invalid');
    }
    return value;
  })
  .messages({
    'any.invalid': '"feed_url" must not include username or password',
  })
  .allow(null, '');

const refSchema = Joi.object({
  feed_guid: Joi.string().trim().max(64).allow(null, ''),
  feed_url: feedUrlSchema,
  item_guid: Joi.forbidden(),
})
  .or('feed_guid', 'feed_url')
  .unknown(false);

const lookupRefSchema = Joi.object({
  feed_guid: Joi.string().trim().max(64).allow(null, ''),
  feed_url: feedUrlSchema,
  item_guid: Joi.string().trim().max(DATABASE_CONSTANTS.varchar_uri).allow(null, ''),
})
  .or('feed_guid', 'feed_url')
  .unknown(false);

const lookupBodySchema = Joi.object({
  refs: Joi.array()
    .items(lookupRefSchema)
    .min(1)
    .max(ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS)
    .required(),
}).unknown(false);

const STRICT_JOI_OPTIONS = {
  abortEarly: true,
  stripUnknown: false,
};

type NormalizedLookupRef = {
  feedGuid: string | null;
  feedUrl: string | null;
  itemGuid: string | null;
  isItemRef: boolean;
};

type NormalizedResolveRef = {
  feedGuid: string | null;
  feedUrl: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function trimmedStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizedFeedGuid(value: unknown): string | null {
  const trimmed = trimmedStringOrNull(value);
  return trimmed === null ? null : trimmed.toLowerCase();
}

function normalizedFeedUrl(value: unknown): string | null {
  return trimmedStringOrNull(value);
}

function normalizeLookupRef(value: unknown): NormalizedLookupRef | null {
  if (!isRecord(value)) {
    return null;
  }
  const feedGuid = normalizedFeedGuid(value.feed_guid);
  const feedUrl = normalizedFeedUrl(value.feed_url);
  const itemGuid = trimmedStringOrNull(value.item_guid);
  return {
    feedGuid,
    feedUrl,
    itemGuid,
    isItemRef: itemGuid !== null,
  };
}

function normalizeResolveRef(value: unknown): NormalizedResolveRef | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    feedGuid: normalizedFeedGuid(value.feed_guid),
    feedUrl: normalizedFeedUrl(value.feed_url),
  };
}

function toDirectoryMatchDto(row: AddByRSSDirectoryChannelMatchRow) {
  return {
    id_text: row.channelIdText,
    title: row.title,
    medium_id: row.mediumId,
  };
}

function toIndexProviderFeedTarget(stub: ReturnType<typeof toDTORemoteChannelStub>) {
  return {
    index_provider: stub.index_provider,
    provider_feed_id: stub.provider_feed_id,
    feed_url: stub.feed_url,
    title: stub.title,
    author: stub.author,
    image_url: stub.image_url,
  };
}

export const addByRssRemoteItemResolveRateLimit = rateLimitAuthEndpoint({
  windowMs: config.rateLimits.accountAddByRssRemoteItemResolve.windowMs,
  max: config.rateLimits.accountAddByRssRemoteItemResolve.max,
  apiKeyAccess: { resource: 'add_by_rss', action: 'read' },
});

export class AccountAddByRSSRemoteItemController {
  private static readonly directoryMatchService = new ChannelAddByRSSDirectoryMatchService();
  private static readonly itemService = new ItemService();
  private static readonly remoteChannelStubService = new RemoteChannelStubService();
  private static readonly remoteItemStubService = new RemoteItemStubService();

  static async lookup(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const validated = lookupBodySchema.validate(req.body, STRICT_JOI_OPTIONS);
        if (validated.error) {
          res.status(400).json({
            message: validated.error.details[0]?.message ?? 'Validation error',
          });
          return;
        }

        if (!isRecord(validated.value) || !Array.isArray(validated.value.refs)) {
          res.status(400).json({ message: '"refs" must be an array' });
          return;
        }

        const refs = validated.value.refs.map(normalizeLookupRef);
        if (refs.some((ref) => ref === null)) {
          res.status(400).json({ message: '"refs" must contain valid reference objects' });
          return;
        }

        const normalizedRefs = refs.filter((ref): ref is NormalizedLookupRef => ref !== null);
        if (normalizedRefs.some((ref) => ref.feedGuid === null && ref.feedUrl === null)) {
          res.status(400).json({ message: 'Each ref must include feed_guid or feed_url' });
          return;
        }

        try {
          const directoryMatchByIndex = new Map<number, AddByRSSDirectoryChannelMatchRow>();
          const guidRefs = normalizedRefs
            .map((ref, index) => ({ ref, index }))
            .filter(({ ref }) => ref.feedGuid !== null);

          if (guidRefs.length > 0) {
            const directoryMatches =
              await AccountAddByRSSRemoteItemController.directoryMatchService.getForListedFeeds(
                guidRefs.map(({ ref }) => ({
                  feedGuid: ref.feedGuid ?? '',
                  feedUrl: ref.feedUrl,
                }))
              );
            for (const { ref, index } of guidRefs) {
              const key = ref.feedGuid ?? '';
              const match = directoryMatches.get(key);
              if (match !== undefined) {
                directoryMatchByIndex.set(index, match);
              }
            }
          }

          const itemRefsWithDirectoryChannel = normalizedRefs
            .map((ref, index) => ({ ref, index }))
            .filter(
              ({ ref, index }) => ref.isItemRef && directoryMatchByIndex.get(index) !== undefined
            );

          const itemQueryPairs: { podcast_guid: string; item_guid: string }[] = [];
          const itemQuerySeen = new Set<string>();
          for (const { ref } of itemRefsWithDirectoryChannel) {
            const podcastGuid = ref.feedGuid;
            const itemGuid = ref.itemGuid;
            if (podcastGuid === null || itemGuid === null) {
              continue;
            }
            const key = `${podcastGuid}||${itemGuid}`;
            if (!itemQuerySeen.has(key)) {
              itemQuerySeen.add(key);
              itemQueryPairs.push({
                podcast_guid: podcastGuid,
                item_guid: itemGuid,
              });
            }
          }

          const directoryItemRows =
            itemQueryPairs.length > 0
              ? await AccountAddByRSSRemoteItemController.itemService.getManyByPodcastGuidAndItemGuid(
                  itemQueryPairs,
                  { relations: { channel: true } }
                )
              : [];
          const directoryItemByKey = new Map<string, (typeof directoryItemRows)[number]>();
          for (const row of directoryItemRows) {
            if (row.guid !== null && row.channel?.id_text) {
              directoryItemByKey.set(`${row.channel.id_text}||${row.guid}`, row);
            }
          }

          const itemStubCandidates = normalizedRefs
            .map((ref, index) => ({ ref, index }))
            .filter(({ ref, index }) => ref.isItemRef && !directoryMatchByIndex.has(index));
          const itemStubRefs = itemStubCandidates
            .map(({ ref }) => ({
              feedGuid: ref.feedGuid,
              feedUrl: ref.feedUrl,
              itemGuid: ref.itemGuid,
            }))
            .filter(
              (ref): ref is { feedGuid: string | null; feedUrl: string | null; itemGuid: string } =>
                ref.itemGuid !== null
            );

          const itemStubs =
            itemStubRefs.length > 0
              ? await AccountAddByRSSRemoteItemController.remoteItemStubService.getItemStubsForRefs(
                  itemStubRefs
                )
              : [];
          const itemStubDtoByIndex = new Map<number, ReturnType<typeof toDTORemoteItemStub>>();
          itemStubCandidates.forEach(({ index }, candidateIndex) => {
            const itemStub = itemStubs[candidateIndex] ?? null;
            if (itemStub?.remote_channel_stub) {
              itemStubDtoByIndex.set(
                index,
                toDTORemoteItemStub(itemStub, itemStub.remote_channel_stub)
              );
            }
          });

          const channelStubIndexes: number[] = [];
          const channelStubRefs: Array<{ feedGuid: string | null; feedUrl: string | null }> = [];
          normalizedRefs.forEach((ref, index) => {
            if (!ref.isItemRef) {
              if (!directoryMatchByIndex.has(index)) {
                channelStubIndexes.push(index);
                channelStubRefs.push({ feedGuid: ref.feedGuid, feedUrl: ref.feedUrl });
              }
              return;
            }

            if (!directoryMatchByIndex.has(index) && !itemStubDtoByIndex.has(index)) {
              channelStubIndexes.push(index);
              channelStubRefs.push({ feedGuid: ref.feedGuid, feedUrl: ref.feedUrl });
            }
          });

          const channelStubs =
            channelStubRefs.length > 0
              ? await AccountAddByRSSRemoteItemController.remoteChannelStubService.getChannelStubsForRefs(
                  channelStubRefs
                )
              : [];
          const channelStubDtoByIndex = new Map<
            number,
            ReturnType<typeof toDTORemoteChannelStub>
          >();
          channelStubIndexes.forEach((index, channelStubIndex) => {
            const channelStub = channelStubs[channelStubIndex] ?? null;
            if (channelStub) {
              channelStubDtoByIndex.set(index, toDTORemoteChannelStub(channelStub));
            }
          });

          const results = normalizedRefs.map((ref, index) => {
            const directoryMatch = directoryMatchByIndex.get(index);
            const channelStub = channelStubDtoByIndex.get(index);
            if (!ref.isItemRef) {
              if (directoryMatch) {
                return { kind: 'channel', channel: toDirectoryMatchDto(directoryMatch) };
              }
              if (channelStub) {
                return {
                  kind: 'provider_feed',
                  provider_feed: toIndexProviderFeedTarget(channelStub),
                };
              }
              return { kind: 'none' };
            }

            const itemGuid = ref.itemGuid;
            if (itemGuid !== null && directoryMatch) {
              const directoryItem = directoryItemByKey.get(
                `${directoryMatch.channelIdText}||${itemGuid}`
              );
              if (directoryItem) {
                return {
                  kind: 'item',
                  item: {
                    id_text: directoryItem.id_text,
                    title: directoryItem.title,
                    channel: toDirectoryMatchDto(directoryMatch),
                  },
                };
              }
            }

            if (directoryMatch) {
              return { kind: 'channel', channel: toDirectoryMatchDto(directoryMatch) };
            }

            const itemStub = itemStubDtoByIndex.get(index);
            if (itemStub) {
              return { kind: 'item_stub', item_stub: itemStub };
            }

            if (channelStub) {
              return {
                kind: 'provider_feed',
                provider_feed: toIndexProviderFeedTarget(channelStub),
              };
            }

            return { kind: 'none' };
          });

          res.status(200).json({ results });
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      },
      {
        skipMembershipStatus: true,
        apiKeyAccess: { resource: 'add_by_rss', action: 'read' },
      }
    );
  }

  static async resolve(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const validated = refSchema.validate(req.body, STRICT_JOI_OPTIONS);
        if (validated.error) {
          res.status(400).json({
            message: validated.error.details[0]?.message ?? 'Validation error',
          });
          return;
        }

        const ref = normalizeResolveRef(validated.value);
        if (ref === null || (ref.feedGuid === null && ref.feedUrl === null)) {
          res.status(400).json({ message: 'Body must include feed_guid or feed_url' });
          return;
        }

        try {
          if (
            config.e2e.fixturesEnabled &&
            isE2eRemoteItemNotFoundRef({
              feed_guid: ref.feedGuid,
              feed_url: ref.feedUrl,
            })
          ) {
            res.status(200).json({ kind: 'not_found' });
            return;
          }

          const directoryMatches =
            await AccountAddByRSSRemoteItemController.directoryMatchService.getForListedFeeds([
              { feedGuid: ref.feedGuid ?? '', feedUrl: ref.feedUrl },
            ]);
          const directoryMatch = directoryMatches.get(ref.feedGuid ?? '');
          if (directoryMatch !== undefined) {
            res.status(200).json({
              kind: 'channel',
              channel: toDirectoryMatchDto(directoryMatch),
            });
            return;
          }

          const resolved = await resolveRemoteStubsForRefs(
            indexProvider,
            [{ feedGuid: ref.feedGuid, feedUrl: ref.feedUrl, itemGuid: null }],
            {
              rateLimitDelayMs: 0,
              maxSingleLookups: 1,
              refreshAfterMs: REMOTE_STUB_REFRESH_AFTER_MS,
            }
          );

          const outcome = resolved.outcomes[0];
          if (outcome?.status === 'stub') {
            res.status(200).json({
              kind: 'provider_feed',
              provider_feed: toIndexProviderFeedTarget(toDTORemoteChannelStub(outcome.channelStub)),
            });
            return;
          }

          if (outcome?.status === 'parsed') {
            res.status(200).json({ kind: 'directory_unavailable' });
            return;
          }

          if (outcome?.status === 'unavailable') {
            res.status(503).json({ message: 'Index provider unavailable' });
            return;
          }

          res.status(200).json({ kind: 'not_found' });
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      },
      {
        skipMembershipStatus: true,
        apiKeyAccess: { resource: 'add_by_rss', action: 'read' },
      }
    );
  }
}
