import type { ItemEnclosure } from '@orm/entities/item/itemEnclosure.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity()
export class ItemEnclosureIntegrity {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('ItemEnclosure', (itemEnclosureSource: ItemEnclosure) => itemEnclosureSource.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'item_enclosure_id' })
  item_enclosure!: Relation<ItemEnclosure>;

  @Column({ type: 'text' })
  type!: 'sri' | 'pgp-signature';

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_long })
  value!: string;
}
