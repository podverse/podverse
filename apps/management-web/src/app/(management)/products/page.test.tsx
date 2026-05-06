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
import ProductsPage from './page.js';

describe('ProductsPage (server)', () => {
  it('redirects to login when there is no session', async () => {
    vi.mocked(getManagementSessionUser).mockResolvedValue(null);

    await expect(async () => {
      await ProductsPage();
    }).rejects.toThrow('redirect_called');

    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/');
  });

  it('redirects non-superusers to the dashboard', async () => {
    vi.mocked(getManagementSessionUser).mockResolvedValue({
      id: 2,
      id_text: 'u2',
      email: 'admin@example.com',
      role: 'admin',
      permissions: null,
    });

    await expect(async () => {
      await ProductsPage();
    }).rejects.toThrow('redirect_called');

    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/dashboard');
  });

  it('renders the products client for a superuser', async () => {
    vi.mocked(getManagementSessionUser).mockResolvedValue({
      id: 1,
      id_text: 'u1',
      email: 'super@example.com',
      role: 'superuser',
      permissions: {
        feeds_crud: 15,
        feed_takedown_reasons_crud: 15,
        admins_crud: 15,
        stats_crud: 15,
      },
    });

    const tree = await ProductsPage();
    expect(tree).not.toBeNull();
  });
});
