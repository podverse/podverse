import type { Channel } from '@orm/entities/channel/channel.js';
import type { Item } from '@orm/entities/item/item.js';
import { LiveItem } from '@orm/entities/liveItem/liveItem.js';
import { LiveItemStatusEnum } from '@orm/entities/liveItem/liveItemStatus.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';
import type { FindManyOptions } from 'typeorm';

type LiveItemDto = {
  live_item_status: LiveItemStatusEnum;
  start_time: Date;
  end_time: Date | null;
  chat_web_url?: string | null;
};

export class LiveItemService extends BaseOneService<LiveItem, 'item'> {
  constructor() {
    super(LiveItem, 'item');
  }

  async update(item: Item, dto: LiveItemDto): Promise<LiveItem> {
    const finalDto = {
      start_time: dto.start_time,
      end_time: dto.end_time,
      live_item_status_id: dto.live_item_status,
      chat_web_url: dto.chat_web_url,
    };

    return super._update(item, finalDto);
  }

  /**
   * Marks these live items ended.
   * start_time and end_time stay unchanged, including when end_time is null.
   */
  async markEndedByItemIds(itemIds: readonly number[]): Promise<void> {
    if (itemIds.length === 0) {
      return;
    }
    await this.repositoryReadWrite
      .createQueryBuilder()
      .update(LiveItem)
      .set({ live_item_status_id: LiveItemStatusEnum.Ended })
      .where('item_id IN (:...itemIds)', { itemIds: [...itemIds] })
      .execute();
  }

  async getManyByChannel(
    channel: Channel,
    config?: FindManyOptions<LiveItem>
  ): Promise<LiveItem[]> {
    return this.repositoryRead.find({
      where: { item: { channel: { id: channel.id } } },
      ...config,
    });
  }
}
