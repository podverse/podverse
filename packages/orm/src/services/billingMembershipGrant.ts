import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import { BillingMembershipGrant } from '@orm/entities/billingMembershipGrant.js';
import type { DataSource, EntityManager } from 'typeorm';
import { In, IsNull, QueryFailedError } from 'typeorm';

import type { MembershipGrantSource } from '@podverse/helpers';

import type { BillingEntitlementRecomputeResult } from './billingEntitlement.js';
import { BillingEntitlementService } from './billingEntitlement.js';

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

  async listForAccount(accountId: number): Promise<BillingMembershipGrant[]> {
    return this.dataSourceRead.getRepository(BillingMembershipGrant).find({
      where: { account_id: accountId },
      order: { starts_at: 'DESC', id: 'DESC' },
    });
  }

  async listByAccountWithManager(
    transactionalEntityManager: EntityManager,
    accountId: number
  ): Promise<BillingMembershipGrant[]> {
    return transactionalEntityManager.getRepository(BillingMembershipGrant).find({
      where: { account_id: accountId },
      order: { starts_at: 'ASC', id: 'ASC' },
    });
  }

  async getByTransactionIdWithManager(
    transactionalEntityManager: EntityManager,
    billingTransactionId: number
  ): Promise<BillingMembershipGrant | null> {
    return transactionalEntityManager.getRepository(BillingMembershipGrant).findOne({
      where: { billing_transaction_id: billingTransactionId },
    });
  }

  /**
   * Inserts without recomputing. The caller holds the account lock (see
   * `BillingEntitlementService.withAccountLock`), checks unique references first, and recomputes
   * once for the whole unit of work. A unique violation here aborts the transaction.
   */
  async insertWithManager(
    transactionalEntityManager: EntityManager,
    params: Omit<CreateBillingMembershipGrantParams, 'now'>
  ): Promise<BillingMembershipGrant> {
    const repository = transactionalEntityManager.getRepository(BillingMembershipGrant);
    return repository.save(
      repository.create({
        account_id: params.accountId,
        source: params.source,
        starts_at: params.startsAt,
        ends_at: params.endsAt,
        revoked_at: params.revokedAt ?? null,
        billing_transaction_id: params.billingTransactionId ?? null,
        membership_claim_token_id: params.membershipClaimTokenId ?? null,
      })
    );
  }

  async updateEndsAtWithManager(
    transactionalEntityManager: EntityManager,
    grantId: number,
    endsAt: Date
  ): Promise<void> {
    await transactionalEntityManager
      .getRepository(BillingMembershipGrant)
      .update({ id: grantId }, { ends_at: endsAt });
  }

  /** Grants already revoked keep their original `revoked_at`. */
  async revokeWithManager(
    transactionalEntityManager: EntityManager,
    grantIds: number[],
    revokedAt: Date
  ): Promise<void> {
    if (grantIds.length === 0) {
      return;
    }
    await transactionalEntityManager
      .getRepository(BillingMembershipGrant)
      .update({ id: In(grantIds), revoked_at: IsNull() }, { revoked_at: revokedAt });
  }
}

export type { CreateBillingMembershipGrantParams, CreateBillingMembershipGrantResult };
