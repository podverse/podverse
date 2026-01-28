import { Channel } from '@orm/entities/channel/channel';
import { BaseStatsTrackEventService } from './baseStatsTrackEvent';
import { StatsTrackEventChannel } from '@orm/entities/stats/statsTrackEventChannel';
import { ChannelService } from '@orm/services/channel/channel';

export class StatsTrackEventChannelService extends BaseStatsTrackEventService<StatsTrackEventChannel> {
  protected entity = StatsTrackEventChannel;
  protected entityName = 'stats_track_event_channel';
  protected entityIdField = 'channel_id';
  protected entityIdTextField = 'channel_id_text';
  private channelService: ChannelService;

  constructor() {
    super();
    this.channelService = new ChannelService();
  }

  protected async getEntityByIdText(id_text: string): Promise<Channel | null | undefined> {
    return this.channelService.getByIdText(id_text);
  }
}
