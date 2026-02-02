import type { Feed } from '@orm/entities/feed/feed.js';
import { FeedLog } from '@orm/entities/feed/feedLog.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';

type FeedLogDto = {
  last_http_status?: number | null;
  last_good_http_status_time?: Date | null;
  last_finished_parse_time?: Date | null;
  parse_errors?: number;
};

export class FeedLogService extends BaseOneService<FeedLog, 'feed'> {
  constructor() {
    super(FeedLog, 'feed');
  }

  async get(feed: Feed): Promise<FeedLog | null> {
    return super._get(feed);
  }

  async update(feed: Feed, dto: FeedLogDto): Promise<FeedLog> {
    return super._update(feed, dto);
  }
}
