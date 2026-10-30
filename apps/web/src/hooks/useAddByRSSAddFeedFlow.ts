import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { resolveAddByRSSFeedUrlCredentials } from '@podverse/helpers-validation/client';
import {
  getAddByRSSDetailRouteSegment,
  getAddByRSSResourceTypeFromMappedFeed,
} from '@podverse/parser-mapping';

import { ROUTES } from '../constants/routes';
import { useAccount } from '../contexts/Account';
import { useModals } from '../contexts/Modals';
import {
  applyAddByRSSParseStatus,
  enqueueAddByRSSParseWithStoredCredentials,
  followAddByRSSChannelAndQueue,
  pollAddByRSSParseStatus,
  unfollowAddByRSSChannelAndClear,
} from '../utils/addByRSS/actions';
import { getAddByRSSFeedByUrl, upsertAddByRSSFeed } from '../utils/addByRSS/storage';
import type { AddByRSSFeedRecord } from '../utils/addByRSS/types';
import { handleRateLimitAlert } from '../utils/rateLimit/rateLimitAlert';
import { useMembershipGate } from './useMembershipGate';

export type AddByRSSStatus = AddByRSSFeedRecord['status'] | 'idle' | 'error';

type ParsedStatus = Extract<AddByRSSFeedRecord['status'], 'parsed' | 'not_modified'>;

export const isParsedStatus = (status?: AddByRSSFeedRecord['status']): status is ParsedStatus =>
  status === 'parsed' || status === 'not_modified';

const isCredentialsFailure = (record: AddByRSSFeedRecord): boolean =>
  record.lastFailureReason === 'credentials_rejected' ||
  record.lastFailureReason === 'credentials_required';

const thrownText = (error: unknown): { message: string; name: string } => {
  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }
  return { message: '', name: '' };
};

export type AddByRSSAddFeedInput = {
  rawFeedUrl: string;
  /** Both set, or both null. */
  username: string | null;
  password: string | null;
  /** Shown in the library until the parse lands; the feed URL when null. */
  title: string | null;
};

export function useAddByRSSAddFeedFlow(): {
  /** Opens the login modal and returns when signed out. `onFollowed` runs once the follow is saved. */
  addFeed: (input: AddByRSSAddFeedInput, options?: { onFollowed?: () => void }) => Promise<void>;
  inputError: string | null;
  isAddingFeed: boolean;
  status: AddByRSSStatus;
  statusError: string | null;
  statusLabel: string | null;
  statusMessage: string | null;
} {
  const tFeatures = useTranslations('features');
  const tMisc = useTranslations('misc');
  const router = useRouter();
  const { loggedInAccount, setLoggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();
  const { tryHandleMembershipGateError } = useMembershipGate();

  const [isAddingFeed, setIsAddingFeed] = useState(false);
  const [status, setStatus] = useState<AddByRSSStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

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

  const addFeed = async (input: AddByRSSAddFeedInput, options?: { onFollowed?: () => void }) => {
    if (isAddingFeed) {
      return;
    }
    if (!loggedInAccount) {
      setModalAuthLogin({ isOpen: true });
      return;
    }

    const accountId = loggedInAccount.id_text;
    let feedUrl = input.rawFeedUrl;

    setIsAddingFeed(true);
    setStatus('idle');
    setStatusMessage(null);
    setInputError(null);
    setStatusError(null);

    try {
      const resolved = resolveAddByRSSFeedUrlCredentials(
        input.rawFeedUrl,
        input.username,
        input.password
      );
      if (!resolved) {
        setStatus('error');
        setInputError(tFeatures('add_by_rss.invalid_url'));
        setIsAddingFeed(false);
        return;
      }
      feedUrl = resolved.feedUrl;

      const { requestId, record, account } = await followAddByRSSChannelAndQueue({
        accountId,
        feedUrl,
        resourceType: 'podcasts',
        title: input.title?.trim() || feedUrl,
        imageUrl: null,
        credentials: resolved.credentials,
      });

      if (account) {
        setLoggedInAccount(account);
      }

      options?.onFollowed?.();

      await runParseAndRedirect(accountId, requestId, feedUrl, record);
    } catch (error) {
      setStatus('error');
      const thrown = thrownText(error);
      const isConstraintError =
        thrown.name === 'ConstraintError' || thrown.message.toLowerCase().includes('constraint');
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
            accountId,
            feedUrl,
          });
          await runParseAndRedirect(accountId, response.request_id, feedUrl, existing);
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
        setStatusError(thrown.message);
      }
    } finally {
      setIsAddingFeed(false);
    }
  };

  return {
    addFeed,
    inputError,
    isAddingFeed,
    status,
    statusError,
    statusLabel,
    statusMessage,
  };
}
