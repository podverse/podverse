import type { Account } from '@orm/entities/account/account.js';
import type { Item } from '@orm/entities/item/item.js';
import type { SharableStatus } from '@orm/entities/sharableStatus.js';
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

@Entity('clip')
export class Clip {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: NANO_ID_V2_MAX_LENGTH })
  id_text!: string;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @Column()
  item_id!: string;

  @ManyToOne('Item', (item: Item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Relation<Item>;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  start_time!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  end_time?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  title?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_long })
  description?: string | null;

  @Column({ type: 'timestamp' })
  created_at!: Date;

  @ManyToOne('SharableStatus', (sharableStatus: SharableStatus) => sharableStatus.id)
  @JoinColumn({ name: 'sharable_status_id' })
  sharable_status!: Relation<SharableStatus>;

  /*
    NOTE: this is not truly nullable, but we need this column to allow
    nested where queries using the .find method of TypeORM.
  */
  @Column({ name: 'sharable_status_id', type: 'int', nullable: true })
  sharable_status_id?: number | null;

  @BeforeInsert()
  generateIdText() {
    this.id_text = generateRandomIdText();
  }
}
