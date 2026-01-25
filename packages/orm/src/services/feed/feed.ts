import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db';
import { Feed } from '@orm/entities/feed/feed';
import { FeedFlagStatusStatusEnum } from '@orm/entities/feed/feedFlagStatus';
import { FeedFlagStatusService } from './feedFlagStatus';
import { applyProperties } from '@orm/lib/applyProperties';

type FeedCreateDto = {
  url: string,
  podcast_index_id: number
}

type FeedUpdateDto = {
  url?: string
  is_parsing?: Date | null
  parsing_priority?: number
  last_parsed_file_hash?: string | null
  container_id?: string | null
}

export class FeedService {
  private repositoryRead = AppDataSourceRead.getRepository(Feed);
  private repositoryReadWrite = AppDataSourceReadWrite.getRepository(Feed);

  async get(id: number): Promise<Feed | null> {
    return this.repositoryRead.findOne({
      where: { id },
      relations: ['channel', 'feed_flag_status', 'feed_log'],
    });
  }

  async getAll(): Promise<Feed[]> {
    return await this.repositoryRead.find({
      relations: ['channel', 'feed_flag_status', 'feed_log'],
    });
  }

  async getByPodcastGuid(podcast_guid: string): Promise<Feed | null> {
    return this.repositoryRead.findOne({
      where: {
        channel: {
          podcast_guid,
        },
      },
      relations: ['channel', 'feed_flag_status', 'feed_log'],
    });
  }

  async getByUrl({ url }: { url: string }): Promise<Feed | null> {
    const base = url.replace(/^https?:\/\//i, '');
    const httpsUrl = `https://${base}`;
    const httpUrl = `http://${base}`;

    const httpsFeed = await this.repositoryRead.findOne({
      where: {
        url: httpsUrl,
      },
      relations: ['channel', 'feed_flag_status', 'feed_log'],
    });
    if (httpsFeed) {return httpsFeed;}

    const httpFeed = await this.repositoryRead.findOne({
      where: {
        url: httpUrl,
      },
      relations: ['channel', 'feed_flag_status', 'feed_log'],
    });
    if (httpFeed) {return httpFeed;}

    return null;
  }

  async getByUrlAndPodcastIndexId({ url, podcast_index_id }: {
    url: string, podcast_index_id: number }): Promise<Feed | null> {
    return this.repositoryRead.findOne({
      where: {
        url,
        podcast_index_id,
      },
      relations: ['channel', 'feed_flag_status', 'feed_log'],
    });
  }
  
  async getByPodcastIndexId(podcast_index_id: number): Promise<Feed | null> {
    return this.repositoryRead.findOne({
      where: {
        podcast_index_id,
      },
      relations: ['channel', 'feed_flag_status', 'feed_log'],
    });
  }

  async getOrCreate({ url, podcast_index_id }: FeedCreateDto): Promise<Feed> {
    const feed = await this.repositoryRead.findOne({
      where: { url },
      relations: ['channel', 'feed_flag_status', 'feed_log'],
    });

    if (feed) {
      return feed;
    }

    return this.create({ url, podcast_index_id });
  }

  async create({ url, podcast_index_id }: FeedCreateDto): Promise<Feed> {
    const feed = new Feed();
    feed.url = url;
    feed.podcast_index_id = podcast_index_id;

    const feedFlagStatusService = new FeedFlagStatusService();
    const feed_flag_status = await feedFlagStatusService.get(FeedFlagStatusStatusEnum.Active);
    if (!feed_flag_status) {
      throw new Error(`FeedService.create: feed status ${FeedFlagStatusStatusEnum.Active} not found`);
    } else {
      feed.feed_flag_status = feed_flag_status;
    }

    feed.is_parsing = null;
    feed.parsing_priority = 0;
    feed.container_id = '';

    return this.repositoryReadWrite.save(feed);
  }

  async update(id: number, dto: FeedUpdateDto): Promise<Feed> {
    let feed = await this.get(id);

    if (!feed) {
      throw new Error(`FeedService.update: feed ${id} not found`);
    }

    feed = applyProperties(feed, dto);

    return this.repositoryReadWrite.save(feed);
  }

  async updateFlagStatus(feed: Feed, feed_flag_status_id: FeedFlagStatusStatusEnum): Promise<Feed> {
    const feedFlagStatusService = new FeedFlagStatusService();
    const feed_flag_status = await feedFlagStatusService.get(feed_flag_status_id);
  
    if (!feed_flag_status) {
      throw new Error(`FeedService.updateFlagStatus: feed status ${feed_flag_status_id} not found`);
    }
  
    feed.feed_flag_status = feed_flag_status;
  
    return this.repositoryReadWrite.save(feed);
  }
}
