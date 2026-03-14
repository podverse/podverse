import type { Channel } from '@orm/entities/channel/channel.js';
import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity({ name: 'channel_txt' })
export class ChannelTxt {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @Column({
    type: 'varchar',
    name: 'purpose',
    nullable: true,
    length: DATABASE_CONSTANTS.varchar_normal,
  })
  purpose!: string | null;

  @Column({ type: 'varchar', name: 'value', length: DATABASE_CONSTANTS.varchar_long })
  value!: string;
}
