import { describe, expect, it, vi } from 'vitest';

const findOneByMock = vi.fn();
const saveTokenMock = vi.fn();
const accountGetMock = vi.fn();
const membershipStatusGetMock = vi.fn();
const membershipStatusUpdateMock = vi.fn();

vi.mock('@orm/db/index.js', () => ({
  AppDataSourceRead: {
    getRepository: () => ({
      findOne: vi.fn(),
    }),
  },
  AppDataSourceReadWrite: {
    getRepository: () => ({
      findOneBy: findOneByMock,
      save: saveTokenMock,
      create: vi.fn((v: object) => v),
    }),
  },
}));

vi.mock('@orm/entities/membershipClaimToken.js', () => ({
  MembershipClaimToken: class MembershipClaimToken {},
}));

vi.mock('@orm/services/account/account.js', () => ({
  AccountService: class {
    get = accountGetMock;
  },
}));

vi.mock('@orm/services/account/accountMembership.js', () => ({
  AccountMembershipService: class {
    get = vi.fn();
  },
}));

vi.mock('@orm/services/account/accountMembershipStatus.js', () => ({
  AccountMembershipStatusService: class {
    _get = membershipStatusGetMock;
    update = membershipStatusUpdateMock;
  },
}));

vi.mock('@orm/services/billingRenewalOrchestrator.js', () => ({
  BillingRenewalOrchestratorService: class {
    handlePayOnDemandExtensionRequested = vi.fn().mockResolvedValue(undefined);
    handlePaymentSettled = vi.fn().mockResolvedValue(undefined);
  },
}));

import { MembershipClaimTokenService } from './membershipClaimToken.js';

describe('MembershipClaimTokenService.claim', () => {
  it('throws when account is missing', async () => {
    accountGetMock.mockResolvedValueOnce(null);

    const service = new MembershipClaimTokenService();

    await expect(service.claim(1, 'token-id')).rejects.toThrow('Account not found');
    expect(findOneByMock).not.toHaveBeenCalled();
  });

  it('throws when token is missing', async () => {
    accountGetMock.mockResolvedValueOnce({ id: 1 });
    findOneByMock.mockResolvedValueOnce(null);

    const service = new MembershipClaimTokenService();

    await expect(service.claim(1, 'missing')).rejects.toThrow('MembershipClaimToken not found');
    expect(membershipStatusUpdateMock).not.toHaveBeenCalled();
  });

  it('throws when token already claimed', async () => {
    accountGetMock.mockResolvedValueOnce({ id: 1 });
    findOneByMock.mockResolvedValueOnce({
      id: 'tok',
      claimed: true,
      months_to_add: 1,
      account_membership_id: 2,
    });

    const service = new MembershipClaimTokenService();

    await expect(service.claim(1, 'tok')).rejects.toThrow(
      'MembershipClaimToken has already been claimed'
    );
    expect(membershipStatusUpdateMock).not.toHaveBeenCalled();
  });
});
