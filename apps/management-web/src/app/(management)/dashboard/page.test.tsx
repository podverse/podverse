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
    getManagementSessionUser: vi.fn(),
  };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (name === 'pv_mgmt_auth' ? { value: 'test-token' } : undefined),
  })),
}));

vi.mock('../../../lib/server/bucketStorageDashboard.js', () => ({
  fetchBucketStorageEnabledForDashboard: vi.fn(),
}));

import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession.js';
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
  },
};

describe('DashboardPage (server)', () => {
  it('redirects to login when there is no session', async () => {
    vi.mocked(getManagementSessionUser).mockResolvedValue(null);

    await expect(async () => {
      await DashboardPage();
    }).rejects.toThrow('redirect_called');

    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/');
  });

  it('renders the dashboard client when the session is valid', async () => {
    vi.mocked(getManagementSessionUser).mockResolvedValue(mockUser);
    vi.mocked(fetchBucketStorageEnabledForDashboard).mockResolvedValue(false);

    const tree = await DashboardPage();

    expect(tree).not.toBeNull();
    const props = (tree as { props?: { initialUser?: unknown; bucketStorageEnabled?: boolean } })
      .props;
    expect(props?.initialUser).toEqual(mockUser);
    expect(props?.bucketStorageEnabled).toBe(false);
  });
});
