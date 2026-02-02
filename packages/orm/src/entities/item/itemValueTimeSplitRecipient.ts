import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type { ItemValueTimeSplit } from '@orm/entities/item/itemValueTimeSplit.js';

@Entity()
export class ItemValueTimeSplitRecipient {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(
    'ItemValueTimeSplit',
    (itemValueTimeSplit: ItemValueTimeSplit) => itemValueTimeSplit.id,
    {
      onDelete: 'CASCADE',
    }
  )
  @JoinColumn({ name: 'item_value_time_split_id' })
  item_value_time_split!: Relation<ItemValueTimeSplit>;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_short })
  type!: string;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_long })
  address!: string;

  @Column({ type: 'float' })
  split!: number;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  name?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_long })
  custom_key?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_long })
  custom_value?: string | null;

  @Column({ type: 'boolean', default: false })
  fee!: boolean;
}
