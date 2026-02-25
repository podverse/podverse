import React from 'react';
import type { ButtonVariant } from '../Button/Button';
import { Button } from '../Button/Button';
import { SettingsSection } from './SettingsSection';
import { useTranslations } from 'next-intl';

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
