import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import { ItemValueTimeSplit } from '@orm/entities/item/itemValueTimeSplit';

@Entity()
export class ItemValueTimeSplitRemoteItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => ItemValueTimeSplit, itemValueTimeSplit => itemValueTimeSplit.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_value_time_split_id' })
  item_value_time_split!: ItemValueTimeSplit;

  @Column({ type: 'uuid' })
  feed_guid!: string;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  feed_url?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_uri })
  item_guid?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  title?: string | null;
}