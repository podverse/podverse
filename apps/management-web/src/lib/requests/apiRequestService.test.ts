import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetConfig = vi.fn();

vi.mock('../../config', () => ({
  getConfig: () => mockGetConfig(),
}));

import { ManagementApiRequestService } from './apiRequestService';

const baseConfig = {
  public: {
    api: {
      ssr: { protocol: 'http', host: 'podverse_local_management_api', port: '3100' },
      client: { protocol: 'http', host: 'localhost', port: '3100' },
      prefix: '/api',
      version: '/v2',
    },
  },
};

describe('ManagementApiRequestService', () => {
  beforeEach(() => {
    mockGetConfig.mockReset();
    mockGetConfig.mockReturnValue(baseConfig);
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it('builds an SSR API base with protocol, host, port, prefix, and version', () => {
    const service = new ManagementApiRequestService();

    expect((service as unknown as { apiBase: string }).apiBase).toBe(
      'http://podverse_local_management_api:3100/api/v2'
    );
  });

  it('builds a client API base with protocol, host, port, prefix, and version', () => {
    (globalThis as { window: unknown }).window = {};
    const service = new ManagementApiRequestService();

    expect((service as unknown as { apiBase: string }).apiBase).toBe(
      'http://localhost:3100/api/v2'
    );
  });
});
