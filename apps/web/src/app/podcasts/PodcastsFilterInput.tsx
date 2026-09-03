'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { TextInput } from '@podverse/ui';

import { PODCASTS_FILTER_MAX_LENGTH } from './podcastsFilter';

const FILTER_INPUT_ID = 'podcasts-subscribed-filter';

interface PodcastsFilterInputProps {
  onChange: (term: string) => void;
  value: string;
}

/**
 * The subscribed list's title filter.
 *
 * Carries a visible label rather than leaning on the placeholder, which disappears at the first
 * keystroke and takes the field's only description with it.
 */
export const PodcastsFilterInput: React.FC<PodcastsFilterInputProps> = ({ onChange, value }) => {
  const tSubscriptions = useTranslations('subscriptions');

  return (
    <TextInput
      button={
        value === ''
          ? undefined
          : {
              label: tSubscriptions('filter.clear'),
              onClick: () => onChange(''),
            }
      }
      id={FILTER_INPUT_ID}
      eyebrow={tSubscriptions('filter.label')}
      maxLength={PODCASTS_FILTER_MAX_LENGTH}
      name={FILTER_INPUT_ID}
      placeholder={tSubscriptions('filter.placeholder')}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};
