import type { Item } from '@orm/entities/item/item.js';
import type { Relation } from 'typeorm';
import { Check, Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity()
@Check('(geo IS NOT NULL AND osm IS NULL) OR (geo IS NULL AND osm IS NOT NULL)')
export class ItemLocation {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Item', (item: Item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Relation<Item>;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  geo?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  osm?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  name!: string | null;
}
