/**
 * Controls how initial playback time is chosen for music-type items (Music / MusicL / PublisherMusic).
 * Podcast and video items ignore this and always use queue abridged resume behavior.
 */
export type MusicItemPlaybackIntent = 'session_restore' | 'explicit_play' | 'fresh_transition';
