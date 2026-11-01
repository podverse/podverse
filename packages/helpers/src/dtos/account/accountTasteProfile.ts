/**
 * Show fields a Taste Profile row needs to render and link. `channel_images` feeds
 * `primaryChannelListArtworkUrl`.
 */
export type DTOAccountTasteProfileChannel = {
  id_text: string;
  slug: string | null;
  title: string | null;
  medium_id: number;
  channel_images: Array<{ url: string; image_width_size: number | null; is_resized: boolean }>;
};

/**
 * One show in the signed-in listener's Taste Profile. Listen times are null while `listen_count`
 * is 0 (a show added back).
 */
export type DTOAccountTasteProfileRow = {
  channel: DTOAccountTasteProfileChannel;
  listen_count: number;
  completion_count: number;
  first_listened_at: string | null;
  last_listened_at: string | null;
  /** 1–5 weight the recommendation job uses. An override when one is set, otherwise the listen level. */
  recommendation_weight: number;
  /** The listener's applied weight, or null while the listen level is in effect. */
  recommendation_weight_override: number | null;
};

/** One recommended show. `strength` is the 1–5 mark for that chip. */
export type DTOAccountRecommendation = {
  channel: DTOAccountTasteProfileChannel;
  strength: number;
};

/** One show on Not Counted in Recommendations or Hidden Channels. */
export type DTOAccountTasteProfileHiddenRow = {
  channel: DTOAccountTasteProfileChannel;
  hidden_at: string;
};

export type DTOAccountTasteProfilePagination = {
  page: number;
  total_count: number;
  total_pages: number;
};

export type DTOAccountTasteProfileList = {
  items: DTOAccountTasteProfileRow[];
  pagination: DTOAccountTasteProfilePagination;
};

export type DTOAccountTasteProfileHiddenList = {
  items: DTOAccountTasteProfileHiddenRow[];
  pagination: DTOAccountTasteProfilePagination;
};

/** A show's state after hide or unhide. */
export type DTOAccountTasteProfileShowState = {
  channel_id_text: string;
  hidden: boolean;
  in_taste_profile: boolean;
};
