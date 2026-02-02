import { AppDataSourceRead } from '@orm/db/index.js';
import { ItemFlagStatus } from '@orm/entities/item/itemFlagStatus.js';

export class ItemFlagStatusService {
  private repositoryRead = AppDataSourceRead.getRepository(ItemFlagStatus);

  async get(id: number): Promise<ItemFlagStatus | null> {
    return await this.repositoryRead.findOne({
      where: { id },
    });
  }
}
