'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAccount } from '../contexts/Account';
import { getApiRequestService } from '../factories/apiRequestService';

export function useLikesItemBatch(itemIdTexts: string[]) {
  const { loggedInAccount } = useAccount();
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const sortedKey = useMemo(
    () => (itemIdTexts.length > 0 ? [...itemIdTexts].sort().join('\u0001') : ''),
    [itemIdTexts]
  );

  useEffect(() => {
    if (!loggedInAccount || itemIdTexts.length === 0) {
      setLikedSet(new Set());
      return;
    }

    let cancelled = false;
    setIsBatchLoading(true);
    (async () => {
      const res = await getApiRequestService().reqPlaylistLikesMembership({
        item_id_texts: itemIdTexts,
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
  }, [itemIdTexts, loggedInAccount, sortedKey]);

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
