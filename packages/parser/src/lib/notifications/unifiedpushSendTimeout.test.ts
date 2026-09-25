import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchWithTimeoutMock = vi.hoisted(() =>
  vi.fn(async () => new Response(null, { status: 200 }))
);

vi.mock('@podverse/helpers-backend', () => ({
  fetchWithTimeout: fetchWithTimeoutMock,
}));

import type { NotificationsContext } from '../../../../notifications/src/factory.js';
import { sendUPDataOnlyBatch } from '../../../../notifications/src/services/unifiedpush/unifiedpushDataOnly.js';
import { UNIFIED_PUSH_SEND_TIMEOUT_MS } from '../../../../notifications/src/services/unifiedpush/unifiedpushHelpers.js';
import { sendUPNotificationBatch } from '../../../../notifications/src/services/unifiedpush/unifiedpushNotification.js';

const notificationsContext: NotificationsContext = {
  config: {
    brandName: 'Podverse',
    web: {
      host: 'podverse.fm',
      protocol: 'https',
      icon_image_path: '/icon.png',
    },
    webpush: {
      enabled: false,
    },
  },
  getWebBaseUrl: () => 'https://podverse.fm',
  getWebBaseUrlWithPath: (path: string) => `https://podverse.fm${path}`,
  getWebIconImageUrl: () => 'https://podverse.fm/icon.png',
  isWebPushEnabled: false,
  webpushAdmin: null,
};

describe('UnifiedPush send timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the shared timeout when sending a UnifiedPush notification', async () => {
    await sendUPNotificationBatch(
      notificationsContext,
      [{ up_auth_key: null, up_endpoint: 'https://push.example/topic' }],
      { title: 'Live' }
    );

    expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
      'https://push.example/topic',
      expect.objectContaining({
        method: 'POST',
        timeoutMs: UNIFIED_PUSH_SEND_TIMEOUT_MS,
      })
    );
    expect(UNIFIED_PUSH_SEND_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it('passes the shared timeout when sending a UnifiedPush data-only message', async () => {
    await sendUPDataOnlyBatch(
      notificationsContext,
      [{ up_auth_key: null, up_endpoint: 'https://push.example/data' }],
      { kind: 'auto-download' }
    );

    expect(fetchWithTimeoutMock).toHaveBeenCalledWith(
      'https://push.example/data',
      expect.objectContaining({
        method: 'POST',
        timeoutMs: UNIFIED_PUSH_SEND_TIMEOUT_MS,
      })
    );
  });
});
