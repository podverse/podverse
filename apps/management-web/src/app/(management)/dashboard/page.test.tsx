import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('redirect_called');
  }),
}));

vi.mock('../../../lib/auth/serverManagementSession.js', () => ({
  getManagementSessionUser: vi.fn(),
}));

import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession.js';
import DashboardPage from './page.js';

const mockUser = {
  id: 1,
  id_text: 'u1',
  email: 'u1@example.com',
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

    const tree = await DashboardPage();

    expect(tree).not.toBeNull();
    expect((tree as { props?: { initialUser?: unknown } }).props?.initialUser).toEqual(mockUser);
  });
});
