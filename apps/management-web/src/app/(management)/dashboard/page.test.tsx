import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('redirect_called');
  }),
}));

vi.mock('../../../lib/auth/serverManagementSession.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../lib/auth/serverManagementSession.js')>();
  return {
    ...actual,
    getManagementAuthService: vi.fn(),
  };
});

vi.mock('../../../lib/server/bucketStorageDashboard.js', () => ({
  fetchBucketStorageEnabledForDashboard: vi.fn(),
}));

import { redirect } from 'next/navigation';

import { getManagementAuthService } from '../../../lib/auth/serverManagementSession.js';
import type { ManagementApiRequestService } from '../../../lib/requests/apiRequestService.js';
import { ROUTES } from '../../../lib/routes';
import { fetchBucketStorageEnabledForDashboard } from '../../../lib/server/bucketStorageDashboard.js';
import DashboardPage from './page.js';

const mockUser = {
  id: 1,
  id_text: 'u1',
  email: 'u1@example.com',
  username: null,
  role: 'superuser',
  permissions: {
    feeds_crud: 15,
    feed_takedown_reasons_crud: 15,
    admins_crud: 15,
    stats_crud: 15,
    billing_prices_crud: 15,
    bucket_crud: 15,
    embed_demo_crud: 15,
  },
};

describe('DashboardPage (server)', () => {
  it('redirects to login when there is no session', async () => {
    vi.mocked(getManagementAuthService).mockResolvedValue(null);

    await expect(async () => {
      await DashboardPage();
    }).rejects.toThrow('redirect_called');

    expect(vi.mocked(redirect)).toHaveBeenCalledWith(ROUTES.HOME);
  });

  it('renders the dashboard client when the session is valid', async () => {
    vi.mocked(getManagementAuthService).mockResolvedValue({
      user: mockUser,
      service: {} as ManagementApiRequestService,
    });
    vi.mocked(fetchBucketStorageEnabledForDashboard).mockResolvedValue(false);

    const tree = await DashboardPage();

    expect(tree).not.toBeNull();
    const props = (tree as { props?: { initialUser?: unknown; bucketStorageEnabled?: boolean } })
      .props;
    expect(props?.initialUser).toEqual(mockUser);
    expect(props?.bucketStorageEnabled).toBe(false);
  });
});
