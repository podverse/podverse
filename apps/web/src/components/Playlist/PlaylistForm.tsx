'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import type { FormDropdownOption } from '@podverse/ui';
import {
  Button,
  Divider,
  FormDropdown,
  FormTextArea,
  StackForm,
  TagField,
  TextInput,
} from '@podverse/ui';

import { useConfig } from '../../contexts/Config';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useMembershipGate } from '../../hooks/useMembershipGate';

import styles from '../../styles/components/Playlist/PlaylistForm.module.scss';

type PlaylistFeaturesTranslator = ReturnType<typeof useTranslations<'features'>>;

export type PlaylistFormProps = {
  medium: string;
  setMedium: (val: string) => void;
  mediumDropdownMenuItems: FormDropdownOption[];
  sharableStatus: string;
  setSharableStatus: (val: string) => void;
  sharableStatusDropdownMenuItems: FormDropdownOption[];
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  tags: readonly string[];
  setTags: (next: readonly string[]) => void;
  draft: string;
  setDraft: (next: string) => void;
  isUpdating: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  isValidSubmit: () => boolean;
  tFeatures: PlaylistFeaturesTranslator;
  tMisc: (key: string) => string;
  /** When set, the form is in edit mode: playlist type (medium) is read-only. */
  edit_playlist_id_text: string | null;
  className?: string;
};

export const PlaylistForm: React.FC<PlaylistFormProps> = ({
  medium,
  setMedium,
  mediumDropdownMenuItems,
  sharableStatus,
  setSharableStatus,
  sharableStatusDropdownMenuItems,
  title,
  setTitle,
  description,
  setDescription,
  tags,
  setTags,
  draft,
  setDraft,
  isUpdating,
  onCancel,
  onSubmit,
  isValidSubmit,
  tFeatures,
  tMisc,
  edit_playlist_id_text,
}) => {
  const router = useRouter();
  const apiRequestService = getApiRequestService();
  const { tryHandleMembershipGateError } = useMembershipGate();
  const tErrors = useTranslations('errors');
  const limits = useConfig().public.playlistLimits;
  const [tagSearchFailed, setTagSearchFailed] = useState(false);

  useEffect(() => {
    if (draft === '') {
      setTagSearchFailed(false);
    }
  }, [draft]);

  const searchPlaylistTags = async (query: string): Promise<readonly string[]> => {
    try {
      const response = await apiRequestService.reqPlaylistTagSearch(query);
      setTagSearchFailed(false);
      return response.data;
    } catch (error) {
      console.error('Playlist tag search failed', error);
      setTagSearchFailed(true);
      throw error;
    }
  };

  const handleDelete = async () => {
    if (edit_playlist_id_text && window.confirm(tFeatures('playlist.delete_playlist_confirm'))) {
      try {
        await apiRequestService.reqPlaylistDelete(edit_playlist_id_text);
        router.push('/playlists');
      } catch (error) {
        if (!tryHandleMembershipGateError(error)) {
          throw error;
        }
      }
    }
  };

  return (
    <StackForm className={styles.form} onSubmit={onSubmit}>
      {edit_playlist_id_text && (
        <TextInput
          type="text"
          name="id_text"
          value={edit_playlist_id_text}
          disabled
          eyebrow={tMisc('id')}
        />
      )}
      {edit_playlist_id_text ? (
        <TextInput
          type="text"
          name="medium_locked"
          value={mediumDropdownMenuItems.find((i) => i.value === `${medium}`)?.label ?? `${medium}`}
          disabled
          eyebrow={tFeatures('playlist.playlist_type')}
        />
      ) : (
        <FormDropdown
          key="medium"
          id="medium"
          eyebrow={tFeatures('playlist.playlist_type')}
          options={mediumDropdownMenuItems}
          value={`${medium}`}
          onChange={setMedium}
        />
      )}
      <FormDropdown
        key="sharable_status"
        id="sharable_status"
        eyebrow={tMisc('sharable_status.sharable_status')}
        options={sharableStatusDropdownMenuItems}
        value={`${sharableStatus}`}
        onChange={setSharableStatus}
      />
      <TextInput
        type="text"
        name="title"
        value={title}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
        autoFocus
        placeholder={tMisc('required')}
        eyebrow={tMisc('title')}
      />
      <FormTextArea
        eyebrow={tMisc('description')}
        name="description"
        value={description}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
        placeholder={tMisc('optional')}
        rows={3}
      />
      <TagField
        id="playlist_tags"
        eyebrow={tFeatures('playlist.tags')}
        placeholder={tFeatures('playlist.tag_placeholder')}
        value={tags}
        onChange={setTags}
        draft={draft}
        onDraftChange={setDraft}
        search={searchPlaylistTags}
        maxCount={limits.maxPerPlaylist}
        maxLength={limits.nameMaxLength}
        limitMessage={tFeatures('playlist.tag_limit', { count: limits.maxPerPlaylist })}
        infoError={tagSearchFailed ? tErrors('generic') : undefined}
        disabled={isUpdating}
        labels={{
          listLabel: tFeatures('playlist.tag_suggestions'),
          clearQueryLabel: tFeatures('playlist.clear_tag_text'),
          removeLabel: (tag) => tFeatures('playlist.remove_tag', { tag }),
        }}
      />
      <div className={styles.buttons}>
        <Button variant="secondary" type="button" onClick={onCancel}>
          {tMisc('cancel')}
        </Button>
        <Button
          variant="primary"
          type="button"
          disabled={!isValidSubmit()}
          onClick={onSubmit}
          isLoading={isUpdating}
        >
          {tMisc('submit')}
        </Button>
      </div>
      {edit_playlist_id_text && (
        <div className={styles.bottomSection}>
          <Divider />
          <div className={styles.bottomSectionButtons}>
            <Button variant="danger" type="button" onClick={handleDelete}>
              {tFeatures('playlist.delete_playlist')}
            </Button>
          </div>
        </div>
      )}
    </StackForm>
  );
};
