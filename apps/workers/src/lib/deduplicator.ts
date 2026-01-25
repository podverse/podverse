import { Channel, ChannelService, DeduplicatorService as DeduplicatorServiceORM, FeedFlagStatusStatusEnum, FeedService } from '@podverse/orm';

export class DeduplicatorService {
  private channelService = new ChannelService();
  private deduplicatorServiceORM = new DeduplicatorServiceORM();

  async handleDuplicatePodcastIndexId(id_to_archive: number, duplicate_id_to_keep: number | null): Promise<void> {    
    const channelToArchive: Channel | null = await this.getChannelByPodcastIndexId(id_to_archive);
    if (channelToArchive) {     
      let duplicateChannelToKeep: Channel | null = null;
      if (duplicate_id_to_keep || duplicate_id_to_keep === 0) {
        duplicateChannelToKeep = await this.getChannelByPodcastIndexId(duplicate_id_to_keep);
      }

      if (duplicateChannelToKeep) {
        await this.deduplicatorServiceORM.mergeChannels(channelToArchive.id, duplicateChannelToKeep.id);
      }
      
      if (channelToArchive.feed) {
        const feedService = new FeedService();
        await feedService.updateFlagStatus(channelToArchive.feed, FeedFlagStatusStatusEnum.PendingArchive);
      }

      return;
    }
  }

  private async getChannelByPodcastIndexId(podcast_index_id: number) {
    return this.channelService.getByPodcastIndexId(podcast_index_id, { feed: true });
  }
}
