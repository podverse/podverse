import Constants from 'expo-constants';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { request } from '@podverse/helpers-requests';
import type { ManualBoostRecipientEvent, ManualBoostRecipientInput } from '@podverse/v4v-btc-ln';
import { boostFieldsForPayment } from '@podverse/v4v-helpers';
import type { MetaBoost } from '@podverse/v4v-metaboost';
import {
  fetchMbrssV1BoostCapability,
  fetchMbV1BoostCapability,
  postMbrssV1BoostAfterLargestSplit,
  resolveMetaBoostFromApiValueMetadata,
} from '@podverse/v4v-metaboost';

import { requestWithMobileAuthRefresh, useAuth } from '../../auth';
import { createAlbyBoostPaymentProvider } from '../../lib/boost/albyBoostPaymentProvider';
import type { MobileBoostFailureCopy } from '../../lib/boost/mobileBoostFailureCopy';
import { mobileBoostFailureCopy } from '../../lib/boost/mobileBoostFailureCopy';
import { mobileBoostMessageMaxLength } from '../../lib/boost/mobileBoostMessageLimit';
import { mobileBoostPostNotice } from '../../lib/boost/mobileBoostPostNotice';
import type {
  MobileBoostValueBlock,
  MobileBoostValueRecipient,
} from '../../lib/boost/mobileBoostRecipients';
import {
  lightningRecipientsForBoost,
  manualBoostRecipientsFromLightning,
  parseBoostSatsAmount,
} from '../../lib/boost/mobileBoostRecipients';
import { runMobileManualBoost } from '../../lib/boost/runMobileManualBoost';
import { mobileBrandName } from '../../lib/mobileBrandName';
import { getPref, setPref } from '../../prefs';
import { isOfflineModeEnabled } from '../../prefs/offlineMode';
import {
  connectAlby,
  getAlbyAccountSnapshot,
  isAlbyConfigured,
  loadAlbyConnection,
  subscribeAlbyConnection,
} from '../../v4v/alby';
import { getValueProviderConnection } from '../../v4v/valueProviders';
import type { BoostSheetTarget } from './BoostSheet';

export type BoostSheetAlbyPhase = 'loading' | 'not_configured' | 'disconnected' | 'connected';

export type BoostSheetCapabilityStatus =
  'idle' | 'loading' | 'unavailable' | 'sender_blocked' | 'ready';

export type BoostSheetNotice =
  | { kind: 'offline' }
  | { kind: 'rate_limited'; retryAfterMs: number }
  | { kind: 'rate_limit_unavailable' }
  | { kind: 'session_ended' }
  | { kind: 'metaboost_offline' }
  | { kind: 'sender_blocked'; detail: string | null }
  | { kind: 'owner_terms'; detail: string | null }
  | { kind: 'post_failed'; detail: string | null };

export type BoostSheetRecipientStatus = {
  attemptLines: readonly string[];
  failure: MobileBoostFailureCopy | null;
  phase: 'failed' | 'paying' | 'success';
};

type StoredCapability = {
  appliedKey: string | null;
  messageCharLimit: number | null;
  senderBlockMessage: string | null;
  status: 'ready' | 'sender_blocked' | 'unavailable';
  termsOfServiceUrl: string | null;
};

const EMPTY_CAPABILITY: StoredCapability = {
  appliedKey: null,
  messageCharLimit: null,
  senderBlockMessage: null,
  status: 'unavailable',
  termsOfServiceUrl: null,
};

const toValueRecipient = (recipient: {
  address: string;
  custom_key?: string | null;
  custom_value?: string | null;
  name?: string | null;
  split: number;
  type: string;
}): MobileBoostValueRecipient => ({
  address: recipient.address,
  customKey: recipient.custom_key ?? null,
  customValue: recipient.custom_value ?? null,
  name: recipient.name ?? null,
  split: recipient.split,
  type: recipient.type,
});

const valueBlocksForTarget = (
  target: BoostSheetTarget
): {
  channelValues: MobileBoostValueBlock[];
  itemValues: MobileBoostValueBlock[] | null;
} => {
  const channelValues = (target.channel.channel_values ?? []).map((value) => ({
    type: value.type,
    recipients: value.channel_value_recipients.map(toValueRecipient),
  }));
  if (target.item === null) {
    return { channelValues, itemValues: null };
  }
  return {
    channelValues,
    itemValues: (target.item.item_values ?? []).map((value) => ({
      type: value.type,
      recipients: value.item_value_recipients.map(toValueRecipient),
    })),
  };
};

/** Lightning recipients on the target. An item with lightning rows replaces the channel rows. */
export const lightningValueRecipientsForTarget = (
  target: BoostSheetTarget
): MobileBoostValueRecipient[] => {
  return lightningRecipientsForBoost(valueBlocksForTarget(target));
};

/** Split amounts for the lightning rows on screen and for submit. */
export const manualLightningRowsForTarget = (
  target: BoostSheetTarget,
  amount: string
): ManualBoostRecipientInput[] => {
  return manualBoostRecipientsFromLightning(
    lightningValueRecipientsForTarget(target),
    parseBoostSatsAmount(amount) ?? 0
  );
};

const usesMbV1Capability = (metaBoost: MetaBoost): boolean => {
  return metaBoost.standard === 'mb-v1' || metaBoost.node.includes('/standard/mb-v1/');
};

const sliceMessage = (value: string, maxLength: number | undefined): string => {
  if (typeof maxLength !== 'number' || value.length <= maxLength) {
    return value;
  }
  return value.slice(0, maxLength);
};

const appVersionFromExpo = (): string | null => {
  const version = Constants.expoConfig?.version;
  if (typeof version !== 'string' || version.trim() === '') {
    return null;
  }
  return version;
};

/**
 * Send state for the boost sheet. Lightning pays through the connected value provider.
 * A signed-out listener can pay. The name and message stay locked until the account
 * snapshot is loaded. A signed-in payment carries the field values, including blanks.
 */
export function useBoostSheetSend(target: BoostSheetTarget | null) {
  const { account, accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const [amount, setAmountState] = useState('1');
  const [amountInvalid, setAmountInvalid] = useState(false);
  const [senderName, setSenderNameState] = useState('');
  const [message, setMessageState] = useState('');
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectFailed, setConnectFailed] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [notice, setNotice] = useState<BoostSheetNotice | null>(null);
  const [statuses, setStatuses] = useState<Record<string, BoostSheetRecipientStatus>>({});
  const [showBack, setShowBack] = useState(false);
  const [notAvailableVisible, setNotAvailableVisible] = useState(false);
  const [storedCapability, setStoredCapability] = useState<StoredCapability>(EMPTY_CAPABILITY);
  const [trackedCapabilityKey, setTrackedCapabilityKey] = useState<string | null>(null);
  const [trackedSheetOpen, setTrackedSheetOpen] = useState(() => target !== null);
  const [albyOpenSession, setAlbyOpenSession] = useState(() => (target !== null ? 1 : 0));
  const [albyReadySession, setAlbyReadySession] = useState(0);

  const generationRef = useRef(0);
  const nameEditedRef = useRef(false);
  const connectBusyRef = useRef(false);
  const submitBusyRef = useRef(false);
  const statusesRef = useRef<Record<string, BoostSheetRecipientStatus>>({});
  const noticeRef = useRef<BoostSheetNotice | null>(null);
  const sessionEndedRef = useRef(false);
  const metaboostWaitRef = useRef<(() => void) | null>(null);

  const sheetOpen = target !== null;
  if (sheetOpen !== trackedSheetOpen) {
    setTrackedSheetOpen(sheetOpen);
    if (sheetOpen) {
      setAlbyOpenSession((session) => session + 1);
    }
  }

  const albyAccount = useSyncExternalStore(subscribeAlbyConnection, getAlbyAccountSnapshot);
  const albyReady = sheetOpen && albyOpenSession !== 0 && albyReadySession === albyOpenSession;
  const albyPhase: BoostSheetAlbyPhase = useMemo(() => {
    if (!albyReady) {
      return 'loading';
    }
    if (!isAlbyConfigured()) {
      return 'not_configured';
    }
    if (albyAccount === null || getValueProviderConnection('alby').status !== 'connected') {
      return 'disconnected';
    }
    return 'connected';
  }, [albyAccount, albyReady]);

  const channelId = target?.channel.id_text ?? '';
  const itemId = target?.item?.id_text ?? '';
  const metaBoostDto = target?.channel.channel_meta_boost ?? null;
  const metaBoostNode = metaBoostDto?.node ?? null;
  const metaBoostStandard = metaBoostDto?.standard ?? null;
  const metaBoost = useMemo(() => {
    if (metaBoostNode === null) {
      return null;
    }
    const resolved = resolveMetaBoostFromApiValueMetadata({
      node: metaBoostNode,
      standard: metaBoostStandard,
    });
    return resolved === null ? null : resolved.metaBoost;
  }, [metaBoostNode, metaBoostStandard]);

  const senderGuid =
    account !== null && typeof account.sender_guid === 'string' && account.sender_guid.trim() !== ''
      ? account.sender_guid.trim()
      : null;

  const capabilityRequestKey =
    metaBoost !== null && account !== null && senderGuid !== null
      ? `${channelId}|${itemId}|${senderGuid}|${metaBoost.standard ?? ''}|${metaBoost.node}`
      : null;
  if (capabilityRequestKey !== trackedCapabilityKey) {
    setTrackedCapabilityKey(capabilityRequestKey);
    setStoredCapability((current) => (current === EMPTY_CAPABILITY ? current : EMPTY_CAPABILITY));
  }

  const capabilityStatus: BoostSheetCapabilityStatus =
    capabilityRequestKey === null
      ? 'idle'
      : storedCapability.appliedKey !== capabilityRequestKey
        ? 'loading'
        : storedCapability.status;
  const senderBlockMessage =
    capabilityStatus === 'sender_blocked' ? storedCapability.senderBlockMessage : null;
  const termsUrl =
    (capabilityStatus === 'ready' || capabilityStatus === 'sender_blocked') &&
    storedCapability.termsOfServiceUrl !== null &&
    storedCapability.termsOfServiceUrl.trim() !== ''
      ? storedCapability.termsOfServiceUrl.trim()
      : null;

  const messageLimitInput = (() => {
    switch (capabilityStatus) {
      case 'idle':
        return { messageCharLimit: null, status: 'idle' as const };
      case 'loading':
        return { messageCharLimit: null, status: 'loading' as const };
      case 'unavailable':
        return { messageCharLimit: null, status: 'error' as const };
      case 'ready':
      case 'sender_blocked':
        return {
          messageCharLimit: storedCapability.messageCharLimit,
          status: 'success' as const,
        };
    }
  })();
  const messageMaxLength = mobileBoostMessageMaxLength(metaBoost !== null, messageLimitInput);
  const messageEditable =
    account !== null &&
    !submitBusy &&
    capabilityStatus !== 'loading' &&
    capabilityStatus !== 'unavailable' &&
    capabilityStatus !== 'sender_blocked';
  const hasMetaBoost = metaBoost !== null;

  const setSheetNotice = (next: BoostSheetNotice | null): void => {
    noticeRef.current = next;
    setNotice(next);
  };

  const resolveMetaboostWait = (): void => {
    const resolve = metaboostWaitRef.current;
    metaboostWaitRef.current = null;
    resolve?.();
  };

  const replaceStatuses = (next: Record<string, BoostSheetRecipientStatus>): void => {
    statusesRef.current = next;
    setStatuses(next);
  };

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    nameEditedRef.current = false;
    connectBusyRef.current = false;
    submitBusyRef.current = false;
    sessionEndedRef.current = false;
    statusesRef.current = {};
    setStatuses({});
    setAmountState('1');
    setMessageState('');
    setAmountInvalid(false);
    setConnectFailed(false);
    setConnectBusy(false);
    setSubmitBusy(false);
    setShowBack(false);
    setNotAvailableVisible(false);
    setSenderNameState('');
    noticeRef.current = null;
    setNotice(null);
    const resolveWait = metaboostWaitRef.current;
    metaboostWaitRef.current = null;
    resolveWait?.();

    void getPref('boost.sender_name').then(
      (stored) => {
        if (generationRef.current !== generation || nameEditedRef.current) {
          return;
        }
        setSenderNameState(stored === null ? '' : stored);
      },
      () => {
        if (generationRef.current !== generation || nameEditedRef.current) {
          return;
        }
        setSenderNameState('');
      }
    );
  }, [channelId, itemId]);

  useEffect(() => {
    if (typeof messageMaxLength !== 'number') {
      return;
    }
    setMessageState((previous) => sliceMessage(previous, messageMaxLength));
  }, [messageMaxLength]);

  useEffect(() => {
    if (!sheetOpen || albyOpenSession === 0) {
      return;
    }
    const session = albyOpenSession;
    let cancelled = false;
    void loadAlbyConnection().then(
      () => {
        if (!cancelled) {
          setAlbyReadySession(session);
        }
      },
      () => {
        if (!cancelled) {
          setAlbyReadySession(session);
        }
      }
    );
    return () => {
      cancelled = true;
    };
  }, [albyOpenSession, sheetOpen]);

  useEffect(() => {
    if (capabilityRequestKey === null || metaBoost === null || senderGuid === null) {
      setStoredCapability((current) => (current === EMPTY_CAPABILITY ? current : EMPTY_CAPABILITY));
      return;
    }
    const generation = generationRef.current;
    const requestKey = capabilityRequestKey;
    const node = metaBoost.node;
    const useMbV1 = usesMbV1Capability(metaBoost);
    let cancelled = false;
    setStoredCapability((current) => (current === EMPTY_CAPABILITY ? current : EMPTY_CAPABILITY));
    const pending = useMbV1
      ? fetchMbV1BoostCapability(node, { senderGuid })
      : fetchMbrssV1BoostCapability(node, { senderGuid });
    void pending.then(
      (result) => {
        if (cancelled || generationRef.current !== generation) {
          return;
        }
        const terms = result.termsOfServiceUrl.trim();
        setStoredCapability({
          appliedKey: requestKey,
          messageCharLimit: result.messageCharLimit,
          senderBlockMessage: result.senderBlocked ? result.senderBlockMessage : null,
          status: result.senderBlocked ? 'sender_blocked' : 'ready',
          termsOfServiceUrl: terms === '' ? null : terms,
        });
      },
      () => {
        if (cancelled || generationRef.current !== generation) {
          return;
        }
        setStoredCapability({
          appliedKey: requestKey,
          messageCharLimit: null,
          senderBlockMessage: null,
          status: 'unavailable',
          termsOfServiceUrl: null,
        });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [capabilityRequestKey, metaBoost, senderGuid]);

  const setAmount = (next: string): void => {
    setAmountState(next);
    setAmountInvalid(false);
  };

  const setSenderName = (next: string): void => {
    nameEditedRef.current = true;
    setSenderNameState(next);
    void setPref('boost.sender_name', next).catch(() => {
      // The field already shows what they typed. A failed write sets no notice.
    });
  };

  const setMessage = (next: string): void => {
    setMessageState(sliceMessage(next, messageMaxLength));
  };

  const dismissNotice = (): void => {
    setSheetNotice(null);
    resolveMetaboostWait();
  };

  const dismissNotAvailable = (): void => {
    setNotAvailableVisible(false);
  };

  const goBack = (): void => {
    replaceStatuses({});
    setShowBack(false);
    setSheetNotice(null);
    resolveMetaboostWait();
  };

  const connect = (): void => {
    if (connectBusyRef.current || albyPhase === 'loading' || albyPhase === 'not_configured') {
      return;
    }
    if (isOfflineModeEnabled()) {
      setSheetNotice({ kind: 'offline' });
      return;
    }
    const generation = generationRef.current;
    connectBusyRef.current = true;
    setConnectBusy(true);
    setConnectFailed(false);
    void connectAlby()
      .then(
        (result) => {
          if (generationRef.current !== generation) {
            return;
          }
          if (result.status === 'failed') {
            setConnectFailed(true);
          }
        },
        () => {
          if (generationRef.current !== generation) {
            return;
          }
          setConnectFailed(true);
        }
      )
      .finally(() => {
        if (generationRef.current !== generation) {
          return;
        }
        connectBusyRef.current = false;
        setConnectBusy(false);
      });
  };

  const submit = (valueKey: string): void => {
    if (submitBusyRef.current) {
      return;
    }
    if (valueKey !== 'lightning') {
      setNotAvailableVisible(true);
      return;
    }
    if (isOfflineModeEnabled()) {
      setSheetNotice({ kind: 'offline' });
      return;
    }
    if (albyPhase !== 'connected') {
      return;
    }
    if (parseBoostSatsAmount(amount) === null) {
      setAmountInvalid(true);
      return;
    }
    if (target === null) {
      setNotAvailableVisible(true);
      return;
    }
    const sheetTarget = target;
    const recipients = manualLightningRowsForTarget(sheetTarget, amount);
    if (recipients.length === 0) {
      setNotAvailableVisible(true);
      return;
    }

    const generation = generationRef.current;
    const paymentFields = boostFieldsForPayment(account !== null, senderName, message);
    const capturedSenderGuid = senderGuid;
    const capturedMetaBoost = metaBoost;
    const capturedHttpMessaging = capabilityStatus === 'ready';
    const appName = mobileBrandName();
    const appVersion = appVersionFromExpo();
    const feedGuid = sheetTarget.channel.podcast_guid;
    const feedTitle = sheetTarget.channel.title;
    const itemGuid = typeof sheetTarget.item?.guid === 'string' ? sheetTarget.item.guid : null;
    const itemTitle = typeof sheetTarget.item?.title === 'string' ? sheetTarget.item.title : null;
    const authDeps = { accessToken, clearSession, refreshToken, setTokens };

    setAmountInvalid(false);
    setSheetNotice(null);
    replaceStatuses({});
    sessionEndedRef.current = false;
    submitBusyRef.current = true;
    setSubmitBusy(true);

    const onMetaboostUnreachable = (): Promise<void> => {
      if (generationRef.current !== generation) {
        return Promise.resolve();
      }
      setSheetNotice({ kind: 'metaboost_offline' });
      return new Promise((resolve) => {
        metaboostWaitRef.current = resolve;
      });
    };

    const onRecipientEvent = (event: ManualBoostRecipientEvent): void => {
      if (generationRef.current !== generation) {
        return;
      }
      const current = statusesRef.current[event.id];
      if (event.type === 'paying') {
        replaceStatuses({
          ...statusesRef.current,
          [event.id]: {
            attemptLines: current?.attemptLines ?? [],
            failure: null,
            phase: 'paying',
          },
        });
        return;
      }
      if (event.type === 'attempt_failed') {
        replaceStatuses({
          ...statusesRef.current,
          [event.id]: {
            attemptLines: [...(current?.attemptLines ?? []), event.message],
            failure: current?.failure ?? null,
            phase: 'paying',
          },
        });
        return;
      }
      if (event.type === 'success') {
        replaceStatuses({
          ...statusesRef.current,
          [event.id]: {
            attemptLines: current?.attemptLines ?? [],
            failure: null,
            phase: 'success',
          },
        });
        return;
      }
      const failure = mobileBoostFailureCopy(event.error);
      if (failure.kind === 'session_ended' && !sessionEndedRef.current) {
        sessionEndedRef.current = true;
        setSheetNotice({ kind: 'session_ended' });
      }
      replaceStatuses({
        ...statusesRef.current,
        [event.id]: {
          attemptLines: current?.attemptLines ?? [],
          failure,
          phase: 'failed',
        },
      });
    };

    void (async () => {
      try {
        const result = await runMobileManualBoost(
          {
            provider: createAlbyBoostPaymentProvider(),
            rateLimitStatus: async () => {
              const status = await requestWithMobileAuthRefresh(authDeps, (api) =>
                api.reqMetaboostMbrssV1MintRateLimitStatus()
              );
              return { allowed: status.allowed, retryAfterMs: status.retryAfterMs };
            },
            postBoost: async ({ totalMsat }) => {
              if (capturedMetaBoost === null) {
                return;
              }
              await postMbrssV1BoostAfterLargestSplit({
                largestSplitSucceeded: true,
                metaBoost: capturedMetaBoost,
                senderGuid: capturedSenderGuid,
                totalMsat,
                appName,
                ...(appVersion === null ? {} : { appVersion }),
                feedGuid,
                feedTitle,
                ...(itemGuid === null ? {} : { itemGuid }),
                ...(itemTitle === null ? {} : { itemTitle }),
                message: paymentFields.message,
                yourName: paymentFields.yourName,
                onMetaboostUnreachable,
                transport: {
                  mintAppAssertion: async ({ ingestUrl, bodyJson }) => {
                    const mint = await requestWithMobileAuthRefresh(authDeps, (api) =>
                      api.reqMetaboostMbrssV1MintAppAssertion({
                        ingest_url: ingestUrl,
                        body_json: bodyJson,
                      })
                    );
                    return {
                      authorization: mint.authorization,
                      ingestUrl: mint.ingest_url,
                    };
                  },
                  postIngest: async ({ ingestUrl, authorization, bodyJson }) => {
                    const res = await request<unknown>(ingestUrl, {
                      method: 'POST',
                      data: bodyJson,
                      headers: {
                        Authorization: authorization,
                        'Content-Type': 'application/json',
                      },
                    });
                    return res.data;
                  },
                },
              });
            },
          },
          {
            appName,
            appVersion,
            feedGuid,
            feedTitle,
            httpMessagingEnabled: capturedHttpMessaging,
            itemGuid,
            itemTitle,
            message: paymentFields.message,
            metaBoost: capturedMetaBoost,
            onMetaboostUnreachable,
            onRecipientEvent,
            recipients,
            senderGuid: capturedSenderGuid,
            senderName: paymentFields.yourName,
          }
        );

        if (generationRef.current !== generation) {
          return;
        }
        if (result.outcome === 'rate_limited') {
          setSheetNotice({ kind: 'rate_limited', retryAfterMs: result.retryAfterMs });
          return;
        }
        if (result.outcome === 'rate_limit_check_failed') {
          setSheetNotice({ kind: 'rate_limit_unavailable' });
          return;
        }
        if (result.postError !== null) {
          const postNotice = mobileBoostPostNotice(result.postError);
          switch (postNotice.kind) {
            case 'capability_already_shown':
              break;
            case 'sender_blocked':
            case 'owner_terms':
            case 'post_failed':
              setSheetNotice(postNotice);
              break;
          }
        }
        const rows = Object.values(statusesRef.current);
        if (rows.length > 0 && rows.every((row) => row.phase === 'failed')) {
          setShowBack(true);
        }
        if (rows.some((row) => row.phase === 'success') && result.postError === null) {
          setMessageState('');
        }
      } catch {
        if (generationRef.current !== generation || noticeRef.current !== null) {
          return;
        }
        setSheetNotice({ kind: 'post_failed', detail: null });
      } finally {
        if (generationRef.current === generation) {
          submitBusyRef.current = false;
          setSubmitBusy(false);
        }
      }
    })();
  };

  return {
    albyPhase,
    amount,
    amountInvalid,
    capabilityStatus,
    connect,
    connectBusy,
    connectFailed,
    dismissNotice,
    dismissNotAvailable,
    goBack,
    hasMetaBoost,
    message,
    messageEditable,
    messageMaxLength,
    notAvailableVisible,
    notice,
    senderBlockMessage,
    senderName,
    setAmount,
    setMessage,
    setSenderName,
    showBack,
    statuses,
    submit,
    submitBusy,
    termsUrl,
  };
}
