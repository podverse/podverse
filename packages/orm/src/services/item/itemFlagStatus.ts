import { AppDataSourceRead } from '@orm/db';
import { ItemFlagStatus } from '@orm/entities/item/itemFlagStatus';

export class ItemFlagStatusService {
  private repositoryRead = AppDataSourceRead.getRepository(ItemFlagStatus);

  async get(id: number): Promise<ItemFlagStatus | null> {
    return await this.repositoryRead.findOne({
      where: { id },
    });
  }
}
