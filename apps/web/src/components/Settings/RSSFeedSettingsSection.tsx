import { useTranslations } from 'next-intl';
import React from 'react';

import type { ButtonVariant } from '@podverse/ui';
import { Button } from '@podverse/ui';

import { SettingsSection } from './SettingsSection';

type RSSFeedSettingsSectionProps = {
  title: string;
  buttonLabel: string;
  buttonVariant?: ButtonVariant;
  onCheckUpdates: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  statusLine?: string | null;
  errorMessage?: string | null;
};

export const RSSFeedSettingsSection: React.FC<RSSFeedSettingsSectionProps> = ({
  title,
  buttonLabel,
  buttonVariant = 'primary',
  onCheckUpdates,
  isLoading,
  disabled,
  statusLine,
  errorMessage,
}) => {
  const tMisc = useTranslations('misc');
  const description = statusLine ?? tMisc('unknown_date');

  return (
    <SettingsSection>
      <h3>{title}</h3>
      <Button
        type="button"
        onClick={onCheckUpdates}
        variant={buttonVariant}
        description={description}
        errorMessage={errorMessage ?? undefined}
        isLoading={isLoading}
        disabled={disabled}
      >
        {buttonLabel}
      </Button>
    </SettingsSection>
  );
};
