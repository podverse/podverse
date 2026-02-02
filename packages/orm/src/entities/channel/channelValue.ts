import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Channel } from '@orm/entities/channel/channel.js';
import type { ChannelValueRecipient } from '@orm/entities/channel/channelValueRecipient.js';

@Entity({ name: 'channel_value' })
export class ChannelValue {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne('Channel', (channel: Channel) => channel.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel!: Relation<Channel>;

  @Column({ type: 'varchar', name: 'type', length: DATABASE_CONSTANTS.varchar_short })
  type!: string;

  @Column({ type: 'varchar', name: 'method', length: DATABASE_CONSTANTS.varchar_short })
  method!: string;

  @Column({ type: 'float', name: 'suggested', nullable: true })
  suggested!: number | null;

  @OneToMany(
    'ChannelValueRecipient',
    (channel_value_recipient: ChannelValueRecipient) => channel_value_recipient.channel_value
  )
  channel_value_recipients!: ChannelValueRecipient[];
}
