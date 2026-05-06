import { AppDataSourceRead } from '@orm/db/index.js';
import { FeedTakedownReason } from '@orm/entities/feed/feedTakedownReason.js';

export class FeedTakedownReasonService {
  private repositoryRead = AppDataSourceRead.getRepository(FeedTakedownReason);

  async get(id: number): Promise<FeedTakedownReason | null> {
    return await this.repositoryRead.findOne({
      where: { id },
    });
  }

  async list(): Promise<FeedTakedownReason[]> {
    return await this.repositoryRead.find({
      order: { id: 'ASC' },
    });
  }
}
