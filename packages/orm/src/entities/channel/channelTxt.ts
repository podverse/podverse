import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import type { Channel } from '@orm/entities/channel/channel.js';

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
