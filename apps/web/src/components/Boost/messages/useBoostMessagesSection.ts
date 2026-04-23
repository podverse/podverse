import { useEffect, useMemo, useRef, useState } from 'react';

import type { PublicBoostMessage, PublicBoostMessagesPage } from '@podverse/v4v-metaboost';

import { getPublicBoostMessageLinkKey } from './getPublicBoostMessageLinkKey';
import type { BoostBreadcrumbLinkResolver, BoostMessagesPageFetcher } from './types';

type Status = 'idle' | 'loading' | 'success' | 'error';

type UseBoostMessagesSectionOptions = {
  pageFetcher: BoostMessagesPageFetcher;
  initialPage?: number;
  limit?: number;
  breadcrumbLinkResolver?: BoostBreadcrumbLinkResolver;
  refreshTrigger?: number;
};

type UseBoostMessagesSectionResult = {
  status: Status;
  page: number;
  setPage: (nextPage: number) => void;
  data: PublicBoostMessagesPage;
  messageLinkMap: Record<string, string | null>;
};

const DEFAULT_LIMIT = 20;

const EMPTY_PAGE: PublicBoostMessagesPage = {
  messages: [],
  page: 1,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 1,
};

const getResolverCacheKey = (message: PublicBoostMessage): string | null => {
  const context = message.breadcrumbContext;
  if (context?.isSubBucket !== true) {
    return null;
  }
  if (context.itemGuid !== null && context.itemGuid !== '') {
    return `item:${context.itemGuid}`;
  }
  if (context.podcastGuid !== null && context.podcastGuid !== '') {
    return `channel:${context.podcastGuid}`;
  }
  return null;
};

const shouldResolveLink = (message: PublicBoostMessage): boolean =>
  message.breadcrumbContext?.isSubBucket === true;

export const useBoostMessagesSection = ({
  pageFetcher,
  initialPage = 1,
  limit = DEFAULT_LIMIT,
  breadcrumbLinkResolver,
  refreshTrigger = 0,
}: UseBoostMessagesSectionOptions): UseBoostMessagesSectionResult => {
  const [status, setStatus] = useState<Status>('idle');
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<PublicBoostMessagesPage>({
    ...EMPTY_PAGE,
    page: initialPage,
    limit,
  });
  const [messageLinkMap, setMessageLinkMap] = useState<Record<string, string | null>>({});
  const resolverCacheRef = useRef<Map<string, string | null>>(new Map());

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    void (async () => {
      try {
        const next = await pageFetcher({ page, limit });
        if (cancelled) {
          return;
        }
        setData(next);
        setStatus('success');
      } catch {
        if (cancelled) {
          return;
        }
        setData((previous) => ({
          ...previous,
          messages: [],
          total: 0,
          totalPages: 1,
        }));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [limit, page, pageFetcher, refreshTrigger]);

  const resolvableMessages = useMemo(
    () =>
      data.messages.filter(
        (message) =>
          shouldResolveLink(message) &&
          breadcrumbLinkResolver !== undefined &&
          (() => {
            const cacheKey = getResolverCacheKey(message);
            return cacheKey !== null && !resolverCacheRef.current.has(cacheKey);
          })()
      ),
    [breadcrumbLinkResolver, data.messages]
  );

  useEffect(() => {
    setMessageLinkMap((previous) => {
      const next = { ...previous };
      let changed = false;
      for (const message of data.messages) {
        const messageKey = getPublicBoostMessageLinkKey(message);
        const cacheKey = getResolverCacheKey(message);
        if (cacheKey === null) {
          if (next[messageKey] !== null) {
            next[messageKey] = null;
            changed = true;
          }
          continue;
        }
        {
          const cached = resolverCacheRef.current.get(cacheKey);
          if (cached !== undefined && next[messageKey] !== cached) {
            next[messageKey] = cached;
            changed = true;
          }
        }
      }
      return changed ? next : previous;
    });
  }, [data.messages]);

  useEffect(() => {
    if (breadcrumbLinkResolver === undefined || resolvableMessages.length === 0) {
      return;
    }
    let cancelled = false;

    void (async () => {
      const nextEntries: Record<string, string | null> = {};
      const nextCacheEntries: Record<string, string | null> = {};

      await Promise.all(
        resolvableMessages.map(async (message) => {
          const key = getPublicBoostMessageLinkKey(message);
          const cacheKey = getResolverCacheKey(message);
          if (cacheKey === null) {
            nextEntries[key] = null;
            return;
          }
          try {
            const resolved = await breadcrumbLinkResolver(message);
            nextEntries[key] = resolved;
            nextCacheEntries[cacheKey] = resolved;
          } catch {
            nextEntries[key] = null;
            nextCacheEntries[cacheKey] = null;
          }
        })
      );

      if (cancelled) {
        return;
      }

      for (const [cacheKey, href] of Object.entries(nextCacheEntries)) {
        resolverCacheRef.current.set(cacheKey, href);
      }

      setMessageLinkMap((previous) => ({
        ...previous,
        ...nextEntries,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [breadcrumbLinkResolver, resolvableMessages]);

  return {
    status,
    page,
    setPage,
    data,
    messageLinkMap,
  };
};
