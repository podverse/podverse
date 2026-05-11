import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as managementApiRequests from '@podverse/management-api-requests';

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
  let createClientSpy: ReturnType<
    typeof vi.spyOn<typeof managementApiRequests, 'createManagementApiClientFromConfig'>
  >;

  beforeEach(() => {
    mockGetConfig.mockReset();
    mockGetConfig.mockReturnValue(baseConfig);
    createClientSpy = vi.spyOn(managementApiRequests, 'createManagementApiClientFromConfig');
  });

  afterEach(() => {
    createClientSpy.mockRestore();
    delete (globalThis as { window?: unknown }).window;
  });

  it('builds an SSR API base with protocol, host, port, prefix, and version', () => {
    new ManagementApiRequestService();

    const innerClient = createClientSpy.mock.results[0]
      ?.value as managementApiRequests.ManagementApiRequestService;
    expect((innerClient as unknown as { apiBase: string }).apiBase).toBe(
      'http://podverse_local_management_api:3100/api/v2'
    );
  });

  it('builds a client API base with protocol, host, port, prefix, and version', () => {
    (globalThis as { window: unknown }).window = {};
    new ManagementApiRequestService();

    const innerClient = createClientSpy.mock.results[0]
      ?.value as managementApiRequests.ManagementApiRequestService;
    expect((innerClient as unknown as { apiBase: string }).apiBase).toBe(
      'http://localhost:3100/api/v2'
    );
  });
});
