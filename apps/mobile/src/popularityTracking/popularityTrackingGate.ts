import { isPopularityTrackingAllowed } from '@podverse/helpers';
import type { DTOAccount } from '@podverse/helpers/dto';

let currentAgreementVersion = '';

export function setPopularityTrackingCurrentVersion(version: string): void {
  currentAgreementVersion = version;
}

export function getPopularityTrackingCurrentVersion(): string {
  return currentAgreementVersion;
}

export function shouldSkipListenStatsForAccount(account: DTOAccount | null): boolean {
  if (account === null) {
    return false;
  }
  return !isPopularityTrackingAllowed(account.account_settings, currentAgreementVersion);
}
