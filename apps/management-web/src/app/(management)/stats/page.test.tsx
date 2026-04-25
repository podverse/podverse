import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('redirect_called');
  }),
}));

vi.mock('../../../lib/auth/serverManagementSession', () => ({
  getManagementSessionUser: vi.fn(),
}));

import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../../lib/auth/serverManagementSession';
import StatsPage from './page.js';

const mockUser = {
  id: 1,
  id_text: 'u1',
  email: 'u1@example.com',
  role: 'superuser',
  permissions: {
    feeds_crud: 15,
    feed_flag_statuses_crud: 15,
    feed_flag_status_reasons_crud: 15,
    admins_crud: 15,
    stats_crud: 15,
  },
};

describe('StatsPage (server)', () => {
  it('redirects to login when there is no session', async () => {
    vi.mocked(getManagementSessionUser).mockResolvedValue(null);

    await expect(async () => {
      await StatsPage();
    }).rejects.toThrow('redirect_called');

    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/');
  });

  it('renders the stats client when the session is valid', async () => {
    vi.mocked(getManagementSessionUser).mockResolvedValue(mockUser);

    const tree = await StatsPage();

    expect(tree).not.toBeNull();
    expect((tree as { props?: { initialUser?: unknown } }).props?.initialUser).toEqual(mockUser);
  });
});
