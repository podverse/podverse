import type { RemoteChannelStub } from '@orm/entities/remoteStub/remoteChannelStub.js';
import type { Relation } from 'typeorm';
import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

/** A remote item the index provider resolved. It always belongs to a channel stub. */
@Entity('remote_item_stub')
@Unique('remote_item_stub_channel_item_guid_key', ['remote_channel_stub_id', 'item_guid'])
@Check(
  'remote_item_stub_duration_seconds_check',
  `"duration_seconds" IS NULL OR "duration_seconds" > 0`
)
export class RemoteItemStub {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ type: 'int' })
  remote_channel_stub_id!: number;

  @ManyToOne('RemoteChannelStub', (stub: RemoteChannelStub) => stub.item_stubs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'remote_channel_stub_id' })
  remote_channel_stub!: Relation<RemoteChannelStub>;

  /** GUID as the source feed references it. */
  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_uri })
  item_guid!: string;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_short, nullable: true })
  provider_item_id!: string | null;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_normal, nullable: true })
  title!: string | null;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_uri, nullable: true })
  image_url!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  pub_date!: Date | null;

  @Column({ type: 'int', nullable: true })
  duration_seconds!: number | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  resolved_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;
}
