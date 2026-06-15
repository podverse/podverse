import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountMembershipEnum, EMBED_DEMO_SYSTEM_ACCOUNT_USERNAME } from '@podverse/helpers';
import type { Account } from '@podverse/orm';

const updateMock = vi.fn();

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockAccountMembershipStatusService {
    update = updateMock;
  }

  return {
    ...actual,
    AccountMembershipStatusService: MockAccountMembershipStatusService,
  };
});

import {
  ensureEmbedDemoSystemAccount,
  generateEmbedDemoSystemPassword,
} from './ensureEmbedDemoSystemAccount.js';

const embedDemoAccountRelations = {
  relations: {
    account_membership_status: {
      account_membership: true,
    },
  },
} as const;

describe('generateEmbedDemoSystemPassword', () => {
  it('returns a password that meets validation rules', () => {
    const password = generateEmbedDemoSystemPassword();

    expect(password.length).toBeGreaterThanOrEqual(8);
    expect(/[^a-z]/.test(password)).toBe(true);
  });
});

describe('ensureEmbedDemoSystemAccount', () => {
  beforeEach(() => {
    updateMock.mockReset();
    updateMock.mockResolvedValue(undefined);
  });

  it('creates the demo account and sets premium membership when missing', async () => {
    const createdAccount = { id: 42 } as Account;
    const getByUsername = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(createdAccount);
    const create = vi.fn().mockResolvedValue(undefined);
    const accountService = { getByUsername, create };

    const accountId = await ensureEmbedDemoSystemAccount(accountService);

    expect(accountId).toBe(42);
    expect(getByUsername).toHaveBeenCalledWith(
      EMBED_DEMO_SYSTEM_ACCOUNT_USERNAME,
      embedDemoAccountRelations
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: EMBED_DEMO_SYSTEM_ACCOUNT_USERNAME,
        locale: 'en-US',
      }),
      true
    );
    expect(updateMock).toHaveBeenCalledWith(
      createdAccount,
      expect.objectContaining({
        account_membership_id: AccountMembershipEnum.Premium,
        membership_expires_at: expect.any(Date),
      })
    );
    const expiresAt = updateMock.mock.calls[0]?.[1]?.membership_expires_at as Date;
    expect(expiresAt.getUTCFullYear()).toBeGreaterThanOrEqual(new Date().getUTCFullYear() + 99);
  });

  it('repairs membership on an existing demo account without recreating it', async () => {
    const existingAccount = { id: 7 } as Account;
    const getByUsername = vi.fn().mockResolvedValue(existingAccount);
    const create = vi.fn();
    const accountService = { getByUsername, create };

    const accountId = await ensureEmbedDemoSystemAccount(accountService);

    expect(accountId).toBe(7);
    expect(create).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      existingAccount,
      expect.objectContaining({
        account_membership_id: AccountMembershipEnum.Premium,
      })
    );
  });
});
