import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('../requests/apiRequestService.js', () => ({
  ManagementApiRequestService: vi.fn(),
}));

import { cookies } from 'next/headers';

import { ManagementApiRequestService } from '../requests/apiRequestService.js';
import {
  getManagementSessionUser,
  MANAGEMENT_AUTH_COOKIE_NAME,
} from './serverManagementSession.js';

describe('getManagementSessionUser', () => {
  beforeEach(() => {
    vi.mocked(ManagementApiRequestService).mockReset();
  });

  it('returns null when the auth cookie is absent', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    });

    await expect(getManagementSessionUser()).resolves.toBeNull();
    expect(ManagementApiRequestService).not.toHaveBeenCalled();
  });

  it('returns the user when the cookie is present and /auth/me succeeds', async () => {
    const mockUser = { id: 1, id_text: 'abc', created_at: '2020-01-01T00:00:00.000Z' };

    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === MANAGEMENT_AUTH_COOKIE_NAME ? { value: 'jwt-token' } : undefined,
    });

    vi.mocked(ManagementApiRequestService).mockImplementation(
      () =>
        ({
          apiRequest: vi.fn().mockResolvedValue(mockUser),
        }) as unknown as InstanceType<typeof ManagementApiRequestService>
    );

    await expect(getManagementSessionUser()).resolves.toEqual(mockUser);
    expect(ManagementApiRequestService).toHaveBeenCalledWith('jwt-token');
  });

  it('returns null when /auth/me responds with 401', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === MANAGEMENT_AUTH_COOKIE_NAME ? { value: 'expired' } : undefined,
    });

    vi.mocked(ManagementApiRequestService).mockImplementation(
      () =>
        ({
          apiRequest: vi.fn().mockRejectedValue({ response: { status: 401 } }),
        }) as unknown as InstanceType<typeof ManagementApiRequestService>
    );

    await expect(getManagementSessionUser()).resolves.toBeNull();
  });
});
