'use client';

import { useTranslations } from 'next-intl';
import type { FormEvent } from 'react';
import React, { useCallback, useEffect, useState } from 'react';

import type { AddByRSSParseFailureReason } from '@podverse/helpers';
import {
  ADD_BY_RSS_CREDENTIAL_MAX_LENGTH,
  canSubmitAddByRssCredentials,
} from '@podverse/helpers-validation/client';
import { Button, StackForm, TextInput } from '@podverse/ui';

import { useMembershipGate } from '../../hooks/useMembershipGate';
import {
  applyAddByRSSParseStatus,
  pollAddByRSSParseStatus,
  saveAddByRSSCredentialsAndQueue,
} from '../../utils/addByRSS/actions';
import { getCredentials } from '../../utils/addByRSS/credentialStore';
import type { AddByRSSFeedRecord } from '../../utils/addByRSS/types';
import { handleRateLimitAlert } from '../../utils/rateLimit/rateLimitAlert';
import { SettingsSection } from './SettingsSection';

import styles from '../../styles/components/Settings/AddByRSSCredentialsSettingsSection.module.scss';

type AddByRSSCredentialsSettingsSectionProps = {
  accountIdText: string;
  feed: AddByRSSFeedRecord;
  onFeedUpdated?: (feed: AddByRSSFeedRecord) => void;
};

const failureMessageKey = (reason: AddByRSSParseFailureReason | null | undefined): string => {
  switch (reason) {
    case 'credentials_rejected':
    case 'credentials_required':
      return 'add_by_rss.credentials_rejected';
    case 'credentials_withheld_other_domain':
    case 'credentials_withheld_insecure':
      return 'add_by_rss.credentials_withheld';
    default:
      return 'add_by_rss.credentials_check_failed';
  }
};

/**
 * Username and password fields for an Add by RSS feed's Settings tab. Both fields need at least
 * one character to save. Credentials stay on this device.
 */
export const AddByRSSCredentialsSettingsSection: React.FC<
  AddByRSSCredentialsSettingsSectionProps
> = ({ accountIdText, feed, onFeedUpdated }) => {
  const tFeatures = useTranslations('features');
  const tMisc = useTranslations('misc');
  const { tryHandleMembershipGateError } = useMembershipGate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const stored = await getCredentials(accountIdText, feed.feedUrl);
      if (!cancelled && stored) {
        setUsername(stored.username);
      }
      if (!cancelled && feed.lastFailureReason === 'credentials_rejected') {
        setErrorMessage(tFeatures('add_by_rss.credentials_rejected'));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [accountIdText, feed.feedUrl, feed.lastFailureReason, tFeatures]);

  const handleSaveAndCheck = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault();
      if (isChecking || !canSubmitAddByRssCredentials(username, password)) {
        return;
      }

      const trimmedUsername = username.trim();
      if (!trimmedUsername || !password) {
        setFieldsError(tFeatures('add_by_rss.basic_auth_required_both'));
        return;
      }

      setIsChecking(true);
      setFieldsError(null);
      setErrorMessage(null);
      setNotice(null);
      setStatusMessage(tFeatures('add_by_rss.status_queued'));

      try {
        const { requestId, savedOnDevice } = await saveAddByRSSCredentialsAndQueue({
          accountId: accountIdText,
          credentials: { password, username: trimmedUsername },
          feed,
        });
        if (!savedOnDevice) {
          setNotice(tFeatures('add_by_rss.credentials_not_saved_on_device'));
        }

        let latestRecord: AddByRSSFeedRecord = feed;
        const finalStatus = await pollAddByRSSParseStatus({
          onStatusUpdate: async (statusResponse) => {
            setStatusMessage(tFeatures(`add_by_rss.status_${statusResponse.status}`));
            const updated = await applyAddByRSSParseStatus({
              cache: statusResponse.cache,
              fallbackRecord: latestRecord,
              feedUrl: feed.feedUrl,
              outcome: statusResponse,
              parsedFeed: statusResponse.payload,
              status: statusResponse.status,
            });
            if (updated) {
              latestRecord = updated;
            }
          },
          requestId,
        });

        onFeedUpdated?.(latestRecord);

        if (finalStatus === 'parsed' || finalStatus === 'not_modified') {
          setPassword('');
          setStatusMessage(tFeatures(`add_by_rss.status_${finalStatus}`));
          setErrorMessage(null);
          return;
        }

        setStatusMessage(null);
        setErrorMessage(tFeatures(failureMessageKey(latestRecord.lastFailureReason)));
      } catch (error) {
        setStatusMessage(null);
        if (tryHandleMembershipGateError(error)) {
          return;
        }
        const handled = await handleRateLimitAlert(error, undefined, tMisc, {
          onMessage: (message) => {
            setErrorMessage(message);
          },
          suppressAlert: true,
        });
        if (!handled) {
          setErrorMessage(tFeatures('add_by_rss.credentials_check_failed'));
          console.error(error);
        }
      } finally {
        setIsChecking(false);
      }
    },
    [
      accountIdText,
      feed,
      isChecking,
      onFeedUpdated,
      password,
      tFeatures,
      tMisc,
      tryHandleMembershipGateError,
      username,
    ]
  );

  return (
    <SettingsSection>
      <h3>{tFeatures('add_by_rss.credentials_page_title')}</h3>
      <p className={styles.intro}>{tFeatures('add_by_rss.credentials_page_intro')}</p>
      <p className={styles.deviceNote}>{tFeatures('add_by_rss.credentials_page_device_note')}</p>
      <StackForm className={styles.form} onSubmit={(event) => void handleSaveAndCheck(event)}>
        <TextInput
          aria-invalid={fieldsError !== null && !username.trim() ? true : undefined}
          aria-label={tFeatures('add_by_rss.basic_auth_username')}
          autoComplete="username"
          disabled={isChecking}
          eyebrow={tFeatures('add_by_rss.basic_auth_username')}
          maxLength={ADD_BY_RSS_CREDENTIAL_MAX_LENGTH}
          onChange={(event) => setUsername(event.target.value)}
          placeholder={tMisc('required')}
          type="text"
          value={username}
        />
        <TextInput
          aria-invalid={fieldsError !== null && !password ? true : undefined}
          aria-label={tFeatures('add_by_rss.basic_auth_password')}
          autoComplete="current-password"
          disabled={isChecking}
          eyebrow={tFeatures('add_by_rss.basic_auth_password')}
          infoError={fieldsError ?? undefined}
          maxLength={ADD_BY_RSS_CREDENTIAL_MAX_LENGTH}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={tMisc('required')}
          type="password"
          value={password}
        />
        {statusMessage !== null ? <p className={styles.statusLine}>{statusMessage}</p> : null}
        {notice !== null ? <p className={styles.statusLine}>{notice}</p> : null}
        <Button
          disabled={isChecking || !canSubmitAddByRssCredentials(username, password)}
          errorMessage={errorMessage ?? undefined}
          isLoading={isChecking}
          type="submit"
          variant="primary"
        >
          {tFeatures('add_by_rss.credentials_save_and_check')}
        </Button>
      </StackForm>
    </SettingsSection>
  );
};
