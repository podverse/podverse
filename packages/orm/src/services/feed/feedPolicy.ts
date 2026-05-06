/**
 * Effective `feed_policy` rows are derived from active `feed_condition` rows + overrides.
 */
import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import type { FeedConditionSourceEnum } from '@orm/entities/feed/feedCondition.js';
import { FeedCondition } from '@orm/entities/feed/feedCondition.js';
import type { FeedConditionTypeKeyEnum } from '@orm/entities/feed/feedConditionType.js';
import { FeedConditionType } from '@orm/entities/feed/feedConditionType.js';
import { FeedPolicy } from '@orm/entities/feed/feedPolicy.js';
import { FeedPolicyOverride } from '@orm/entities/feed/feedPolicyOverride.js';
import {
  applyLifecycleConstraintsToComputedPolicy,
  applyLifecycleConstraintsToEffectiveFlags,
  type ComputedFeedEffectivePolicy,
  computeEffectivePolicyFromConditionKeys,
} from '@orm/lib/feedEffectivePolicyComputed.js';
import type { EntityManager } from 'typeorm';
import type { Repository } from 'typeorm';

export type { ComputedFeedEffectivePolicy };
export {
  applyLifecycleConstraintsToComputedPolicy,
  applyLifecycleConstraintsToEffectiveFlags,
  computeEffectivePolicyFromConditionKeys,
};

export function isFeedPolicyPubliclyVisible(feedPolicy: FeedPolicy | null | undefined): boolean {
  if (!feedPolicy) {
    return true;
  }
  return feedPolicy.public_visible;
}

export function isFeedPolicyParseAllowed(feedPolicy: FeedPolicy | null | undefined): boolean {
  if (!feedPolicy) {
    return true;
  }
  return feedPolicy.parse_allowed;
}

export function isFeedPolicyAddAllowed(feedPolicy: FeedPolicy | null | undefined): boolean {
  if (!feedPolicy) {
    return true;
  }
  return feedPolicy.add_allowed;
}

export class FeedPolicyService {
  constructor(private readonly transactionalEntityManager?: EntityManager) {}

  private conditionTypeReadRepo(): Repository<FeedConditionType> {
    return this.transactionalEntityManager
      ? this.transactionalEntityManager.getRepository(FeedConditionType)
      : AppDataSourceRead.getRepository(FeedConditionType);
  }

  private conditionReadRepo(): Repository<FeedCondition> {
    return this.transactionalEntityManager
      ? this.transactionalEntityManager.getRepository(FeedCondition)
      : AppDataSourceRead.getRepository(FeedCondition);
  }

  private conditionReadWriteRepo(): Repository<FeedCondition> {
    return this.transactionalEntityManager
      ? this.transactionalEntityManager.getRepository(FeedCondition)
      : AppDataSourceReadWrite.getRepository(FeedCondition);
  }

  private policyReadRepo(): Repository<FeedPolicy> {
    return this.transactionalEntityManager
      ? this.transactionalEntityManager.getRepository(FeedPolicy)
      : AppDataSourceRead.getRepository(FeedPolicy);
  }

  private policyReadWriteRepo(): Repository<FeedPolicy> {
    return this.transactionalEntityManager
      ? this.transactionalEntityManager.getRepository(FeedPolicy)
      : AppDataSourceReadWrite.getRepository(FeedPolicy);
  }

  private policyOverrideReadRepo(): Repository<FeedPolicyOverride> {
    return this.transactionalEntityManager
      ? this.transactionalEntityManager.getRepository(FeedPolicyOverride)
      : AppDataSourceRead.getRepository(FeedPolicyOverride);
  }

  private async getOrCreateConditionType(
    conditionKey: FeedConditionTypeKeyEnum
  ): Promise<FeedConditionType> {
    const existing = await this.conditionTypeReadRepo().findOne({
      where: { condition_key: conditionKey },
    });

    if (existing) {
      return existing;
    }

    const created = new FeedConditionType();
    created.condition_key = conditionKey;
    return this.conditionReadWriteRepo().manager.save(created);
  }

  async setCondition({
    feedId,
    conditionKey,
    isActive,
    source,
    note,
  }: {
    feedId: number;
    conditionKey: FeedConditionTypeKeyEnum;
    isActive: boolean;
    source: FeedConditionSourceEnum;
    note?: string | null;
  }): Promise<FeedCondition> {
    const conditionType = await this.getOrCreateConditionType(conditionKey);

    let feedCondition = await this.conditionReadRepo().findOne({
      where: {
        feed_id: feedId,
        feed_condition_type_id: conditionType.id,
      },
    });

    if (!feedCondition) {
      feedCondition = new FeedCondition();
      feedCondition.feed_id = feedId;
      feedCondition.feed_condition_type_id = conditionType.id;
    }

    feedCondition.is_active = isActive;
    feedCondition.source = source;
    feedCondition.note = note === undefined ? null : note;
    return this.conditionReadWriteRepo().save(feedCondition);
  }

  async getActiveConditionKeys(feedId: number): Promise<FeedConditionTypeKeyEnum[]> {
    const rows = await this.conditionReadRepo().find({
      where: {
        feed_id: feedId,
        is_active: true,
      },
      relations: {
        feed_condition_type: true,
      },
    });

    return rows
      .map((row) => row.feed_condition_type?.condition_key)
      .filter((key): key is FeedConditionTypeKeyEnum => key !== undefined);
  }

  async recomputePolicy(feedId: number): Promise<FeedPolicy> {
    const conditionKeys = await this.getActiveConditionKeys(feedId);
    const computed = computeEffectivePolicyFromConditionKeys(conditionKeys);
    const override = await this.policyOverrideReadRepo().findOne({
      where: { feed_id: feedId },
    });

    let parseAllowed = computed.parseAllowed;
    let publicVisible = computed.publicVisible;
    let addAllowed = computed.addAllowed;

    if (
      override?.parse_allowed_override !== null &&
      override?.parse_allowed_override !== undefined
    ) {
      parseAllowed = override.parse_allowed_override;
    }
    if (
      override?.public_visible_override !== null &&
      override?.public_visible_override !== undefined
    ) {
      publicVisible = override.public_visible_override;
    }
    if (override?.add_allowed_override !== null && override?.add_allowed_override !== undefined) {
      addAllowed = override.add_allowed_override;
    }

    let policy = await this.policyReadRepo().findOne({
      where: { feed_id: feedId },
    });

    if (!policy) {
      policy = new FeedPolicy();
      policy.feed_id = feedId;
    }

    policy.parse_allowed = parseAllowed;
    policy.public_visible = publicVisible;
    policy.add_allowed = addAllowed;
    policy.primary_block_reason = computed.primaryBlockReason;
    policy.last_policy_refresh_at = new Date();

    return this.policyReadWriteRepo().save(policy);
  }

  async getByFeedId(feedId: number): Promise<FeedPolicy | null> {
    return this.policyReadRepo().findOne({
      where: { feed_id: feedId },
    });
  }
}
