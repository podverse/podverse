'use client';

import { useTranslations } from 'next-intl';
import React, { useMemo, useRef } from 'react';

import type { CategoryMappingKeys, DTOChannel, DTOClip, DTOItem } from '@podverse/helpers';
import type { QueryParamsItemsType } from '@podverse/helpers-requests';
import { CallToActionMessage } from '@podverse/ui';

import { useModals } from '../../../contexts/Modals';
import { checkBackNavFlag } from '../../../contexts/Navigation';
import { useLikesClipBatch } from '../../../hooks/useLikesClipBatch';
import { useSkipInitialEffect } from '../../../hooks/useSkipInitialEffect';
import { buildListLikeRow } from '../../../utils/likes/buildListLikeRow';
import { scrollMainToTop } from '../../../utils/scroll';
import { Pagination } from '../../Pagination/Pagination';
import { ListClipRow } from './ListClipRow';

type Props = {
  page: number;
  setPage: (page: number) => void;
  channel?: DTOChannel;
  item?: DTOItem;
  clips: DTOClip[];
  totalPages: number;
  showSubscribeMessage?: boolean;
  type?: QueryParamsItemsType;
  category?: CategoryMappingKeys | null;
  showItemInfo?: boolean;
};

export const ListClips: React.FC<Props> = ({
  page,
  setPage,
  channel,
  item,
  clips,
  totalPages,
  showSubscribeMessage,
  showItemInfo,
}) => {
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const { setModalAuthLogin } = useModals();

  const clipIdTexts = useMemo(() => clips.map((c) => c.id_text), [clips]);
  const { isLiked, toggle } = useLikesClipBatch(clipIdTexts);

  // Skip scroll on the first effect run when returning via back navigation.
  const skipScrollOnceRef = useRef(checkBackNavFlag());

  useSkipInitialEffect(() => {
    // Skip scroll-to-top once if this is a back navigation
    if (skipScrollOnceRef.current) {
      skipScrollOnceRef.current = false;
      return;
    }
    scrollMainToTop();
  }, [clips]);

  const showCallToAction = showSubscribeMessage;
  const showPagination = !showSubscribeMessage;

  return (
    <>
      {showCallToAction && (
        <CallToActionMessage
          message={tInstructions('login_for_subscriptions')}
          buttonLabel={tAuthentication('login')}
          onButtonClick={() => setModalAuthLogin({ isOpen: true })}
        />
      )}
      {showPagination && (
        <Pagination currentPage={page} totalPages={totalPages} setPage={setPage}>
          {clips.map((clip) => (
            <ListClipRow
              key={clip.id}
              channel={channel}
              item={item}
              clip={clip}
              showItemInfo={showItemInfo}
              playlist_id_text={null}
              likeRow={buildListLikeRow(clip.id_text, { isLiked, toggle })}
            />
          ))}
        </Pagination>
      )}
    </>
  );
};
