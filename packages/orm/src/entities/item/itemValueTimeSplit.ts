import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { ItemValue } from '@orm/entities/item/itemValue.js';
import type { ItemValueTimeSplitRemoteItem } from '@orm/entities/item/itemValueTimeSplitRemoteItem.js';
import type { ItemValueTimeSplitRecipient } from '@orm/entities/item/itemValueTimeSplitRecipient.js';

@Entity()
export class ItemValueTimeSplit {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('ItemValue', (itemValue: ItemValue) => itemValue.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_value_id' })
  item_value!: Relation<ItemValue>;

  @OneToMany(
    'ItemValueTimeSplitRecipient',
    (item_value_time_split_recipient: ItemValueTimeSplitRecipient) =>
      item_value_time_split_recipient.item_value_time_split
  )
  item_value_time_split_recipients!: ItemValueTimeSplitRecipient[];

  @OneToOne(
    'ItemValueTimeSplitRemoteItem',
    (item_value_time_split_remote_item: ItemValueTimeSplitRemoteItem) =>
      item_value_time_split_remote_item.item_value_time_split
  )
  item_value_time_split_remote_item!: Relation<ItemValueTimeSplitRemoteItem>;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  start_time!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  duration!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  remote_start_time!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 100 })
  remote_percentage!: string;
}
