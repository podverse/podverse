import type { ChannelValue } from '@orm/entities/channel/channelValue.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity({ name: 'channel_value_meta_boost' })
export class ChannelValueMetaBoost {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('ChannelValue', (channel_value: ChannelValue) => channel_value.meta_boost, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'channel_value_id' })
  channel_value!: Relation<ChannelValue>;

  @Column({ type: 'varchar', name: 'type', length: DATABASE_CONSTANTS.varchar_short })
  type!: string;

  @Column({ type: 'varchar', name: 'schema', length: DATABASE_CONSTANTS.varchar_short })
  schema!: string;

  @Column({
    type: 'varchar',
    name: 'license',
    length: DATABASE_CONSTANTS.varchar_url,
    nullable: true,
  })
  license!: string | null;

  @Column({ type: 'varchar', name: 'node', length: DATABASE_CONSTANTS.varchar_url })
  node!: string;
}
