import { urlBase64ToUint8Array } from '@podverse/helpers-browser';
import { parseMembershipGateError } from '@podverse/helpers-requests';

import { getConfig } from '../../../config';
import { getApiRequestService } from '../../../factories/apiRequestService';

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const config = getConfig();
    const apiRequestService = getApiRequestService();
    const vapidPublicKey = config.public.notifications.webpush.vapidPublicKey;
    if (!vapidPublicKey) {
      console.warn('No VAPID public key available; aborting notification setup.');
      return false;
    }

    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    // Register the service worker
    const registration = await navigator.serviceWorker.register('/webpush-sw.js');

    if (!registration) {
      console.error('Failed to register service worker');
      return false;
    }

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    if (!subscription) {
      console.error('Failed to create push subscription');
      return false;
    }

    // Extract the subscription details
    const subscriptionJson = subscription.toJSON();
    const endpoint = subscriptionJson.endpoint;
    const p256dh = subscriptionJson.keys?.p256dh;
    const auth = subscriptionJson.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      console.error('Invalid subscription data');
      return false;
    }

    // Send subscription to the server
    try {
      await apiRequestService.reqAccountWebPushDeviceCreate({
        endpoint,
        p256dh,
        auth,
      });
    } catch {
      // If create fails, try update (device might already exist)
      await apiRequestService.reqAccountWebPushDeviceUpdate({
        endpoint,
        p256dh,
        auth,
      });
    }

    return true;
  } catch (error) {
    // The web-push device register (reqAccountWebPushDeviceCreate/Update) is member-gated
    // (skipMembershipStatus: false), so an expired/insufficient member gets a `membership.*` 403.
    // Make that observable so callers can show the shared membership modal (via useMembershipGate)
    // instead of this generic alert. Non-membership failures keep the existing alert + console behavior.
    if (parseMembershipGateError(error) !== null) {
      throw error;
    }
    alert('Error requesting notification permission. See console for details.');
    console.error('Error Requesting Notification Permission:', error);
    return false;
  }
};
