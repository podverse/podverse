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
  getManagementAuthService,
  getManagementJwtFromCookies,
  getManagementSession,
  getManagementSessionUser,
  MANAGEMENT_AUTH_COOKIE_NAME,
} from './serverManagementSession.js';

const mockUser = {
  id: 1,
  id_text: 'abc',
  email: 'abc@example.com',
  username: null,
  role: 'superuser',
  permissions: {
    feeds_crud: 15,
    feed_takedown_reasons_crud: 15,
    admins_crud: 15,
    stats_crud: 15,
  },
};

describe('getManagementJwtFromCookies', () => {
  it('returns undefined when the auth cookie is absent', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    await expect(getManagementJwtFromCookies()).resolves.toBeUndefined();
  });

  it('returns the cookie value when present', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === MANAGEMENT_AUTH_COOKIE_NAME
          ? { name: MANAGEMENT_AUTH_COOKIE_NAME, value: 'jwt-token' }
          : undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    await expect(getManagementJwtFromCookies()).resolves.toBe('jwt-token');
  });
});

describe('getManagementSession', () => {
  beforeEach(() => {
    vi.mocked(ManagementApiRequestService).mockReset();
  });

  it('returns null when the auth cookie is absent', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    await expect(getManagementSession()).resolves.toBeNull();
    expect(ManagementApiRequestService).not.toHaveBeenCalled();
  });

  it('returns user, token, and service when /auth/me succeeds', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === MANAGEMENT_AUTH_COOKIE_NAME
          ? { name: MANAGEMENT_AUTH_COOKIE_NAME, value: 'jwt-token' }
          : undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const mockInstance = {
      apiRequest: vi.fn().mockResolvedValue(mockUser),
    };

    vi.mocked(ManagementApiRequestService).mockImplementation(
      () => mockInstance as unknown as InstanceType<typeof ManagementApiRequestService>
    );

    await expect(getManagementSession()).resolves.toEqual({
      user: mockUser,
      token: 'jwt-token',
      service: mockInstance,
    });
    expect(ManagementApiRequestService).toHaveBeenCalledWith('jwt-token');
  });

  it('returns null when /auth/me responds with 401', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === MANAGEMENT_AUTH_COOKIE_NAME
          ? { name: MANAGEMENT_AUTH_COOKIE_NAME, value: 'expired' }
          : undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    vi.mocked(ManagementApiRequestService).mockImplementation(
      () =>
        ({
          apiRequest: vi.fn().mockRejectedValue({ response: { status: 401 } }),
        }) as unknown as InstanceType<typeof ManagementApiRequestService>
    );

    await expect(getManagementSession()).resolves.toBeNull();
  });
});

describe('getManagementAuthService', () => {
  beforeEach(() => {
    vi.mocked(ManagementApiRequestService).mockReset();
  });

  it('returns null when there is no session', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    await expect(getManagementAuthService()).resolves.toBeNull();
  });

  it('returns user and service when the session is valid', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === MANAGEMENT_AUTH_COOKIE_NAME
          ? { name: MANAGEMENT_AUTH_COOKIE_NAME, value: 'jwt-token' }
          : undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const mockInstance = {
      apiRequest: vi.fn().mockResolvedValue(mockUser),
    };

    vi.mocked(ManagementApiRequestService).mockImplementation(
      () => mockInstance as unknown as InstanceType<typeof ManagementApiRequestService>
    );

    await expect(getManagementAuthService()).resolves.toEqual({
      user: mockUser,
      service: mockInstance,
    });
  });
});

describe('getManagementSessionUser', () => {
  beforeEach(() => {
    vi.mocked(ManagementApiRequestService).mockReset();
  });

  it('returns null when the auth cookie is absent', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    await expect(getManagementSessionUser()).resolves.toBeNull();
    expect(ManagementApiRequestService).not.toHaveBeenCalled();
  });

  it('returns the user when the cookie is present and /auth/me succeeds', async () => {
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) =>
        name === MANAGEMENT_AUTH_COOKIE_NAME
          ? { name: MANAGEMENT_AUTH_COOKIE_NAME, value: 'jwt-token' }
          : undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

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
        name === MANAGEMENT_AUTH_COOKIE_NAME
          ? { name: MANAGEMENT_AUTH_COOKIE_NAME, value: 'expired' }
          : undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    vi.mocked(ManagementApiRequestService).mockImplementation(
      () =>
        ({
          apiRequest: vi.fn().mockRejectedValue({ response: { status: 401 } }),
        }) as unknown as InstanceType<typeof ManagementApiRequestService>
    );

    await expect(getManagementSessionUser()).resolves.toBeNull();
  });
});
