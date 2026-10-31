import type { AddByRSSResourceData } from '../addByRSSResourceData.js';

export interface DTOAccountDataExportMinimalFeed {
  url: string;
}

export interface DTOAccountDataExportMinimalChannel {
  id_text: string;
  title: string | null;
  feed: DTOAccountDataExportMinimalFeed | null;
}

export interface DTOAccountDataExportMinimalItem {
  id_text: string;
  title: string | null;
  pub_date: string | null;
  channel: DTOAccountDataExportMinimalChannel | null;
}

export interface DTOAccountDataExportMinimalClip {
  id_text: string;
  title: string | null;
  start_time: string;
  end_time: string | null;
  created_at: string;
  item: DTOAccountDataExportMinimalItem | null;
}

export interface DTOAccountDataExportItemSoundbite {
  id: number;
  item: DTOAccountDataExportMinimalItem | null;
}

export interface DTOAccountDataExportPlaylistResource {
  list_position: string;
  item?: DTOAccountDataExportMinimalItem | null;
  clip?: DTOAccountDataExportMinimalClip | null;
  item_soundbite?: DTOAccountDataExportItemSoundbite | null;
  add_by_rss_hash_id?: string | null;
  add_by_rss_resource_data?: AddByRSSResourceData | null;
}

export interface DTOAccountDataExportPlaylist {
  id_text: string;
  title: string | null;
  description: string | null;
  is_default_likes: boolean;
  item_count: number;
  last_updated: string;
  medium_id: number | null;
  sharable_status_id: number | null;
  playlist_resources: DTOAccountDataExportPlaylistResource[];
}

export interface DTOAccountDataExportClip {
  id_text: string;
  title: string | null;
  description: string | null;
  start_time: string;
  end_time: string | null;
  created_at: string;
  sharable_status_id: number | null;
  item: DTOAccountDataExportMinimalItem | null;
}

export interface DTOAccountDataExportQueueResource {
  list_position: string;
  playback_position: string;
  media_file_duration: string;
  completed: boolean;
  item?: DTOAccountDataExportMinimalItem | null;
  clip?: DTOAccountDataExportMinimalClip | null;
  item_soundbite?: DTOAccountDataExportItemSoundbite | null;
  add_by_rss_hash_id?: string | null;
  add_by_rss_resource_data?: AddByRSSResourceData | null;
}

export interface DTOAccountDataExportQueue {
  id_text: string;
  medium_id: number | null;
  is_active_queue: boolean;
  queue_resources: DTOAccountDataExportQueueResource[];
}

export interface DTOAccountDataExportFollowingAccount {
  id_text: string;
  verified: boolean;
}

export interface DTOAccountDataExportFollowingChannel {
  id_text: string;
  title: string | null;
  feed: DTOAccountDataExportMinimalFeed | null;
}

export interface DTOAccountDataExportFollowingPlaylist {
  id_text: string;
  title: string | null;
  account: {
    id_text: string;
  } | null;
}

export interface DTOAccountDataExportFollowingAddByRSSChannel {
  feed_url: string;
  title: string | null;
  image_url: string | null;
}

export interface DTOAccountDataExportFollowing {
  accounts: DTOAccountDataExportFollowingAccount[];
  channels: DTOAccountDataExportFollowingChannel[];
  playlists: DTOAccountDataExportFollowingPlaylist[];
  add_by_rss_channels: DTOAccountDataExportFollowingAddByRSSChannel[];
}

export interface DTOAccountDataExportAccountProfile {
  display_name: string | null;
  bio: string | null;
}

export interface DTOAccountDataExportAccount {
  id: number;
  id_text: string;
  verified: boolean;
  sharable_status_id: number | null;
  account_profile?: DTOAccountDataExportAccountProfile | null;
}

/** MetaBoost linkage stored for the account (value-for-value sender identity). */
export interface DTOAccountDataExportAccountMetaboost {
  sender_guid: string;
}

export interface DTOAccountDataExportTermsAcceptance {
  terms_version: string;
  accepted_at: string;
}

export interface DTOAccountDataExportTasteProfileRow {
  channel_id_text: string;
  channel_title: string | null;
  listen_count: number;
  completion_count: number;
  first_listened_at: string;
  last_listened_at: string;
  recent_score: number;
  long_term_score: number;
  scores_updated_at: string;
  weight_override: number | null;
  weight_override_at: string | null;
}

export interface DTOAccountDataExportHiddenFromTasteProfileRow {
  channel_id_text: string;
  channel_title: string | null;
  hidden_at: string;
}

export interface DTOAccountDataExportHiddenChannelRow {
  channel_id_text: string;
  channel_title: string | null;
  hidden_at: string;
}

export interface DTOAccountDataExportListenEvent {
  created_at: string;
  channel_id_text: string;
  item_id_text: string;
  item_title: string | null;
  clip_id_text: string | null;
  seconds_heard: number;
  completed: boolean;
}

export interface DTOAccountDataExportOpenEvent {
  opened_at: string;
  account_id_text: string | null;
  playlist_id_text: string | null;
}

/**
 * Stored Taste Profile listening data linked to the account; empty lists when tracking never
 * stored anything or Taste Profile was turned off.
 */
export interface DTOAccountDataExportListeningData {
  taste_profile: DTOAccountDataExportTasteProfileRow[];
  hidden_from_taste_profile: DTOAccountDataExportHiddenFromTasteProfileRow[];
  hidden_channels: DTOAccountDataExportHiddenChannelRow[];
  listen_events: DTOAccountDataExportListenEvent[];
  open_events: DTOAccountDataExportOpenEvent[];
}

export interface DTOAccountDataExport {
  export_date: string;
  account: DTOAccountDataExportAccount;
  account_metaboost: DTOAccountDataExportAccountMetaboost | null;
  account_terms_acceptance: DTOAccountDataExportTermsAcceptance | null;
  allow_listen_stats: boolean;
  listen_stats_accepted: boolean | null;
  listen_stats_agreement_version: string | null;
  listen_stats_decided_at: string | null;
  listen_stats_opted_out_at: string | null;
  listening_data: DTOAccountDataExportListeningData;
  following: DTOAccountDataExportFollowing;
  playlists: DTOAccountDataExportPlaylist[];
  clips: DTOAccountDataExportClip[];
  queues: DTOAccountDataExportQueue[];
}
