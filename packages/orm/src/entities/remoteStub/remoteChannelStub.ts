import type { RemoteChannelStubAlias } from '@orm/entities/remoteStub/remoteChannelStubAlias.js';
import type { RemoteItemStub } from '@orm/entities/remoteStub/remoteItemStub.js';
import type { Relation } from 'typeorm';
import { Check, Column, Entity, Index, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';

import type { IndexProviderId } from '@podverse/helpers';
import { DATABASE_CONSTANTS } from '@podverse/helpers';

/**
 * A remote item feed the index provider resolved but Podverse has not fully parsed. Stubs live
 * outside `feed` / `channel`, so no browse, search, or scheduled parse query reaches them.
 */
@Entity('remote_channel_stub')
@Unique('remote_channel_stub_provider_feed_key', ['index_provider', 'provider_feed_id'])
@Index('idx_remote_channel_stub_feed_guid', ['feed_guid'])
@Index('idx_remote_channel_stub_feed_url', ['feed_url'])
@Check('remote_channel_stub_index_provider_check', `"index_provider" IN ('podcast_index')`)
export class RemoteChannelStub {
  @PrimaryGeneratedColumn('identity')
  id!: number;

  @Column({ type: 'text' })
  index_provider!: IndexProviderId;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_short })
  provider_feed_id!: string;

  @Column({ type: 'uuid', nullable: true })
  feed_guid!: string | null;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_url })
  feed_url!: string;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_normal, nullable: true })
  title!: string | null;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_normal, nullable: true })
  author!: string | null;

  /** Raw provider image URL; stubs never go through image shrinking. */
  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_uri, nullable: true })
  image_url!: string | null;

  @Column({ type: 'int', nullable: true })
  medium_id!: number | null;

  /** Last successful provider lookup. */
  @Column({ type: 'timestamptz', default: () => 'now()' })
  resolved_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;

  @OneToMany('RemoteChannelStubAlias', (alias: RemoteChannelStubAlias) => alias.remote_channel_stub)
  aliases!: Relation<RemoteChannelStubAlias>[];

  @OneToMany('RemoteItemStub', (itemStub: RemoteItemStub) => itemStub.remote_channel_stub)
  item_stubs!: Relation<RemoteItemStub>[];
}
