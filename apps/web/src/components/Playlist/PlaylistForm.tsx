'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import type { FormDropdownOption } from '@podverse/ui';
import { Button, Divider, FormDropdown, FormTextArea, StackForm, TextInput } from '@podverse/ui';

import { getApiRequestService } from '../../factories/apiRequestService';
import { useMembershipGate } from '../../hooks/useMembershipGate';

import styles from '../../styles/components/Playlist/PlaylistForm.module.scss';

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
  isUpdating: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  isValidSubmit: () => boolean;
  tFeatures: (key: string) => string;
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
