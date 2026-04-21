import type { Channel } from '@orm/entities/channel/channel.js';
import { StatsTrackEventChannel } from '@orm/entities/stats/statsTrackEventChannel.js';
import { ChannelService } from '@orm/services/channel/channel.js';

import { BaseStatsTrackEventService } from './baseStatsTrackEvent.js';

export class StatsTrackEventChannelService extends BaseStatsTrackEventService<StatsTrackEventChannel> {
  protected entity = StatsTrackEventChannel;
  protected entityIdField = 'channel_id';
  private channelService: ChannelService;

  constructor() {
    super();
    this.channelService = new ChannelService();
  }

  protected async getEntityByIdText(id_text: string): Promise<Channel | null | undefined> {
    return this.channelService.getByIdText(id_text);
  }
}
