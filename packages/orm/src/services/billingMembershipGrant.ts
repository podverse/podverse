import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import { BillingMembershipGrant } from '@orm/entities/billingMembershipGrant.js';
import type { DataSource } from 'typeorm';
import { QueryFailedError } from 'typeorm';

import type { MembershipGrantSource } from '@podverse/helpers';

import { BillingEntitlementService } from './billingEntitlement.js';
import type { BillingEntitlementRecomputeResult } from './billingEntitlement.js';

type BillingMembershipGrantServiceParams = {
  dataSourceRead?: DataSource;
  dataSourceReadWrite?: DataSource;
  billingEntitlementService?: BillingEntitlementService;
};

type CreateBillingMembershipGrantParams = {
  accountId: number;
  source: MembershipGrantSource;
  startsAt: Date;
  endsAt: Date;
  billingSubscriptionId?: number | null;
  billingTransactionId?: number | null;
  membershipClaimTokenId?: string | null;
  revokedAt?: Date | null;
  now?: Date;
};

type CreateBillingMembershipGrantResult = {
  grant: BillingMembershipGrant;
  created: boolean;
  entitlement: BillingEntitlementRecomputeResult;
};

function isPostgresUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  if ('code' in error && error.code === '23505') {
    return true;
  }
  const driverError = error.driverError;
  if (typeof driverError !== 'object' || driverError === null || !('code' in driverError)) {
    return false;
  }
  return Reflect.get(driverError, 'code') === '23505';
}

export class BillingMembershipGrantService {
  private dataSourceRead: DataSource;
  private dataSourceReadWrite: DataSource;
  private billingEntitlementService: BillingEntitlementService;

  constructor(params?: BillingMembershipGrantServiceParams) {
    this.dataSourceRead = params?.dataSourceRead ?? getDataSourceRead();
    this.dataSourceReadWrite = params?.dataSourceReadWrite ?? getDataSourceReadWrite();
    this.billingEntitlementService =
      params?.billingEntitlementService ??
      new BillingEntitlementService({ dataSourceReadWrite: this.dataSourceReadWrite });
  }

  private async findExistingGrantByUniqueReference(
    params: CreateBillingMembershipGrantParams
  ): Promise<BillingMembershipGrant | null> {
    const repository = this.dataSourceRead.getRepository(BillingMembershipGrant);
    if (params.billingTransactionId !== undefined && params.billingTransactionId !== null) {
      return repository.findOne({ where: { billing_transaction_id: params.billingTransactionId } });
    }
    if (params.membershipClaimTokenId !== undefined && params.membershipClaimTokenId !== null) {
      return repository.findOne({
        where: { membership_claim_token_id: params.membershipClaimTokenId },
      });
    }
    return null;
  }

  async createGrant(
    params: CreateBillingMembershipGrantParams
  ): Promise<CreateBillingMembershipGrantResult> {
    const now = params.now ?? new Date();
    const repository = this.dataSourceReadWrite.getRepository(BillingMembershipGrant);

    let grant = repository.create({
      account_id: params.accountId,
      source: params.source,
      starts_at: params.startsAt,
      ends_at: params.endsAt,
      revoked_at: params.revokedAt ?? null,
      billing_subscription_id: params.billingSubscriptionId ?? null,
      billing_transaction_id: params.billingTransactionId ?? null,
      membership_claim_token_id: params.membershipClaimTokenId ?? null,
    });
    let created = true;

    try {
      grant = await repository.save(grant);
    } catch (error) {
      if (!isPostgresUniqueViolation(error)) {
        throw error;
      }
      const existing = await this.findExistingGrantByUniqueReference(params);
      if (existing === null) {
        throw error;
      }
      grant = existing;
      created = false;
    }

    const entitlement = await this.billingEntitlementService.recompute(params.accountId, now);
    return { grant, created, entitlement };
  }
}

export type { CreateBillingMembershipGrantParams, CreateBillingMembershipGrantResult };
