import { Clip } from '@orm/entities/clip';
import { BaseStatsTrackEventService } from './baseStatsTrackEvent';
import { StatsTrackEventClip } from '@orm/entities/stats/statsTrackEventClip';
import { ClipService } from '@orm/services/clip';

export class StatsTrackEventClipService extends BaseStatsTrackEventService<StatsTrackEventClip> {
  protected entity = StatsTrackEventClip;
  protected entityName = 'stats_track_event_clip';
  protected entityIdField = 'clip_id';
  protected entityIdTextField = 'clip_id_text';
  private clipService: ClipService;

  constructor() {
    super();
    this.clipService = new ClipService();
  }

  protected async getEntityByIdText(id_text: string): Promise<Clip | null | undefined> {
    return this.clipService.getByIdText(id_text);
  }
}
