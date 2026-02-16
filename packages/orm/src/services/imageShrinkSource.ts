import type { Repository } from 'typeorm';

import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import { ImageShrinkSource } from '@orm/entities/imageShrinkSource.js';

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
    await this.upsert(url, {}, false, null);
  }

  async upsert(
    url: string,
    headers: ImageShrinkSourceHeaders,
    changed: boolean,
    checksumSha256?: string | null
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
    return this.repositoryReadWrite.save(updated);
  }

  async deleteUnusedSources(pruneAfterDays: number | null): Promise<number> {
    if (pruneAfterDays !== null && pruneAfterDays < 0) {
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
          AND source.last_checked_at < NOW() - ($1 || ' days')::interval
        )
      )
      RETURNING 1;
    `;
    const results = await this.repositoryReadWrite.query(sql, [pruneAfterDays]);
    return Array.isArray(results) ? results.length : 0;
  }
}
