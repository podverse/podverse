import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import { AccountMembershipStatus } from '@orm/entities/account/accountMembershipStatus.js';
import { BillingMembershipGrant } from '@orm/entities/billingMembershipGrant.js';
import { BillingEntitlementService } from '@orm/services/billingEntitlement.js';
import { BillingMembershipGrantService } from '@orm/services/billingMembershipGrant.js';
import type { DataSource, EntityManager } from 'typeorm';

import type { BillingCadence, MembershipGrantSource } from '@podverse/helpers';
import {
  AccountMembershipEnum,
  extendMembershipPeriodByCadence,
  extendMembershipPeriodByMonths,
  isAdminEditableGrant,
  MS_PER_SECOND,
  resolveMembershipExtensionBaseDate,
  SECONDS_PER_DAY,
} from '@podverse/helpers';

type GrantReferences = {
  billingSubscriptionId?: number | null;
  billingTransactionId?: number | null;
  membershipClaimTokenId?: string | null;
};

type ExtendMembershipBaseParams = GrantReferences & {
  accountId: number;
  idempotencyKey: string;
  source?: MembershipGrantSource;
  accountMembershipId?: AccountMembershipEnum;
  now?: Date;
};

type ExtendMembershipByCadenceParams = ExtendMembershipBaseParams & {
  cadence: BillingCadence;
};

type ExtendMembershipByMonthsParams = ExtendMembershipBaseParams & {
  monthsToAdd: number;
};

type ExtendMembershipByDaysParams = ExtendMembershipBaseParams & {
  days: number;
};

type ExtendMembershipToDateParams = ExtendMembershipBaseParams & {
  expiresAt: Date;
};

type StartTrialParams = {
  accountId: number;
  trialSeconds: number;
  now: Date;
};

type ExtendMembershipResult = {
  applied: boolean;
  membershipExpiresAt: Date | null;
};

type MembershipAccessChangeResult = {
  membershipExpiresAt: Date | null;
};

type BillingMembershipExtensionServiceParams = {
  dataSourceRead?: DataSource;
  dataSourceReadWrite?: DataSource;
};

/**
 * A change would remove access a processor or a claim token paid for. The operator cancels or
 * refunds that access with the processor instead.
 */
export class ProtectedMembershipAccessError extends Error {
  /** When the protected access ends; null when the targeted grant itself is protected. */
  readonly accessEndsAt: Date | null;

  constructor(accessEndsAt: Date | null) {
    super(
      accessEndsAt === null
        ? 'This grant was paid through a processor or claim token and cannot be changed here.'
        : 'Paid access continues past the requested end. Cancel or refund it with the processor.'
    );
    this.name = 'ProtectedMembershipAccessError';
    this.accessEndsAt = accessEndsAt;
  }
}

export class MembershipGrantNotFoundError extends Error {
  constructor() {
    super('Membership grant not found');
    this.name = 'MembershipGrantNotFoundError';
  }
}

function resolveMembershipGrantStart(membershipExpiresAt: Date | null, now: Date): Date {
  if (membershipExpiresAt !== null && membershipExpiresAt > now) {
    return membershipExpiresAt;
  }
  return now;
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer`);
  }
}

/**
 * Every admin, trial, and claim membership write goes through here. Each method runs as one unit
 * of work under the account's status row lock, so concurrent extensions stack instead of
 * overlapping, and the cached `membership_expires_at` is written only by the entitlement
 * recompute at the end of that unit.
 */
export class BillingMembershipExtensionService {
  private dataSourceReadWrite: DataSource;
  private billingEntitlementService: BillingEntitlementService;
  private billingMembershipGrantService: BillingMembershipGrantService;

  constructor(params?: BillingMembershipExtensionServiceParams) {
    const dataSourceRead = params?.dataSourceRead ?? getDataSourceRead();
    this.dataSourceReadWrite = params?.dataSourceReadWrite ?? getDataSourceReadWrite();
    this.billingEntitlementService = new BillingEntitlementService({
      dataSourceReadWrite: this.dataSourceReadWrite,
    });
    this.billingMembershipGrantService = new BillingMembershipGrantService({
      dataSourceRead,
      dataSourceReadWrite: this.dataSourceReadWrite,
      billingEntitlementService: this.billingEntitlementService,
    });
  }

  private async getStatusWithManager(
    transactionalEntityManager: EntityManager,
    accountId: number
  ): Promise<AccountMembershipStatus> {
    const status = await transactionalEntityManager
      .getRepository(AccountMembershipStatus)
      .createQueryBuilder('status')
      .leftJoinAndSelect('status.account_membership', 'account_membership')
      .where('status.account_id = :accountId', { accountId })
      .getOne();
    if (!status) {
      throw new Error('AccountMembershipStatus not found');
    }
    return status;
  }

  /**
   * Accounts written before the ledger (and seeds that set the cache directly) can hold a cached
   * expiry no grant covers. The next recompute would drop that time, so before any ledger write
   * the uncovered time becomes a `migration_baseline` grant. Returns the account's status and the
   * access expiry after adoption. The caller holds the account lock.
   */
  private async adoptCachedExpiryWithManager(
    transactionalEntityManager: EntityManager,
    accountId: number,
    now: Date
  ): Promise<{ status: AccountMembershipStatus; membershipExpiresAt: Date | null }> {
    const status = await this.getStatusWithManager(transactionalEntityManager, accountId);
    const access = await this.billingEntitlementService.computeAccessWithManager(
      transactionalEntityManager,
      accountId,
      now
    );
    const cachedExpiresAt = status.membership_expires_at ?? null;
    const derivedExpiresAt = access.membershipExpiresAt;

    if (
      cachedExpiresAt === null ||
      (derivedExpiresAt !== null && cachedExpiresAt <= derivedExpiresAt)
    ) {
      return { status, membershipExpiresAt: derivedExpiresAt };
    }

    await this.billingMembershipGrantService.insertWithManager(transactionalEntityManager, {
      accountId,
      source: 'migration_baseline',
      startsAt: cachedExpiresAt < now ? cachedExpiresAt : now,
      endsAt: cachedExpiresAt,
    });
    return { status, membershipExpiresAt: cachedExpiresAt };
  }

  private async findGrantByUniqueReferenceWithManager(
    transactionalEntityManager: EntityManager,
    references: GrantReferences
  ): Promise<BillingMembershipGrant | null> {
    const repository = transactionalEntityManager.getRepository(BillingMembershipGrant);
    if (
      references.billingTransactionId !== undefined &&
      references.billingTransactionId !== null
    ) {
      return repository.findOne({
        where: { billing_transaction_id: references.billingTransactionId },
      });
    }
    if (
      references.membershipClaimTokenId !== undefined &&
      references.membershipClaimTokenId !== null
    ) {
      return repository.findOne({
        where: { membership_claim_token_id: references.membershipClaimTokenId },
      });
    }
    return null;
  }

  private async applyGrant(
    params: GrantReferences & {
      accountId: number;
      idempotencyKey: string;
      source: MembershipGrantSource;
      /** Computed from the locked, adopted expiry so concurrent extensions stack. */
      resolveEndsAt: (membershipExpiresAt: Date | null, now: Date) => Date;
      accountMembershipId?: AccountMembershipEnum;
      /** Omitted keeps the account's current cadence. */
      billingCadence?: BillingCadence;
      now: Date;
    }
  ): Promise<ExtendMembershipResult> {
    const { result: applied, entitlement } = await this.billingEntitlementService.withAccountLock(
      params.accountId,
      async (transactionalEntityManager) => {
        const { status, membershipExpiresAt } = await this.adoptCachedExpiryWithManager(
          transactionalEntityManager,
          params.accountId,
          params.now
        );
        if (status.last_extension_idempotency_key === params.idempotencyKey) {
          return false;
        }

        const startsAt = resolveMembershipGrantStart(membershipExpiresAt, params.now);
        const endsAt = params.resolveEndsAt(membershipExpiresAt, params.now);
        if (endsAt < startsAt) {
          return false;
        }

        const existingGrant = await this.findGrantByUniqueReferenceWithManager(
          transactionalEntityManager,
          params
        );
        if (existingGrant === null) {
          await this.billingMembershipGrantService.insertWithManager(transactionalEntityManager, {
            accountId: params.accountId,
            source: params.source,
            startsAt,
            endsAt,
            billingSubscriptionId: params.billingSubscriptionId,
            billingTransactionId: params.billingTransactionId,
            membershipClaimTokenId: params.membershipClaimTokenId,
          });
        }

        await this.billingEntitlementService.setAccountMembershipWithManager(
          transactionalEntityManager,
          params.accountId,
          params.accountMembershipId ??
            status.account_membership?.id ??
            AccountMembershipEnum.Premium
        );
        await transactionalEntityManager
          .getRepository(AccountMembershipStatus)
          .update(
            { account: { id: params.accountId } },
            {
              last_extension_idempotency_key: params.idempotencyKey,
              billing_cadence: params.billingCadence ?? status.billing_cadence ?? null,
            }
          );
        return true;
      },
      params.now
    );

    return { applied, membershipExpiresAt: entitlement.membershipExpiresAt };
  }

  async extendByCadence(params: ExtendMembershipByCadenceParams): Promise<ExtendMembershipResult> {
    return this.applyGrant({
      ...params,
      source: params.source ?? 'admin',
      billingCadence: params.cadence,
      resolveEndsAt: (membershipExpiresAt, now) =>
        extendMembershipPeriodByCadence({ membershipExpiresAt, cadence: params.cadence, now }),
      now: params.now ?? new Date(),
    });
  }

  async extendByMonths(params: ExtendMembershipByMonthsParams): Promise<ExtendMembershipResult> {
    return this.applyGrant({
      ...params,
      source: params.source ?? 'admin',
      resolveEndsAt: (membershipExpiresAt, now) =>
        extendMembershipPeriodByMonths({
          membershipExpiresAt,
          monthsToAdd: params.monthsToAdd,
          now,
        }),
      now: params.now ?? new Date(),
    });
  }

  async extendByDays(params: ExtendMembershipByDaysParams): Promise<ExtendMembershipResult> {
    assertPositiveInteger(params.days, 'days');
    return this.applyGrant({
      ...params,
      source: params.source ?? 'admin',
      resolveEndsAt: (membershipExpiresAt, now) =>
        new Date(
          resolveMembershipExtensionBaseDate(membershipExpiresAt, now).getTime() +
            params.days * SECONDS_PER_DAY * MS_PER_SECOND
        ),
      now: params.now ?? new Date(),
    });
  }

  async extendToDate(params: ExtendMembershipToDateParams): Promise<ExtendMembershipResult> {
    return this.applyGrant({
      ...params,
      source: params.source ?? 'admin',
      resolveEndsAt: () => params.expiresAt,
      now: params.now ?? new Date(),
    });
  }

  /**
   * Inserts the free trial grant `[now, now + trialSeconds]` and recomputes, inside the caller's
   * transaction so account creation and the trial commit together. The status row must exist.
   */
  async startTrialWithManager(
    transactionalEntityManager: EntityManager,
    params: StartTrialParams
  ): Promise<void> {
    assertPositiveInteger(params.trialSeconds, 'trialSeconds');
    await this.billingEntitlementService.lockStatusWithManager(
      transactionalEntityManager,
      params.accountId
    );
    await this.adoptCachedExpiryWithManager(
      transactionalEntityManager,
      params.accountId,
      params.now
    );
    await this.billingMembershipGrantService.insertWithManager(transactionalEntityManager, {
      accountId: params.accountId,
      source: 'trial',
      startsAt: params.now,
      endsAt: new Date(params.now.getTime() + params.trialSeconds * MS_PER_SECOND),
    });
    await this.billingEntitlementService.recomputeWithManager(
      transactionalEntityManager,
      params.accountId,
      params.now
    );
  }

  async startTrial(params: StartTrialParams): Promise<void> {
    await this.dataSourceReadWrite.transaction(async (transactionalEntityManager) =>
      this.startTrialWithManager(transactionalEntityManager, params)
    );
  }

  /**
   * Records that membership lapsed on a past date: an `admin` grant `[expiresAt, expiresAt]`,
   * which dates the lapse without granting access.
   */
  async recordPastExpiry(params: {
    accountId: number;
    expiresAt: Date;
    now?: Date;
  }): Promise<MembershipAccessChangeResult> {
    const now = params.now ?? new Date();
    if (params.expiresAt > now) {
      throw new RangeError('expiresAt must not be in the future');
    }
    const { entitlement } = await this.billingEntitlementService.withAccountLock(
      params.accountId,
      async (transactionalEntityManager) => {
        await this.adoptCachedExpiryWithManager(transactionalEntityManager, params.accountId, now);
        await this.billingMembershipGrantService.insertWithManager(transactionalEntityManager, {
          accountId: params.accountId,
          source: 'admin',
          startsAt: params.expiresAt,
          endsAt: params.expiresAt,
        });
      },
      now
    );
    return { membershipExpiresAt: entitlement.membershipExpiresAt };
  }

  /**
   * Ends admin-editable access at `endsAt` (now or a past date means access ends then). Grants
   * that start at or after `endsAt` are revoked; grants running past it are cut back to it.
   * Throws `ProtectedMembershipAccessError`, rolling back every change, when access a processor
   * or claim token paid for still runs past `endsAt`.
   */
  async endAccess(params: {
    accountId: number;
    endsAt: Date;
    now?: Date;
  }): Promise<MembershipAccessChangeResult> {
    const now = params.now ?? new Date();
    const { entitlement } = await this.billingEntitlementService.withAccountLock(
      params.accountId,
      async (transactionalEntityManager) => {
        await this.adoptCachedExpiryWithManager(transactionalEntityManager, params.accountId, now);

        const grants = await this.billingMembershipGrantService.listByAccountWithManager(
          transactionalEntityManager,
          params.accountId
        );
        const grantIdsToRevoke: number[] = [];
        for (const grant of grants) {
          if (grant.revoked_at !== null || !isAdminEditableGrant(grant)) {
            continue;
          }
          if (grant.starts_at >= params.endsAt) {
            grantIdsToRevoke.push(grant.id);
          } else if (grant.ends_at > params.endsAt) {
            await this.billingMembershipGrantService.updateEndsAtWithManager(
              transactionalEntityManager,
              grant.id,
              params.endsAt
            );
          }
        }
        await this.billingMembershipGrantService.revokeWithManager(
          transactionalEntityManager,
          grantIdsToRevoke,
          now
        );

        const access = await this.billingEntitlementService.computeAccessWithManager(
          transactionalEntityManager,
          params.accountId,
          now
        );
        if (access.membershipExpiresAt !== null && access.membershipExpiresAt > params.endsAt) {
          throw new ProtectedMembershipAccessError(access.membershipExpiresAt);
        }
      },
      now
    );
    return { membershipExpiresAt: entitlement.membershipExpiresAt };
  }

  /** Revokes one admin-editable grant. Revoking an already-revoked grant changes nothing. */
  async revokeGrant(params: {
    accountId: number;
    grantId: number;
    now?: Date;
  }): Promise<MembershipAccessChangeResult> {
    const now = params.now ?? new Date();
    const { entitlement } = await this.billingEntitlementService.withAccountLock(
      params.accountId,
      async (transactionalEntityManager) => {
        await this.adoptCachedExpiryWithManager(transactionalEntityManager, params.accountId, now);

        const grant = await transactionalEntityManager
          .getRepository(BillingMembershipGrant)
          .findOne({ where: { id: params.grantId, account_id: params.accountId } });
        if (grant === null) {
          throw new MembershipGrantNotFoundError();
        }
        if (!isAdminEditableGrant(grant)) {
          throw new ProtectedMembershipAccessError(null);
        }
        await this.billingMembershipGrantService.revokeWithManager(
          transactionalEntityManager,
          [grant.id],
          now
        );
      },
      now
    );
    return { membershipExpiresAt: entitlement.membershipExpiresAt };
  }

  /** Moves the account to another tier under the lock, clearing overrides when the tier changes. */
  async setAccountMembership(params: {
    accountId: number;
    accountMembershipId: AccountMembershipEnum;
    now?: Date;
  }): Promise<MembershipAccessChangeResult> {
    const now = params.now ?? new Date();
    const { entitlement } = await this.billingEntitlementService.withAccountLock(
      params.accountId,
      async (transactionalEntityManager) => {
        await this.adoptCachedExpiryWithManager(transactionalEntityManager, params.accountId, now);
        await this.billingEntitlementService.setAccountMembershipWithManager(
          transactionalEntityManager,
          params.accountId,
          params.accountMembershipId
        );
      },
      now
    );
    return { membershipExpiresAt: entitlement.membershipExpiresAt };
  }
}
