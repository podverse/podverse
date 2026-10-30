'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import type { DTOChannel, DTORemoteChannelStub } from '@podverse/helpers';

import { ListAlbumRemoteItemNodes } from '../../../components/List/Music/Albums/ListAlbumRemoteItemNodes';
import { ArtistPageYourAddByRssAlbums } from './ArtistPageAddByRssSections';

import styles from '../../../styles/components/Artist/ArtistPageAlbumSections.module.scss';

type ArtistPageAlbumSectionsProps = {
  channel: DTOChannel;
  channelsAdded: DTOChannel[];
  channelsUnadded: DTORemoteChannelStub[];
};

export function ArtistPageAlbumSections({
  channel,
  channelsAdded,
  channelsUnadded,
}: ArtistPageAlbumSectionsProps) {
  const tMedia = useTranslations('media');
  const verifiedHeadingId = useId();
  const unaddedHeadingId = useId();
  const noteId = useId();

  return (
    <div className={styles.sections}>
      {channelsAdded.length > 0 ? (
        <section aria-labelledby={verifiedHeadingId} data-testid="artist-verified-albums">
          <h2 id={verifiedHeadingId} className={styles.heading}>
            {tMedia('music.verified_albums')}
          </h2>
          <ListAlbumRemoteItemNodes
            channelsAdded={channelsAdded}
            channelsUnadded={[]}
            viewSelected="rows"
          />
        </section>
      ) : null}
      <ArtistPageYourAddByRssAlbums channel={channel} />
      {channelsUnadded.length > 0 ? (
        <section
          aria-labelledby={unaddedHeadingId}
          aria-describedby={noteId}
          data-testid="artist-not-yet-added-albums"
        >
          <h2 id={unaddedHeadingId} className={styles.heading}>
            {tMedia('music.not_yet_added')}
          </h2>
          <p id={noteId} className={styles.note} data-testid="artist-not-yet-added-albums-note">
            {tMedia('music.not_yet_added_albums_note')}
          </p>
          <ListAlbumRemoteItemNodes
            channelsAdded={[]}
            channelsUnadded={channelsUnadded}
            viewSelected="rows"
          />
        </section>
      ) : null}
    </div>
  );
}
