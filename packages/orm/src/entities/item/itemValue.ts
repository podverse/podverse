import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Item } from '@orm/entities/item/item';
import { ItemValueTimeSplit } from '@orm/entities/item/itemValueTimeSplit';
import { ItemValueRecipient } from '@orm/entities/item/itemValueRecipient';

@Entity()
export class ItemValue {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Item, item => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Item;

  @OneToMany(() => ItemValueRecipient, item_value_recipient => item_value_recipient.item_value)
  item_value_recipients!: ItemValueRecipient[];

  @OneToMany(() => ItemValueTimeSplit, item_value_time_split => item_value_time_split.item_value)
  item_value_time_splits!: ItemValueTimeSplit[];

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_short })
  type!: string;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_short })
  method!: string;

  @Column({ type: 'float', nullable: true })
  suggested?: number | null;
}