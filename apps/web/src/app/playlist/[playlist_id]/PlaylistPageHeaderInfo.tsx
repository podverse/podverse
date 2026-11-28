'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { DTOPlaylist } from '@podverse/helpers';
import { formatDateAbbrev } from '@podverse/helpers';
import { TagField } from '@podverse/ui';

import { MEDIUM } from '../../../constants/medium';

import styles from '../../../styles/app/playlist/PlaylistHeaderInfo.module.scss';

type PlaylistPageHeaderInfoProps = {
  playlist: DTOPlaylist;
};

export const PlaylistPageHeaderInfo = ({ playlist }: PlaylistPageHeaderInfoProps) => {
  const tMedia = useTranslations('media');
  const tFeatures = useTranslations('features');
  const tMisc = useTranslations('misc');
  const locale = useLocale();

  const lastUpdated = tMedia('updated_with_date', {
    date: formatDateAbbrev(playlist.last_updated, locale),
  });
  const itemCount = tFeatures('playlist.item_count', { count: playlist.item_count });
  const displayName = playlist.account?.account_profile?.display_name || tMisc('anonymous');
  const info = `${itemCount} • ${lastUpdated}`;
  const medium = MEDIUM.getMediumTranslation(playlist.medium_id, tMedia);
  const description = `${medium} ${playlist.description ? `• ${playlist.description}` : ''}`;

  return (
    <>
      <div className={styles.creator}>{displayName}</div>
      <div className={styles.info}>{info}</div>
      <div className={styles.description}>{description}</div>
      {Array.isArray(playlist.tags) && playlist.tags.length > 0 ? (
        <div className={styles.tags} data-testid="playlist-page-tags">
          <TagField id="playlist-page-tags" readOnly value={playlist.tags} />
        </div>
      ) : null}
    </>
  );
};
