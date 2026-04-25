'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAccount } from '../contexts/Account';
import { getApiRequestService } from '../factories/apiRequestService';

export function useLikesItemBatch(itemIdTexts: string[]) {
  const { loggedInAccount } = useAccount();
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  // Primitive key so the batch effect can depend on stable values (avoids re-running when
  // the parent passes a new `itemIdTexts` array ref each render for the same ids).
  const itemIdBatchKey = itemIdTexts.length > 0 ? [...itemIdTexts].sort().join('\u0001') : '';

  useEffect(() => {
    if (!loggedInAccount || itemIdBatchKey === '') {
      setLikedSet((prev) => (prev.size === 0 ? prev : new Set()));
      setIsBatchLoading(false);
      return;
    }

    const itemIdTextsForRequest = itemIdBatchKey.split('\u0001');
    let cancelled = false;
    setIsBatchLoading(true);
    (async () => {
      const res = await getApiRequestService().reqPlaylistLikesMembership({
        item_id_texts: itemIdTextsForRequest,
      });
      if (cancelled) {
        return;
      }
      setLikedSet(new Set(res.item_id_texts));
      setIsBatchLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [itemIdBatchKey, loggedInAccount]);

  const isLiked = useCallback(
    (idText: string) => !isBatchLoading && likedSet.has(idText),
    [isBatchLoading, likedSet]
  );

  const toggle = useCallback(
    async (itemIdText: string) => {
      if (!loggedInAccount) {
        return;
      }
      const was = likedSet.has(itemIdText);
      setLikedSet((s) => {
        const n = new Set(s);
        if (was) {
          n.delete(itemIdText);
        } else {
          n.add(itemIdText);
        }
        return n;
      });
      try {
        const r = await getApiRequestService().reqPlaylistToggleLike({
          resource_type: 'item',
          item_id_text: itemIdText,
        });
        setLikedSet((s) => {
          const n = new Set(s);
          if (r.liked) {
            n.add(itemIdText);
          } else {
            n.delete(itemIdText);
          }
          return n;
        });
      } catch {
        setLikedSet((s) => {
          const n = new Set(s);
          if (was) {
            n.add(itemIdText);
          } else {
            n.delete(itemIdText);
          }
          return n;
        });
      }
    },
    [loggedInAccount, likedSet]
  );

  return { isLiked, toggle, isBatchLoading, likedSet };
}
