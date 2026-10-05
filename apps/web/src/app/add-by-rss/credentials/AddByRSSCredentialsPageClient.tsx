'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { FormEvent } from 'react';
import React, { useEffect, useState } from 'react';

import type { AddByRSSParseFailureReason } from '@podverse/helpers';
import {
  ADD_BY_RSS_CREDENTIAL_MAX_LENGTH,
  canSubmitAddByRssCredentials,
} from '@podverse/helpers-validation/client';
import {
  getAddByRSSDetailRouteSegment,
  getAddByRSSResourceTypeFromMappedFeed,
} from '@podverse/parser-mapping';
import {
  Button,
  CallToActionMessage,
  FormPrimaryActions,
  MainColumnStack,
  MainHeader,
  MainSidebarLayout,
  SideContent,
  StackForm,
  TextInput,
} from '@podverse/ui';

import { WebLoadingSpinnerOverlay } from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { NoResults } from '../../../components/NoResults/NoResults';
import { ROUTES } from '../../../constants/routes';
import { useAccount } from '../../../contexts/Account';
import { useModals } from '../../../contexts/Modals';
import { useMembershipGate } from '../../../hooks/useMembershipGate';
import {
  applyAddByRSSParseStatus,
  pollAddByRSSParseStatus,
  saveAddByRSSCredentialsAndQueue,
  unfollowAddByRSSChannelAndClear,
} from '../../../utils/addByRSS/actions';
import { getCredentials } from '../../../utils/addByRSS/credentialStore';
import { getAddByRSSFeedByIdText, upsertAddByRSSFeed } from '../../../utils/addByRSS/storage';
import { syncAddByRSSCacheWithServer } from '../../../utils/addByRSS/sync';
import type { AddByRSSFeedRecord } from '../../../utils/addByRSS/types';
import { handleRateLimitAlert } from '../../../utils/rateLimit/rateLimitAlert';

import styles from '../../../styles/components/AddByRSS/AddByRSSAddFeed.module.scss';

type AddByRSSCredentialsPageClientProps = {
  idText: string;
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

export const AddByRSSCredentialsPageClient: React.FC<AddByRSSCredentialsPageClientProps> = ({
  idText,
}) => {
  const tFeatures = useTranslations('features');
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const tMisc = useTranslations('misc');
  const router = useRouter();
  const { loggedInAccount, setLoggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();
  const { tryHandleMembershipGateError } = useMembershipGate();

  const [feed, setFeed] = useState<AddByRSSFeedRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldsError, setFieldsError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      if (!loggedInAccount) {
        setFeed(null);
        setIsLoading(false);
        return;
      }
      try {
        await syncAddByRSSCacheWithServer(loggedInAccount.id_text);
        const record = await getAddByRSSFeedByIdText(idText);
        if (cancelled) {
          return;
        }
        setFeed(record);
        if (record) {
          const stored = await getCredentials(loggedInAccount.id_text, record.feedUrl);
          if (!cancelled && stored) {
            setUsername(stored.username);
          }
          if (!cancelled && record.lastFailureReason === 'credentials_rejected') {
            setErrorMessage(tFeatures('add_by_rss.credentials_rejected'));
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [idText, loggedInAccount, tFeatures]);

  const isBusy = isChecking || isRemoving;
  const canSave = canSubmitAddByRssCredentials(username, password);

  const handleSaveAndCheck = async (event?: FormEvent) => {
    event?.preventDefault();
    if (isBusy || !feed || !canSave) {
      return;
    }
    if (!loggedInAccount) {
      setModalAuthLogin({ isOpen: true });
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
        accountId: loggedInAccount.id_text,
        feed,
        credentials: { username: trimmedUsername, password },
      });
      if (!savedOnDevice) {
        setNotice(tFeatures('add_by_rss.credentials_not_saved_on_device'));
      }

      let latestRecord: AddByRSSFeedRecord = feed;
      const finalStatus = await pollAddByRSSParseStatus({
        requestId,
        onStatusUpdate: async (statusResponse) => {
          setStatusMessage(tFeatures(`add_by_rss.status_${statusResponse.status}`));
          const updated = await applyAddByRSSParseStatus({
            feedUrl: feed.feedUrl,
            parsedFeed: statusResponse.payload,
            status: statusResponse.status,
            cache: statusResponse.cache,
            outcome: statusResponse,
            fallbackRecord: latestRecord,
          });
          if (updated) {
            latestRecord = updated;
          }
        },
      });

      setFeed(latestRecord);

      if (finalStatus === 'parsed' || finalStatus === 'not_modified') {
        setPassword('');
        const resourceType = getAddByRSSResourceTypeFromMappedFeed(latestRecord.mappedFeed);
        if (latestRecord.resourceType !== resourceType) {
          latestRecord = { ...latestRecord, resourceType };
          await upsertAddByRSSFeed(latestRecord);
        }
        router.push(
          `/add-by-rss/${getAddByRSSDetailRouteSegment(resourceType)}/${latestRecord.idText}`
        );
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
        suppressAlert: true,
        onMessage: (message) => {
          setErrorMessage(message);
        },
      });
      if (!handled) {
        setErrorMessage(tFeatures('add_by_rss.credentials_check_failed'));
        console.error(error);
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleRemoveFeed = async () => {
    if (isBusy || !feed || !loggedInAccount) {
      return;
    }

    setIsRemoving(true);
    setErrorMessage(null);
    try {
      const nextAccount = await unfollowAddByRSSChannelAndClear({
        accountId: loggedInAccount.id_text,
        feedUrl: feed.feedUrl,
        channelIdText: feed.idText,
      });
      setLoggedInAccount(nextAccount);
      router.push(ROUTES.ADD_BY_RSS_PODCASTS);
    } catch (error) {
      console.error(error);
      setErrorMessage(tFeatures('add_by_rss.credentials_check_failed'));
      setIsRemoving(false);
    }
  };

  const title = feed?.mappedFeed?.channel?.channel?.title ?? feed?.title ?? feed?.feedUrl ?? null;

  const renderBody = () => {
    if (!loggedInAccount) {
      return (
        <CallToActionMessage
          message={tInstructions('login_for_subscriptions')}
          buttonLabel={tAuthentication('login')}
          onButtonClick={() => setModalAuthLogin({ isOpen: true })}
        />
      );
    }
    if (isLoading) {
      return <WebLoadingSpinnerOverlay isLoading />;
    }
    if (!feed) {
      return <NoResults message={tFeatures('add_by_rss.feed_not_found_local')} />;
    }

    return (
      <div className={styles.content}>
        {title && <h2>{title}</h2>}
        {title !== feed.feedUrl && <p className={styles.instructions}>{feed.feedUrl}</p>}
        <p className={styles.instructions}>{tFeatures('add_by_rss.credentials_page_intro')}</p>
        <p className={styles.instructions}>
          {tFeatures('add_by_rss.credentials_page_device_note')}
        </p>
        <p className={styles.instructions}>{tFeatures('add_by_rss.credentials_page_media_note')}</p>

        <StackForm onSubmit={(e) => handleSaveAndCheck(e)} className={styles.form}>
          <TextInput
            id="add-by-rss-credentials-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            eyebrow={tFeatures('add_by_rss.basic_auth_username')}
            eyebrowPlacement="field"
            placeholder={tMisc('required')}
            aria-label={tFeatures('add_by_rss.basic_auth_username')}
            autoComplete="username"
            maxLength={ADD_BY_RSS_CREDENTIAL_MAX_LENGTH}
            aria-invalid={fieldsError && !username.trim() ? true : undefined}
            disabled={isBusy}
          />
          <TextInput
            id="add-by-rss-credentials-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            eyebrow={tFeatures('add_by_rss.basic_auth_password')}
            eyebrowPlacement="field"
            placeholder={tMisc('required')}
            aria-label={tFeatures('add_by_rss.basic_auth_password')}
            type="password"
            autoComplete="current-password"
            maxLength={ADD_BY_RSS_CREDENTIAL_MAX_LENGTH}
            infoError={fieldsError ?? undefined}
            aria-invalid={fieldsError && !password ? true : undefined}
            disabled={isBusy}
          />
          <FormPrimaryActions>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void handleRemoveFeed();
              }}
              disabled={isBusy}
              isLoading={isRemoving}
            >
              {tFeatures('add_by_rss.credentials_remove_feed')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isBusy || !canSave}
              isLoading={isChecking}
            >
              {tFeatures('add_by_rss.credentials_save_and_check')}
            </Button>
          </FormPrimaryActions>
        </StackForm>

        <div aria-live="polite">
          {statusMessage && <p className={styles.statusValue}>{statusMessage}</p>}
          {notice && <p className={styles.instructions}>{notice}</p>}
        </div>
        {errorMessage && (
          <p className={styles.errorText} role="alert">
            {errorMessage}
          </p>
        )}

        <Link href={ROUTES.ADD_BY_RSS_PODCASTS}>
          {tFeatures('add_by_rss.credentials_back_to_list')}
        </Link>
      </div>
    );
  };

  return (
    <>
      <MainHeader title={tFeatures('add_by_rss.credentials_page_title')} />
      <MainWrapper>
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>{renderBody()}</MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
};
