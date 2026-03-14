import type { ItemValueTimeSplit } from '@orm/entities/item/itemValueTimeSplit.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity()
export class ItemValueTimeSplitRemoteItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(
    'ItemValueTimeSplit',
    (itemValueTimeSplit: ItemValueTimeSplit) => itemValueTimeSplit.id,
    {
      onDelete: 'CASCADE',
    }
  )
  @JoinColumn({ name: 'item_value_time_split_id' })
  item_value_time_split!: Relation<ItemValueTimeSplit>;

  @Column({ type: 'uuid' })
  feed_guid!: string;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  feed_url?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_uri })
  item_guid?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  title?: string | null;
}
