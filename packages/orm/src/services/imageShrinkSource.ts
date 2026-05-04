import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import { ImageShrinkSource } from '@orm/entities/imageShrinkSource.js';
import type { Repository } from 'typeorm';

export type ImageShrinkSourceHeaders = {
  etag?: string | null;
  lastModified?: string | null;
  contentLength?: number | null;
};

export class ImageShrinkSourceService {
  private repositoryRead: Repository<ImageShrinkSource>;
  private repositoryReadWrite: Repository<ImageShrinkSource>;

  constructor() {
    this.repositoryRead = getDataSourceRead().getRepository(ImageShrinkSource);
    this.repositoryReadWrite = getDataSourceReadWrite().getRepository(ImageShrinkSource);
  }

  async getByUrl(url: string): Promise<ImageShrinkSource | null> {
    return this.repositoryRead.findOne({ where: { url } });
  }

  async shouldCheck(url: string, minIntervalMs: number): Promise<boolean> {
    const existing = await this.getByUrl(url);
    const lastChecked = existing?.lastCheckedAt?.getTime();
    if (!lastChecked || minIntervalMs <= 0) {
      return true;
    }
    return Date.now() - lastChecked >= minIntervalMs;
  }

  async updateCheckTime(url: string): Promise<void> {
    await this.upsert(url, {}, false, null, {});
  }

  /**
   * When `intervalSeconds` is <= 0, deep recheck is disabled (only shallow conditional fetches).
   * When a row exists and `last_deep_checked_at` is null, the next run uses the deep path once.
   */
  async shouldDeepRecheck(url: string, intervalSeconds: number): Promise<boolean> {
    if (intervalSeconds <= 0) {
      return false;
    }
    const existing = await this.getByUrl(url);
    if (!existing) {
      return false;
    }
    if (existing.lastDeepCheckedAt === null || existing.lastDeepCheckedAt === undefined) {
      return true;
    }
    return Date.now() - existing.lastDeepCheckedAt.getTime() >= intervalSeconds * 1000;
  }

  async upsert(
    url: string,
    headers: ImageShrinkSourceHeaders,
    changed: boolean,
    checksumSha256?: string | null,
    options: { markDeepCheckComplete?: boolean } = {}
  ): Promise<ImageShrinkSource> {
    const existing = await this.getByUrl(url);
    const now = new Date();
    const updated = existing ?? new ImageShrinkSource();
    updated.url = url;
    if (headers.etag !== undefined) {
      updated.etag = headers.etag;
    }
    if (headers.lastModified !== undefined) {
      updated.lastModified = headers.lastModified;
    }
    if (headers.contentLength !== undefined) {
      updated.contentLength = headers.contentLength;
    }
    if (checksumSha256 !== undefined) {
      updated.checksumSha256 = checksumSha256;
    }
    updated.lastCheckedAt = now;
    if (changed) {
      updated.lastChangedAt = now;
    }
    if (options.markDeepCheckComplete === true) {
      updated.lastDeepCheckedAt = now;
    }
    return this.repositoryReadWrite.save(updated);
  }

  /**
   * @param pruneAfterExpiration - Eligible when `last_checked_at` is older than this (or null to skip the time check branch).
   */
  async deleteUnusedSources(pruneAfterExpiration: number | null): Promise<number> {
    if (pruneAfterExpiration !== null && pruneAfterExpiration < 0) {
      return 0;
    }
    const sql = `
      DELETE FROM image_shrink_source AS source
      WHERE NOT EXISTS (
        SELECT 1 FROM channel_image AS channel
        WHERE channel.is_resized = true AND channel.url = source.url
      )
      AND NOT EXISTS (
        SELECT 1 FROM item_image AS item
        WHERE item.is_resized = true AND item.url = source.url
      )
      AND (
        source.last_changed_at IS NOT NULL
        OR (
          $1 IS NOT NULL
          AND source.last_checked_at IS NOT NULL
          AND source.last_checked_at < NOW() - ($1 * interval '1 second')
        )
      )
      RETURNING 1;
    `;
    const results = await this.repositoryReadWrite.query(sql, [pruneAfterExpiration]);
    return Array.isArray(results) ? results.length : 0;
  }
}
