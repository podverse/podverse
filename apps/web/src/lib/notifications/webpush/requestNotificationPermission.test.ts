import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getConfig } from '../../../config';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { requestNotificationPermission } from './requestNotificationPermission';

// Only the webpush device-register branch matters here, so we stub the browser push flow and the two
// module deps the SUT reads. The real `parseMembershipGateError` (@podverse/helpers-requests) runs so the
// membership-403 detection stays in sync with production.
vi.mock('../../../config', () => ({ getConfig: vi.fn() }));
vi.mock('../../../factories/apiRequestService', () => ({ getApiRequestService: vi.fn() }));
vi.mock('@podverse/helpers-browser', () => ({
  urlBase64ToUint8Array: () => new Uint8Array([1, 2, 3]),
}));

describe('requestNotificationPermission — membership gating on device register', () => {
  const alertMock = vi.fn();
  let create: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    create = vi.fn().mockResolvedValue(undefined);
    update = vi.fn().mockResolvedValue(undefined);

    vi.mocked(getConfig).mockReturnValue({
      public: { notifications: { webpush: { vapidPublicKey: 'test-vapid-key' } } },
    } as unknown as ReturnType<typeof getConfig>);

    vi.mocked(getApiRequestService).mockReturnValue({
      reqAccountWebPushDeviceCreate: create,
      reqAccountWebPushDeviceUpdate: update,
    } as unknown as ReturnType<typeof getApiRequestService>);

    const subscription = {
      toJSON: () => ({
        endpoint: 'https://push.example/ep',
        keys: { p256dh: 'p256', auth: 'auth' },
      }),
    };
    const registration = {
      pushManager: { subscribe: vi.fn().mockResolvedValue(subscription) },
    };
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: vi.fn().mockResolvedValue(registration),
        ready: Promise.resolve(registration),
      },
    });

    vi.stubGlobal('Notification', {
      permission: 'granted',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });
    vi.stubGlobal('alert', alertMock);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    Reflect.deleteProperty(globalThis.navigator, 'serviceWorker');
  });

  it('returns true when the member-gated device register succeeds', async () => {
    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('rethrows a membership 403 (so callers can open the membership modal) instead of alerting', async () => {
    const membershipError = {
      response: {
        status: 403,
        data: {
          i18nKey: 'membership.membership_expired',
          code: 'membership_expired',
          renewPath: '/membership/renew',
        },
      },
    };
    create.mockRejectedValue(membershipError);
    update.mockRejectedValue(membershipError);

    await expect(requestNotificationPermission()).rejects.toBe(membershipError);
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('keeps the generic alert and resolves false for a non-membership device-register failure', async () => {
    const genericError = { response: { status: 500, data: {} } };
    create.mockRejectedValue(genericError);
    update.mockRejectedValue(genericError);

    await expect(requestNotificationPermission()).resolves.toBe(false);
    expect(alertMock).toHaveBeenCalledTimes(1);
  });
});
