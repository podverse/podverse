import type { Account } from '@orm/entities/account/account.js';
import type { Medium } from '@orm/entities/medium.js';
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

@Entity()
export class Queue {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: NANO_ID_V2_MAX_LENGTH })
  id_text!: string;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @ManyToOne('Medium', (medium: Medium) => medium.id)
  @JoinColumn({ name: 'medium_id' })
  medium!: Relation<Medium>;

  /*
    NOTE: this is not truly nullable, but we need this column to allow
    nested where queries using the .find method of TypeORM.
  */
  @Column({ name: 'medium_id', type: 'int', nullable: true })
  medium_id?: number | null;

  @Column({ type: 'boolean', default: false })
  is_active_queue!: boolean;

  @BeforeInsert()
  generateIdText() {
    this.id_text = generateRandomIdText();
  }
}
