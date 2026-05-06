import type { FeedConditionTypeKeyEnum, FeedLifecycleStateKeyEnum } from '@podverse/orm';
import {
  FeedConditionTypeKeyEnum as FeedConditionEnum,
  FeedLifecycleStateKeyEnum as FeedLifecycleEnum,
} from '@podverse/orm';

export function toLifecycleStateEnum(
  key: string | undefined
): FeedLifecycleStateKeyEnum | undefined {
  if (key === undefined) {
    return undefined;
  }
  if (key === FeedLifecycleEnum.Active) {
    return FeedLifecycleEnum.Active;
  }
  if (key === FeedLifecycleEnum.PendingArchive) {
    return FeedLifecycleEnum.PendingArchive;
  }
  if (key === FeedLifecycleEnum.Archived) {
    return FeedLifecycleEnum.Archived;
  }
  if (key === FeedLifecycleEnum.Takedown) {
    return FeedLifecycleEnum.Takedown;
  }
  throw new Error('Invalid lifecycle_state_key');
}

export function toConditionTypeEnums(keys: string[]): FeedConditionTypeKeyEnum[] {
  const allowed = new Map<string, FeedConditionTypeKeyEnum>(
    Object.values(FeedConditionEnum).map((k) => [k, k])
  );
  return keys.map((key) => {
    const v = allowed.get(key);
    if (v === undefined) {
      throw new Error('Invalid active_condition_keys entry');
    }
    return v;
  });
}
