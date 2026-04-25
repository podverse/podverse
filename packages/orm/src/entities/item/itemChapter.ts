import { generateRandomIdText, NANO_ID_V2_MAX_LENGTH } from '@orm/lib/nanoid.js';
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

import type { ItemChaptersObject } from './itemChaptersObject.js';

@Entity()
export class ItemChapter {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: NANO_ID_V2_MAX_LENGTH })
  id_text!: string;

  @ManyToOne(
    'ItemChaptersObject',
    (item_chapters_object: ItemChaptersObject) => item_chapters_object.item_chapters,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'item_chapters_object_id' })
  item_chapters_object!: Relation<ItemChaptersObject>;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_md5 })
  data_hash!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  start_time!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  end_time?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  title?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  img?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  web_url?: string | null;

  @Column({ type: 'boolean', default: true })
  table_of_contents!: boolean;

  @BeforeInsert()
  setIdText() {
    this.id_text = generateRandomIdText();
  }
}
