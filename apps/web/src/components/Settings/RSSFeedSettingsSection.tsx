import React from 'react';

import type { ButtonVariant } from '@podverse/ui';
import { Button } from '@podverse/ui';

import { SettingsSection } from './SettingsSection';

import styles from '../../styles/components/Settings/RSSFeedSettingsSection.module.scss';

type RSSFeedSettingsSectionProps = {
  title: string;
  buttonLabel: string;
  buttonVariant?: ButtonVariant;
  onCheckUpdates: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  statusLines?: string[];
  errorMessage?: string | null;
};

export const RSSFeedSettingsSection: React.FC<RSSFeedSettingsSectionProps> = ({
  title,
  buttonLabel,
  buttonVariant = 'primary',
  onCheckUpdates,
  isLoading,
  disabled,
  statusLines,
  errorMessage,
}) => {
  return (
    <SettingsSection>
      <h3>{title}</h3>
      <div className={styles.actions}>
        {statusLines !== undefined && statusLines.length > 0 && (
          <div className={styles.statusLines}>
            {statusLines.map((line, index) => (
              <p key={`${index}-${line}`} className={styles.statusLine}>
                {line}
              </p>
            ))}
          </div>
        )}
        <Button
          type="button"
          onClick={onCheckUpdates}
          variant={buttonVariant}
          errorMessage={errorMessage ?? undefined}
          isLoading={isLoading}
          disabled={disabled}
        >
          {buttonLabel}
        </Button>
      </div>
    </SettingsSection>
  );
};
