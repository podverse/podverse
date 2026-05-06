import { AccountPayPalOrder } from '@orm/entities/account/accountPayPalOrder.js';
import { AccountService } from '@orm/services/account/account.js';
import { AccountMembershipStatusService } from '@orm/services/account/accountMembershipStatus.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import { BillingRenewalOrchestratorService } from '@orm/services/billingRenewalOrchestrator.js';
import type { FindOneOptions } from 'typeorm';

import { AccountMembershipEnum, extendMembershipPeriodByCadence } from '@podverse/helpers';

export class AccountPayPalOrderService extends BaseManyService<AccountPayPalOrder, 'account'> {
  private accountService: AccountService;
  private accountMembershipStatusService: AccountMembershipStatusService;
  private billingRenewalOrchestratorService: BillingRenewalOrchestratorService;

  constructor() {
    super(AccountPayPalOrder, 'account');
    this.accountService = new AccountService();
    this.accountMembershipStatusService = new AccountMembershipStatusService();
    this.billingRenewalOrchestratorService = new BillingRenewalOrchestratorService();
  }

  async get(
    account_id: number,
    payment_id: string,
    config?: FindOneOptions<AccountPayPalOrder>
  ): Promise<AccountPayPalOrder | null> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    return this._get(account, { payment_id }, config);
  }

  async create(account_id: number, payment_id: string, state: string): Promise<AccountPayPalOrder> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const existingAccountPayPalOrder = await this.get(account_id, payment_id);
    if (existingAccountPayPalOrder) {
      throw new Error('PayPal Order already exists.');
    }

    return this._update(account, ['payment_id'], { payment_id, state });
  }

  async completePayPalOrder(payment_id: string, state: string, isV2: boolean): Promise<void> {
    const accountPayPalOrder = await this.repositoryRead.findOne({
      where: { payment_id },
      relations: ['account', 'account_membership_status'],
    });

    if (!accountPayPalOrder) {
      throw new Error('PayPal Order not found.');
    }

    if (accountPayPalOrder.state === 'approved') {
      throw new Error('PayPal Order has already been approved.');
    }

    await this._update(accountPayPalOrder.account, ['payment_id'], { payment_id, state });

    const accountMembershipStatus = accountPayPalOrder.account.account_membership_status;

    const newExpirationDate = extendMembershipPeriodByCadence({
      membershipExpiresAt: accountMembershipStatus?.membership_expires_at,
      cadence: 'annual',
    });

    const successState = isV2 ? 'completed' : 'approved';
    if (state === successState) {
      await this.billingRenewalOrchestratorService.handlePaymentSettled({
        accountId: accountPayPalOrder.account.id,
        cadence: 'annual',
        idempotencyKey: `paypal:${payment_id}`,
        provider: 'paypal',
      });
      await this.accountMembershipStatusService.update(accountPayPalOrder.account, {
        account_membership_id: AccountMembershipEnum.Premium,
        membership_expires_at: newExpirationDate,
        billing_cadence: 'annual',
      });
    } else {
      throw new Error('PayPal Order not approved.');
    }

    return;
  }
}
