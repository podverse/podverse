'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { FormEvent } from 'react';
import React, { useMemo, useState } from 'react';

import {
  ADD_BY_RSS_CREDENTIAL_MAX_LENGTH,
  resolveAddByRSSFeedUrlCredentials,
} from '@podverse/helpers-validation/client';
import {
  getAddByRSSDetailRouteSegment,
  getAddByRSSResourceTypeFromMappedFeed,
} from '@podverse/parser-mapping';
import {
  CallToActionMessage,
  CheckboxField,
  MainColumnStack,
  MainHeader,
  MainSidebarLayout,
  SideContent,
  StackForm,
  TextInput,
} from '@podverse/ui';

import { MainWrapper } from '../../../components/Main/MainWrapper';
import { ROUTES } from '../../../constants/routes';
import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import { useMembershipGate } from '../../../hooks/useMembershipGate';
import {
  applyAddByRSSParseStatus,
  enqueueAddByRSSParseWithStoredCredentials,
  followAddByRSSChannelAndQueue,
  pollAddByRSSParseStatus,
  unfollowAddByRSSChannelAndClear,
} from '../../../utils/addByRSS/actions';
import { getAddByRSSFeedByUrl, upsertAddByRSSFeed } from '../../../utils/addByRSS/storage';
import type { AddByRSSFeedRecord } from '../../../utils/addByRSS/types';
import { handleRateLimitAlert } from '../../../utils/rateLimit/rateLimitAlert';

import styles from '../../../styles/components/AddByRSS/AddByRSSAddFeed.module.scss';

type AddByRSSStatus = AddByRSSFeedRecord['status'] | 'idle' | 'error';
type ParsedStatus = Extract<AddByRSSFeedRecord['status'], 'parsed' | 'not_modified'>;

const isParsedStatus = (status?: AddByRSSFeedRecord['status']): status is ParsedStatus =>
  status === 'parsed' || status === 'not_modified';

const isCredentialsFailure = (record: AddByRSSFeedRecord): boolean =>
  record.lastFailureReason === 'credentials_rejected' ||
  record.lastFailureReason === 'credentials_required';

export const AddByRSSAddFeedPageClient: React.FC = () => {
  const tFeatures = useTranslations('features');
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const tMisc = useTranslations('misc');
  const router = useRouter();
  const { loggedInAccount, setLoggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();
  const { tryHandleMembershipGateError } = useMembershipGate();

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

  /**
   * A first parse that fails on credentials keeps the follow and the credentials saved on this
   * browser, and sends the user to the credentials page to correct them. Any other first-parse
   * failure unfollows so a broken URL does not linger in the library.
   */
  const runParseAndRedirect = async (
    accountId: string,
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
          outcome: statusResponse,
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
    } else if (finalStatus === 'failed' && isCredentialsFailure(latestRecord)) {
      router.push(`${ROUTES.ADD_BY_RSS_CREDENTIALS}/${latestRecord.idText}`);
    } else if (finalStatus === 'failed' && !isParsedStatus(seedRecord.status)) {
      await unfollowAddByRSSChannelAndClear({
        accountId,
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

    const rawFeedUrl = newFeedUrl.trim();
    if (!rawFeedUrl) {
      return;
    }
    let feedUrl = rawFeedUrl;

    setIsAddingFeed(true);
    setStatus('idle');
    setStatusMessage(null);
    setInputError(null);
    setStatusError(null);
    setBasicAuthError(null);

    try {
      if (useBasicAuth && (!basicAuthUsername.trim() || !basicAuthPassword)) {
        setBasicAuthError(tFeatures('add_by_rss.basic_auth_required_both'));
        setIsAddingFeed(false);
        return;
      }

      const resolved = resolveAddByRSSFeedUrlCredentials(
        rawFeedUrl,
        useBasicAuth ? basicAuthUsername.trim() : null,
        useBasicAuth ? basicAuthPassword : null
      );
      if (!resolved) {
        setStatus('error');
        setInputError(tFeatures('add_by_rss.invalid_url'));
        setIsAddingFeed(false);
        return;
      }
      feedUrl = resolved.feedUrl;

      const { requestId, record, account } = await followAddByRSSChannelAndQueue({
        accountId: loggedInAccount.id_text,
        feedUrl,
        resourceType: 'podcasts',
        title: feedUrl,
        imageUrl: null,
        credentials: resolved.credentials,
      });

      if (account) {
        setLoggedInAccount(account);
      }

      setBasicAuthPassword('');
      if (useBasicAuth) {
        setBasicAuthUsername('');
        setUseBasicAuth(false);
      }

      await runParseAndRedirect(loggedInAccount.id_text, requestId, feedUrl, record);
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
          const response = await enqueueAddByRSSParseWithStoredCredentials({
            accountId: loggedInAccount.id_text,
            feedUrl,
          });
          await runParseAndRedirect(
            loggedInAccount.id_text,
            response.request_id,
            feedUrl,
            existing
          );
          return;
        }
      }

      if (tryHandleMembershipGateError(error)) {
        return;
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
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
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
                <StackForm onSubmit={(e) => handleAddFeed(e)} className={styles.form}>
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
                    <CheckboxField
                      wrapInDiv
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
                          autoComplete="username"
                          maxLength={ADD_BY_RSS_CREDENTIAL_MAX_LENGTH}
                          aria-invalid={
                            basicAuthError && !basicAuthUsername.trim() ? true : undefined
                          }
                          disabled={isAddingFeed}
                        />
                        <TextInput
                          value={basicAuthPassword}
                          onChange={(event) => setBasicAuthPassword(event.target.value)}
                          placeholder={tFeatures('add_by_rss.basic_auth_password')}
                          aria-label={tFeatures('add_by_rss.basic_auth_password')}
                          type="password"
                          autoComplete="current-password"
                          maxLength={ADD_BY_RSS_CREDENTIAL_MAX_LENGTH}
                          infoError={basicAuthError ?? undefined}
                          aria-invalid={basicAuthError && !basicAuthPassword ? true : undefined}
                          disabled={isAddingFeed}
                        />
                      </div>
                    )}
                  </div>
                </StackForm>
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
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
};
