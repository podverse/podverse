'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import { getQueryParamFromQueueMediumId } from '@podverse/helpers';

import { PlaylistForm } from '../../../components/Playlist/PlaylistForm';
import { MEDIUM } from '../../../constants/medium';
import { SHARABLE_STATUS } from '../../../constants/sharableStatus';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { usePlaylistCreatePageContext } from './PlaylistCreatePageContext';

export const PlaylistCreatePageForm: React.FC = () => {
  const tMedia = useTranslations('media');
  const tFeatures = useTranslations('features');
  const tMisc = useTranslations('misc');
  const router = useRouter();
  const {
    medium,
    setMedium,
    title,
    setTitle,
    description,
    setDescription,
    sharableStatus,
    setSharableStatus,
    isUpdating,
    setIsUpdating,
  } = usePlaylistCreatePageContext();

  const mediumDropdownMenuItems = MEDIUM.menuItems(tMedia);
  const sharableStatusDropdownMenuItems = SHARABLE_STATUS.menuItems(tMisc);

  const onCancel = () => {
    router.push('/');
  };

  const onSubmit = async () => {
    setIsUpdating(true);

    const playlist = await getApiRequestService().reqPlaylistCreate({
      title,
      description,
      medium: getQueryParamFromQueueMediumId(Number(medium)),
      sharable_status_id: Number(sharableStatus),
    });

    setIsUpdating(false);

    router.push(`/playlist/${playlist.id_text}`);
  };

  const isValidSubmit = () => {
    return !isUpdating && title.trim().length > 0;
  };

  return (
    <PlaylistForm
      medium={medium}
      setMedium={setMedium}
      mediumDropdownMenuItems={mediumDropdownMenuItems}
      sharableStatus={sharableStatus}
      setSharableStatus={setSharableStatus}
      sharableStatusDropdownMenuItems={sharableStatusDropdownMenuItems}
      title={title}
      setTitle={setTitle}
      description={description}
      setDescription={setDescription}
      isUpdating={isUpdating}
      onCancel={onCancel}
      onSubmit={onSubmit}
      isValidSubmit={isValidSubmit}
      tFeatures={tFeatures}
      tMisc={tMisc}
      edit_playlist_id_text={null}
    />
  );
};
