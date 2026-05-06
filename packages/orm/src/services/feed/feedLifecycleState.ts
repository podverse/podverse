import { AppDataSourceReadWrite } from '@orm/db/index.js';
import { FeedLifecycleState as FeedLifecycleStateRow } from '@orm/entities/feed/feedLifecycleState.js';
import {
  FeedLifecycleStateKeyEnum,
  FeedLifecycleStateType,
} from '@orm/entities/feed/feedLifecycleStateType.js';
import type { FeedLifecycleUpdateSourceEnum } from '@orm/entities/feed/feedLifecycleUpdateSource.js';
import type { LifecycleTransitionValidationOptions } from '@orm/lib/feedLifecycleTransitionValidation.js';
import { assertLifecycleTransitionAllowed } from '@orm/lib/feedLifecycleTransitionValidation.js';
import type { EntityManager } from 'typeorm';

export type SetFeedLifecycleStateParams = {
  toStateKey: FeedLifecycleStateKeyEnum;
  reasonKey?: string | null;
  note?: string | null;
  source: FeedLifecycleUpdateSourceEnum;
  updatedByAdminId?: number | null;
  transitionOptions?: LifecycleTransitionValidationOptions;
};

/**
 * Mutations for **`feed_lifecycle_state`** (workflow). Pair with **`FeedPolicyService`** for policy and
 * lifecycle updates.
 */
export class FeedLifecycleStateService {
  constructor(private readonly transactionalEntityManager?: EntityManager) {}

  private manager(): EntityManager {
    return this.transactionalEntityManager ?? AppDataSourceReadWrite.manager;
  }

  async setLifecycleState(
    feedId: number,
    params: SetFeedLifecycleStateParams
  ): Promise<FeedLifecycleStateRow> {
    const em = this.manager();
    const lifecycleRepo = em.getRepository(FeedLifecycleStateRow);
    const typeRepo = em.getRepository(FeedLifecycleStateType);

    const existing = await lifecycleRepo.findOne({
      where: { feed_id: feedId },
      relations: { feed_lifecycle_state_type: true },
    });

    const fromKey =
      existing?.feed_lifecycle_state_type?.state_key ?? FeedLifecycleStateKeyEnum.Active;

    assertLifecycleTransitionAllowed(fromKey, params.toStateKey, params.transitionOptions);

    const targetType = await typeRepo.findOne({
      where: { state_key: params.toStateKey },
    });

    if (!targetType) {
      throw new Error(
        `FeedLifecycleStateService.setLifecycleState: unknown lifecycle key ${params.toStateKey}`
      );
    }

    const row = existing ?? lifecycleRepo.create({ feed_id: feedId });

    row.feed_lifecycle_state_type_id = targetType.id;
    row.reason_key = params.reasonKey ?? null;
    row.note = params.note ?? null;
    row.updated_by_source = params.source;
    row.updated_by_admin_id = params.updatedByAdminId ?? null;

    return lifecycleRepo.save(row);
  }
}
