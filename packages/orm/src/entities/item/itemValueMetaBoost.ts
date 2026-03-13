import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type { ItemValue } from '@orm/entities/item/itemValue.js';

@Entity({ name: 'item_value_meta_boost' })
export class ItemValueMetaBoost {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('ItemValue', (item_value: ItemValue) => item_value.meta_boost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_value_id' })
  item_value!: Relation<ItemValue>;

  @Column({ type: 'varchar', name: 'type', length: DATABASE_CONSTANTS.varchar_short })
  type!: string;

  @Column({ type: 'varchar', name: 'schema', length: DATABASE_CONSTANTS.varchar_short })
  schema!: string;

  @Column({
    type: 'varchar',
    name: 'license',
    length: DATABASE_CONSTANTS.varchar_url,
    nullable: true,
  })
  license!: string | null;

  @Column({ type: 'varchar', name: 'node', length: DATABASE_CONSTANTS.varchar_url })
  node!: string;
}
