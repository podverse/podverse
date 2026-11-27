import type { Item } from '@orm/entities/item/item.js';
import { ItemPerson } from '@orm/entities/item/itemPerson.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import { readItemPersonIds, syncItemPeople } from '@orm/services/person/personCreditSync.js';
import type { EntityManager } from 'typeorm';

type ItemPersonDto = {
  name: string;
  role: string | null;
  person_group: string | 'cast';
  img: string | null;
  href: string | null;
};

export class ItemPersonService extends BaseManyService<ItemPerson, 'item'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(ItemPerson, 'item', transactionalEntityManager);
  }

  async update(item: Item, dto: ItemPersonDto): Promise<ItemPerson> {
    const whereKeys = ['name'] as (keyof ItemPerson)[];
    const before = await readItemPersonIds(this.repositoryReadWrite.manager, item.id);
    const saved = await super._update(item, whereKeys, dto);
    await syncItemPeople(
      this.repositoryReadWrite.manager,
      item.id,
      Number(item.channel_id),
      before
    );
    return saved;
  }

  async updateMany(item: Item, dtos: ItemPersonDto[]): Promise<ItemPerson[]> {
    const whereKeys = ['name'] as (keyof ItemPerson)[];
    const before = await readItemPersonIds(this.repositoryReadWrite.manager, item.id);
    const saved = await super._updateMany(item, whereKeys, dtos);
    await syncItemPeople(
      this.repositoryReadWrite.manager,
      item.id,
      Number(item.channel_id),
      before
    );
    return saved;
  }

  async deleteAll(item: Item): Promise<void> {
    const before = await readItemPersonIds(this.repositoryReadWrite.manager, item.id);
    await super._deleteAll(item);
    await syncItemPeople(
      this.repositoryReadWrite.manager,
      item.id,
      Number(item.channel_id),
      before
    );
  }
}
