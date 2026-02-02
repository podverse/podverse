import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type { ItemEnclosure } from '@orm/entities/item/itemEnclosure.js';

@Entity()
export class ItemEnclosureSource {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('ItemEnclosure', (itemEnclosure: ItemEnclosure) => itemEnclosure.id, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'item_enclosure_id' })
  item_enclosure!: Relation<ItemEnclosure>;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_uri })
  uri!: string;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_short })
  content_type?: string | null;
}
