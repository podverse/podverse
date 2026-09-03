import type { Account } from '@orm/entities/account/account.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity()
export class AccountFollowingAddByRSSChannel {
  @PrimaryColumn()
  account_id!: number;

  @PrimaryColumn({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_url })
  feed_url!: string;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  title!: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_url })
  image_url!: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  basic_auth_username!: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  basic_auth_password!: string | null;

  /**
   * When this account last opened the feed, on any device.
   *
   * The server never stores add-by-RSS items, so it cannot derive an unseen count for one — the
   * device does that from the feed it holds. This column exists so opening the feed on one device
   * still clears the badge on another.
   */
  @Column({ type: 'timestamptz', nullable: true })
  last_seen_at!: Date | null;
}
