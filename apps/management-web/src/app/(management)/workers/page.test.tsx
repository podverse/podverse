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
import { ROUTES } from '../../../lib/routes';
import WorkersPage from './page.js';

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

describe('WorkersPage (server)', () => {
  it('redirects to login when there is no session', async () => {
    vi.mocked(getManagementSessionUser).mockResolvedValue(null);

    await expect(async () => {
      await WorkersPage();
    }).rejects.toThrow('redirect_called');

    expect(vi.mocked(redirect)).toHaveBeenCalledWith(ROUTES.HOME);
  });

  it('renders the workers page client when the session is valid', async () => {
    vi.mocked(getManagementSessionUser).mockResolvedValue(mockUser);

    const tree = await WorkersPage();

    expect(tree).not.toBeNull();
  });
});
