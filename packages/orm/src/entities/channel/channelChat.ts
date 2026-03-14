import type { Channel } from '@orm/entities/channel/channel.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity()
export class ChannelChat {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_fqdn })
  server!: string;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_short })
  protocol!: string;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  account_id!: string | null;

  @Column({ type: 'varchar', nullable: true, length: DATABASE_CONSTANTS.varchar_normal })
  space!: string | null;
}
