'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAccount } from '../contexts/Account';
import { getApiRequestService } from '../factories/apiRequestService';

export function useLikesClipBatch(clipIdTexts: string[]) {
  const { loggedInAccount } = useAccount();
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  // Primitive key so the batch effect can depend on stable values (avoids re-running when
  // the parent passes a new `clipIdTexts` array ref each render for the same ids).
  const clipIdBatchKey = clipIdTexts.length > 0 ? [...clipIdTexts].sort().join('\u0001') : '';

  useEffect(() => {
    if (!loggedInAccount || clipIdBatchKey === '') {
      setLikedSet((prev) => (prev.size === 0 ? prev : new Set()));
      setIsBatchLoading(false);
      return;
    }

    const clipIdTextsForRequest = clipIdBatchKey.split('\u0001');
    let cancelled = false;
    setIsBatchLoading(true);
    (async () => {
      const res = await getApiRequestService().reqPlaylistLikesMembership({
        clip_id_texts: clipIdTextsForRequest,
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
  }, [clipIdBatchKey, loggedInAccount]);

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
