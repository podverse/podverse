'use client';

import type { FormEvent } from 'react';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { CallToActionMessage } from '../../../components/CallToActionMessage/CallToActionMessage';
import { Checkbox } from '../../../components/Form/Checkbox';
import Form from '../../../components/Form/Form';
import { TextInput } from '../../../components/Form/TextInput';
import { MainHeader } from '../../../components/Main/MainHeader';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { SideContent } from '../../../components/SideContent/SideContent';
import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import {
  applyAddByRSSParseStatus,
  followAddByRSSChannelAndQueue,
  pollAddByRSSParseStatus,
  unfollowAddByRSSChannelAndClear,
} from '../../../utils/addByRSS/actions';
import { enqueueAddByRSSParse } from '../../../utils/addByRSS/api';
import { handleRateLimitAlert } from '../../../utils/rateLimit/rateLimitAlert';
import { getAddByRSSFeedByUrl, upsertAddByRSSFeed } from '../../../utils/addByRSS/storage';
import type { AddByRSSFeedRecord } from '../../../utils/addByRSS/types';
import {
  getAddByRSSDetailRouteSegment,
  getAddByRSSResourceTypeFromMappedFeed,
} from '@podverse/parser-mapping';
import styles from '../../../styles/components/AddByRSS/AddByRSSAddFeed.module.scss';

type AddByRSSStatus = AddByRSSFeedRecord['status'] | 'idle' | 'error';
type ParsedStatus = Extract<AddByRSSFeedRecord['status'], 'parsed' | 'not_modified'>;

const isParsedStatus = (status?: AddByRSSFeedRecord['status']): status is ParsedStatus =>
  status === 'parsed' || status === 'not_modified';

export const AddByRSSAddFeedPageClient: React.FC = () => {
  const tFeatures = useTranslations('features');
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const tMisc = useTranslations('misc');
  const router = useRouter();
  const { loggedInAccount, setLoggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();

  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [isAddingFeed, setIsAddingFeed] = useState(false);
  const [status, setStatus] = useState<AddByRSSStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [useBasicAuth, setUseBasicAuth] = useState(false);
  const [basicAuthUsername, setBasicAuthUsername] = useState('');
  const [basicAuthPassword, setBasicAuthPassword] = useState('');
  const [basicAuthError, setBasicAuthError] = useState<string | null>(null);

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'queued':
        return tFeatures('add_by_rss.status_queued');
      case 'processing':
        return tFeatures('add_by_rss.status_processing');
      case 'parsed':
        return tFeatures('add_by_rss.status_parsed');
      case 'not_modified':
        return tFeatures('add_by_rss.status_not_modified');
      case 'failed':
        return tFeatures('add_by_rss.status_failed');
      case 'error':
        return tFeatures('add_by_rss.status_failed');
      default:
        return null;
    }
  }, [status, tFeatures]);

  const runParseAndRedirect = async (
    requestId: string,
    feedUrl: string,
    seedRecord: AddByRSSFeedRecord
  ) => {
    let latestRecord: AddByRSSFeedRecord = seedRecord;
    setStatus(seedRecord.status ?? 'queued');
    setStatusMessage(tFeatures('add_by_rss.status_queued'));

    const finalStatus = await pollAddByRSSParseStatus({
      requestId,
      onStatusUpdate: async (statusResponse) => {
        setStatus(statusResponse.status);
        setStatusMessage(
          statusResponse.status ? tFeatures(`add_by_rss.status_${statusResponse.status}`) : null
        );
        const updated = await applyAddByRSSParseStatus({
          feedUrl,
          parsedFeed: statusResponse.payload,
          status: statusResponse.status,
          cache: statusResponse.cache,
          fallbackRecord: latestRecord,
          onUpdated: (nextRecord) => {
            latestRecord = nextRecord;
          },
        });
        if (updated) {
          latestRecord = updated;
        }
      },
    });

    if (finalStatus === 'parsed' || finalStatus === 'not_modified') {
      const resourceType = getAddByRSSResourceTypeFromMappedFeed(latestRecord.mappedFeed);
      if (latestRecord.resourceType !== resourceType) {
        latestRecord = { ...latestRecord, resourceType };
        await upsertAddByRSSFeed(latestRecord);
      }
      const routeSegment = getAddByRSSDetailRouteSegment(resourceType);
      router.push(`/add-by-rss/${routeSegment}/${latestRecord.idText}`);
    } else if (finalStatus === 'failed' && !isParsedStatus(seedRecord.status)) {
      await unfollowAddByRSSChannelAndClear({
        feedUrl,
        channelIdText: seedRecord.idText,
      });
    }
  };

  const handleAddFeed = async (event?: FormEvent) => {
    event?.preventDefault();
    if (isAddingFeed) {
      return;
    }
    if (!loggedInAccount) {
      setModalAuthLogin({ isOpen: true });
      return;
    }

    const feedUrl = newFeedUrl.trim();
    if (!feedUrl) {
      return;
    }

    setIsAddingFeed(true);
    setStatus('idle');
    setStatusMessage(null);
    setInputError(null);
    setStatusError(null);
    setBasicAuthError(null);

    try {
      try {
        new URL(feedUrl);
      } catch {
        setStatus('error');
        setInputError(tFeatures('add_by_rss.invalid_url'));
        setIsAddingFeed(false);
        return;
      }

      if (useBasicAuth) {
        const username = basicAuthUsername.trim();
        const password = basicAuthPassword;
        if (!username || !password) {
          setBasicAuthError(tFeatures('add_by_rss.basic_auth_required_both'));
          setIsAddingFeed(false);
          return;
        }
      }

      const { requestId, record, account } = await followAddByRSSChannelAndQueue({
        feedUrl,
        resourceType: 'podcasts',
        title: feedUrl,
        imageUrl: null,
        ...(useBasicAuth && basicAuthUsername.trim() && basicAuthPassword
          ? {
              basic_auth_username: basicAuthUsername.trim(),
              basic_auth_password: basicAuthPassword,
            }
          : {}),
      });

      if (account) {
        setLoggedInAccount(account);
      }

      setBasicAuthPassword('');
      if (useBasicAuth) {
        setBasicAuthUsername('');
        setUseBasicAuth(false);
      }

      await runParseAndRedirect(requestId, feedUrl, record);
    } catch (error) {
      setStatus('error');
      const message = (error as Error)?.message ?? '';
      const errorName = (error as { name?: string })?.name ?? '';
      const isConstraintError =
        errorName === 'ConstraintError' || message.toLowerCase().includes('constraint');
      if (isConstraintError) {
        const existing = await getAddByRSSFeedByUrl(feedUrl);
        if (existing) {
          if (isParsedStatus(existing.status)) {
            const resourceType =
              existing.resourceType ?? getAddByRSSResourceTypeFromMappedFeed(existing.mappedFeed);
            if (existing.resourceType !== resourceType) {
              await upsertAddByRSSFeed({ ...existing, resourceType });
            }
            const routeSegment = getAddByRSSDetailRouteSegment(resourceType);
            router.push(`/add-by-rss/${routeSegment}/${existing.idText}`);
            return;
          }
          const response = await enqueueAddByRSSParse({ feedUrl });
          await runParseAndRedirect(response.request_id, feedUrl, existing);
          return;
        }
      }

      const handled = await handleRateLimitAlert(error, undefined, tMisc, {
        suppressAlert: true,
        onMessage: (message) => {
          setStatusError(message);
        },
      });
      if (!handled) {
        setStatusError((error as Error).message);
      }
    } finally {
      setIsAddingFeed(false);
    }
  };

  return (
    <>
      <MainHeader title={tFeatures('add_by_rss.label')} />
      <MainWrapper>
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <div className={styles.content}>
              <p className={styles.instructions}>{tFeatures('add_by_rss.add_feed_instructions')}</p>

              {!loggedInAccount && (
                <CallToActionMessage
                  message={tInstructions('login_for_subscriptions')}
                  buttonLabel={tAuthentication('login')}
                  onButtonClick={() => setModalAuthLogin({ isOpen: true })}
                />
              )}

              {loggedInAccount && (
                <Form onSubmit={(e) => handleAddFeed(e)} className={styles.form}>
                  <TextInput
                    value={newFeedUrl}
                    onChange={(event) => setNewFeedUrl(event.target.value)}
                    placeholder={tFeatures('add_by_rss.feed_url')}
                    aria-label={tFeatures('add_by_rss.feed_url')}
                    infoError={inputError ?? undefined}
                    aria-invalid={inputError ? true : undefined}
                    button={{
                      label: tFeatures('add_feed.add_feed'),
                      disabled: isAddingFeed,
                      isLoading: isAddingFeed,
                      onClick: () => {
                        void handleAddFeed();
                      },
                    }}
                    disabled={isAddingFeed}
                  />
                  <div className={styles.basicAuthSection}>
                    <Checkbox
                      id="add-by-rss-use-basic-auth"
                      name="useBasicAuth"
                      checked={useBasicAuth}
                      onChange={setUseBasicAuth}
                      label={tFeatures('add_by_rss.basic_auth_requires')}
                    />
                    {useBasicAuth && (
                      <div className={styles.basicAuthFields}>
                        <TextInput
                          value={basicAuthUsername}
                          onChange={(event) => setBasicAuthUsername(event.target.value)}
                          placeholder={tFeatures('add_by_rss.basic_auth_username')}
                          aria-label={tFeatures('add_by_rss.basic_auth_username')}
                          type="text"
                          disabled={isAddingFeed}
                        />
                        <TextInput
                          value={basicAuthPassword}
                          onChange={(event) => setBasicAuthPassword(event.target.value)}
                          placeholder={tFeatures('add_by_rss.basic_auth_password')}
                          aria-label={tFeatures('add_by_rss.basic_auth_password')}
                          type="password"
                          infoError={basicAuthError ?? undefined}
                          disabled={isAddingFeed}
                        />
                      </div>
                    )}
                  </div>
                </Form>
              )}

              {statusLabel && (
                <div className={styles.statusCard}>
                  <p className={styles.statusLabel}>{tFeatures('add_by_rss.status')}</p>
                  <p className={styles.statusValue}>{statusLabel}</p>
                  {statusMessage && statusMessage !== statusLabel && (
                    <p className={styles.statusValue}>{statusMessage}</p>
                  )}
                  {statusError && <p className={styles.errorText}>{statusError}</p>}
                </div>
              )}
            </div>
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
};
