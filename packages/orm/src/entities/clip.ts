import { DATABASE_CONSTANTS, SharableStatusEnum } from '@podverse/helpers';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { Account } from '@orm/entities/account/account';
import { Item } from '@orm/entities/item/item';
import { SharableStatus } from '@orm/entities/sharableStatus';
import { generateRandomIdText } from '@orm/lib/nanoid';

@Entity('clip')
export class Clip {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  id_text!: string;

  @ManyToOne(() => Account, (account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @Column()
  item_id!: string;

  @ManyToOne(() => Item, (item) => item.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: Item;

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

  @ManyToOne(() => SharableStatus, (sharableStatus) => sharableStatus.id)
  @JoinColumn({ name: 'sharable_status_id' })
  sharable_status!: SharableStatusEnum;

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
