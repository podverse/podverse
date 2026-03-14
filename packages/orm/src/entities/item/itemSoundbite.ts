import type { Item } from '@orm/entities/item/item.js';
import { generateRandomIdText } from '@orm/lib/nanoid.js';
import type { Relation } from 'typeorm';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity()
export class ItemSoundbite {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  id_text!: string;

  @ManyToOne('Item', (item: Item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Relation<Item>;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  start_time!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  duration!: string;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  title?: string | null;

  @BeforeInsert()
  generateIdText() {
    this.id_text = generateRandomIdText();
  }
}
