'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAccount } from '../contexts/Account';
import { getApiRequestService } from '../factories/apiRequestService';

export function useLikesClipBatch(clipIdTexts: string[]) {
  const { loggedInAccount } = useAccount();
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const sortedKey = useMemo(
    () => (clipIdTexts.length > 0 ? [...clipIdTexts].sort().join('\u0001') : ''),
    [clipIdTexts]
  );

  useEffect(() => {
    if (!loggedInAccount || clipIdTexts.length === 0) {
      setLikedSet(new Set());
      return;
    }

    let cancelled = false;
    setIsBatchLoading(true);
    (async () => {
      const res = await getApiRequestService().reqPlaylistLikesMembership({
        clip_id_texts: clipIdTexts,
      });
      if (cancelled) {
        return;
      }
      setLikedSet(new Set(res.clip_id_texts));
      setIsBatchLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clipIdTexts, loggedInAccount, sortedKey]);

  const isLiked = useCallback(
    (idText: string) => !isBatchLoading && likedSet.has(idText),
    [isBatchLoading, likedSet]
  );

  const toggle = useCallback(
    async (clipIdText: string) => {
      if (!loggedInAccount) {
        return;
      }
      const was = likedSet.has(clipIdText);
      setLikedSet((s) => {
        const n = new Set(s);
        if (was) {
          n.delete(clipIdText);
        } else {
          n.add(clipIdText);
        }
        return n;
      });
      try {
        const r = await getApiRequestService().reqPlaylistToggleLike({
          resource_type: 'clip',
          clip_id_text: clipIdText,
        });
        setLikedSet((s) => {
          const n = new Set(s);
          if (r.liked) {
            n.add(clipIdText);
          } else {
            n.delete(clipIdText);
          }
          return n;
        });
      } catch {
        setLikedSet((s) => {
          const n = new Set(s);
          if (was) {
            n.add(clipIdText);
          } else {
            n.delete(clipIdText);
          }
          return n;
        });
      }
    },
    [loggedInAccount, likedSet]
  );

  return { isLiked, toggle, isBatchLoading, likedSet };
}
