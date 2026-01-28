import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Account } from '@orm/entities/account/account';

@Entity()
export class AccountFollowingAddByRSSChannel {
  @PrimaryColumn()
  account_id!: number;

  @PrimaryColumn({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_url })
  feed_url!: string;

  @ManyToOne(() => Account, (account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  title!: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  image_url!: string | null;
}
