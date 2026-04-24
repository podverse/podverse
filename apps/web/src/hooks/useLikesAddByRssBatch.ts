'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { buildAddByRSSResourceData } from '@podverse/parser-mapping';

import { useAccount } from '../contexts/Account';
import { getApiRequestService } from '../factories/apiRequestService';
import type { AddByRSSItemIndexItem } from '../utils/addByRSS/types';

type RowEntry = { hashId: string; indexItem: AddByRSSItemIndexItem };

export function useLikesAddByRssBatch(rows: RowEntry[]) {
  const { loggedInAccount } = useAccount();
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const hashList = useMemo(
    () =>
      rows
        .map((r) => r.hashId)
        .filter((h): h is string => h.length > 0)
        .sort(),
    [rows]
  );
  const sortedKey = useMemo(() => hashList.join('\u0001'), [hashList]);
  const rowByHash = useMemo(() => {
    const m = new Map<string, AddByRSSItemIndexItem>();
    for (const r of rows) {
      m.set(r.hashId, r.indexItem);
    }
    return m;
  }, [rows]);

  useEffect(() => {
    if (!loggedInAccount || hashList.length === 0) {
      setLikedSet(new Set());
      return;
    }

    let cancelled = false;
    setIsBatchLoading(true);
    (async () => {
      const res = await getApiRequestService().reqPlaylistLikesMembership({
        add_by_rss_hash_ids: hashList,
      });
      if (cancelled) {
        return;
      }
      setLikedSet(new Set(res.add_by_rss_hash_ids));
      setIsBatchLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [hashList, loggedInAccount, sortedKey]);

  const isLiked = useCallback(
    (hashId: string) => !isBatchLoading && likedSet.has(hashId),
    [isBatchLoading, likedSet]
  );

  const toggle = useCallback(
    async (hashId: string) => {
      if (!loggedInAccount) {
        return;
      }
      const indexItem = rowByHash.get(hashId);
      if (!indexItem) {
        return;
      }
      const was = likedSet.has(hashId);
      setLikedSet((s) => {
        const n = new Set(s);
        if (was) {
          n.delete(hashId);
        } else {
          n.add(hashId);
        }
        return n;
      });
      try {
        const addByRssResourceData = buildAddByRSSResourceData(indexItem);
        const r = await getApiRequestService().reqPlaylistToggleLike({
          resource_type: 'add_by_rss',
          add_by_rss_hash_id: hashId,
          add_by_rss_resource_data: { ...addByRssResourceData },
        });
        setLikedSet((s) => {
          const n = new Set(s);
          if (r.liked) {
            n.add(hashId);
          } else {
            n.delete(hashId);
          }
          return n;
        });
      } catch {
        setLikedSet((s) => {
          const n = new Set(s);
          if (was) {
            n.add(hashId);
          } else {
            n.delete(hashId);
          }
          return n;
        });
      }
    },
    [loggedInAccount, likedSet, rowByHash]
  );

  return { isLiked, toggle, isBatchLoading, likedSet };
}
