import type { Feed } from '@orm/entities/feed/feed.js';
import { FeedLog } from '@orm/entities/feed/feedLog.js';
import { isPostgresUniqueViolation } from '@orm/lib/postgresUniqueViolation.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';

/** Short delay before retry so the other transaction can commit (ms). */
const RETRY_DELAY_MS = 25;

type FeedLogDto = {
  last_http_status?: number | null;
  last_good_http_status_time?: Date | null;
  last_finished_parse_time?: Date | null;
  last_failed_parse_time?: Date | null;
  parse_errors?: number;
};

export class FeedLogService extends BaseOneService<FeedLog, 'feed'> {
  constructor() {
    super(FeedLog, 'feed');
  }

  async get(feed: Feed): Promise<FeedLog | null> {
    return super._get(feed);
  }

  /**
   * Update feed_log for the given feed. If a concurrent call created the row
   * (duplicate key on feed_id), retry once so we update the existing row.
   */
  async update(feed: Feed, dto: FeedLogDto): Promise<FeedLog> {
    try {
      return await super._update(feed, dto);
    } catch (error) {
      if (!isPostgresUniqueViolation(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return super._update(feed, dto);
    }
  }
}
