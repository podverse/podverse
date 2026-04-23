import type { Clip } from '@orm/entities/clip.js';
import { StatsTrackEventClip } from '@orm/entities/stats/statsTrackEventClip.js';
import { ClipService } from '@orm/services/clip.js';

import { BaseStatsTrackEventService } from './baseStatsTrackEvent.js';

export class StatsTrackEventClipService extends BaseStatsTrackEventService<StatsTrackEventClip> {
  protected entity = StatsTrackEventClip;
  protected entityIdField = 'clip_id';
  private clipService: ClipService;

  constructor() {
    super();
    this.clipService = new ClipService();
  }

  protected async getEntityByIdText(id_text: string): Promise<Clip | null | undefined> {
    return this.clipService.getByIdText(id_text);
  }
}
