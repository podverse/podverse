import type { RemoteChannelStub } from '@orm/entities/remoteStub/remoteChannelStub.js';
import type { Relation } from 'typeorm';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

export type RemoteStubAliasKeyKind = 'feed_guid' | 'feed_url';

/**
 * A normalized reference key that resolved to a channel stub. A key points at one stub; the latest
 * resolution wins, which moves a key to a new stub after a provider merge.
 */
@Entity('remote_channel_stub_alias')
@Unique('remote_channel_stub_alias_key_kind_key_value_key', ['key_kind', 'key_value'])
@Index('idx_remote_channel_stub_alias_remote_channel_stub_id', ['remote_channel_stub_id'])
@Check('remote_channel_stub_alias_key_kind_check', `"key_kind" IN ('feed_guid', 'feed_url')`)
export class RemoteChannelStubAlias {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ type: 'int' })
  remote_channel_stub_id!: number;

  @ManyToOne('RemoteChannelStub', (stub: RemoteChannelStub) => stub.aliases, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'remote_channel_stub_id' })
  remote_channel_stub!: Relation<RemoteChannelStub>;

  @Column({ type: 'text' })
  key_kind!: RemoteStubAliasKeyKind;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_uri })
  key_value!: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;
}
