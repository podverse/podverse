export type DTOPerson = {
  id_text: string;
  display_name: string;
  summary: string | null;
  list_image_url: string | null;
  item_appearance_count: number;
  channel_cast_count: number;
  latest_appearance_at: string | null;
  is_followed?: boolean;
  counts?: DTOPersonContentCounts;
};

export type DTOPersonContentCounts = {
  podcasts: number;
  episodes: number;
  albums: number;
  tracks: number;
  artists: number;
  livestreams: number;
};

export type DTOPersonAppearance = {
  id_text: string;
  display_name: string;
  item_count: number;
  img: string | null;
};

export type DTOPersonChannel = {
  id_text: string;
  title: string | null;
  medium_id: number;
  image_url: string | null;
  role: string | null;
  item_count: number;
};

export type DTOPersonItem = {
  id_text: string;
  title: string | null;
  channel_id_text: string;
  channel_title: string | null;
  medium_id: number;
  image_url: string | null;
  pub_date: string | null;
};

/** One recommended person. `strength` is the 1–5 mark for that listener. */
export type DTOPersonRecommendation = {
  person: DTOPerson;
  strength: number;
};

export const PERSON_CONTENT_CHIPS = [
  'podcasts',
  'episodes',
  'albums',
  'tracks',
  'artists',
  'livestreams',
] as const;

export type PersonContentChip = (typeof PERSON_CONTENT_CHIPS)[number];

export function isPersonContentChip(value: string): value is PersonContentChip {
  return PERSON_CONTENT_CHIPS.some((chip) => chip === value);
}
