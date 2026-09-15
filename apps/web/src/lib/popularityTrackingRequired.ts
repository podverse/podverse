import type { DTOAccount } from '@podverse/helpers';
import { isPopularityTrackingPromptRequired } from '@podverse/helpers';

export function isPopularityTrackingPromptRequiredForAccount(
  account: DTOAccount | null | undefined,
  currentVersion: string
): boolean {
  if (account === null || account === undefined) {
    return false;
  }
  return isPopularityTrackingPromptRequired(account.account_settings, currentVersion);
}
