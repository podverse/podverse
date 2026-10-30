'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { DTOAddByRSSRemoteItemLookupResult } from '@podverse/helpers';
import {
  ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS,
  buildIndexProviderFeedPath,
  MediumEnum,
} from '@podverse/helpers';
import type { AddByRSSBundleRemoteRef, AddByRSSRemoteItemList } from '@podverse/parser-mapping';
import {
  getAddByRSSDetailRouteSegment,
  getAddByRSSRemoteItemRefs,
  toAddByRSSRemoteItemLookupRef,
  toAddByRSSRemoteItemResolveRef,
} from '@podverse/parser-mapping';

import { useAccount } from '../contexts/Account';
import { useModals } from '../contexts/Modals';
import { getApiRequestService } from '../factories/apiRequestService';
import { getAddByRSSFeedGuid } from '../utils/addByRSS/publisherLinks';
import {
  findAddByRSSFeedForRemoteRef,
  remoteFeedPathForRef,
  remoteRefRowKey,
} from '../utils/addByRSS/remoteItemRefs';
import { getAllAddByRSSFeeds } from '../utils/addByRSS/storage';
import type { AddByRSSFeedRecord } from '../utils/addByRSS/types';
import { handleRateLimitAlert } from '../utils/rateLimit/rateLimitAlert';
import {
  getChannelPathByMedium,
  getItemPathByMedium,
} from '../utils/redirect/redirectToChannelPageByMedium';

type AddByRSSRemoteItemRowBase = {
  key: string;
  title: string;
  /** Second line: the channel title on item rows, when known and not already the title. */
  subtitle: string | null;
  imageUrl: string | null;
  /** Picks the item row layout. */
  isItemRef: boolean;
};

export type AddByRSSRemoteItemRow =
  | (AddByRSSRemoteItemRowBase & { kind: 'add_by_rss'; href: string })
  | (AddByRSSRemoteItemRowBase & { kind: 'channel'; href: string })
  | (AddByRSSRemoteItemRowBase & { kind: 'item'; href: string })
  | (AddByRSSRemoteItemRowBase & { kind: 'provider_feed'; href: string })
  | (AddByRSSRemoteItemRowBase & { kind: 'item_stub'; href: string })
  | (AddByRSSRemoteItemRowBase & { kind: 'reference'; ref: AddByRSSBundleRemoteRef });

const trimmedOrNull = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const withFallback = (
  preferred: string | null,
  fallback: string | null,
  untitled: string
): string => trimmedOrNull(preferred) ?? trimmedOrNull(fallback) ?? untitled;

const itemSubtitle = (subtitle: string | null, title: string): string | null => {
  const trimmed = trimmedOrNull(subtitle);
  if (trimmed === null || trimmed === title) {
    return null;
  }
  return trimmed;
};

const directoryChannelHref = (mediumId: number | null, idText: string): string =>
  getChannelPathByMedium(mediumId === null ? MediumEnum.Podcast : mediumId, idText);

const sharedRow = (
  ref: AddByRSSBundleRemoteRef,
  title: string,
  subtitleSource: string | null,
  imageUrl: string | null
): AddByRSSRemoteItemRowBase => ({
  key: remoteRefRowKey(ref),
  title,
  subtitle: ref.itemGuid === null ? null : itemSubtitle(subtitleSource, title),
  imageUrl: trimmedOrNull(imageUrl),
  isItemRef: ref.itemGuid !== null,
});

const deviceOrReferenceRow = (
  ref: AddByRSSBundleRemoteRef,
  feeds: readonly AddByRSSFeedRecord[],
  untitled: string
): AddByRSSRemoteItemRow => {
  const record = findAddByRSSFeedForRemoteRef(ref, feeds);
  const refTitle = trimmedOrNull(ref.title);
  if (record !== undefined) {
    const recordTitle = trimmedOrNull(record.title);
    const title =
      ref.itemGuid === null
        ? withFallback(recordTitle, refTitle, untitled)
        : withFallback(refTitle, recordTitle, untitled);
    return {
      ...sharedRow(ref, title, recordTitle, record.imageUrl),
      kind: 'add_by_rss',
      href: `/add-by-rss/${getAddByRSSDetailRouteSegment(record.resourceType)}/${record.idText}`,
    };
  }

  return {
    ...sharedRow(ref, withFallback(refTitle, trimmedOrNull(ref.feedUrl), untitled), null, null),
    kind: 'reference',
    ref,
  };
};

const rowFromLookup = (
  ref: AddByRSSBundleRemoteRef,
  result: DTOAddByRSSRemoteItemLookupResult,
  untitled: string
): AddByRSSRemoteItemRow | null => {
  const refTitle = trimmedOrNull(ref.title);
  switch (result.kind) {
    case 'none':
      return null;
    case 'channel': {
      const channelTitle = trimmedOrNull(result.channel.title);
      const title =
        ref.itemGuid === null
          ? withFallback(channelTitle, refTitle, untitled)
          : withFallback(refTitle, channelTitle, untitled);
      return {
        ...sharedRow(ref, title, channelTitle, null),
        kind: 'channel',
        href: directoryChannelHref(result.channel.medium_id, result.channel.id_text),
      };
    }
    case 'item': {
      const channelTitle = trimmedOrNull(result.item.channel.title);
      return {
        ...sharedRow(
          ref,
          withFallback(trimmedOrNull(result.item.title), refTitle, untitled),
          channelTitle,
          null
        ),
        kind: 'item',
        href: getItemPathByMedium(result.item.channel.medium_id, result.item.id_text),
      };
    }
    case 'provider_feed': {
      const targetTitle = trimmedOrNull(result.provider_feed.title);
      const title =
        ref.itemGuid === null
          ? withFallback(targetTitle, refTitle, untitled)
          : withFallback(refTitle, targetTitle, untitled);
      return {
        ...sharedRow(ref, title, targetTitle, result.provider_feed.image_url),
        kind: 'provider_feed',
        href: buildIndexProviderFeedPath(
          result.provider_feed.index_provider,
          result.provider_feed.provider_feed_id
        ),
      };
    }
    case 'item_stub': {
      const channelTitle = trimmedOrNull(result.item_stub.channel_stub.title);
      const imageUrl =
        trimmedOrNull(result.item_stub.image_url) ??
        trimmedOrNull(result.item_stub.channel_stub.image_url);
      return {
        ...sharedRow(
          ref,
          withFallback(trimmedOrNull(result.item_stub.title), refTitle, untitled),
          channelTitle,
          imageUrl
        ),
        kind: 'item_stub',
        href: buildIndexProviderFeedPath(
          result.item_stub.channel_stub.index_provider,
          result.item_stub.channel_stub.provider_feed_id
        ),
      };
    }
    default: {
      const unhandled: never = result;
      return unhandled;
    }
  }
};

export function useAddByRSSRemoteItemList(
  feed: AddByRSSFeedRecord | null,
  list: AddByRSSRemoteItemList
): {
  rows: AddByRSSRemoteItemRow[];
  hasRows: boolean;
  openReference: (row: Extract<AddByRSSRemoteItemRow, { kind: 'reference' }>) => Promise<void>;
  openingKey: string | null;
  errorMessage: string | null;
} {
  const tFeatures = useTranslations('features');
  const tMisc = useTranslations('misc');
  const untitled = tMisc('untitled');
  const locale = useLocale();
  const router = useRouter();
  const { loggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();
  const isSignedIn = loggedInAccount !== null;
  const requestGenerationRef = useRef(0);
  const openingLockRef = useRef(false);
  const [rows, setRows] = useState<AddByRSSRemoteItemRow[]>([]);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refs = useMemo(() => {
    if (feed === null) {
      return [];
    }
    return getAddByRSSRemoteItemRefs(
      feed.mappedFeed,
      { feedGuid: getAddByRSSFeedGuid(feed), feedUrl: feed.feedUrl },
      list
    );
  }, [feed, list]);

  useEffect(() => {
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    const isCurrent = () => requestGenerationRef.current === generation;

    if (refs.length === 0) {
      setRows([]);
      return () => {
        if (requestGenerationRef.current === generation) {
          requestGenerationRef.current += 1;
        }
      };
    }

    const load = async () => {
      const storedFeeds = await getAllAddByRSSFeeds();
      if (!isCurrent()) {
        return;
      }

      const initialRows = refs.map((ref) => deviceOrReferenceRow(ref, storedFeeds, untitled));
      setRows(initialRows);
      if (!isSignedIn) {
        return;
      }

      const pending = initialRows.flatMap((row, index) => {
        const ref = refs[index];
        if (row.kind !== 'reference' || ref === undefined) {
          return [];
        }
        return [{ index, ref }];
      });
      if (pending.length === 0) {
        return;
      }

      try {
        const results: DTOAddByRSSRemoteItemLookupResult[] = [];
        for (
          let offset = 0;
          offset < pending.length;
          offset += ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS
        ) {
          const chunk = pending
            .slice(offset, offset + ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS)
            .map((entry) => toAddByRSSRemoteItemLookupRef(entry.ref));
          const response = await getApiRequestService().reqAccountAddByRSSRemoteItemLookup(chunk);
          results.push(...response.results);
        }
        if (!isCurrent()) {
          return;
        }

        const next = initialRows.slice();
        pending.forEach((entry, resultIndex) => {
          const result = results[resultIndex];
          if (result === undefined) {
            return;
          }
          const replacement = rowFromLookup(entry.ref, result, untitled);
          if (replacement !== null) {
            next[entry.index] = replacement;
          }
        });
        setRows(next);
      } catch (error: unknown) {
        if (!isCurrent()) {
          return;
        }
        console.error('Add by RSS remote item lookup failed', error);
      }
    };

    void load();
    return () => {
      if (requestGenerationRef.current === generation) {
        requestGenerationRef.current += 1;
      }
    };
  }, [isSignedIn, refs, untitled]);

  const openReference = useCallback(
    async (row: Extract<AddByRSSRemoteItemRow, { kind: 'reference' }>) => {
      if (loggedInAccount === null) {
        setModalAuthLogin({ isOpen: true });
        return;
      }
      if (openingLockRef.current) {
        return;
      }
      openingLockRef.current = true;
      setOpeningKey(row.key);
      setErrorMessage(null);
      try {
        const result = await getApiRequestService().reqAccountAddByRSSRemoteItemResolve(
          toAddByRSSRemoteItemResolveRef(row.ref)
        );
        switch (result.kind) {
          case 'channel':
            router.push(directoryChannelHref(result.channel.medium_id, result.channel.id_text));
            return;
          case 'provider_feed':
            router.push(
              buildIndexProviderFeedPath(
                result.provider_feed.index_provider,
                result.provider_feed.provider_feed_id
              )
            );
            return;
          case 'not_found': {
            const path = remoteFeedPathForRef(row.ref);
            if (path === null) {
              setErrorMessage(tFeatures('add_by_rss.remote_item_not_found'));
              return;
            }
            router.push(path);
            return;
          }
          case 'directory_unavailable':
            setErrorMessage(tFeatures('add_by_rss.remote_item_directory_unavailable'));
            return;
          default: {
            const unhandled: never = result;
            return unhandled;
          }
        }
      } catch (error: unknown) {
        const handled = await handleRateLimitAlert(error, locale, tMisc, {
          suppressAlert: true,
          onMessage: (message) => {
            setErrorMessage(message);
          },
        });
        if (!handled) {
          setErrorMessage(tFeatures('add_by_rss.remote_item_lookup_failed'));
        }
      } finally {
        openingLockRef.current = false;
        setOpeningKey(null);
      }
    },
    [locale, loggedInAccount, router, setModalAuthLogin, tFeatures, tMisc]
  );

  return {
    rows,
    hasRows: refs.length > 0,
    openReference,
    openingKey,
    errorMessage,
  };
}
