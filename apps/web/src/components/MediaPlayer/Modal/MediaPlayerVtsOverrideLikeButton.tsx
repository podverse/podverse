'use client';

import { useTranslations } from 'next-intl';
import React from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa6';

import type { DTOItem } from '@podverse/helpers';
import { Button } from '@podverse/ui';

import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import { useLikesItemBatch } from '../../../hooks/useLikesItemBatch';

import styles from '../../../styles/components/MediaPlayer/Modal/MediaPlayerVtsOverrideLikeButton.module.scss';

type Props = {
  likeTarget: DTOItem;
};

export const MediaPlayerVtsOverrideLikeButton: React.FC<Props> = ({ likeTarget }) => {
  const { loggedInAccount } = useAccount();
  const { setModalLoginRequired } = useModals();
  const tFeatures = useTranslations('features');
  const tInstructions = useTranslations('instructions');
  const { isLiked, toggle } = useLikesItemBatch([likeTarget.id_text]);
  const liked = isLiked(likeTarget.id_text);

  return (
    <Button
      type="button"
      variant="unstyled"
      className={styles.heart}
      onClick={() => {
        if (!loggedInAccount) {
          setModalLoginRequired({ title: null, message: tInstructions('login_to_like') });
          return;
        }
        void toggle(likeTarget.id_text);
      }}
      title={liked ? tFeatures('playlist.remove_from_liked') : tFeatures('playlist.add_to_liked')}
    >
      {liked ? <FaHeart aria-hidden /> : <FaRegHeart aria-hidden />}
    </Button>
  );
};
