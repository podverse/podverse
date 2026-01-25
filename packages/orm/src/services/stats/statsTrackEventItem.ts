import { Item } from '@orm/entities/item/item';
import { BaseStatsTrackEventService } from './baseStatsTrackEvent';
import { StatsTrackEventItem } from '@orm/entities/stats/statsTrackEventItem';
import { ItemService } from '@orm/services/item/item';

export class StatsTrackEventItemService extends BaseStatsTrackEventService<StatsTrackEventItem> {
  protected entity = StatsTrackEventItem;
  protected entityName = 'stats_track_event_item';
  protected entityIdField = 'item_id';
  protected entityIdTextField = 'item_id_text';
  private itemService: ItemService;

  constructor() {
    super();
    this.itemService = new ItemService();
  }

  protected async getEntityByIdText(id_text: string): Promise<Item | null | undefined> {
    return this.itemService.getByIdText(id_text);
  }
}