import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Item } from '@orm/entities/item/item.js';
import type { ItemValueTimeSplit } from '@orm/entities/item/itemValueTimeSplit.js';
import type { ItemValueRecipient } from '@orm/entities/item/itemValueRecipient.js';

@Entity()
export class ItemValue {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Item', (item: Item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Relation<Item>;

  @OneToMany(
    'ItemValueRecipient',
    (item_value_recipient: ItemValueRecipient) => item_value_recipient.item_value
  )
  item_value_recipients!: ItemValueRecipient[];

  @OneToMany(
    'ItemValueTimeSplit',
    (item_value_time_split: ItemValueTimeSplit) => item_value_time_split.item_value
  )
  item_value_time_splits!: ItemValueTimeSplit[];

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_short })
  type!: string;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_short })
  method!: string;

  @Column({ type: 'float', nullable: true })
  suggested?: number | null;
}
