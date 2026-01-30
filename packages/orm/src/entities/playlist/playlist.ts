import { DATABASE_CONSTANTS, MediumEnum, SharableStatusEnum } from '@podverse/helpers';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  Unique,
  OneToMany,
} from 'typeorm';
import { Account } from '@orm/entities/account/account';
import { SharableStatus } from '@orm/entities/sharableStatus';
import { Medium } from '@orm/entities/medium';
import { PlaylistResource } from './playlistResource';
import { generateRandomIdText } from '@orm/lib/nanoid';

@Entity()
@Unique(['account', 'medium', 'is_default_favorites'])
export class Playlist {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  id_text!: string;

  @ManyToOne(() => Account, (account) => account.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @ManyToOne(() => SharableStatus, (sharableStatus) => sharableStatus.id)
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
  is_default_favorites!: boolean;

  @Column({ type: 'int', default: 0 })
  item_count!: number;

  @Column({ type: 'timestamp' })
  last_updated!: Date;

  @ManyToOne(() => Medium, (medium) => medium.id)
  @JoinColumn({ name: 'medium_id' })
  medium!: MediumEnum;

  /*
    NOTE: this is not truly nullable, but we need this column to allow
    nested where queries using the .find method of TypeORM.
  */
  @Column({ name: 'medium_id', type: 'int', nullable: true })
  medium_id?: number | null;

  @OneToMany(() => PlaylistResource, (playlistResource) => playlistResource.playlist)
  playlist_resources!: PlaylistResource[];

  @BeforeInsert()
  generateIdText() {
    this.id_text = generateRandomIdText();
  }
}
