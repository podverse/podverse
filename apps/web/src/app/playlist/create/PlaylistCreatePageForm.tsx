'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useRef, useState } from 'react';

import { getQueryParamFromQueueMediumId } from '@podverse/helpers';
import { commitTagDraft } from '@podverse/ui';

import { PlaylistForm } from '../../../components/Playlist/PlaylistForm';
import { MEDIUM } from '../../../constants/medium';
import { SHARABLE_STATUS } from '../../../constants/sharableStatus';
import { useConfig } from '../../../contexts/Config';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { useMembershipGate } from '../../../hooks/useMembershipGate';
import { usePlaylistCreatePageContext } from './PlaylistCreatePageContext';

export const PlaylistCreatePageForm: React.FC = () => {
  const tMedia = useTranslations('media');
  const tFeatures = useTranslations('features');
  const tMisc = useTranslations('misc');
  const router = useRouter();
  const { tryHandleMembershipGateError } = useMembershipGate();
  const limits = useConfig().public.playlistLimits;
  const {
    medium,
    setMedium,
    title,
    setTitle,
    description,
    setDescription,
    tags,
    setTags,
    sharableStatus,
    setSharableStatus,
    isUpdating,
    setIsUpdating,
  } = usePlaylistCreatePageContext();
  const [draft, setDraft] = useState('');
  const tagsRef = useRef(tags);
  const draftRef = useRef('');

  const setTagsFromField = (next: readonly string[]) => {
    tagsRef.current = [...next];
    setTags([...next]);
  };

  const setDraftFromField = (next: string) => {
    draftRef.current = next;
    setDraft(next);
  };

  const mediumDropdownMenuItems = MEDIUM.menuItems(tMedia);
  const sharableStatusDropdownMenuItems = SHARABLE_STATUS.menuItems(tMisc);

  const onCancel = () => {
    router.push('/');
  };

  const onSubmit = async () => {
    const result = commitTagDraft({
      tags: tagsRef.current,
      draft: draftRef.current,
      maxCount: limits.maxPerPlaylist,
      maxLength: limits.nameMaxLength,
    });
    const committed = [...result.tags];
    tagsRef.current = committed;
    setTags(committed);
    if (result.status === 'added' || result.status === 'duplicate' || result.status === 'empty') {
      draftRef.current = '';
      setDraft('');
    }

    setIsUpdating(true);

    try {
      const playlist = await getApiRequestService().reqPlaylistCreate({
        title,
        description,
        medium: getQueryParamFromQueueMediumId(Number(medium)),
        sharable_status_id: Number(sharableStatus),
        tags: [...committed],
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
      tags={tags}
      setTags={setTagsFromField}
      draft={draft}
      setDraft={setDraftFromField}
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
