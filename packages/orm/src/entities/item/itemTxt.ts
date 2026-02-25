import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Item } from '@orm/entities/item/item.js';

@Entity()
export class ItemTxt {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Item', (item: Item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Relation<Item>;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  purpose!: string | null;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_long })
  value!: string;
}
