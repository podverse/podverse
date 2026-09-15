import { useCallback, useMemo, useState } from 'react';

import type { SyncedNotificationType } from '../auth';
import { syncChannelNotificationEnabled, syncChannelNotificationType } from '../auth';
import { useAuth } from '../auth/AuthProvider';
import { useMembershipGate } from '../membership/MembershipGateProvider';
import { useAccessTier } from '../membership/useAccessTier';

export type ChannelNotificationsState = {
  /** Already-keyed copy for a failed write; null while nothing has failed. */
  errorKey: string | null;
  /** True once the account holds a notification row for this channel. */
  isEnabled: boolean;
  /** True while any notification write for this channel is in flight. */
  isSaving: boolean;
  isTypeEnabled: (type: SyncedNotificationType) => boolean;
  /** Create or delete the channel's notification row. */
  setEnabled: (next: boolean) => Promise<void>;
  /** Add or remove one type on the channel's existing notification row. */
  setTypeEnabled: (type: SyncedNotificationType, next: boolean) => Promise<void>;
  /** Flip the row on or off in one tap, for the header bell. */
  toggleEnabled: () => Promise<void>;
};

/**
 * One reader and writer for a podcast's notification state, shared by the header bell and the
 * podcast settings screen.
 *
 * The account is the only source of truth here — there is no device-local mirror — so the switches
 * read straight from `account.account_notification_channels` and every write replaces the account
 * with the server's answer. That keeps the bell and the settings switches in agreement without
 * either telling the other what it did.
 *
 * Denials are answered twice: `evaluateFeature` refuses before spending a request, and
 * `handleGateError` catches a server 403 that the client could not predict. Anything else surfaces
 * as `errorKey` for the caller to render near the control the user touched.
 *
 * Membership expiry is never described here. A lapsed member sees the gate, which explains renewal
 * in-app; expiry does not travel as a notification.
 */
export const useChannelNotifications = ({
  channelId,
  channelIdText,
}: {
  channelId: number | null;
  channelIdText: string;
}): ChannelNotificationsState => {
  const { accessToken, account, setAccount, status } = useAuth();
  const { handleGateError, openGate } = useMembershipGate();
  const { evaluateFeature } = useAccessTier();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isSignedIn = status === 'authenticated';

  const notificationChannel = useMemo(() => {
    if (channelId === null) {
      return null;
    }
    return (
      account?.account_notification_channels?.find(
        (candidate) => candidate.channel_id === channelId
      ) ?? null
    );
  }, [account?.account_notification_channels, channelId]);

  const isEnabled = notificationChannel !== null;

  const enabledTypes = useMemo(
    () =>
      new Set<string>(
        notificationChannel?.account_notification_channel_types?.map(
          (candidate) => candidate.type
        ) ?? []
      ),
    [notificationChannel]
  );

  const isTypeEnabled = useCallback(
    (type: SyncedNotificationType): boolean => enabledTypes.has(type),
    [enabledTypes]
  );

  /**
   * Every notification write shares the same shape: refuse or gate, run, then translate a failure
   * into either the gate or a message beside the control.
   */
  const runWrite = useCallback(
    async (write: () => Promise<void>): Promise<void> => {
      if (isSaving) {
        return;
      }

      if (!isSignedIn) {
        openGate('needs_account');
        return;
      }

      const access = evaluateFeature('notifications');
      if (!access.allowed) {
        openGate(access.reason);
        return;
      }

      setIsSaving(true);
      setErrorKey(null);
      try {
        await write();
      } catch (error) {
        if (!handleGateError(error)) {
          setErrorKey('errors.generic');
        }
      } finally {
        setIsSaving(false);
      }
    },
    [evaluateFeature, handleGateError, isSaving, isSignedIn, openGate]
  );

  const setEnabled = useCallback(
    async (next: boolean): Promise<void> => {
      await runWrite(async () => {
        await syncChannelNotificationEnabled({
          accessToken,
          channelIdText,
          enabled: next,
          setAccount,
        });
      });
    },
    [accessToken, channelIdText, runWrite, setAccount]
  );

  const setTypeEnabled = useCallback(
    async (type: SyncedNotificationType, next: boolean): Promise<void> => {
      await runWrite(async () => {
        await syncChannelNotificationType({
          accessToken,
          channelIdText,
          enabled: next,
          setAccount,
          type,
        });
      });
    },
    [accessToken, channelIdText, runWrite, setAccount]
  );

  const toggleEnabled = useCallback(async (): Promise<void> => {
    await setEnabled(!isEnabled);
  }, [isEnabled, setEnabled]);

  return {
    errorKey,
    isEnabled,
    isSaving,
    isTypeEnabled,
    setEnabled,
    setTypeEnabled,
    toggleEnabled,
  };
};
