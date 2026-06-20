'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import type { MediaTypePreference } from '@podverse/helpers';
import { FormDropdown } from '@podverse/ui';

import { useAccount } from '../../../../contexts/Account';
import { useLocalSettings } from '../../../../contexts/LocalSettings';
import { getApiRequestService } from '../../../../factories/apiRequestService';

function isMediaTypePreference(value: string): value is MediaTypePreference {
  return value === 'audio' || value === 'video';
}

export const SettingsMediaTypeSelector: React.FC = () => {
  const tSettings = useTranslations('settings');
  const apiRequestService = getApiRequestService();
  const { preferredMediaType, setPreferredMediaType } = useLocalSettings();
  const { loggedInAccount, setLoggedInAccount } = useAccount();

  const options = [
    { label: tSettings('preferred_media_type.video'), value: 'video' },
    { label: tSettings('preferred_media_type.audio'), value: 'audio' },
  ];

  const handleChange = async (value: string) => {
    if (!isMediaTypePreference(value) || value === preferredMediaType) {
      return;
    }

    // Always persist device-level (cookie + state) for anonymous and logged-in users.
    setPreferredMediaType(value);

    // For logged-in users, also persist to the DB for cross-device memory.
    if (loggedInAccount) {
      try {
        const updatedAccount = await apiRequestService.reqAccountSettingsPlaybackUpdate({
          preferred_media_type: value,
        });
        setLoggedInAccount(updatedAccount);
      } catch {
        // Cookie still updated; ignore DB persistence failure.
      }
    }
  };

  return (
    <FormDropdown
      id="settings_preferred_media_type_selector"
      eyebrow={tSettings('preferred_media_type.label')}
      info={tSettings('preferred_media_type.description')}
      options={options}
      value={preferredMediaType}
      onChange={handleChange}
    />
  );
};
