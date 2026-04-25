import type { Account } from '@orm/entities/account/account.js';
import type { Medium } from '@orm/entities/medium.js';
import type { SharableStatus } from '@orm/entities/sharableStatus.js';
import { generateRandomIdText, NANO_ID_V2_MAX_LENGTH } from '@orm/lib/nanoid.js';
import type { Relation } from 'typeorm';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import type { MediumEnum, SharableStatusEnum } from '@podverse/helpers';
import { DATABASE_CONSTANTS } from '@podverse/helpers';

import type { PlaylistResource } from './playlistResource.js';

@Entity()
@Unique(['account', 'medium', 'is_default_likes'])
export class Playlist {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true, length: NANO_ID_V2_MAX_LENGTH })
  id_text!: string;

  @ManyToOne('Account', (account: Account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Relation<Account>;

  @ManyToOne('SharableStatus', (sharableStatus: SharableStatus) => sharableStatus.id)
  @JoinColumn({ name: 'sharable_status_id' })
  sharable_status!: SharableStatusEnum;

  /*
    NOTE: this is not truly nullable, but we need this column to allow
    nested where queries using the .find method of TypeORM.
  */
  @Column({ name: 'sharable_status_id', type: 'int', nullable: true })
  sharable_status_id?: number | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  title?: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_long })
  description?: string | null;

  @Column({ type: 'boolean', default: false })
  is_default_likes!: boolean;

  @Column({ type: 'int', default: 0 })
  item_count!: number;

  @Column({ type: 'timestamp' })
  last_updated!: Date;

  @ManyToOne('Medium', (medium: Medium) => medium.id)
  @JoinColumn({ name: 'medium_id' })
  medium!: MediumEnum;

  /*
    NOTE: this is not truly nullable, but we need this column to allow
    nested where queries using the .find method of TypeORM.
  */
  @Column({ name: 'medium_id', type: 'int', nullable: true })
  medium_id?: number | null;

  @OneToMany('PlaylistResource', (playlistResource: PlaylistResource) => playlistResource.playlist)
  playlist_resources!: PlaylistResource[];

  @BeforeInsert()
  generateIdText() {
    this.id_text = generateRandomIdText();
  }
}
