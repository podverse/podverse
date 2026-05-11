'use client';

import { useTranslations } from 'next-intl';

import { SettingsSection } from '../../SettingsSection';

import styles from '../../../../styles/components/Settings/Panels/SettingsKeyboard/SettingsKeyboard.module.scss';

export function SettingsKeyboard() {
  const t = useTranslations('settings.keyboard');

  const rows = [
    {
      id: 'play_pause',
      keys: t('keys_space'),
      label: t('shortcut_play_pause_label'),
      description: t('shortcut_play_pause_detail'),
    },
    {
      id: 'seek',
      keys: t('keys_arrows_seek'),
      label: t('shortcut_seek_label'),
      description: t('shortcut_seek_detail'),
    },
    {
      id: 'volume',
      keys: t('keys_arrows_volume'),
      label: t('shortcut_volume_label'),
      description: t('shortcut_volume_detail'),
    },
  ];

  return (
    <SettingsSection>
      <p className={styles.intro}>{t('intro')}</p>
      <ul className={styles.shortcuts}>
        {rows.map((row) => (
          <li key={row.id} className={styles.item}>
            <span className={styles.keys}>{row.keys}</span>
            <span className={styles.label}>{row.label}</span>
            <span className={styles.description}>{row.description}</span>
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}
