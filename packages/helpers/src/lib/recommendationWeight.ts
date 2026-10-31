import { MediumEnum } from './medium.js';

/** Lowest and highest recommendation weight. A new show starts at the lowest. */
export const RECOMMENDATION_WEIGHT_MIN = 1;
export const RECOMMENDATION_WEIGHT_MAX = 5;

/** Chips the recommendations page can show. Taste Profile scores shows only. */
export const RECOMMENDATION_CHIPS = ['podcasts', 'albums', 'artists'] as const;

export type RecommendationChip = (typeof RECOMMENDATION_CHIPS)[number];

/**
 * Mediums behind each chip. Podcasts and albums include the large-medium twin.
 * Artists are publisher music channels.
 */
export const RECOMMENDATION_MEDIUM_IDS: Record<RecommendationChip, readonly number[]> = {
  podcasts: [MediumEnum.Podcast, MediumEnum.PodcastL],
  albums: [MediumEnum.Music, MediumEnum.MusicL],
  artists: [MediumEnum.PublisherMusic],
};

export function isRecommendationChip(value: string): value is RecommendationChip {
  return RECOMMENDATION_CHIPS.some((chip) => chip === value);
}

/**
 * Weight the recommendation job uses for a Taste Profile show.
 * 1–4 listens → 1, 5–9 → 2, 10–14 → 3, 15–19 → 4, 20 or more → 5.
 * A stored override replaces that level until the listener applies another one.
 * Zero listens (a show added back) is level 1.
 */
export function recommendationWeightFromListenCount(
  listenCount: number,
  weightOverride: number | null
): number {
  if (weightOverride !== null) {
    return weightOverride;
  }
  const stepped = 1 + Math.floor(listenCount / RECOMMENDATION_WEIGHT_MAX);
  if (stepped > RECOMMENDATION_WEIGHT_MAX) {
    return RECOMMENDATION_WEIGHT_MAX;
  }
  return stepped;
}

/**
 * Whether a taste change should rebuild that listener's recommendations.
 * A new show (`previousListenCount` null) always does. An override keeps the weight
 * fixed across later listens. Completions never change `listen_count`, so they stay out.
 */
export function recommendationWeightChanged(params: {
  previousListenCount: number | null;
  previousWeightOverride: number | null;
  nextListenCount: number;
  nextWeightOverride: number | null;
}): boolean {
  if (params.previousListenCount === null) {
    return true;
  }
  return (
    recommendationWeightFromListenCount(
      params.previousListenCount,
      params.previousWeightOverride
    ) !==
    recommendationWeightFromListenCount(params.nextListenCount, params.nextWeightOverride)
  );
}

/**
 * Display mark for one recommendation. The listener's top score in that chip is 5.
 * The rest scale down in even steps and never fall below 1.
 */
export function recommendationStrength(score: number, topScore: number): number {
  if (!(topScore > 0)) {
    return RECOMMENDATION_WEIGHT_MIN;
  }
  const scaled = Math.round((score / topScore) * RECOMMENDATION_WEIGHT_MAX);
  if (scaled < RECOMMENDATION_WEIGHT_MIN) {
    return RECOMMENDATION_WEIGHT_MIN;
  }
  if (scaled > RECOMMENDATION_WEIGHT_MAX) {
    return RECOMMENDATION_WEIGHT_MAX;
  }
  return scaled;
}
