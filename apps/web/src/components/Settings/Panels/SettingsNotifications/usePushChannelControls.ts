'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { validateHttpsUrl } from '@podverse/helpers-validation/client';

import { useAccount } from '../../../../contexts/Account';
import { useModals } from '../../../../contexts/Modals';
import { useNotifications } from '../../../../contexts/Notifications';
import { getApiRequestService } from '../../../../factories/apiRequestService';
import { useLoadingMap } from '../../../../hooks/useLoadingMap';
import { useMembershipGate } from '../../../../hooks/useMembershipGate';
import { disableNotificationPermission } from '../../../../lib/notifications/webpush/disableNotificationPermission';
import { requestNotificationPermission } from '../../../../lib/notifications/webpush/requestNotificationPermission';

export function usePushChannelControls() {
  const {
    refreshWebPushRegistration,
    setPermission,
    registered,
    setRegistered,
    upRegistered,
    setUPRegistered,
    upEndpoint,
    setUPEndpoint,
  } = useNotifications();
  const { loadingMap, withLoading, setLoadingFor } = useLoadingMap();
  const { loggedInAccount } = useAccount();
  const { setModalLoginRequired } = useModals();
  const { tryHandleMembershipGateError } = useMembershipGate();
  const tInstructions = useTranslations('instructions');
  const tSettings = useTranslations('settings');

  const [showUPForm, setShowUPForm] = useState(false);
  const [upEndpointInput, setUPEndpointInput] = useState('');
  const [upAuthKeyInput, setUPAuthKeyInput] = useState('');
  const [upEndpointError, setUPEndpointError] = useState<string | undefined>(undefined);

  const requireLogin = (enabling: boolean): boolean => {
    if (loggedInAccount) {
      return false;
    }
    setModalLoginRequired({
      title: null,
      message: tInstructions(
        enabling ? 'login_to_enable_notifications' : 'login_to_disable_notifications'
      ),
    });
    return true;
  };

  const disableUP = async () => {
    setLoadingFor('unifiedpush', true);
    try {
      await withLoading('unifiedpush', async () => {
        if (upEndpoint) {
          await getApiRequestService().reqAccountUPDeviceDelete({ up_endpoint: upEndpoint });
        }

        const upDevice = await getApiRequestService().reqAccountUPDeviceGetForAccount();
        if (upDevice) {
          setUPRegistered(true);
          setUPEndpoint(upDevice.up_endpoint);
        } else {
          setUPRegistered(false);
          setUPEndpoint(null);
        }
        setShowUPForm(false);
        setUPEndpointInput('');
        setUPAuthKeyInput('');
      });
    } catch (error) {
      console.warn('Could not disable Unified Push', error);
    } finally {
      setLoadingFor('unifiedpush', false);
    }
  };

  const disableWebPush = async () => {
    setLoadingFor('webpush', true);
    if (requireLogin(false)) {
      setLoadingFor('webpush', false);
      return;
    }
    await withLoading('webpush', async () => {
      await disableNotificationPermission();
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = Notification.permission;
        setPermission(permission);
      } else {
        setPermission('default');
      }
      setRegistered(false);
    });
  };

  const enableWebPush = async () => {
    setLoadingFor('webpush', true);
    if (requireLogin(true)) {
      setLoadingFor('webpush', false);
      return;
    }

    try {
      if (upRegistered) {
        await disableUP();
      }

      await withLoading('webpush', async () => {
        await requestNotificationPermission();
      });
    } catch (error) {
      // requestNotificationPermission rethrows a membership 403 (member-gated device register) so we
      // can surface the shared membership modal instead of its generic alert; other errors it handles
      // internally and does not throw.
      if (!tryHandleMembershipGateError(error)) {
        console.warn('Could not enable web push', error);
      }
    } finally {
      await refreshWebPushRegistration();
    }
  };

  const enableUP = async (endpoint: string, authKey: string | null) => {
    setLoadingFor('unifiedpush', true);
    try {
      if (registered) {
        await disableWebPush();
      }

      await withLoading('unifiedpush', async () => {
        await getApiRequestService().reqAccountUPDeviceCreate({
          up_endpoint: endpoint,
          up_auth_key: authKey,
        });
        const upDevice = await getApiRequestService().reqAccountUPDeviceGetForAccount();
        if (upDevice) {
          setUPRegistered(true);
          setUPEndpoint(upDevice.up_endpoint);
        } else {
          setUPRegistered(false);
          setUPEndpoint(null);
        }
        setShowUPForm(false);
        setUPAuthKeyInput('');
      });
    } catch (error) {
      if (!tryHandleMembershipGateError(error)) {
        console.warn('Could not enable Unified Push', error);
        setUPEndpointError(tSettings('notifications.up_enable_error'));
      }
    } finally {
      setLoadingFor('unifiedpush', false);
    }
  };

  const handleUPToggle = async (next: boolean) => {
    if (requireLogin(next)) {
      return;
    }

    if (next) {
      setShowUPForm(true);
      setUPEndpointInput(upEndpoint || '');
      setUPEndpointError(undefined);
      return;
    }

    await disableUP();
  };

  const validateAndEnableUP = async () => {
    const validation = validateHttpsUrl(upEndpointInput);
    if (!validation.isValid) {
      setUPEndpointError(validation.error);
      return;
    }

    setUPEndpointError(undefined);
    await enableUP(upEndpointInput, upAuthKeyInput || null);
  };

  const cancelUPForm = () => {
    setShowUPForm(false);
    setUPEndpointInput('');
    setUPAuthKeyInput('');
    setUPEndpointError(undefined);
  };

  return {
    cancelUPForm,
    disableWebPush,
    enableWebPush,
    handleUPToggle,
    loadingUnifiedPush: !!loadingMap['unifiedpush'],
    loadingWebPush: !!loadingMap['webpush'],
    registered,
    setUPAuthKeyInput,
    setUPEndpointError,
    setUPEndpointInput,
    showUPForm,
    upAuthKeyInput,
    upEndpoint,
    upEndpointError,
    upEndpointInput,
    upRegistered,
    validateAndEnableUP,
  };
}
