export type PopularityTrackingDecision = {
  listen_stats_accepted: boolean | null;
  listen_stats_agreement_version: string | null;
};

export const POPULARITY_TRACKING_AGREEMENT_VERSION_MAX_LENGTH = 64;

export function isPopularityTrackingAllowed(
  decision: PopularityTrackingDecision | null | undefined,
  currentVersion: string
): boolean {
  if (decision === null || decision === undefined) {
    return false;
  }
  if (decision.listen_stats_accepted !== true) {
    return false;
  }
  return decision.listen_stats_agreement_version === currentVersion;
}

export function isPopularityTrackingPromptRequired(
  decision: PopularityTrackingDecision | null | undefined,
  currentVersion: string
): boolean {
  if (decision === null || decision === undefined) {
    return true;
  }
  if (decision.listen_stats_accepted === null) {
    return true;
  }
  if (decision.listen_stats_accepted === false) {
    return false;
  }
  return decision.listen_stats_agreement_version !== currentVersion;
}
