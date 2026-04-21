import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('redirect_called');
  }),
}));

vi.mock('../../lib/auth/serverManagementSession.js', () => ({
  getManagementSessionUser: vi.fn(),
}));

import { redirect } from 'next/navigation';

import { getManagementSessionUser } from '../../lib/auth/serverManagementSession.js';
import DashboardPage from './page.js';

describe('DashboardPage (server)', () => {
  it('redirects to login when there is no session', async () => {
    vi.mocked(getManagementSessionUser).mockResolvedValue(null);

    await expect(async () => {
      await DashboardPage();
    }).rejects.toThrow('redirect_called');

    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/');
  });

  it('renders the dashboard client when the session is valid', async () => {
    const user = { id: 1, id_text: 'u1', created_at: '2024-01-01T00:00:00.000Z' };
    vi.mocked(getManagementSessionUser).mockResolvedValue(user);

    const tree = await DashboardPage();

    expect(tree).not.toBeNull();
    expect((tree as { props?: { initialUser?: unknown } }).props?.initialUser).toEqual(user);
  });
});
