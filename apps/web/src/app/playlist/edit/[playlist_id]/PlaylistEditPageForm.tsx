'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { DTOPlaylist } from '@podverse/helpers';

import { PlaylistForm } from '../../../../components/Playlist/PlaylistForm';
import { MEDIUM } from '../../../../constants/medium';
import { SHARABLE_STATUS } from '../../../../constants/sharableStatus';
import { getApiRequestService } from '../../../../factories/apiRequestService';
import { useMembershipGate } from '../../../../hooks/useMembershipGate';
import { usePlaylistEditPageContext } from './PlaylistEditPageContext';

type PlaylistEditPageFormProps = {
  ssrPlaylist: DTOPlaylist;
};

export const PlaylistEditPageForm: React.FC<PlaylistEditPageFormProps> = ({ ssrPlaylist }) => {
  const tMedia = useTranslations('media');
  const tFeatures = useTranslations('features');
  const tMisc = useTranslations('misc');
  const router = useRouter();
  const { tryHandleMembershipGateError } = useMembershipGate();
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
    tabSelectedKey,
  } = usePlaylistEditPageContext();

  if (tabSelectedKey !== 'info') {
    return null;
  }

  const mediumDropdownMenuItems = MEDIUM.menuItems(tMedia);
  const sharableStatusDropdownMenuItems = SHARABLE_STATUS.menuItems(tMisc);

  const onCancel = () => {
    router.push('/');
  };

  const onSubmit = async () => {
    setIsUpdating(true);

    try {
      const playlist = await getApiRequestService().reqPlaylistEdit({
        id_text: ssrPlaylist.id_text,
        title,
        description,
        sharable_status_id: Number(sharableStatus),
      });
      router.push(`/playlist/${playlist.id_text}`);
    } catch (error) {
      if (!tryHandleMembershipGateError(error)) {
        throw error;
      }
    } finally {
      setIsUpdating(false);
    }
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
      edit_playlist_id_text={ssrPlaylist.id_text}
    />
  );
};
