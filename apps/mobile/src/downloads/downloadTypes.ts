/**
 * Shared contract for Track 13 offline downloads. Pure types only — no React Native / Expo imports
 * so this module stays unit-testable in the node vitest project (see vitest.config.ts). The
 * download job runner (concurrency, retry loop, byte transfer) is wired to Expo FileSystem in a
 * later step (13.4); these types define the seam the runner, repository, and screens share.
 */

/**
 * Download job lifecycle. Forward transitions:
 *   queued → downloading → complete
 *   downloading → failed   (transient/error; retryable back to queued)
 *   queued|downloading → cancelled  (user cancel)
 *   failed|cancelled → queued        (retry)
 * Only one job is `downloading` at a time (concurrency = 1); the rest wait in `queued`.
 */
export const DOWNLOAD_STATUSES = [
  'queued',
  'downloading',
  'complete',
  'failed',
  'cancelled',
] as const;

export type DownloadStatus = (typeof DOWNLOAD_STATUSES)[number];

export const isDownloadStatus = (value: string): value is DownloadStatus =>
  (DOWNLOAD_STATUSES as readonly string[]).includes(value);

/** Progressive media modality of the downloaded file (HLS/livestream never reach here). */
export type DownloadMediaType = 'audio' | 'video';

export const isDownloadMediaType = (value: string): value is DownloadMediaType =>
  value === 'audio' || value === 'video';

/**
 * The download index row (source of truth for the phone Downloads library). Mirrors the SQLite
 * `downloads` table; `filePath` / `byteSize` populate as the transfer progresses. Never holds a
 * livestream or HLS playlist entry — eligibility is gated before a row is created.
 */
export interface DownloadRecord {
  /** Stable local key — the item's `id_text`. */
  itemIdText: string;
  /** Resolved progressive enclosure URI being fetched (never a `.m3u8` playlist). */
  enclosureUri: string;
  /** Deterministic hash of `enclosureUri` for de-dupe / stable on-disk naming. */
  enclosureUrlHash: string;
  /** Enclosure MIME (`audio/mpeg`, `video/mp4`, …) when the feed provided one. */
  enclosureMime: string | null;
  mediaType: DownloadMediaType;
  /** Lowercase progressive extension (`mp3`, `m4a`, `mp4`, …) when derivable. */
  fileExtension: string | null;
  /** Absolute on-disk path once the file exists; `null` while queued/downloading. */
  filePath: string | null;
  /** Total bytes when known (Content-Length / enclosure length). */
  byteSize: number | null;
  /** Bytes written so far (drives progress UI). */
  bytesDownloaded: number;
  status: DownloadStatus;
  title: string | null;
  artworkUrl: string | null;
  /** Short machine reason for the last failure (surfaced for retry UX). */
  errorReason: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Progress event emitted by the download runner (13.4) and consumed by screens. */
export interface DownloadProgressEvent {
  itemIdText: string;
  status: DownloadStatus;
  bytesDownloaded: number;
  byteSize: number | null;
  /** 0..1 when `byteSize` is known, else `null` (indeterminate). */
  fraction: number | null;
}
