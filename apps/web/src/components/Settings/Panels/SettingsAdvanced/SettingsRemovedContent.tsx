'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { DTOAccountContentLog } from '@podverse/helpers';
import { LoadingSpinner } from '@podverse/ui';

import { getApiRequestService } from '../../../../factories/apiRequestService';
import { NoResults } from '../../../NoResults/NoResults';
import { SettingsSection } from '../../SettingsSection';

import styles from '../../../../styles/components/Settings/Panels/SettingsAdvanced/SettingsRemovedContent.module.scss';

type LoadState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; rows: DTOAccountContentLog[] };

export function SettingsRemovedContent() {
  const t = useTranslations('settings.advanced');
  const tMisc = useTranslations('misc');
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await getApiRequestService().reqAccountContentLog({
          type: 'removed_content',
        });
        if (!cancelled) {
          setState({ status: 'ready', rows });
        }
      } catch (error) {
        console.warn('Could not load removed content', error);
        if (!cancelled) {
          setState({ status: 'error' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SettingsSection>
      <div className={styles.stack}>
        <h3 className={styles.heading}>{t('removed_content')}</h3>
        <p className={styles.copy}>{t('explanation')}</p>
        {state.status === 'loading' ? (
          <LoadingSpinner ariaLabel={tMisc('loading')} size="medium" />
        ) : null}
        {state.status === 'error' ? (
          <p className={styles.copy} role="alert">
            {t('load_error')}
          </p>
        ) : null}
        {state.status === 'ready' && state.rows.length === 0 ? (
          <NoResults message={t('empty')} role="status" />
        ) : null}
        {state.status === 'ready' && state.rows.length > 0 ? (
          <ul className={styles.rows}>
            {state.rows.map((row) => (
              <li key={row.id}>
                <p className={styles.copy}>{removedContentSentences(row, t).join(' ')}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </SettingsSection>
  );
}

function removedContentSentences(
  row: DTOAccountContentLog,
  t: ReturnType<typeof useTranslations<'settings.advanced'>>
): string[] {
  const title =
    row.channel_title !== null && row.channel_title !== '' ? row.channel_title : t('unknown_show');
  const sentences = [t(row.reason, { title })];
  if (row.follow_outcome === 'moved_to_add_by_rss') {
    sentences.push(t('moved_to_add_by_rss'));
  } else if (row.follow_outcome === 'ended') {
    sentences.push(t('follow_ended'));
  }
  if (row.clip_count > 0) {
    sentences.push(t('clips', { count: row.clip_count }));
  }
  if (row.playlist_entry_count > 0) {
    sentences.push(t('playlist_entries', { count: row.playlist_entry_count }));
  }
  return sentences;
}
